import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { PageLoader } from "@/components/PageLoader";
import { useMTWebSocket } from "@/hooks/useMTWebSocket";
import { useForexPrices } from "@/hooks/useForexPrices";
import { getMTAssets } from "@/hooks/useMTAssets";
import { useTradingSession } from "@/hooks/useTradingSession";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { toast } from "sonner";
import { formatEUR, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, LineChart, TrendingUp, TrendingDown, History, MessageSquare,
  Star, Search, X, Calendar, Plus, Minus, AlertCircle, ChevronDown
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────
export interface MTAsset {
  symbol: string;
  name: string;
  category: 'metals' | 'forex' | 'crypto' | 'stocks' | 'indices' | 'commodities' | 'etfs';
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
}

export interface MTPosition {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  openTime: Date;
}

interface UserMessage {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

type MT5Screen = 'quotes' | 'chart' | 'trade' | 'history' | 'messages';

// Forex symbols for Twelve Data
const FOREX_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
const COMMODITY_SYMBOLS = ['XAU/USD', 'XAG/USD'];
const ALL_TWELVE_DATA_SYMBOLS = [...FOREX_SYMBOLS, ...COMMODITY_SYMBOLS];

// Map MT asset symbols to Twelve Data format
const mtSymbolToTwelveData: Record<string, string> = {
  'EURUSD': 'EUR/USD', 'GBPUSD': 'GBP/USD', 'USDJPY': 'USD/JPY',
  'AUDUSD': 'AUD/USD', 'USDCAD': 'USD/CAD', 'USDCHF': 'USD/CHF',
  'NZDUSD': 'NZD/USD', 'EURGBP': 'EUR/GBP', 'EURJPY': 'EUR/JPY',
  'GBPJPY': 'GBP/JPY', 'XAUUSD': 'XAU/USD', 'XAGUSD': 'XAG/USD',
};
const twelveDataToMT: Record<string, string> = {};
Object.entries(mtSymbolToTwelveData).forEach(([mt, td]) => { twelveDataToMT[td] = mt; });

// ─── Main Component ───────────────────────────────────────
const MetalTrader = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<MT5Screen>('trade');
  const [selectedCategory, setSelectedCategory] = useState<MTAsset['category']>('forex');
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [selectedAsset, setSelectedAsset] = useState<MTAsset | null>(null);
  const [simpleMode, setSimpleMode] = useState(true);
  const [chartTimeframe, setChartTimeframe] = useState('H1');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<'positions' | 'orders' | 'deals'>('positions');
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [messagesTab, setMessagesTab] = useState<'all' | 'trade' | 'system'>('all');

  // Order state
  const [volume, setVolume] = useState(0.01);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  // Real-time prices
  const { prices: binancePrices, isConnected: binanceConnected } = useMTWebSocket(selectedCategory);
  const { prices: forexPrices, isConnected: forexConnected } = useForexPrices(ALL_TWELVE_DATA_SYMBOLS);

  const {
    session: tradingSession,
    trades: dbTrades,
    tradeHistory: dbTradeHistory,
    openTrade,
    closeTrade: closeSessionTrade,
  } = useTradingSession(session?.user?.id, 'metal_trader');

  const { totals } = useUnifiedBalance(session?.user?.id || null);
  const balance = totals.tradingBalance;

  // Merge Twelve Data forex prices with Binance crypto prices
  const mergedPrices = useMemo(() => {
    const merged: Record<string, { bid: number; ask: number; change: number }> = {};
    Object.entries(binancePrices).forEach(([symbol, data]) => {
      merged[symbol] = data;
    });
    Object.entries(forexPrices).forEach(([tdSymbol, data]) => {
      const mtSymbol = twelveDataToMT[tdSymbol];
      if (mtSymbol && data.price > 0) {
        const spread = tdSymbol.includes('XAU') ? data.price * 0.0003 : data.price * 0.00015;
        merged[mtSymbol] = {
          bid: data.price,
          ask: data.price + spread,
          change: data.change,
        };
      }
    });
    return merged;
  }, [binancePrices, forexPrices]);

  const isConnected = forexConnected || binanceConnected;

  // Positions with live P&L
  const positions: MTPosition[] = useMemo(() =>
    dbTrades.map(t => {
      const livePrice = mergedPrices[t.asset_symbol];
      const currentPrice = livePrice?.bid || t.current_price || t.entry_price;
      const pnl = t.trade_type === 'buy'
        ? (currentPrice - t.entry_price) * t.quantity * 100000
        : (t.entry_price - currentPrice) * t.quantity * 100000;
      return {
        id: t.id,
        symbol: t.asset_symbol,
        type: t.trade_type as 'buy' | 'sell',
        volume: t.quantity,
        openPrice: t.entry_price,
        currentPrice,
        stopLoss: t.stop_loss || undefined,
        takeProfit: t.take_profit || undefined,
        pnl,
        openTime: new Date(t.opened_at),
      };
    })
  , [dbTrades, mergedPrices]);

  const margin = positions.reduce((sum, pos) => sum + (pos.volume * pos.openPrice * 0.01), 0);
  const floatingPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const equity = balance + floatingPnL;
  const freeMargin = equity - margin;
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;

  const tradeHistory = useMemo(() =>
    dbTradeHistory.map(t => ({
      id: t.id,
      symbol: t.asset_symbol,
      type: t.trade_type,
      volume: t.quantity,
      openPrice: t.entry_price,
      closePrice: t.exit_price || t.current_price || t.entry_price,
      pnl: t.pnl,
      closeTime: t.closed_at ? new Date(t.closed_at) : new Date(),
      openTime: new Date(t.opened_at),
    }))
  , [dbTradeHistory]);

  const assets = useMemo(() => getMTAssets(selectedCategory), [selectedCategory]);

  // Price flash tracking
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    const newFlashes: Record<string, 'up' | 'down' | null> = {};
    Object.entries(mergedPrices).forEach(([symbol, data]) => {
      const prev = prevPricesRef.current[symbol];
      if (prev !== undefined && prev !== data.bid) {
        newFlashes[symbol] = data.bid > prev ? 'up' : 'down';
      }
    });
    if (Object.keys(newFlashes).length > 0) {
      setFlashMap(newFlashes);
      setTimeout(() => setFlashMap({}), 200);
    }
    const newPrev: Record<string, number> = {};
    Object.entries(mergedPrices).forEach(([s, d]) => { newPrev[s] = d.bid; });
    prevPricesRef.current = newPrev;
  }, [mergedPrices]);

  // SL/TP auto-close
  const closingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (positions.length === 0) return;
    positions.forEach(pos => {
      if (closingRef.current.has(pos.id)) return;
      if (pos.stopLoss) {
        if ((pos.type === 'buy' && pos.currentPrice <= pos.stopLoss) ||
            (pos.type === 'sell' && pos.currentPrice >= pos.stopLoss)) {
          closingRef.current.add(pos.id);
          handleClosePosition(pos.id, 'SL');
          toast.info(`SL triggered: ${pos.symbol} closed at ${pos.currentPrice.toFixed(5)}`);
        }
      }
      if (pos.takeProfit) {
        if ((pos.type === 'buy' && pos.currentPrice >= pos.takeProfit) ||
            (pos.type === 'sell' && pos.currentPrice <= pos.takeProfit)) {
          closingRef.current.add(pos.id);
          handleClosePosition(pos.id, 'TP');
          toast.success(`TP triggered: ${pos.symbol} closed at ${pos.currentPrice.toFixed(5)}`);
        }
      }
    });
  }, [positions]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/auth"); return; }
        setSession(session);
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
        setUserName(profile?.full_name || session.user.email?.split("@")[0] || "Trader");
      } catch (e) {
        console.error("Auth check failed:", e);
      }
      setLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch MT5 configs and auto-populate SL/TP for selected symbol
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('mt5_configurations')
        .select('*')
        .eq('currency_pair', selectedSymbol)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const config = data[0] as any;
        setStopLoss(Number(config.stop_loss).toFixed(5));
        setTakeProfit(Number(config.take_profit).toFixed(5));
      }
    };
    fetchConfig();
  }, [selectedSymbol]);

  // Load messages
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setMessages(data as UserMessage[]);
    };
    fetchMessages();

    const channel = supabase
      .channel(`mt5_messages:${session.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_messages',
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        setMessages(prev => [payload.new as UserMessage, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Update selected asset
  useEffect(() => {
    const asset = assets.find(a => a.symbol === selectedSymbol);
    if (asset) {
      const priceData = mergedPrices[selectedSymbol];
      setSelectedAsset({
        ...asset,
        category: selectedCategory,
        bid: priceData?.bid || asset.basePrice * 0.9999,
        ask: priceData?.ask || asset.basePrice * 1.0001,
        spread: priceData ? (priceData.ask - priceData.bid) : asset.basePrice * 0.0002,
        change: priceData?.change || 0,
        changePercent: priceData ? ((priceData.change / priceData.bid) * 100) : 0,
      });
    }
  }, [selectedSymbol, mergedPrices, assets, selectedCategory]);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    const allCategories: MTAsset['category'][] = ['metals', 'forex', 'crypto', 'stocks', 'indices', 'commodities', 'etfs'];
    for (const cat of allCategories) {
      if (getMTAssets(cat).find(a => a.symbol === symbol)) {
        if (cat !== selectedCategory) setSelectedCategory(cat);
        break;
      }
    }
  };

  const sendTradeMessage = async (title: string, message: string) => {
    if (!session?.user?.id) return;
    await supabase.from('user_messages').insert({
      user_id: session.user.id, type: 'trade', title, message, is_read: false,
    });
  };

  const handlePlaceOrder = async (type: 'buy' | 'sell') => {
    if (!selectedAsset) return;
    const price = type === 'buy' ? selectedAsset.ask : selectedAsset.bid;
    const trade = await openTrade({
      symbol: selectedAsset.symbol, name: selectedAsset.name,
      type, quantity: volume, entryPrice: price,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    });
    if (trade) {
      toast.success(`${type.toUpperCase()} ${volume} ${selectedAsset.symbol} @ ${price.toFixed(5)}`);
      await sendTradeMessage('Position Opened', `${type.toUpperCase()} ${volume} ${selectedAsset.symbol} opened at ${price.toFixed(5)}`);
      setShowOrderModal(false);
    } else {
      toast.error("Failed to execute order");
    }
  };

  const handleClosePosition = async (positionId: string, reason?: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;
    const success = await closeSessionTrade(positionId, position.currentPrice);
    if (success) {
      closingRef.current.delete(positionId);
      const pnlStr = `${position.pnl >= 0 ? '+' : ''}${formatEUR(position.pnl)}`;
      toast.success(`Closed: ${pnlStr}`);
      const reasonStr = reason === 'SL' ? 'Stop Loss triggered' : reason === 'TP' ? 'Take Profit achieved' : 'Manually closed';
      await sendTradeMessage(
        reason === 'SL' ? 'Stop Loss Triggered' : reason === 'TP' ? 'Take Profit Achieved' : 'Position Closed',
        `${position.symbol} ${position.type.toUpperCase()} closed. ${reasonStr}. P&L: ${pnlStr}`
      );
    } else {
      closingRef.current.delete(positionId);
      toast.error("Failed to close position");
    }
  };

  const adjustVolume = (delta: number) => {
    setVolume(prev => Math.max(0.01, parseFloat((prev + delta).toFixed(2))));
  };

  const getAssetWithPrice = (asset: any): MTAsset => {
    const priceData = mergedPrices[asset.symbol];
    return {
      ...asset, category: selectedCategory,
      bid: priceData?.bid || asset.basePrice * 0.9999,
      ask: priceData?.ask || asset.basePrice * 1.0001,
      spread: priceData ? (priceData.ask - priceData.bid) : asset.basePrice * 0.0002,
      change: priceData?.change || 0,
      changePercent: priceData ? ((priceData.change / priceData.bid) * 100) : 0,
    };
  };

  // ─── MT5 Pip Formatting ──────────────────────────────────
  const formatPipPrice = (price: number, decimals: number = 5) => {
    const str = price.toFixed(decimals);
    if (decimals >= 4) {
      const parts = str.split('.');
      const smallPart = parts[1].slice(0, -2);
      const bigPart = parts[1].slice(-2);
      return (
        <span className="font-mono">
          {parts[0]}.{smallPart}<span className="text-xl font-bold">{bigPart}</span>
        </span>
      );
    }
    if (decimals >= 2) {
      const parts = str.split('.');
      const smallPart = parts[1].slice(0, -2);
      const bigPart = parts[1].slice(-2);
      return (
        <span className="font-mono">
          {parts[0]}.{smallPart && <>{smallPart}</>}<span className="text-xl font-bold">{bigPart}</span>
        </span>
      );
    }
    return <span className="font-mono">{str}</span>;
  };

  const marginRequired = selectedAsset ? volume * selectedAsset.ask * 0.01 : 0;
  const canTrade = marginRequired <= freeMargin && volume > 0;

  // ─── Render Screens ──────────────────────────────────────

  const renderQuotesScreen = () => {
    const categoryTabs: MTAsset['category'][] = ['forex', 'metals', 'crypto', 'stocks'];
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5EA] dark:border-[#38383A]">
          <div className="flex gap-2">
            <button onClick={() => setSimpleMode(true)} className={cn("text-sm font-medium px-3 py-1 rounded-full", simpleMode ? "bg-[#007AFF] text-white" : "text-[#8E8E93]")}>Simple</button>
            <button onClick={() => setSimpleMode(false)} className={cn("text-sm font-medium px-3 py-1 rounded-full", !simpleMode ? "bg-[#007AFF] text-white" : "text-[#8E8E93]")}>Advanced</button>
          </div>
          <div className="flex gap-1">
            {categoryTabs.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("text-xs px-2 py-1 rounded capitalize", selectedCategory === cat ? "bg-[#007AFF]/10 text-[#007AFF] font-semibold" : "text-[#8E8E93]")}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_90px_90px_60px] px-4 py-1 text-[10px] text-[#8E8E93] border-b border-[#E5E5EA] dark:border-[#38383A]">
          <div>Symbol</div><div className="text-right">Bid</div><div className="text-right">Ask</div><div className="text-right">Chg%</div>
        </div>

        <ScrollArea className="flex-1">
          {assets.map(asset => {
            const a = getAssetWithPrice(asset);
            const isPositive = a.changePercent >= 0;
            const dec = asset.decimals || (selectedCategory === 'forex' ? 5 : 2);
            const flash = flashMap[asset.symbol];
            return (
              <div
                key={asset.symbol}
                onClick={() => { handleSymbolSelect(asset.symbol); setActiveScreen('chart'); }}
                className={cn(
                  "grid grid-cols-[1fr_90px_90px_60px] px-4 py-3 border-b border-[#F2F2F7] dark:border-[#2C2C2E] cursor-pointer transition-colors",
                  flash === 'up' && "bg-[#007AFF]/10",
                  flash === 'down' && "bg-[#FF3B30]/10",
                  "hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E]"
                )}
              >
                <div>
                  <div className="font-semibold text-sm text-[#000] dark:text-white">{asset.symbol}</div>
                  <div className="text-[10px] text-[#8E8E93]">{asset.name}</div>
                </div>
                <div className={cn("text-right text-sm", isPositive ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                  {formatPipPrice(a.bid, dec)}
                </div>
                <div className={cn("text-right text-sm", isPositive ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                  {formatPipPrice(a.ask, dec)}
                </div>
                <div className={cn("text-right text-xs font-mono self-center", isPositive ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                  {isPositive ? "+" : ""}{a.changePercent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>
    );
  };

  const renderChartScreen = () => {
    const timeframes = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
    const getTradingViewSymbol = (symbol: string): string => {
      const symbolMap: Record<string, string> = {
        "EURUSD": "FX:EURUSD", "GBPUSD": "FX:GBPUSD", "USDJPY": "FX:USDJPY",
        "AUDUSD": "FX:AUDUSD", "USDCAD": "FX:USDCAD", "USDCHF": "FX:USDCHF",
        "NZDUSD": "FX:NZDUSD", "EURGBP": "FX:EURGBP", "EURJPY": "FX:EURJPY",
        "GBPJPY": "FX:GBPJPY", "XAUUSD": "TVC:GOLD", "XAGUSD": "TVC:SILVER",
        "BTCUSD": "BINANCE:BTCUSDT", "ETHUSD": "BINANCE:ETHUSDT",
        "BNBUSD": "BINANCE:BNBUSDT", "SOLUSD": "BINANCE:SOLUSDT",
        "XRPUSD": "BINANCE:XRPUSDT", "LTCUSD": "BINANCE:LTCUSDT",
      };
      return symbolMap[symbol] || `BINANCE:${symbol}`;
    };
    const tvInterval: Record<string, string> = { 'M1': '1', 'M5': '5', 'M15': '15', 'H1': '60', 'H4': '240', 'D1': 'D' };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E5EA] dark:border-[#38383A]">
          <span className="font-bold text-sm">{selectedSymbol}</span>
          <div className="flex gap-1 overflow-x-auto">
            {timeframes.map(tf => (
              <button key={tf} onClick={() => setChartTimeframe(tf)} className={cn("text-xs px-2 py-1 rounded", chartTimeframe === tf ? "bg-[#007AFF] text-white" : "text-[#8E8E93]")}>
                {tf}
              </button>
            ))}
          </div>
          <button onClick={() => setShowOrderModal(true)} className="bg-[#007AFF] text-white text-xs px-3 py-1 rounded font-semibold">
            Trade
          </button>
        </div>
        {/* Chart takes full available height */}
        <div className="flex-1 min-h-0">
          <TradingViewWidget symbol={getTradingViewSymbol(selectedSymbol)} interval={tvInterval[chartTimeframe] || '60'} />
        </div>
      </div>
    );
  };

  const renderTradeScreen = () => {
    const dec = selectedCategory === 'forex' ? 5 : 2;
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
        {/* Account Summary */}
        <div className="px-4 py-3 border-b border-[#E5E5EA] dark:border-[#38383A] bg-[#F9F9F9] dark:bg-[#2C2C2E]">
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <div className="flex justify-between pr-4">
              <span className="text-[#8E8E93]">Balance:</span>
              <span className="font-mono font-semibold text-[#000] dark:text-white">{formatEUR(balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Equity:</span>
              <span className={cn("font-mono font-semibold", equity >= balance ? "text-[#007AFF]" : "text-[#FF3B30]")}>{formatEUR(equity)}</span>
            </div>
            <div className="flex justify-between pr-4">
              <span className="text-[#8E8E93]">Margin:</span>
              <span className="font-mono text-[#000] dark:text-white">{formatEUR(margin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Free Margin:</span>
              <span className="font-mono text-[#000] dark:text-white">{formatEUR(freeMargin)}</span>
            </div>
            <div className="flex justify-between pr-4">
              <span className="text-[#8E8E93]">Margin Level:</span>
              <span className={cn("font-mono", marginLevel > 100 ? "text-[#007AFF]" : "text-[#FF3B30]")}>{marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Floating P/L:</span>
              <span className={cn("font-mono font-semibold", floatingPnL >= 0 ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                {floatingPnL >= 0 ? '+' : ''}{formatEUR(floatingPnL)}
              </span>
            </div>
          </div>
        </div>

        {/* Order Entry */}
        <div className="px-4 py-3 border-b border-[#E5E5EA] dark:border-[#38383A]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-[#000] dark:text-white">{selectedAsset?.symbol || 'EURUSD'}</span>
            <span className="text-xs text-[#8E8E93]">Market Execution</span>
          </div>

          {/* Volume selector */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <button onClick={() => adjustVolume(-0.1)} className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded text-xs font-semibold">-0.1</button>
            <button onClick={() => adjustVolume(-0.01)} className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded text-xs font-semibold">-0.01</button>
            <div className="px-6 py-1.5 bg-white dark:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#38383A] rounded text-center font-mono font-bold text-lg min-w-[80px]">
              {volume.toFixed(2)}
            </div>
            <button onClick={() => adjustVolume(0.01)} className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded text-xs font-semibold">+0.01</button>
            <button onClick={() => adjustVolume(0.1)} className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-[#3A3A3C] rounded text-xs font-semibold">+0.1</button>
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-[10px] text-[#FF3B30] font-medium">Stop Loss</Label>
              <Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="0.00000"
                className="h-8 text-xs font-mono border-b-2 border-b-[#FF3B30] rounded-none bg-transparent" />
            </div>
            <div>
              <Label className="text-[10px] text-[#007AFF] font-medium">Take Profit</Label>
              <Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="0.00000"
                className="h-8 text-xs font-mono border-b-2 border-b-[#007AFF] rounded-none bg-transparent" />
            </div>
          </div>

          {/* Buy / Sell buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePlaceOrder('sell')}
              disabled={!canTrade || !selectedAsset}
              className="py-4 rounded-lg bg-[#FF3B30] text-white flex flex-col items-center justify-center gap-0 disabled:opacity-50 transition-opacity active:opacity-80"
            >
              <span className="text-[10px] uppercase tracking-widest font-light">Sell by Market</span>
              <span className="text-2xl font-bold font-mono">{selectedAsset ? formatPipPrice(selectedAsset.bid, dec) : '—'}</span>
            </button>
            <button
              onClick={() => handlePlaceOrder('buy')}
              disabled={!canTrade || !selectedAsset}
              className="py-4 rounded-lg bg-[#007AFF] text-white flex flex-col items-center justify-center gap-0 disabled:opacity-50 transition-opacity active:opacity-80"
            >
              <span className="text-[10px] uppercase tracking-widest font-light">Buy by Market</span>
              <span className="text-2xl font-bold font-mono">{selectedAsset ? formatPipPrice(selectedAsset.ask, dec) : '—'}</span>
            </button>
          </div>
        </div>

        {/* Positions */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8E8E93] uppercase">Positions ({positions.length})</span>
            <button onClick={() => setShowOrderModal(true)} className="text-[#007AFF] text-xs font-semibold">+ New Order</button>
          </div>
          {positions.length === 0 ? (
            <div className="text-center text-[#8E8E93] text-xs py-8">No open positions</div>
          ) : (
            positions.map(pos => (
              <div key={pos.id} className="px-4 py-3 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#000] dark:text-white">{pos.symbol}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded font-semibold", pos.type === 'buy' ? "bg-[#007AFF]/10 text-[#007AFF]" : "bg-[#FF3B30]/10 text-[#FF3B30]")}>
                      {pos.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#8E8E93]">{pos.volume}</span>
                  </div>
                  <span className={cn("font-mono font-semibold text-sm", pos.pnl >= 0 ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                    {pos.pnl >= 0 ? '+' : ''}{formatEUR(pos.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E8E93] font-mono">{pos.openPrice.toFixed(5)} → {pos.currentPrice.toFixed(5)}</span>
                  <button onClick={() => handleClosePosition(pos.id)} className="text-xs text-[#FF3B30] font-semibold">Close</button>
                </div>
                {(pos.stopLoss || pos.takeProfit) && (
                  <div className="flex gap-4 mt-1 text-[10px] text-[#8E8E93]">
                    {pos.stopLoss && <span>SL: <span className="text-[#FF3B30]">{pos.stopLoss.toFixed(5)}</span></span>}
                    {pos.takeProfit && <span>TP: <span className="text-[#007AFF]">{pos.takeProfit.toFixed(5)}</span></span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderHistoryScreen = () => {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5EA] dark:border-[#38383A]">
          <div className="flex gap-4">
            {(['positions', 'orders', 'deals'] as const).map(tab => (
              <button key={tab} onClick={() => setHistoryTab(tab)} className={cn("text-sm capitalize", historyTab === tab ? "text-[#007AFF] font-semibold border-b-2 border-[#007AFF] pb-1" : "text-[#8E8E93]")}>
                {tab}
              </button>
            ))}
          </div>
          <Calendar className="w-5 h-5 text-[#8E8E93]" />
        </div>
        <ScrollArea className="flex-1">
          {tradeHistory.length === 0 ? (
            <div className="text-center text-[#8E8E93] text-xs py-12">No history yet — start trading!</div>
          ) : (
            tradeHistory.map(trade => (
              <div key={trade.id} className="px-4 py-3 border-b border-[#F2F2F7] dark:border-[#2C2C2E]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#000] dark:text-white">{trade.symbol}</span>
                    <span className={cn("text-xs font-semibold", trade.type === 'buy' ? "text-[#007AFF]" : "text-[#FF3B30]")}>{trade.type.toUpperCase()}</span>
                    <span className="text-xs text-[#8E8E93]">{trade.volume}</span>
                  </div>
                  <span className={cn("font-mono text-sm font-semibold", trade.pnl >= 0 ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                    {trade.pnl >= 0 ? '+' : ''}{formatEUR(trade.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8E8E93]">
                  <span>{new Date(trade.openTime).toLocaleString()}</span>
                  <span className="font-mono">{trade.openPrice.toFixed(5)} → {trade.closePrice.toFixed(5)}</span>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>
    );
  };

  const renderMessagesScreen = () => {
    const getIcon = (type: string) => {
      switch (type) {
        case 'trade': return '📈';
        case 'deposit': return '💰';
        case 'withdrawal': return '💸';
        case 'system': return '⚙️';
        default: return '📬';
      }
    };

    const filtered = messagesTab === 'all' ? messages : messages.filter(m => m.type === messagesTab);

    const markAsRead = async (id: string) => {
      await supabase.from('user_messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    };

    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E]">
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#E5E5EA] dark:border-[#38383A]">
          {(['all', 'trade', 'system'] as const).map(tab => (
            <button key={tab} onClick={() => setMessagesTab(tab)} className={cn("text-sm capitalize", messagesTab === tab ? "text-[#007AFF] font-semibold" : "text-[#8E8E93]")}>
              {tab} {tab === 'all' ? `(${messages.length})` : ''}
            </button>
          ))}
        </div>
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center text-[#8E8E93] py-12">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Trade notifications will appear here</p>
            </div>
          ) : (
            filtered.map(msg => (
              <div
                key={msg.id}
                onClick={() => !msg.is_read && markAsRead(msg.id)}
                className={cn("px-4 py-3 border-b border-[#F2F2F7] dark:border-[#2C2C2E] cursor-pointer", !msg.is_read && "bg-[#007AFF]/5")}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getIcon(msg.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#000] dark:text-white">{msg.title}</span>
                      {!msg.is_read && <span className="w-2 h-2 rounded-full bg-[#007AFF]" />}
                    </div>
                    <p className="text-xs text-[#8E8E93] mt-0.5">{msg.message}</p>
                    <p className="text-[10px] text-[#8E8E93] mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>
    );
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'quotes': return renderQuotesScreen();
      case 'chart': return renderChartScreen();
      case 'trade': return renderTradeScreen();
      case 'history': return renderHistoryScreen();
      case 'messages': return renderMessagesScreen();
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <PageLoader loading={loading}>
      <div className="min-h-screen bg-white dark:bg-[#1C1C1E] text-[#000] dark:text-white flex flex-col">
        <DashboardHeader userName={userName} onMenuClick={() => setIsSidebarOpen(true)} pageTitle="Metal Trader" />
        <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Content - safe area padding */}
        <div className="flex-1 pt-16 pb-14 overflow-hidden">
          {renderActiveScreen()}
        </div>

        {/* MT5 Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] border-t border-[#E5E5EA] dark:border-[#38383A] z-50 safe-area-bottom">
          <div className="flex items-center justify-around py-2">
            {([
              { id: 'quotes' as MT5Screen, icon: BarChart3, label: 'Quotes' },
              { id: 'chart' as MT5Screen, icon: LineChart, label: 'Chart' },
              { id: 'trade' as MT5Screen, icon: TrendingUp, label: 'Trade' },
              { id: 'history' as MT5Screen, icon: History, label: 'History' },
              { id: 'messages' as MT5Screen, icon: MessageSquare, label: 'Messages' },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveScreen(id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors relative",
                  activeScreen === id ? "text-[#007AFF]" : "text-[#8E8E93]"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{label}</span>
                {id === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageLoader>
  );
};

// ─── TradingView Widget (500px height) ─────────────────────
const TradingViewWidget = ({ symbol, interval }: { symbol: string; interval: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      withdateranges: false,
      backgroundColor: "#ffffff",
      gridColor: "rgba(46, 46, 46, 0.06)",
    });
    containerRef.current.appendChild(script);
    return () => { if (containerRef.current) containerRef.current.innerHTML = ""; };
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget-container w-full h-full" ref={containerRef} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }} />
    </div>
  );
};

export default MetalTrader;
