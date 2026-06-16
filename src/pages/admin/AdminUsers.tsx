import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Eye,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { UserEditModal } from "@/components/admin/UserEditModal";

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
};

interface UserBalance {
  // EUR balances
  funding_balance: number;
  main_balance: number;
  trading_balance: number;
  bonus_balance: number;
  challenges_balance: number;
  balance_eur: number;
  total_balance: number;
  is_test_account: boolean;
  // Crypto balances (from user_wallet_balances)
  usd_balance: number;
  btc_balance: number;
  eth_balance: number;
  ltc_balance: number;
  bnb_balance: number;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  profile_status: string | null;
  created_at: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  balances?: UserBalance | null;
  stats?: {
    total_trades: number;
    winning_trades: number;
    total_profit: number;
    win_rate: number;
  };
}

interface PlatformStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  verifiedUsers: number;
}

const USERS_PER_PAGE = 20;

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    verifiedUsers: 0,
  });
  const { toast } = useToast();

  const fetchPlatformStats = useCallback(async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('profile_status', 'verified');

      const weekAgo = subDays(new Date(), 7).toISOString();
      const { count: newThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      const todayStart = new Date().toISOString().split('T')[0];
      const { data: activeTrades } = await supabase
        .from('platform_trades')
        .select('user_id')
        .gte('created_at', todayStart);

      const activeUserIds = new Set(activeTrades?.map(t => t.user_id) || []);

      setPlatformStats({
        totalUsers: totalUsers || 0,
        activeToday: activeUserIds.size,
        newThisWeek: newThisWeek || 0,
        verifiedUsers: verifiedUsers || 0,
      });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * USERS_PER_PAGE;
      const to = from + USERS_PER_PAGE - 1;

      let query = supabase
        .from('profiles')
        .select('id, email, full_name, profile_status, created_at, phone, country, city, address', { count: 'exact' });

      if (statusFilter !== "all") {
        query = query.eq('profile_status', statusFilter);
      }

      const { data: profiles, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setTotalCount(count || 0);

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map(p => p.id);
      
      // Fetch EUR balances from user_balances
      const { data: balances, error: balancesError } = await supabase
        .from('user_balances')
        .select('user_id, funding_balance, trading_balance, bonus_balance, challenges_balance, total_balance, main_balance, balance_eur')
        .in('user_id', userIds);

      if (balancesError) {
        console.error('Balance fetch error:', balancesError);
      }

      // Fetch crypto balances from user_wallet_balances (PHASE 2)
      const { data: cryptoBalances, error: cryptoError } = await supabase
        .from('user_wallet_balances')
        .select('user_id, usd_balance, btc_balance, eth_balance, ltc_balance, bnb_balance')
        .in('user_id', userIds);

      if (cryptoError) {
        console.error('Crypto fetch error:', cryptoError);
      }

      // Create maps for quick lookup
      const balanceMap = new Map();
      if (balances) {
        balances.forEach(b => {
          balanceMap.set(b.user_id, b);
        });
      }

      const cryptoMap = new Map();
      if (cryptoBalances) {
        cryptoBalances.forEach(c => {
          cryptoMap.set(c.user_id, c);
        });
      }

      const usersWithBalances = profiles.map(profile => {
        const userBalance = balanceMap.get(profile.id);
        const userCrypto = cryptoMap.get(profile.id);
        
        return {
          ...profile,
          balances: {
            // EUR balances
            funding_balance: userBalance ? toNumber(userBalance.funding_balance) : 0,
            main_balance: userBalance ? toNumber(userBalance.main_balance) : 0,
            trading_balance: userBalance ? toNumber(userBalance.trading_balance) : 0,
            bonus_balance: userBalance ? toNumber(userBalance.bonus_balance) : 0,
            challenges_balance: userBalance ? toNumber(userBalance.challenges_balance) : 0,
            total_balance: userBalance ? toNumber(userBalance.total_balance) : 0,
            balance_eur: userBalance ? toNumber(userBalance.balance_eur) : 0,
            is_test_account: false,
            // Crypto balances (from user_wallet_balances)
            usd_balance: userCrypto ? toNumber(userCrypto.usd_balance) : 0,
            btc_balance: userCrypto ? toNumber(userCrypto.btc_balance) : 0,
            eth_balance: userCrypto ? toNumber(userCrypto.eth_balance) : 0,
            ltc_balance: userCrypto ? toNumber(userCrypto.ltc_balance) : 0,
            bnb_balance: userCrypto ? toNumber(userCrypto.bnb_balance) : 0,
          },
        };
      });

      setUsers(usersWithBalances);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
    fetchPlatformStats();
  }, [fetchUsers, fetchPlatformStats]);

  const fetchUserStats = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: userId });
      if (error) throw error;
      return data?.[0] || { total_trades: 0, winning_trades: 0, total_profit: 0, win_rate: 0 };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { total_trades: 0, winning_trades: 0, total_profit: 0, win_rate: 0 };
    }
  };

  const handleViewUser = async (user: UserProfile) => {
    // Fetch EUR balances
    const { data: freshBalances, error: balancesError } = await supabase
      .from('user_balances')
      .select('funding_balance, main_balance, trading_balance, bonus_balance, challenges_balance, total_balance, balance_eur')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Fetch crypto balances
    const { data: cryptoBalances, error: cryptoError } = await supabase
      .from('user_wallet_balances')
      .select('usd_balance, btc_balance, eth_balance, ltc_balance, bnb_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    
    let balanceData = {
      funding_balance: 0,
      main_balance: 0,
      trading_balance: 0,
      bonus_balance: 0,
      challenges_balance: 0,
      total_balance: 0,
      balance_eur: 0,
      is_test_account: false,
      usd_balance: 0,
      btc_balance: 0,
      eth_balance: 0,
      ltc_balance: 0,
      bnb_balance: 0,
    };
    
    if (freshBalances) {
      balanceData = {
        ...balanceData,
        funding_balance: toNumber(freshBalances.funding_balance),
        main_balance: toNumber(freshBalances.main_balance),
        trading_balance: toNumber(freshBalances.trading_balance),
        bonus_balance: toNumber(freshBalances.bonus_balance),
        challenges_balance: toNumber(freshBalances.challenges_balance),
        total_balance: toNumber(freshBalances.total_balance),
        balance_eur: toNumber(freshBalances.balance_eur),
      };
    }
    
    if (cryptoBalances) {
      balanceData = {
        ...balanceData,
        usd_balance: toNumber(cryptoBalances.usd_balance),
        btc_balance: toNumber(cryptoBalances.btc_balance),
        eth_balance: toNumber(cryptoBalances.eth_balance),
        ltc_balance: toNumber(cryptoBalances.ltc_balance),
        bnb_balance: toNumber(cryptoBalances.bnb_balance),
      };
    }
    
    const stats = await fetchUserStats(user.id);
    
    setSelectedUser({ 
      ...user, 
      balances: balanceData,
      stats 
    });
    setDetailModalOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-gold/20 text-gold border-gold/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircle className="w-3 h-3 mr-1" />
            Unverified
          </Badge>
        );
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Email",
      "Full Name",
      "Status",
      "Country",
      "Funding Balance (€)",
      "BTC Balance",
      "ETH Balance",
      "USDT Balance",
      "Total Balance",
      "Created At",
    ];
    const rows = filteredUsers.map((user) => [
      user.id,
      user.email || "",
      user.full_name || "",
      user.profile_status || "unverified",
      user.country || "",
      user.balances?.funding_balance || 0,
      user.balances?.btc_balance || 0,
      user.balances?.eth_balance || 0,
      user.balances?.usd_balance || 0,
      user.balances?.total_balance || 0,
      user.created_at || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredUsers.length} users to CSV`,
    });
  };

  const getTotalBalance = (user: UserProfile) => {
    return user.balances?.total_balance || 0;
  };

  const forceRefresh = async () => {
    setLoading(true);
    await fetchUsers();
    toast({
      title: "Refreshed",
      description: "User data has been refreshed",
    });
  };

  // Format crypto display
  const formatCrypto = (value: number) => {
    if (value === 0) return '0';
    if (value < 0.000001) return value.toFixed(8);
    if (value < 0.001) return value.toFixed(6);
    return value.toFixed(4);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-secondary" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            {totalCount} registered users • Manage accounts, balances, and verification
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={forceRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Force Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{platformStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold text-emerald-500">{platformStats.activeToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gold" />
              <div>
                <p className="text-sm text-muted-foreground">New This Week</p>
                <p className="text-2xl font-bold text-gold">{platformStats.newThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-blue-500">{platformStats.verifiedUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Funding (€)</TableHead>
                  <TableHead>BTC</TableHead>
                  <TableHead>ETH</TableHead>
                  <TableHead>USDT</TableHead>
                  <TableHead>Total Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name || "N/A"}</span>
                          <span className="text-sm text-muted-foreground">{user.email}</span>
                          <code className="text-xs text-muted-foreground mt-0.5">
                            {user.id.slice(0, 8)}...
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.profile_status)}</TableCell>
                      <TableCell>
                        <span className="font-mono font-medium text-gold">
                          €{(user.balances?.funding_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-orange-500">
                        {formatCrypto(user.balances?.btc_balance || 0)}
                      </TableCell>
                      <TableCell className="font-mono text-blue-400">
                        {formatCrypto(user.balances?.eth_balance || 0)}
                      </TableCell>
                      <TableCell className="font-mono text-green-400">
                        €{(user.balances?.usd_balance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-emerald-500">
                          €{getTotalBalance(user).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.created_at
                          ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * USERS_PER_PAGE) + 1} to{" "}
                {Math.min(currentPage * USERS_PER_PAGE, totalCount)} of {totalCount} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal with Crypto */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              User Profile Details
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedUser.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{selectedUser.id}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedUser.profile_status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedUser.country || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{selectedUser.city || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {selectedUser.created_at
                      ? format(new Date(selectedUser.created_at), "PPpp")
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* EUR Balances */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  EUR Balances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Funding (Cash)</p>
                    <p className="text-lg font-bold text-gold">
                      €{(selectedUser.balances?.funding_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Trading (Active)</p>
                    <p className="text-lg font-bold">
                      €{(selectedUser.balances?.trading_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Bonus</p>
                    <p className="text-lg font-bold">
                      €{(selectedUser.balances?.bonus_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Challenges</p>
                    <p className="text-lg font-bold">
                      €{(selectedUser.balances?.challenges_balance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Crypto Balances (Phase 2) */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Crypto Balances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">USDT (€)</p>
                    <p className="text-lg font-bold text-green-400">
                      €{(selectedUser.balances?.usd_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">BTC</p>
                    <p className="text-lg font-bold text-orange-500">
                      {formatCrypto(selectedUser.balances?.btc_balance || 0)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">ETH</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatCrypto(selectedUser.balances?.eth_balance || 0)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">LTC</p>
                    <p className="text-lg font-bold text-gray-400">
                      {formatCrypto(selectedUser.balances?.ltc_balance || 0)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">BNB</p>
                    <p className="text-lg font-bold text-yellow-500">
                      {formatCrypto(selectedUser.balances?.bnb_balance || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Balance */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Total Balance (EUR + Crypto)</p>
                <p className="text-2xl font-bold text-emerald-500">
                  €{getTotalBalance(selectedUser).toLocaleString()}
                </p>
              </div>

              {/* Trading Stats */}
              <div>
                <h3 className="font-semibold mb-3">Trading Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Trades</p>
                    <p className="text-lg font-bold">{selectedUser.stats?.total_trades || 0}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-bold text-emerald-500">
                      {(selectedUser.stats?.win_rate || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Profit</p>
                    <p className={`text-lg font-bold ${(selectedUser.stats?.total_profit || 0) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      €{(selectedUser.stats?.total_profit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Winning Trades</p>
                    <p className="text-lg font-bold">{selectedUser.stats?.winning_trades || 0}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button onClick={() => {
                  setDetailModalOpen(false);
                  handleEditUser(selectedUser);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </Button>
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedUser && (
        <UserEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSave={fetchUsers}
        />
      )}
    </div>
  );
};