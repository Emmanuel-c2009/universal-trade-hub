import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet, Bitcoin, TrendingUp, TrendingDown, ArrowRightLeft,
  PiggyBank, Activity, Gift, Target, Eye, EyeOff, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { formatEUR } from "@/lib/utils";

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
};

export default function Portfolio() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [userName, setUserName] = useState("Trader");

  const { balance, totals, cryptoPrices, loading: balanceLoading } = useUnifiedBalance(session?.user?.id || null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setSession(session);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
      if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const usdtRate = cryptoPrices.find(p => p.symbol === 'USDT')?.price_eur || 0.92;
  const totalUSDT = usdtRate > 0 ? totals.totalAssets / usdtRate : 0;
  const todayPnl = balance?.today_pnl || 0;
  const todayPnlPercent = totals.totalAssets > 0 ? (todayPnl / totals.totalAssets) * 100 : 0;

  const cryptoWallets = [
    { symbol: "BTC", name: "Bitcoin", balance: balance?.btc_balance || 0, valueEUR: totals.btcValueEUR, change: cryptoPrices.find(p => p.symbol === 'BTC')?.change_24h || 0, price: cryptoPrices.find(p => p.symbol === 'BTC')?.price_eur || 0 },
    { symbol: "ETH", name: "Ethereum", balance: balance?.eth_balance || 0, valueEUR: totals.ethValueEUR, change: cryptoPrices.find(p => p.symbol === 'ETH')?.change_24h || 0, price: cryptoPrices.find(p => p.symbol === 'ETH')?.price_eur || 0 },
    { symbol: "USDT", name: "Tether", balance: balance?.usdt_balance || 0, valueEUR: totals.usdtValueEUR, change: cryptoPrices.find(p => p.symbol === 'USDT')?.change_24h || 0, price: cryptoPrices.find(p => p.symbol === 'USDT')?.price_eur || 0 },
    { symbol: "BNB", name: "BNB", balance: balance?.bnb_balance || 0, valueEUR: totals.bnbValueEUR, change: cryptoPrices.find(p => p.symbol === 'BNB')?.change_24h || 0, price: cryptoPrices.find(p => p.symbol === 'BNB')?.price_eur || 0 },
    { symbol: "LTC", name: "Litecoin", balance: balance?.litecoin_balance || 0, valueEUR: totals.ltcValueEUR, change: cryptoPrices.find(p => p.symbol === 'LTC')?.change_24h || 0, price: cryptoPrices.find(p => p.symbol === 'LTC')?.price_eur || 0 },
  ].filter(c => c.balance > 0 || c.valueEUR > 0);

  const fiatSections = [
    { label: "Funding Balance", value: totals.fundingBalance, icon: Wallet, color: "text-blue-500" },
    { label: "Trading Balance", value: totals.tradingBalance, icon: Activity, color: "text-green-500" },
    { label: "Bonus Balance", value: totals.bonusBalance, icon: Gift, color: "text-amber-500" },
    { label: "Challenges Balance", value: totals.challengesBalance, icon: Target, color: "text-purple-500" },
  ];

  if (loading || balanceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} pageTitle="Portfolio" />
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="container mx-auto px-4 pt-28 max-w-4xl">
          <Skeleton className="h-48 w-full mb-4" />
          <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} pageTitle="Portfolio" />
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="container mx-auto px-4 pt-28 max-w-4xl pb-8">
        {/* Total Value Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Est. Total Value</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHideBalance(!hideBalance)}>
                {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold font-mono">
                {hideBalance ? "****" : `${totalUSDT.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT`}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {hideBalance ? "****" : `≈ ${formatEUR(totals.totalAssets)}`}
            </p>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Today's P&L</span>
              <div className={`flex items-center gap-1 text-sm font-semibold ${todayPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {todayPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {hideBalance ? "****" : `${formatEUR(todayPnl)} (${todayPnlPercent >= 0 ? "+" : ""}${todayPnlPercent.toFixed(2)}%)`}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => navigate('/deposit')}>Deposit</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/withdraw')}>Withdraw</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/transfer')}>
                <ArrowRightLeft className="w-4 h-4 mr-1" /> Transfer
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Crypto Wallets */}
        {cryptoWallets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-orange-500" /> Crypto Wallets
              </h3>
              <Button size="sm" variant="outline" onClick={() => navigate('/swap')}>
                <RefreshCw className="w-4 h-4 mr-1" /> Swap
              </Button>
            </div>
            <div className="space-y-2">
              {cryptoWallets.map((c, i) => (
                <motion.div key={c.symbol} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={CRYPTO_ICONS[c.symbol]} alt={c.symbol} className="w-8 h-8 rounded-full" />
                      <div>
                        <span className="font-semibold">{c.symbol}</span>
                        <span className="text-xs text-muted-foreground ml-2">{c.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">{hideBalance ? "****" : c.balance.toFixed(6)}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-muted-foreground">{hideBalance ? "****" : `≈ ${formatEUR(c.valueEUR)}`}</span>
                        <span className={`text-xs font-medium ${c.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {c.change >= 0 ? "+" : ""}{c.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Fiat Balances */}
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3">Account Balances</h3>
          <div className="grid grid-cols-2 gap-3">
            {fiatSections.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold font-mono">{hideBalance ? "****" : formatEUR(item.value)}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trading Metrics */}
        <div>
          <h3 className="text-base font-semibold mb-3">Trading Performance</h3>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Profit</p>
              <p className={`text-lg font-bold ${(balance?.total_profit || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatEUR(balance?.total_profit || 0)}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="text-lg font-bold text-secondary">{(balance?.win_rate || 0).toFixed(1)}%</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
              <p className="text-lg font-bold">{balance?.total_trades || 0}</p>
            </Card>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
