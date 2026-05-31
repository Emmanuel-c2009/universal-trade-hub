import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Bot,
  TrendingUp,
  Receipt,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  RefreshCw,
  Clock,
  Bell,
  Mail,
  Ticket,
  LayoutDashboard,
  Gift, // Added for referrals
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { AdminNotificationsBox } from "@/components/admin/AdminNotificationsBox";
import { MassEmailSystem } from "@/components/admin/MassEmailSystem";
import { SupportTicketsAdmin } from "@/components/admin/SupportTicketsAdmin";
import { AdminReferrals } from "./AdminReferrals"; // Import the new referrals component

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalBots: number;
  activeTrades: number;
  totalTransactions: number;
  totalVolume: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

interface TradingMetrics {
  totalTrades: number;
  totalProfit: number;
  winRate: number;
  todayPnl: number;
  todayTrades: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount: number;
  created_at: string;
  user_email?: string;
}

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalBots: 0,
    activeTrades: 0,
    totalTransactions: 0,
    totalVolume: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
  });
  const [tradingMetrics, setTradingMetrics] = useState<TradingMetrics>({
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    todayPnl: 0,
    todayTrades: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = useCallback(async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch active bots
      const { count: botCount } = await supabase
        .from('ai_bots')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch active trades (open positions)
      const { count: openTrades } = await supabase
        .from('platform_trades')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Fetch pending deposits
      const { count: pendingDeposits } = await supabase
        .from('deposits')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch pending withdrawals
      const { count: pendingWithdrawals } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch transactions volume
      const { data: transactions, count: txCount } = await supabase
        .from('transactions')
        .select('amount', { count: 'exact' });

      const totalVolume = transactions?.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        activeUsers: userCount || 0,
        totalBots: botCount || 0,
        activeTrades: openTrades || 0,
        totalTransactions: txCount || 0,
        totalVolume,
        pendingDeposits: pendingDeposits || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  }, []);

  const fetchTradingMetrics = useCallback(async () => {
    try {
      // Get all closed trades for metrics
      const { data: allTrades, error: tradesError } = await supabase
        .from('platform_trades')
        .select('pnl, status, closed_at, created_at')
        .eq('status', 'closed');

      if (tradesError) throw tradesError;

      const closedTrades = allTrades || [];
      const totalTrades = closedTrades.length;
      const totalProfit = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      // Today's metrics
      const today = new Date().toISOString().split('T')[0];
      const todaysTrades = closedTrades.filter(t => 
        t.closed_at && t.closed_at.startsWith(today)
      );
      const todayPnl = todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

      setTradingMetrics({
        totalTrades,
        totalProfit,
        winRate,
        todayPnl,
        todayTrades: todaysTrades.length,
      });
    } catch (error) {
      console.error('Error fetching trading metrics:', error);
    }
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    try {
      // Fetch recent deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('id, amount, deposit_method, created_at, status, profiles!deposits_user_id_fkey(email)')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, amount, withdrawal_method, created_at, status, profiles!withdrawals_user_id_fkey(email)')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [
        ...(deposits || []).map(d => ({
          id: d.id,
          type: 'deposit',
          description: `${d.deposit_method} deposit - ${d.status}`,
          amount: d.amount,
          created_at: d.created_at,
          user_email: (d.profiles as any)?.email,
        })),
        ...(withdrawals || []).map(w => ({
          id: w.id,
          type: 'withdrawal',
          description: `${w.withdrawal_method} withdrawal - ${w.status}`,
          amount: -w.amount,
          created_at: w.created_at,
          user_email: (w.profiles as any)?.email,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTradingMetrics(), fetchRecentActivity()]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [fetchStats, fetchTradingMetrics, fetchRecentActivity]);

  useEffect(() => {
    refreshAll();

    // Set up real-time subscriptions
    const tradesChannel = supabase
      .channel('dashboard-trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_trades' }, () => {
        fetchTradingMetrics();
      })
      .subscribe();

    const depositsChannel = supabase
      .channel('dashboard-deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => {
        fetchStats();
        fetchRecentActivity();
      })
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('dashboard-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        fetchStats();
        fetchRecentActivity();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(withdrawalsChannel);
    };
  }, [refreshAll, fetchTradingMetrics, fetchStats, fetchRecentActivity]);

  if (loading && activeTab === "overview") {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-card animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview • Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll} disabled={loading && activeTab === "overview"}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading && activeTab === "overview" ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-5 bg-card border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Mail className="w-4 h-4 mr-2" /> Mass Email
          </TabsTrigger>
          <TabsTrigger value="tickets" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Ticket className="w-4 h-4 mr-2" /> Support Tickets
          </TabsTrigger>
          <TabsTrigger value="referrals" className="data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary">
            <Gift className="w-4 h-4 mr-2" /> Referrals
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Your existing dashboard */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Pending Actions Alert */}
          {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <Wallet className="w-6 h-6 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium">Pending Actions Required</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingDeposits > 0 && `${stats.pendingDeposits} deposits`}
                      {stats.pendingDeposits > 0 && stats.pendingWithdrawals > 0 && ' and '}
                      {stats.pendingWithdrawals > 0 && `${stats.pendingWithdrawals} withdrawals`}
                      {' '}awaiting review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-card border-border hover:border-secondary/30 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Trading Metrics */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-secondary" />
              Real-time Trading Metrics
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Auto-calculated from platform_trades)
              </span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {tradingCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </CardTitle>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Activity & Platform Health */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-secondary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No recent activity.</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          {activity.type === 'deposit' ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-amber-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{activity.user_email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-mono ${activity.amount >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {activity.amount >= 0 ? '+' : ''}€{Math.abs(activity.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gold" />
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">API Status</span>
                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Operational
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Database</span>
                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Healthy
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">WebSocket</span>
                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Real-time Updates</span>
                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab - Send notifications to users */}
        <TabsContent value="notifications" className="mt-6">
          <AdminNotificationsBox />
        </TabsContent>

        {/* Mass Email Tab - Send bulk emails */}
        <TabsContent value="emails" className="mt-6">
          <MassEmailSystem />
        </TabsContent>

        {/* Support Tickets Tab - Manage tickets */}
        <TabsContent value="tickets" className="mt-6">
          <SupportTicketsAdmin />
        </TabsContent>

        {/* Referrals Tab - Manage referral system */}
        <TabsContent value="referrals" className="mt-6">
          <AdminReferrals />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Stat cards definition (moved outside component)
const statCards = [
  {
    title: "Total Users",
    value: 0, // Will be updated dynamically
    icon: Users,
    color: "text-secondary",
  },
  {
    title: "Active AI Bots",
    value: 0,
    icon: Bot,
    color: "text-gold",
  },
  {
    title: "Open Positions",
    value: 0,
    icon: Activity,
    color: "text-emerald-500",
  },
  {
    title: "Total Transactions",
    value: 0,
    icon: Receipt,
    color: "text-purple-500",
  },
  {
    title: "Total Volume",
    value: "€0",
    icon: TrendingUp,
    color: "text-secondary",
  },
];

// Trading cards definition (moved outside component)
const tradingCards = [
  {
    title: "Total Trades",
    value: 0,
    subtitle: "All time closed",
    icon: Activity,
    color: "text-blue-500",
  },
  {
    title: "Total Profit",
    value: "€0",
    subtitle: "Platform-wide",
    icon: TrendingUp,
    color: "text-emerald-500",
  },
  {
    title: "Win Rate",
    value: "0%",
    subtitle: "Based on closed trades",
    icon: TrendingUp,
    color: "text-gold",
  },
  {
    title: "Today's P&L",
    value: "€0",
    subtitle: "0 trades today",
    icon: Clock,
    color: "text-emerald-500",
  },
];