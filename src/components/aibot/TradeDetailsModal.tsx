import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Clock, Bot, Activity, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AIBotTrade } from "@/services/aiBotService";
import { format, formatDistanceToNow } from "date-fns";

interface TradeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: AIBotTrade | null;
  currentPrice?: number;
  onEndTrade: () => void;
}

export const TradeDetailsModal = ({
  isOpen,
  onClose,
  trade,
  currentPrice,
  onEndTrade,
}: TradeDetailsModalProps) => {
  if (!trade) return null;

  const price = currentPrice || trade.entry_price;
  const profitLoss = (price - trade.entry_price) * (trade.trade_type === 'buy' ? 1 : -1);
  const profitLossPercent = (profitLoss / trade.entry_price) * 100;
  const isProfit = profitLoss >= 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-primary to-secondary/30 border-b border-border">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-card flex items-center justify-center">
                  <Bot className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{trade.bot?.name || 'AI Bot'}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{trade.trading_pair}</Badge>
                    <Badge variant={trade.trade_type === 'buy' ? 'default' : 'secondary'}>
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* P&L Display */}
              <div className={`rounded-xl p-6 text-center ${isProfit ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isProfit ? (
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  )}
                  <span className="text-sm font-medium">Current P&L</span>
                </div>
                <p className={`text-3xl font-bold ${isProfit ? 'text-emerald-500' : 'text-destructive'}`}>
                  {isProfit ? '+' : ''}€{(profitLoss * trade.investment_amount / trade.entry_price).toFixed(2)}
                </p>
                <p className={`text-sm ${isProfit ? 'text-emerald-500' : 'text-destructive'}`}>
                  {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
                </p>
              </div>

              {/* Trade Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
                  <p className="font-mono font-bold">${trade.entry_price.toFixed(4)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                  <p className="font-mono font-bold">${price.toFixed(4)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Investment</p>
                  <p className="font-bold">€{trade.investment_amount.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-bold">{formatDistanceToNow(new Date(trade.started_at))}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Trade Timeline
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <p className="text-sm">
                      Started: {format(new Date(trade.started_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <p className="text-sm">Active - Auto-trading in progress</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <Badge className="bg-secondary">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
                  Active
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={onEndTrade}
                  className="flex-1"
                >
                  End Trade Now
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
