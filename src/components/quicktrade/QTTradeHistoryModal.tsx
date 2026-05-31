import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Printer, BarChart3, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QTTrade } from "@/pages/QuickTrade";
import { cn } from "@/lib/utils";

interface QTTradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: QTTrade[];
}

const TRADES_PER_PAGE = 10;

export const QTTradeHistoryModal = ({ isOpen, onClose, trades }: QTTradeHistoryModalProps) => {
  const [periodFilter, setPeriodFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      // Period filter
      if (periodFilter !== "all") {
        const tradeDate = new Date(trade.startTime);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 86400000);
        const weekAgo = new Date(today.getTime() - 7 * 86400000);
        const monthAgo = new Date(today.getTime() - 30 * 86400000);

        if (periodFilter === "today" && tradeDate < today) return false;
        if (periodFilter === "yesterday" && (tradeDate < yesterday || tradeDate >= today)) return false;
        if (periodFilter === "week" && tradeDate < weekAgo) return false;
        if (periodFilter === "month" && tradeDate < monthAgo) return false;
      }

      // Result filter
      if (resultFilter === "won" && trade.status !== "won") return false;
      if (resultFilter === "lost" && trade.status !== "lost") return false;

      // Asset filter (category-based)
      if (assetFilter !== "all") {
        const symbol = trade.symbol.toLowerCase();
        if (assetFilter === "forex" && !symbol.includes("/")) return false;
        if (assetFilter === "crypto" && !["btc", "eth", "bnb", "sol", "xrp", "ada", "doge", "dot", "link", "uni", "shib", "pepe"].some(c => symbol.includes(c))) return false;
        if (assetFilter === "stocks" && symbol.includes("/")) return false;
      }

      return true;
    });
  }, [trades, periodFilter, assetFilter, resultFilter]);

  const totalPages = Math.ceil(filteredTrades.length / TRADES_PER_PAGE);
  const paginatedTrades = filteredTrades.slice(
    currentPage * TRADES_PER_PAGE,
    (currentPage + 1) * TRADES_PER_PAGE
  );

  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winCount = filteredTrades.filter(t => t.status === "won").length;
  const winRate = filteredTrades.length > 0 ? (winCount / filteredTrades.length * 100).toFixed(1) : "0";

  const handleExportCSV = () => {
    const headers = ["Asset", "Type", "Amount", "Entry Price", "Status", "P/L", "Date", "Time"];
    const rows = filteredTrades.map(t => [
      t.symbol,
      t.type,
      t.amount.toFixed(2),
      t.entryPrice.toFixed(2),
      t.status.toUpperCase(),
      t.pnl.toFixed(2),
      new Date(t.startTime).toLocaleDateString(),
      new Date(t.startTime).toLocaleTimeString()
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qt-trade-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              QT Trade History
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="forex">Forex</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="stocks">Stocks</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="won">Won Only</SelectItem>
                <SelectItem value="lost">Lost Only</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="p-4 border-b border-border grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredTrades.length}</div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", totalPnL >= 0 ? "text-green-500" : "text-red-500")}>
                {totalPnL >= 0 ? "+" : ""}€{totalPnL.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total P/L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{winRate}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          </div>

          {/* Trade Table */}
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Asset</th>
                  <th className="text-left p-3 text-sm font-semibold">Type</th>
                  <th className="text-right p-3 text-sm font-semibold">Amount</th>
                  <th className="text-right p-3 text-sm font-semibold">Entry</th>
                  <th className="text-center p-3 text-sm font-semibold">Status</th>
                  <th className="text-right p-3 text-sm font-semibold">P/L</th>
                  <th className="text-right p-3 text-sm font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrades.map((trade, index) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="p-3">
                      <div className="font-medium">{trade.symbol}</div>
                    </td>
                    <td className="p-3">
                      <div className={cn(
                        "flex items-center gap-1 font-semibold",
                        trade.type === "BUY" ? "text-green-500" : "text-red-500"
                      )}>
                        {trade.type === "BUY" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {trade.type}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">€{trade.amount.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">${trade.entryPrice.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-semibold",
                        trade.status === "won" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {trade.status.toUpperCase()}
                      </span>
                    </td>
                    <td className={cn(
                      "p-3 text-right font-mono font-semibold",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {trade.pnl >= 0 ? "+" : ""}€{trade.pnl.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-sm">
                      <div>{new Date(trade.startTime).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{new Date(trade.startTime).toLocaleTimeString()}</div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {currentPage * TRADES_PER_PAGE + 1}-{Math.min((currentPage + 1) * TRADES_PER_PAGE, filteredTrades.length)} of {filteredTrades.length} trades
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
