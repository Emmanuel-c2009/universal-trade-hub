import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Clock, History, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QTAsset, QTTrade } from "@/pages/QuickTrade";
import { cn, formatEUR } from "@/lib/utils";

interface QTDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assets: QTAsset[];
  selectedAsset: QTAsset | null;
  onSelectAsset: (asset: QTAsset) => void;
  prices: Record<string, number>;
  activeTrades: QTTrade[];
  tradeHistory: QTTrade[];
  onCloseTrade: (tradeId: string) => void;
}

const categories = ["all", "crypto", "forex", "stocks", "indices", "commodities"];

export const QTDrawer = ({
  isOpen, onClose, assets, selectedAsset, onSelectAsset,
  prices, activeTrades, tradeHistory, onCloseTrade
}: QTDrawerProps) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [, forceUpdate] = useState(0);

  // Force re-render for countdown
  useEffect(() => {
    if (activeTrades.length === 0) return;
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTrades.length]);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "all" || a.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [assets, search, activeCategory]);

  const getTimeRemaining = (endTime: Date) => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "0:00";
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getProgress = (start: Date, end: Date) => {
    const total = new Date(end).getTime() - new Date(start).getTime();
    const elapsed = Date.now() - new Date(start).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[320px] max-w-[85vw] bg-card border-r border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg">Quick Trade</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Search Assets */}
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search QT Assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="flex gap-1 flex-wrap mb-3">
                    {categories.map(cat => (
                      <Button
                        key={cat}
                        variant={activeCategory === cat ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs capitalize"
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-1 max-h-[250px] overflow-y-auto">
                    {filtered.slice(0, 20).map(asset => {
                      const currentPrice = prices[asset.symbol] || asset.price;
                      const isSelected = selectedAsset?.id === asset.id;
                      return (
                        <button
                          key={asset.id}
                          onClick={() => onSelectAsset(asset)}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors",
                            isSelected ? "bg-secondary/20 border border-secondary" : "hover:bg-muted/50"
                          )}
                        >
                          <div>
                            <span className="font-semibold text-sm">{asset.symbol}</span>
                            <span className="text-xs text-muted-foreground ml-2">{asset.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm">€{currentPrice > 1000 ? currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 }) : currentPrice < 1 ? currentPrice.toFixed(6) : currentPrice.toFixed(2)}</div>
                            <span className={cn("text-xs", asset.changePercent >= 0 ? "text-green-500" : "text-red-500")}>
                              {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active QT Trades */}
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4" />
                    Active QT Trades ({activeTrades.filter(t => t.status === "active").length})
                  </h3>
                  {activeTrades.filter(t => t.status === "active").length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No active trades</p>
                  ) : (
                    <div className="space-y-2">
                      {activeTrades.filter(t => t.status === "active").map(trade => (
                        <div key={trade.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("px-1.5 py-0.5 rounded text-xs font-bold", trade.type === "BUY" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                                {trade.type}
                              </span>
                              <span className="font-semibold text-sm">{trade.symbol}</span>
                            </div>
                            <span className="font-mono text-sm">{formatEUR(trade.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between mb-1 text-xs">
                            <span className="text-muted-foreground">Entry: €{trade.entryPrice.toFixed(2)}</span>
                            <span className="text-muted-foreground">Now: €{trade.currentPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Time</span>
                            <span className="font-mono text-xs font-semibold">{getTimeRemaining(trade.endTime)}</span>
                          </div>
                          <Progress value={getProgress(trade.startTime, trade.endTime)} className="h-1 mb-2" />
                          <div className="flex items-center justify-between">
                            <span className={cn("font-mono text-sm font-semibold", trade.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                              {trade.pnl >= 0 ? "+" : ""}{formatEUR(trade.pnl)}
                            </span>
                            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onCloseTrade(trade.id)}>
                              Close
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent QT Trades */}
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <History className="w-4 h-4" />
                    Recent QT Trades
                  </h3>
                  {tradeHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No trade history</p>
                  ) : (
                    <div className="space-y-1">
                      {tradeHistory.slice(0, 10).map(trade => (
                        <div key={trade.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            {trade.status === "won" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            <div>
                              <div className="flex items-center gap-1">
                                <span className={cn("text-xs font-semibold", trade.type === "BUY" ? "text-green-500" : "text-red-500")}>{trade.type}</span>
                                <span className="text-sm font-medium">{trade.symbol}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatTime(trade.startTime)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", trade.status === "won" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                              {trade.status === "won" ? "WON" : "LOST"}
                            </span>
                            <div className={cn("font-mono text-xs", trade.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                              {trade.pnl >= 0 ? "+" : ""}{formatEUR(trade.pnl)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
