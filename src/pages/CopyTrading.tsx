import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { CopyTradingLoader } from "@/components/copytrading/CopyTradingLoader";
import { ExpertCard } from "@/components/copytrading/ExpertCard";
import { ActiveSessions } from "@/components/copytrading/ActiveSessions";
import { SessionModal } from "@/components/copytrading/SessionModal";
import { ExpertProfileModal } from "@/components/copytrading/ExpertProfileModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, AlertTriangle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCopyTradingSession } from "@/hooks/useCopyTradingSession";
import { toast } from "sonner";

export interface Expert {
  id: string;
  name: string;
  avatar: string;
  focus: string;
  winRate: number;
  totalProfit: number;
  followers: number;
  minInvestment: number;
  riskLevel: "Low" | "Medium" | "High";
  tradingStyle: string;
  description: string;
  favoriteAssets: string[];
  monthlyReturn: number;
  isActive: boolean;
}

export interface CopySession {
  id: string;
  expertId: string;
  expertName: string;
  investment: number;
  duration: number; // in hours
  startTime: Date;
  currentProfit: number;
  status: "active" | "completed" | "stopped";
}

// Simulated expert data
const EXPERTS: Expert[] = [
  {
    id: "1",
    name: "Adriano Mendes",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    focus: "Forex",
    winRate: 78.5,
    totalProfit: 124500,
    followers: 2847,
    minInvestment: 50,
    riskLevel: "Medium",
    tradingStyle: "Swing Trading",
    description: "Professional forex trader with 8+ years experience. Specializing in EUR/USD and GBP/USD pairs with consistent monthly returns.",
    favoriteAssets: ["EUR/USD", "GBP/USD", "USD/JPY"],
    monthlyReturn: 12.4,
    isActive: true,
  },
  {
    id: "2",
    name: "Sarah Chen",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    focus: "Crypto",
    winRate: 82.3,
    totalProfit: 287000,
    followers: 4521,
    minInvestment: 100,
    riskLevel: "High",
    tradingStyle: "Day Trading",
    description: "Crypto specialist focused on BTC and ETH. Uses technical analysis and on-chain metrics for high-probability setups.",
    favoriteAssets: ["BTC/USD", "ETH/USD", "SOL/USD"],
    monthlyReturn: 18.7,
    isActive: true,
  },
  {
    id: "3",
    name: "Marcus Weber",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    focus: "Stocks",
    winRate: 71.2,
    totalProfit: 89400,
    followers: 1923,
    minInvestment: 75,
    riskLevel: "Low",
    tradingStyle: "Position Trading",
    description: "Value investor focusing on blue-chip stocks and dividend plays. Low-risk approach with steady returns.",
    favoriteAssets: ["AAPL", "MSFT", "GOOGL"],
    monthlyReturn: 8.2,
    isActive: true,
  },
  {
    id: "4",
    name: "Elena Volkov",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    focus: "Metals",
    winRate: 75.8,
    totalProfit: 156700,
    followers: 3156,
    minInvestment: 60,
    riskLevel: "Medium",
    tradingStyle: "Scalping",
    description: "Gold and silver specialist with focus on quick scalping trades during high volatility periods.",
    favoriteAssets: ["XAUUSD", "XAGUSD", "XPTUSD"],
    monthlyReturn: 14.3,
    isActive: true,
  },
  {
    id: "5",
    name: "James O'Connor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    focus: "Indices",
    winRate: 69.4,
    totalProfit: 67800,
    followers: 1456,
    minInvestment: 100,
    riskLevel: "Medium",
    tradingStyle: "Swing Trading",
    description: "Index trader focusing on S&P 500 and NASDAQ. Uses macro analysis for trend identification.",
    favoriteAssets: ["SP500", "US100", "DJI30"],
    monthlyReturn: 9.8,
    isActive: true,
  },
  {
    id: "6",
    name: "Yuki Tanaka",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop",
    focus: "Crypto",
    winRate: 85.1,
    totalProfit: 412000,
    followers: 6789,
    minInvestment: 150,
    riskLevel: "High",
    tradingStyle: "Algorithmic",
    description: "Algorithmic trader using proprietary indicators for crypto markets. High win rate with managed risk.",
    favoriteAssets: ["BTC/USD", "ETH/USD", "BNB/USD"],
    monthlyReturn: 24.5,
    isActive: true,
  },
];

