import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Printer, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClosedTrade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  closePrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  openTime: Date;
  closeTime: Date;
}

interface MTFullHistoryProps {
  history: ClosedTrade[];
}

export const MTFullHistory = ({ history }: MTFullHistoryProps) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueSymbols = useMemo(() => {
    const symbols = [...new Set(history.map(t => t.symbol))];
    return ['all', ...symbols];
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(trade => {
      // Time filter
      const now = new Date();
      const tradeDate = new Date(trade.closeTime);
      
      if (filter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (tradeDate < today) return false;
      } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (tradeDate < weekAgo) return false;
      } else if (filter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (tradeDate < monthAgo) return false;
      }
      
      // Asset filter
      if (assetFilter !== 'all' && trade.symbol !== assetFilter) return false;
      
      // Result filter
      if (resultFilter === 'profit' && trade.pnl < 0) return false;
      if (resultFilter === 'loss' && trade.pnl >= 0) return false;
      
      return true;
    });
  }, [history, filter, assetFilter, resultFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const stats = useMemo(() => {
    const totalTrades = filteredHistory.length;
    const totalProfit = filteredHistory.reduce((sum, t) => sum + t.pnl, 0);
    const winningTrades = filteredHistory.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    return { totalTrades, totalProfit, winRate };
  }, [filteredHistory]);

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    const headers = ['Ticket', 'Time', 'Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'SL', 'TP', 'P/L'];
    const rows = filteredHistory.map(t => [
      t.id,
      formatDateTime(t.closeTime),
      t.symbol,
      t.type.toUpperCase(),
      t.volume,
      t.openPrice.toFixed(2),
      t.closePrice.toFixed(2),
      t.stopLoss?.toFixed(2) || '-',
      t.takeProfit?.toFixed(2) || '-',
      `€${t.pnl.toFixed(2)}`,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="h-full bg-[#2d2e33] border border-[#3c3f45] rounded flex flex-col">
      {/* Filters */}
      <div className="p-3 border-b border-[#3c3f45] flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-32 h-8 text-xs bg-[#1e1f22] border-[#3c3f45]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent className="bg-[#2d2e33] border-[#3c3f45]">
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assetFilter} onValueChange={setAssetFilter}>
          <SelectTrigger className="w-32 h-8 text-xs bg-[#1e1f22] border-[#3c3f45]">
            <SelectValue placeholder="Asset" />
          </SelectTrigger>
          <SelectContent className="bg-[#2d2e33] border-[#3c3f45]">
            {uniqueSymbols.map(symbol => (
              <SelectItem key={symbol} value={symbol}>
                {symbol === 'all' ? 'All Assets' : symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as typeof resultFilter)}>
          <SelectTrigger className="w-32 h-8 text-xs bg-[#1e1f22] border-[#3c3f45]">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent className="bg-[#2d2e33] border-[#3c3f45]">
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="profit">Profit Only</SelectItem>
            <SelectItem value="loss">Loss Only</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-[#1e1f22] border-[#3c3f45]"
            onClick={exportToCSV}
          >
            <Download className="w-3 h-3 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-[#1e1f22] border-[#3c3f45]"
            onClick={() => window.print()}
          >
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-3 border-b border-[#3c3f45] grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-[10px] text-gray-400 uppercase">Total Trades</div>
          <div className="text-lg font-bold text-white">{stats.totalTrades}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-400 uppercase">Total Profit</div>
          <div className={cn(
            "text-lg font-bold font-mono",
            stats.totalProfit >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {stats.totalProfit >= 0 ? '+' : ''}€{stats.totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-400 uppercase">Win Rate</div>
          <div className={cn(
            "text-lg font-bold",
            stats.winRate >= 50 ? "text-green-500" : "text-red-500"
          )}>
            {stats.winRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {paginatedHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
            No trade history found
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-[#1e1f22] sticky top-0">
              <tr className="text-gray-400 text-left">
                <th className="p-2">Ticket</th>
                <th className="p-2">Time</th>
                <th className="p-2">Symbol</th>
                <th className="p-2">Type</th>
                <th className="p-2">Volume</th>
                <th className="p-2">Open</th>
                <th className="p-2">Close</th>
                <th className="p-2">SL</th>
                <th className="p-2">TP</th>
                <th className="p-2">P/L</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c3f45]">
              {paginatedHistory.map((trade) => (
                <tr key={trade.id} className="hover:bg-[#363739]">
                  <td className="p-2 text-gray-400 font-mono">{trade.id}</td>
                  <td className="p-2 text-gray-400">{formatDateTime(trade.closeTime)}</td>
                  <td className="p-2 text-white font-medium">{trade.symbol}</td>
                  <td className="p-2">
                    <span className={cn(
                      "flex items-center gap-1",
                      trade.type === 'buy' ? "text-green-500" : "text-red-500"
                    )}>
                      {trade.type === 'buy' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 text-white">{trade.volume}</td>
                  <td className="p-2 text-white font-mono">{trade.openPrice.toFixed(2)}</td>
                  <td className="p-2 text-white font-mono">{trade.closePrice.toFixed(2)}</td>
                  <td className="p-2 text-red-400 font-mono">{trade.stopLoss?.toFixed(2) || '-'}</td>
                  <td className="p-2 text-green-400 font-mono">{trade.takeProfit?.toFixed(2) || '-'}</td>
                  <td className={cn(
                    "p-2 font-mono",
                    trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {trade.pnl >= 0 ? '+' : ''}€{trade.pnl.toFixed(2)}
                  </td>
                  <td className="p-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px]",
                      trade.pnl >= 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    )}>
                      {trade.pnl >= 0 ? 'WON' : 'LOST'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-2 border-t border-[#3c3f45] flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredHistory.length)} of {filteredHistory.length} trades
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
