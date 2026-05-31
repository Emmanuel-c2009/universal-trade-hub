import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { QTTradingChart } from "@/components/quicktrade/QTTradingChart";
import { QTTradeControls } from "@/components/quicktrade/QTTradeControls";
import { QTDrawer } from "@/components/quicktrade/QTDrawer";
import { PageLoader } from "@/components/PageLoader";
import { useQTAssets } from "@/hooks/useQTAssets";
import { useQTWebSocket } from "@/hooks/useQTWebSocket";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/utils";

export interface QTAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  payout: number;
  category: "forex" | "crypto" | "stocks" | "indices" | "commodities";
  source: "coingecko" | "alphavantage" | "yahoo";
  isFavorite?: boolean;
}

export interface QTTrade {
  id: string;
  assetId: string;
  symbol: string;
  type: "BUY" | "SELL";
  amount: number;
  entryPrice: number;
  currentPrice: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  pnl: number;
  status: "active" | "won" | "lost" | "closed";
}

const QuickTrade = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<QTAsset | null>(null);
  const [activeTrades, setActiveTrades] = useState<QTTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<QTTrade[]>([]);
  const [userName, setUserName] = useState("Trader");

  const { assets, connected, refreshAssets } = useQTAssets();
  const { prices, isConnected } = useQTWebSocket(assets.map(a => a.symbol));

  // Use real balance from DB
  const { totals } = useUnifiedBalance(session?.user?.id || null);
  const tradingBalance = totals.tradingBalance;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }
        setSession(session);
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
        if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);
      } catch (e) {
        console.error("Auth check failed:", e);
      }
      setLoading(false);
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Update prices in real-time
  useEffect(() => {
    if (selectedAsset && prices[selectedAsset.symbol]) {
      setSelectedAsset(prev => prev ? { ...prev, price: prices[prev.symbol] || prev.price } : null);
    }
    setActiveTrades(prev => prev.map(trade => {
      const currentPrice = prices[trade.symbol] || trade.currentPrice;
      const pnl = trade.type === "BUY"
        ? (currentPrice - trade.entryPrice) / trade.entryPrice * trade.amount
        : (trade.entryPrice - currentPrice) / trade.entryPrice * trade.amount;
      return { ...trade, currentPrice, pnl };
    }));
  }, [prices, selectedAsset?.symbol]);

  // Check for expired trades - binary outcome
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setActiveTrades(prev => {
        const expired = prev.filter(t => t.status === "active" && new Date(t.endTime) <= now);
        const active = prev.filter(t => t.status === "active" && new Date(t.endTime) > now);
        if (expired.length > 0) {
          const completedTrades = expired.map(trade => {
            const won = trade.type === "BUY"
              ? trade.currentPrice > trade.entryPrice
              : trade.currentPrice < trade.entryPrice;
            const payout = won ? trade.amount * ((selectedAsset?.payout || 85) / 100) : -trade.amount;
            return { ...trade, pnl: won ? payout : -trade.amount, status: (won ? "won" : "lost") as "won" | "lost" };
          });
          setTradeHistory(prev => [...completedTrades, ...prev]);

          // Update balance in DB for won trades
          completedTrades.forEach(async trade => {
            if (trade.status === "won" && session?.user?.id) {
              const newBalance = tradingBalance + trade.amount + trade.pnl;
              await supabase.from('user_balances').update({ trading_balance: newBalance }).eq('user_id', session.user.id);
            }
            toast({
              title: trade.status === "won" ? "Trade Won! 🎉" : "Trade Lost",
              description: `${trade.symbol} ${trade.type} ${trade.status === "won" ? "+" : ""}${formatEUR(Math.abs(trade.pnl))}`,
              variant: trade.status === "won" ? "default" : "destructive"
            });
          });
        }
        return active;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedAsset?.payout, tradingBalance, session?.user?.id]);

  const handlePlaceTrade = useCallback(async (type: "BUY" | "SELL", amount: number, duration: number) => {
    if (!selectedAsset) {
      toast({ title: "Select an asset", description: "Tap ☰ to select an asset", variant: "destructive" });
      return;
    }
    if (amount > tradingBalance) {
      toast({ title: "Insufficient balance", description: `Your trading balance is ${formatEUR(tradingBalance)}`, variant: "destructive" });
      return;
    }

    // Deduct from balance immediately
    if (session?.user?.id) {
      await supabase.from('user_balances').update({ trading_balance: tradingBalance - amount }).eq('user_id', session.user.id);
    }

    // Save trade to database
    const { data: dbTrade } = await supabase.from('platform_trades').insert({
      user_id: session?.user?.id,
      session_id: null,
      platform: 'quick_trade',
      asset_symbol: selectedAsset.symbol,
      asset_name: selectedAsset.name,
      trade_type: type.toLowerCase(),
      quantity: amount,
      entry_price: selectedAsset.price,
      current_price: selectedAsset.price,
      pnl: 0,
      status: 'open',
    }).select().single();

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60 * 1000);
    const newTrade: QTTrade = {
      id: dbTrade?.id || `qt-${Date.now()}`,
      assetId: selectedAsset.id,
      symbol: selectedAsset.symbol,
      type, amount,
      entryPrice: selectedAsset.price,
      currentPrice: selectedAsset.price,
      duration, startTime: now, endTime,
      pnl: 0, status: "active"
    };
    setActiveTrades(prev => [...prev, newTrade]);
    toast({ title: "Trade Placed", description: `${type} ${selectedAsset.symbol} ${formatEUR(amount)} for ${duration}min` });
  }, [selectedAsset, tradingBalance, session?.user?.id]);

  const handleCloseTrade = useCallback((tradeId: string) => {
    setActiveTrades(prev => {
      const trade = prev.find(t => t.id === tradeId);
      if (trade) {
        setTradeHistory(current => [{ ...trade, status: "closed" as const }, ...current]);
      }
      return prev.filter(t => t.id !== tradeId);
    });
    toast({ title: "Trade Closed", description: "Position closed early" });
  }, []);

  const handleSelectAsset = useCallback((asset: QTAsset) => {
    setSelectedAsset(asset);
    setDrawerOpen(false);
  }, []);

  return (
    <PageLoader loading={loading}>
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} pageTitle="Quick Trade" />
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 pt-20 pb-16 lg:pb-0 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDrawerOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <span className="font-semibold text-sm">{selectedAsset?.symbol || "Select Asset"}</span>
              {selectedAsset && (
                <span className={`text-xs font-mono ${(selectedAsset.changePercent || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {(selectedAsset.changePercent || 0) >= 0 ? "+" : ""}{(selectedAsset.changePercent || 0).toFixed(2)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isConnected ? (
                <Button variant="outline" size="sm" className="text-xs text-destructive h-7" onClick={() => refreshAssets()}>
                  <AlertCircle className="w-3 h-3 mr-1" /> Retry
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">Live</span>
                </div>
              )}
              <span className="font-mono font-bold text-sm">{formatEUR(tradingBalance)}</span>
            </div>
          </div>

          {/* Chart - 90% of screen */}
          <div className="flex-1 min-h-0">
            <QTTradingChart
              asset={selectedAsset}
              activeTrades={activeTrades.filter(t => t.symbol === selectedAsset?.symbol)}
            />
          </div>

          {/* Trade Controls - compact at bottom */}
          <div className="border-t border-border">
            <QTTradeControls
              asset={selectedAsset}
              onPlaceTrade={handlePlaceTrade}
              tradingBalance={tradingBalance}
            />
          </div>
        </main>

        {/* Side Drawer */}
        <QTDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          assets={assets}
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          prices={prices}
          activeTrades={activeTrades}
          tradeHistory={tradeHistory}
          onCloseTrade={handleCloseTrade}
        />

        <BottomNav />
      </div>
    </PageLoader>
  );
};

export default QuickTrade;