const CopyTrading = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Use REAL copy trading session with database persistence
  const {
    copySessions,
    tradingBalance,
    totalAllocated,
    totalProfit,
    startCopySession,
    stopCopySession,
    refreshSessions,
  } = useCopyTradingSession(user?.id);

  // Convert DB sessions to local format for ActiveSessions component
  const activeSessions = copySessions
    .filter(s => s.status === 'active')
    .map(s => ({
      id: s.id,
      expertId: s.expert_id,
      expertName: s.expert_name,
      investment: s.allocated_amount,
      duration: s.duration_hours,
      startTime: new Date(s.start_time),
      currentProfit: s.current_profit,
      status: s.status,
    }));

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Simulate loading with 3D animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const filters = ["All", "Forex", "Crypto", "Stocks", "Metals", "Indices"];

  const filteredExperts = EXPERTS.filter((expert) => {
    const matchesSearch = expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert.focus.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || expert.focus === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleCopyExpert = (expert: Expert) => {
    setSelectedExpert(expert);
    setShowSessionModal(true);
  };

  const handleViewProfile = (expert: Expert) => {
    setSelectedExpert(expert);
    setShowProfileModal(true);
  };

  const handleStartSession = async (investment: number, duration: number) => {
    if (!selectedExpert) return;
    
    if (investment > tradingBalance) {
      toast.error("Insufficient trading balance");
      return;
    }

    // Start REAL copy session with database persistence
    const success = await startCopySession(
      selectedExpert.id,
      selectedExpert.name,
      investment,
      duration
    );

    if (success) {
      toast.success(`Started copying ${selectedExpert.name} with €${investment}`);
      setShowSessionModal(false);
      setSelectedExpert(null);
    } else {
      toast.error("Failed to start copy session. Please try again.");
    }
  };

  const handleStopSession = async (sessionId: string) => {
    const success = await stopCopySession(sessionId);
    if (success) {
      toast.success("Copy session stopped. Funds returned to trading balance.");
    } else {
      toast.error("Failed to stop session. Please try again.");
    }
  };

  // Simulate profit updates for active sessions
  useEffect(() => {
    const interval = setInterval(async () => {
      // In a real app, this would be handled by the backend
      // For now, we'll just refresh sessions periodically
      if (user?.id) {
        refreshSessions();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id, refreshSessions]);

  if (isLoading) {
    return <CopyTradingLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="container mx-auto px-4 pt-20 pb-24 lg:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Copy Trading</h1>
            <p className="text-muted-foreground">
              Copy expert traders and earn when they profit
            </p>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6 mb-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Trading Balance</p>
                  <p className="text-2xl font-bold">€{tradingBalance.toFixed(2)}</p>
                  {totalAllocated > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Allocated: €{totalAllocated.toFixed(2)} | Profit: <span className={totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>€{totalProfit.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Top Up Balance
              </Button>
            </div>
          </motion.div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search experts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className={
                    activeFilter === filter
                      ? "bg-secondary text-secondary-foreground"
                      : "border-border"
                  }
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <ActiveSessions
              sessions={activeSessions}
              onStopSession={handleStopSession}
            />
          )}

          {/* Expert Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <AnimatePresence mode="popLayout">
              {filteredExperts.map((expert, index) => (
                <motion.div
                  key={expert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                >
                  <ExpertCard
                    expert={expert}
                    onCopy={() => handleCopyExpert(expert)}
                    onViewProfile={() => handleViewProfile(expert)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Risk Warning */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-destructive mb-1">
                  Risk Warning
                </h4>
                <p className="text-sm text-muted-foreground">
                  <strong>REAL MONEY TRADING - NOT A DEMO.</strong> You are risking actual funds. 
                  Complete loss of investment is possible if the first trade loses. 
                  Past simulated performance does not guarantee future results.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <BottomNav />

      {/* Modals */}
      <SessionModal
        isOpen={showSessionModal}
        onClose={() => {
          setShowSessionModal(false);
          setSelectedExpert(null);
        }}
        expert={selectedExpert}
        userBalance={tradingBalance}
        onStartSession={handleStartSession}
      />

      <ExpertProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedExpert(null);
        }}
        expert={selectedExpert}
        onCopy={() => {
          setShowProfileModal(false);
          setShowSessionModal(true);
        }}
      />
    </div>
  );
};

export default CopyTrading;
