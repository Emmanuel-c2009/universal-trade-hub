import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Copy, RotateCcw, X, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QTTrade } from "@/pages/QuickTrade";
import { cn } from "@/lib/utils";

interface QTActiveTradesProps {
  trades: QTTrade[];
  onDoubleUp: (tradeId: string) => void;
  onRollover: (tradeId: string) => void;
  onClose: (tradeId: string) => void;
}

export const QTActiveTrades = ({
  trades,
  onDoubleUp,
  onRollover,
  onClose,
}: QTActiveTradesProps) => {
  const [, forceUpdate] = useState(0);

  // Force re-render every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = new Date(endTime).getTime() - now.getTime();
    if (diff <= 0) return "0:00";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getProgress = (startTime: Date, endTime: Date) => {
    const now = new Date();
    const total = new Date(endTime).getTime() - new Date(startTime).getTime();
    const elapsed = now.getTime() - new Date(startTime).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const activeTrades = trades.filter(t => t.status === "active");

  if (activeTrades.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Active QT Trades
        </h3>
        <div className="text-center py-6 text-muted-foreground text-sm">
          No active trades
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Active QT Trades ({activeTrades.length})
      </h3>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        <AnimatePresence>
          {activeTrades.map((trade) => {
            const isPositive = trade.pnl >= 0;
            const progress = getProgress(trade.startTime, trade.endTime);

            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-muted/30 rounded-lg border border-border"
              >
                {/* Trade Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold",
                      trade.type === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    )}>
                      {trade.type}
                    </span>
                    <span className="font-semibold text-sm">{trade.symbol}</span>
                  </div>
                  <span className="font-mono text-sm">€{trade.amount}</span>
                </div>

                {/* P&L */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">P&L</span>
                  <span className={cn(
                    "font-mono font-semibold flex items-center gap-1",
                    isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? "+" : ""}€{trade.pnl.toFixed(2)}
                  </span>
                </div>

                {/* Time Remaining */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Time remaining</span>
                    <span className="font-mono font-semibold">{getTimeRemaining(trade.endTime)}</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => onDoubleUp(trade.id)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Double Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => onRollover(trade.id)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Rollover
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => onClose(trade.id)}
                  >
                    <X className="w-4 h-4" />
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
