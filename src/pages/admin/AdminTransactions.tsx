import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  channel: string;
  balance_type: string;
  description: string | null;
  status: string;
  created_at: string;
  user_email?: string;
}

const channelColors: Record<string, string> = {
  ai_bot: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  quick_trade: "bg-secondary/20 text-secondary border-secondary/30",
  copy_trading: "bg-gold/20 text-gold border-gold/30",
  mt5_metals: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  crypto_trading: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  stock_investment: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  deposit: "bg-green-500/20 text-green-400 border-green-500/30",
  withdrawal: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchTransactions = async (limit: number = 20) => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      setTotalCount(count || 0);

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch user emails
      const userIds = [...new Set((data || []).map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const transactionsWithEmail = (data || []).map(t => ({
        ...t,
        user_email: emailMap.get(t.user_id) || 'Unknown',
      }));

      setTransactions(transactionsWithEmail);
      setVisibleCount(limit);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel = channelFilter === "all" || tx.channel === channelFilter;
    const matchesType = typeFilter === "all" || tx.transaction_type === typeFilter;
    return matchesSearch && matchesChannel && matchesType;
  });

  const uniqueChannels = [...new Set(transactions.map(t => t.channel))];
  const uniqueTypes = [...new Set(transactions.map(t => t.transaction_type))];

  const exportToCSV = () => {
    const headers = ["Date", "User", "Type", "Channel", "Amount", "Balance Type", "Status", "Description"];
    const rows = filteredTransactions.map((tx) => [
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
      tx.user_email || "",
      tx.transaction_type,
      tx.channel,
      tx.amount,
      tx.balance_type,
      tx.status,
      tx.description || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transaction Oversight</h1>
          <p className="text-muted-foreground">
            Monitor all platform transactions in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTransactions(visibleCount)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {uniqueChannels.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx, index) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-border"
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{tx.user_email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={channelColors[tx.channel] || "bg-muted text-muted-foreground"}>
                          {tx.channel.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {tx.transaction_type === 'credit' ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-destructive" />
                          )}
                          <span className="text-sm capitalize">{tx.transaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono font-medium ${
                          tx.transaction_type === 'credit' ? 'text-emerald-500' : 'text-destructive'
                        }`}>
                          {tx.transaction_type === 'credit' ? '+' : '-'}€{Math.abs(tx.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {transactions.length < totalCount && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {transactions.length} of {totalCount} transactions
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTransactions(visibleCount + 20)}
                disabled={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
