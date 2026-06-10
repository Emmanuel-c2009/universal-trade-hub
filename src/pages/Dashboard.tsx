// src/pages/Dashboard.tsx - COMPLETE WITHOUT TEST BUTTON
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveChatWidget } from "@/components/LiveChatWidget";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import UnifiedBalanceCards from "@/components/dashboard/UnifiedBalanceCards";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const navigate = useNavigate();

  // Use unified balance hook
  const { balance, totals, cryptoPrices, loading: balanceLoading } = useUnifiedBalance(session?.user?.id || null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      
      if (!newSession) {
        navigate("/auth");
      }
    });

    // Check for existing session
    const checkSession = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      setSession(existingSession);
      setLoading(false);
      
      if (!existingSession) {
        navigate("/auth");
      }
    };
    
    checkSession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch profile separately
  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
          if (data.profile_status === "unverified") {
            setShowVerificationBanner(true);
          }
        }
      }
    };
    
    fetchProfile();
  }, [session]);

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
        showGreeting={true}
      />
      <LiveChatWidget />

      <main className="container mx-auto px-4 pt-40 max-w-7xl">
        {showVerificationBanner && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-gold/20 to-secondary/20 border-gold">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Shield className="w-8 h-8 text-gold" />
                <div>
                  <h3 className="font-semibold text-lg">Verify Your Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete verification to unlock all trading features.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/verification")}
                className="bg-gold text-black hover:bg-gold/90"
              >
                Start Verification
              </Button>
            </div>
          </Card>
        )}

        <div className="grid gap-6 mb-6">
          <UnifiedBalanceCards
            balance={balance}
            totals={totals}
            cryptoPrices={cryptoPrices}
            loading={balanceLoading}
          />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;