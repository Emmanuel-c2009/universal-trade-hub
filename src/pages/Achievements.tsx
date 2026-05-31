// src/pages/Achievements.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Card } from "@/components/ui/card";
import { Trophy, Award, Star, Target, TrendingUp, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";

const MILESTONES = [500, 1000, 5000, 10000, 15000, 25000, 50000, 100000];

export default function Achievements() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [totalProfit, setTotalProfit] = useState(0);
  const [achievedMilestones, setAchievedMilestones] = useState<number[]>([]);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setSession(session);
      fetchData(session.user.id);
    });
  }, [navigate]);

  const fetchData = async (userId: string) => {
    try {
      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);

      // Get total profit
      const { data: profit } = await supabase
        .rpc("get_user_total_profit", { user_id_param: userId });
      setTotalProfit(profit || 0);

      // Get achieved milestones
      const { data: milestones } = await supabase
        .from("user_profit_milestones")
        .select("milestone_amount")
        .eq("user_id", userId);
      
      setAchievedMilestones(milestones?.map(m => m.milestone_amount) || []);
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextMilestone = () => {
    for (const milestone of MILESTONES) {
      if (!achievedMilestones.includes(milestone) && totalProfit < milestone) {
        return milestone;
      }
    }
    return null;
  };

  const getProgressToNext = () => {
    const next = getNextMilestone();
    if (!next) return 100;
    return Math.min(100, (totalProfit / next) * 100);
  };

  const userName = profile?.full_name || session?.user?.email?.split("@")[0] || "Trader";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={userName}
        onMenuClick={() => setSidebarOpen(true)}
        notificationCount={0}
        messageCount={0}
        avatarUrl={profile?.avatar_url}
        verificationStatus={profile?.profile_status}
        pageTitle="Achievements"
      />

      <main className="container mx-auto px-4 pt-28 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Your Trading Achievements</h1>
          <p className="text-muted-foreground">
            Track your progress and unlock milestones as you grow your profits
          </p>
        </motion.div>

        {/* Total Profit Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-8 mb-8 bg-gradient-to-br from-secondary/20 to-gold/20 border-gold/30 text-center">
            <h2 className="text-lg text-muted-foreground mb-2">Total Lifetime Profit</h2>
            <p className="text-5xl font-bold text-gold">€{totalProfit.toLocaleString()}</p>
            
            {getNextMilestone() && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to €{getNextMilestone()?.toLocaleString()}</span>
                  <span>{Math.round(getProgressToNext())}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gold rounded-full h-2 transition-all duration-500"
                    style={{ width: `${getProgressToNext()}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Need €{(getNextMilestone()! - totalProfit).toLocaleString()} more to reach next milestone
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Milestones Grid */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-secondary" />
          Profit Milestones
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MILESTONES.map((milestone, index) => {
            const achieved = achievedMilestones.includes(milestone);
            const isCurrent = totalProfit >= milestone;
            
            return (
              <motion.div
                key={milestone}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.2 }}
              >
                <Card className={`p-4 transition-all duration-300 ${
                  achieved 
                    ? "bg-gradient-to-r from-green-500/10 to-gold/10 border-gold" 
                    : isCurrent 
                    ? "border-secondary/50 bg-secondary/5" 
                    : "opacity-60"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {achieved ? (
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      ) : isCurrent ? (
                        <TrendingUp className="w-8 h-8 text-secondary animate-pulse" />
                      ) : (
                        <Lock className="w-8 h-8 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-bold text-lg">€{milestone.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {achieved 
                            ? "✅ Achieved!" 
                            : isCurrent 
                            ? "🎯 Current Goal" 
                            : `Need €${(milestone - totalProfit).toLocaleString()} more`}
                        </p>
                      </div>
                    </div>
                    {achieved && <Award className="w-6 h-6 text-gold" />}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Tips Section */}
        <Card className="p-6 mt-8 bg-muted/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-gold" />
            How to Earn More
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 📊 Trade consistently across all markets (Crypto, Metals, Stocks)</li>
            <li>• 🤖 Use AI Bot Trading for automated strategies</li>
            <li>• 👥 Copy successful traders to learn from the best</li>
            <li>• 📈 Keep positions open longer for bigger gains</li>
            <li>• 🎯 Set stop losses to protect your profits</li>
          </ul>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}