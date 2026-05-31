import { motion } from "framer-motion";
import { 
  Wallet, Gift, Target, TrendingUp, TrendingDown, Bitcoin,
  ArrowRightLeft, Activity, Trophy, PiggyBank
} from "lucide-react";
import { formatEUR } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedBalance, CalculatedTotals, CryptoPrice } from "@/hooks/useUnifiedBalance";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnifiedBalanceCardsProps {
  balance: UnifiedBalance | null;
  totals: CalculatedTotals;
  cryptoPrices: CryptoPrice[];
  loading: boolean;
}

interface TradingStats {
  totalProfit: number;
  winRate: number;
  totalTrades: number;
}

export const UnifiedBalanceCards = ({
  balance,
  totals,
  cryptoPrices,
  loading,
}: UnifiedBalanceCardsProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TradingStats>({ totalProfit: 0, winRate: 0, totalTrades: 0 });

  // Calculate real stats from DB
  useEffect(() => {
    if (!balance?.user_id) return;
    const fetchStats = async () => {
      const { data: trades } = await supabase
        .from('platform_trades')
        .select('pnl, status')
        .eq('user_id', balance.user_id)
        .eq('status', 'closed');
      
      if (trades && trades.length > 0) {
        const totalProfit = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const wins = trades.filter(t => (t.pnl || 0) > 0).length;
        setStats({
          totalProfit,
          winRate: (wins / trades.length) * 100,
          totalTrades: trades.length,
        });
      }
    };
    fetchStats();
  }, [balance?.user_id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const fiatBalances = [
    { label: "Funding Balance", value: totals.fundingBalance, icon: Wallet, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "Trading Balance", value: totals.tradingBalance, icon: Activity, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "Bonus Balance", value: totals.bonusBalance, icon: Gift, color: "text-gold", bgColor: "bg-gold/10" },
    { label: "Challenges Balance", value: totals.challengesBalance, icon: Target, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  // Use the display properties (btc_balance, eth_balance, etc.) that we added to UnifiedBalance
  const cryptoBalances = [
    { symbol: "BTC", name: "Bitcoin", balance: balance?.btc_balance || 0, valueEUR: totals.btcValueEUR, change: cryptoPrices.find(p => p.symbol === 'BTC')?.change_24h || 0, color: "text-orange-500" },
    { symbol: "ETH", name: "Ethereum", balance: balance?.eth_balance || 0, valueEUR: totals.ethValueEUR, change: cryptoPrices.find(p => p.symbol === 'ETH')?.change_24h || 0, color: "text-purple-500" },
    { symbol: "USDT", name: "Tether", balance: balance?.usdt_balance || 0, valueEUR: totals.usdtValueEUR, change: cryptoPrices.find(p => p.symbol === 'USDT')?.change_24h || 0, color: "text-green-500" },
    { symbol: "LTC", name: "Litecoin", balance: balance?.litecoin_balance || 0, valueEUR: totals.ltcValueEUR, change: cryptoPrices.find(p => p.symbol === 'LTC')?.change_24h || 0, color: "text-gray-400" },
    { symbol: "BNB", name: "Binance", balance: balance?.bnb_balance || 0, valueEUR: totals.bnbValueEUR, change: cryptoPrices.find(p => p.symbol === 'BNB')?.change_24h || 0, color: "text-yellow-500" },
  ];

  const tradingMetrics = [
    { label: "Total Profit", value: formatEUR(stats.totalProfit), icon: Trophy, color: stats.totalProfit >= 0 ? "text-green-500" : "text-red-500" },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, icon: TrendingUp, color: "text-secondary" },
    { label: "Total Trades", value: stats.totalTrades.toString(), icon: Activity, color: "text-gold" },
  ];

  return (
    <div className="space-y-6">
      {/* Total Assets */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="p-8 bg-gradient-to-br from-secondary/20 to-gold/20 border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg text-muted-foreground mb-1">Total Assets</h3>
                <p className="text-5xl font-bold">{formatEUR(totals.totalAssets)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-8 h-8 text-gold" />
                {balance?.is_test_account && <Badge variant="outline" className="border-gold text-gold">Demo</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                {(balance?.today_pnl || 0) >= 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                <span className={`text-lg font-semibold ${(balance?.today_pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {(balance?.today_pnl || 0) >= 0 ? "+" : ""}{formatEUR(balance?.today_pnl || 0)}
                </span>
                <span className="text-muted-foreground">Today's P&L</span>
              </div>
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-purple-500" />
                <span className="text-lg font-semibold text-purple-400">{formatEUR(totals.cryptoValueEUR)}</span>
                <span className="text-muted-foreground">in Crypto</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => navigate('/deposit')}>Deposit</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/withdraw')}>Withdraw</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/transfer')}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />Transfer
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Fiat Balances */}
      <div className="grid gap-4 md:grid-cols-4">
        {fiatBalances.map((item, index) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 + 0.2 }}>
            <Card className="p-6 bg-card border-border hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
              <p className="text-2xl font-bold">{formatEUR(item.value)}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Crypto Wallets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-orange-500" />Crypto Wallets
          </h3>
          <Button size="sm" variant="outline" onClick={() => navigate('/swap')}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />Swap
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {cryptoBalances.map((crypto, index) => (
            <motion.div key={crypto.symbol} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 + 0.4 }}>
              <Card className="p-4 bg-card border-border hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${crypto.color}`}>{crypto.symbol}</span>
                  <span className={`text-xs ${crypto.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {crypto.change >= 0 ? "+" : ""}{crypto.change.toFixed(2)}%
                  </span>
                </div>
                <p className="text-lg font-semibold">{crypto.balance.toFixed(6)}</p>
                <p className="text-sm text-muted-foreground">≈ {formatEUR(crypto.valueEUR)}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Trading Metrics - from real data */}
      <div className="grid gap-4 md:grid-cols-3">
        {tradingMetrics.map((metric, index) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 + 0.5 }}>
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ✅ ADD DEFAULT EXPORT FOR THE COMPONENT
export default UnifiedBalanceCards;