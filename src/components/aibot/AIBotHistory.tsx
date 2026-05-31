import { useState } from "react";
import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Download, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AIBotTrade } from "@/services/aiBotService";
import { format } from "date-fns";

interface AIBotHistoryProps {
  trades: AIBotTrade[];
  onExportCSV: () => void;
}

export const AIBotHistory = ({ trades, onExportCSV }: AIBotHistoryProps) => {
  const [filter, setFilter] = useState<"all" | "profit" | "loss">("all");
  const [botFilter, setBotFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  const uniqueBots = [...new Set(trades.map(t => t.bot?.name).filter(Boolean))];

  const filteredTrades = trades.filter(trade => {
    if (filter === "profit" && trade.profit_loss <= 0) return false;
    if (filter === "loss" && trade.profit_loss > 0) return false;
    if (botFilter !== "all" && trade.bot?.name !== botFilter) return false;
    
    if (dateRange !== "all") {
      const tradeDate = new Date(trade.created_at || '');
      const now = new Date();
      if (dateRange === "today") {
        if (tradeDate.toDateString() !== now.toDateString()) return false;
      } else if (dateRange === "week") {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        if (tradeDate < weekAgo) return false;
      } else if (dateRange === "month") {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        if (tradeDate < monthAgo) return false;
      }
    }
    
    return true;
  });

  const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const winRate = filteredTrades.length > 0 
    ? (filteredTrades.filter(t => t.profit_loss > 0).length / filteredTrades.length * 100).toFixed(1)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            <h3 className="font-bold">AI Trading History</h3>
            <Badge variant="secondary">{filteredTrades.length} trades</Badge>
          </div>
          
          <Button variant="outline" size="sm" onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={botFilter} onValueChange={setBotFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Bot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bots</SelectItem>
              {uniqueBots.map(bot => (
                <SelectItem key={bot} value={bot!}>{bot}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[120px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="profit">Profit</SelectItem>
              <SelectItem value="loss">Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Trades</p>
            <p className="font-bold text-lg">{filteredTrades.length}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`font-bold text-lg ${totalProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {totalProfit >= 0 ? '+' : ''}€{totalProfit.toFixed(2)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-bold text-lg">{winRate}%</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Bot</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Investment</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No trades found
                </TableCell>
              </TableRow>
            ) : (
              filteredTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-mono text-sm">
                    {trade.created_at ? format(new Date(trade.created_at), 'MMM dd, HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{trade.bot?.name || 'AI Bot'}</TableCell>
                  <TableCell>{trade.trading_pair}</TableCell>
                  <TableCell>
                    <Badge variant={trade.trade_type === 'buy' ? 'default' : 'secondary'}>
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    €{trade.investment_amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {trade.profit_loss >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                      <span className={`font-mono ${trade.profit_loss >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        {trade.profit_loss >= 0 ? '+' : ''}€{trade.profit_loss.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={trade.status === 'closed' ? 'outline' : trade.status === 'active' ? 'default' : 'secondary'}
                    >
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};
