import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ChevronUp, ChevronDown, TrendingUp, TrendingDown, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QTTrade } from "@/pages/QuickTrade";
import { cn } from "@/lib/utils";

interface QTTradeHistoryProps {
  trades: QTTrade[];
  onViewAll: () => void;
}

const VISIBLE_TRADES = 10;

export const QTTradeHistory = ({ trades, onViewAll }: QTTradeHistoryProps) => {
  const [startIndex, setStartIndex] = useState(0);

  const visibleTrades = trades.slice(startIndex, startIndex + VISIBLE_TRADES);
  const canScrollUp = startIndex > 0;
  const canScrollDown = startIndex + VISIBLE_TRADES < trades.length;

  const handleScrollUp = () => {
    setStartIndex(prev => Math.max(0, prev - VISIBLE_TRADES));
  };

  const handleScrollDown = () => {
    setStartIndex(prev => Math.min(trades.length - VISIBLE_TRADES, prev + VISIBLE_TRADES));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="w-4 h-4" />
          Recent QT Trades
        </h3>
        <span className="text-xs text-muted-foreground">
          {trades.length} total
        </span>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No trade history yet
        </div>
      ) : (
        <>
          {/* Scroll Up Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 mb-2"
            onClick={handleScrollUp}
            disabled={!canScrollUp}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>

          {/* Trade List */}
          <div className="space-y-2 max-h-[400px] overflow-hidden">
            <AnimatePresence mode="popLayout">
              {visibleTrades.map((trade, index) => {
                const isWon = trade.status === "won";
                const isPositive = trade.pnl >= 0;

                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isWon ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-xs font-semibold",
                            trade.type === "BUY" ? "text-green-500" : "text-red-500"
                          )}>
                            {trade.type}
                          </span>
                          <span className="font-medium text-sm truncate">{trade.symbol}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>€{trade.amount}</span>
                          <span>•</span>
                          <span>{formatTime(trade.startTime)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded",
                        isWon ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {isWon ? "WON" : "LOST"}
                      </span>
                      <div className={cn(
                        "font-mono font-semibold text-sm flex items-center gap-1",
                        isPositive ? "text-green-500" : "text-red-500"
                      )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? "+" : ""}€{trade.pnl.toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Scroll Down Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 mt-2"
            onClick={handleScrollDown}
            disabled={!canScrollDown}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          {/* Position Indicator */}
          <div className="text-center text-xs text-muted-foreground mt-2">
            Showing {startIndex + 1}-{Math.min(startIndex + VISIBLE_TRADES, trades.length)} of {trades.length} trades
          </div>
        </>
      )}

      <Button
        variant="outline"
        className="w-full mt-3 text-sm gap-2"
        onClick={onViewAll}
      >
        <BarChart3 className="w-4 h-4" />
        View Complete QT Trade History
      </Button>
    </div>
  );
};
