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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { UserEditModal } from "@/components/admin/UserEditModal";

interface UserBalance {
  main_balance: number;
  trading_balance: number;
  litecoin_balance: number;
  bonus_balance: number;
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  bnb_balance: number;
  funding_balance: number; // Added to fix TypeScript error
  is_test_account: boolean;
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
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Verified users
      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('profile_status', 'verified');

      // New this week
      const weekAgo = subDays(new Date(), 7).toISOString();
      const { count: newThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Active today (users with recent transactions or trades)
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
      // Get total count for pagination
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setTotalCount(count || 0);

      // Fetch paginated profiles
      const from = (currentPage - 1) * USERS_PER_PAGE;
      const to = from + USERS_PER_PAGE - 1;

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Fetch all balances in one query
      const userIds = (profiles || []).map(p => p.id);
      const { data: balances } = await supabase
        .from('user_balances')
        .select('*')
        .in('user_id', userIds);

      // Map balances to users
      const usersWithBalances = (profiles || []).map(profile => ({
        ...profile,
        balances: balances?.find(b => b.user_id === profile.id) || null,
      }));

      setUsers(usersWithBalances);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Make sure you have admin access.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, toast]);

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
    const stats = await fetchUserStats(user.id);
    setSelectedUser({ ...user, stats });
    setDetailModalOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || user.profile_status === statusFilter;
    return matchesSearch && matchesStatus;
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
      "Main Balance",
      "Trading Balance",
      "BTC Balance",
      "ETH Balance",
      "USDT Balance",
      "Created At",
    ];
    const rows = filteredUsers.map((user) => [
      user.id,
      user.email || "",
      user.full_name || "",
      user.profile_status || "unverified",
      user.country || "",
      user.balances?.main_balance || 0,
      user.balances?.trading_balance || 0,
      user.balances?.btc_balance || 0,
      user.balances?.eth_balance || 0,
      user.balances?.usdt_balance || 0,
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
    if (!user.balances) return 0;
    return (
      (user.balances.main_balance || 0) +
      (user.balances.trading_balance || 0) +
      (user.balances.bonus_balance || 0)
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Filters */}
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

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Main Balance</TableHead>
                  <TableHead>Trading Balance</TableHead>
                  <TableHead>Total Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                          {user.balances?.is_test_account && (
                            <Badge variant="outline" className="w-fit mt-1 text-xs text-gold border-gold/30">
                              Test Account
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.profile_status)}</TableCell>
                      <TableCell>
                        <span className="font-mono">
                          €{(user.balances?.main_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          €{(user.balances?.trading_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium text-secondary">
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

          {/* Pagination */}
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

      {/* User Detail Modal */}
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

              {/* Balances */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Account Balances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Main Balance</p>
                    <p className="text-lg font-bold">
                      €{(selectedUser.balances?.main_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Trading Balance</p>
                    <p className="text-lg font-bold">
                      €{(selectedUser.balances?.trading_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Bonus Balance</p>
                    <p className="text-lg font-bold">
                      €{(selectedUser.balances?.bonus_balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">BTC Balance</p>
                    <p className="text-lg font-bold">
                      {(selectedUser.balances?.btc_balance || 0).toFixed(8)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">ETH Balance</p>
                    <p className="text-lg font-bold">
                      {(selectedUser.balances?.eth_balance || 0).toFixed(8)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">USDT Balance</p>
                    <p className="text-lg font-bold">
                      {(selectedUser.balances?.usdt_balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">LTC Balance</p>
                    <p className="text-lg font-bold">
                      {(selectedUser.balances?.litecoin_balance || 0).toFixed(8)}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">BNB Balance</p>
                    <p className="text-lg font-bold">
                      {(selectedUser.balances?.bnb_balance || 0).toFixed(8)}
                    </p>
                  </div>
                </div>
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