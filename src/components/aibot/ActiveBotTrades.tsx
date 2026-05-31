import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, XCircle, Eye, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AIBotTrade } from "@/services/aiBotService";
import { formatDistanceToNow } from "date-fns";

interface ActiveBotTradesProps {
  trades: AIBotTrade[];
  onEndTrade: (tradeId: string) => void;
  onViewDetails: (trade: AIBotTrade) => void;
}

export const ActiveBotTrades = ({ trades, onEndTrade, onViewDetails }: ActiveBotTradesProps) => {
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrices(prev => {
        const newPrices = { ...prev };
        trades.forEach(trade => {
          const change = (Math.random() - 0.45) * 0.01;
          newPrices[trade.id] = (prev[trade.id] || trade.entry_price) * (1 + change);
        });
        return newPrices;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">No Active Trades</h3>
        <p className="text-sm text-muted-foreground">
          Subscribe to an AI bot to start automated trading
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-secondary" />
          Active AI Trades ({trades.length})
        </h3>
        <Badge variant="secondary" className="animate-pulse">
          Live
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {trades.map((trade) => {
            const currentPrice = currentPrices[trade.id] || trade.entry_price;
            const profitLoss = (currentPrice - trade.entry_price) * (trade.trade_type === 'buy' ? 1 : -1);
            const profitLossPercent = (profitLoss / trade.entry_price) * 100;
            const isProfit = profitLoss >= 0;

            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                className="bg-card border border-border rounded-xl p-4 hover:border-accent/30 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {trade.bot?.name?.charAt(0) || 'AI'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{trade.bot?.name || 'AI Bot'}</p>
                      <p className="text-xs text-muted-foreground">{trade.trading_pair}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    <Badge variant="outline" className="text-xs">
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Price Info */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Entry Price</p>
                    <p className="font-mono">${trade.entry_price.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Current Price</p>
                    <p className="font-mono">${currentPrice.toFixed(4)}</p>
                  </div>
                </div>

                {/* P&L */}
                <div className={`rounded-lg p-3 mb-3 ${isProfit ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium">P&L</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isProfit ? 'text-emerald-500' : 'text-destructive'}`}>
                        {isProfit ? '+' : ''}€{(profitLoss * trade.investment_amount / trade.entry_price).toFixed(2)}
                      </p>
                      <p className={`text-xs ${isProfit ? 'text-emerald-500' : 'text-destructive'}`}>
                        {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Investment & Duration */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <span>Investment: €{trade.investment_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(trade.started_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onViewDetails(trade)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEndTrade(trade.id)}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    End Trade
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
