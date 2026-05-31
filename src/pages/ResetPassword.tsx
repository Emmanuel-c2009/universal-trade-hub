import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated via reset token
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email);
      } else {
        // No valid session, redirect to auth
        toast.error("Invalid or expired reset link");
        navigate("/auth");
      }
    };
    checkSession();
  }, [navigate]);

  const sendMigrationNotification = async (email: string, userName: string, fundingBalance: number) => {
    try {
      await supabase.functions.invoke("send-migration-notification", {
        body: {
          type: "migration_complete",
          email: email,
          user_name: userName,
          funding_balance: fundingBalance.toFixed(2),
          verification_link: `${window.location.origin}/verification`,
        },
      });
      console.log("Migration notification sent to:", email);
    } catch (error) {
      console.error("Migration notification error:", error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setSuccess(true);
      toast.success("Password updated successfully!");
      
      // Check if user needs verification and is a migrated user
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_status, full_name")
          .eq("id", userId)
          .single();
        
        // Check if user is migrated (has funding_balance)
        const { data: balance } = await supabase
          .from("user_balances")
          .select("funding_balance")
          .eq("user_id", userId)
          .single();
        
        const isMigrated = balance?.funding_balance !== null && balance?.funding_balance !== undefined;
        
        // Send migration completion notification for migrated users
        if (isMigrated && profile?.profile_status !== "verified") {
          const fundingBalance = balance?.funding_balance || 0;
          
          await sendMigrationNotification(
            userEmail || "",
            profile?.full_name || "Valued Customer",
            fundingBalance
          );
          
          // Create in-app notification
          await supabase.from("user_notifications").insert({
            user_id: userId,
            title: "🎉 Welcome to the New Platform!",
            message: `Your account has been successfully migrated. Your balance is €${fundingBalance.toFixed(2)}. Please complete verification to start trading.`,
            notification_type: "success",
            is_read: false,
            link: "/verification",
          });
        }
        
        // Redirect based on verification status
        if (profile?.profile_status !== "verified") {
          setTimeout(() => {
            navigate("/verification");
          }, 2000);
        } else {
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        }
      } else {
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/20 to-background py-12 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Password Updated!</h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully changed. Redirecting you...
          </p>
          <Button onClick={() => navigate("/dashboard")} variant="hero" className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/20 to-background py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logo} alt="Universal Stock Trade" className="h-16 w-auto mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
          <p className="text-muted-foreground">Choose a strong password for your account</p>
        </div>

        <Card className="p-8 bg-card/80 backdrop-blur-sm border-border">
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <div className="text-center">
              <Link to="/auth" className="text-gold hover:text-gold-glow transition-colors text-sm inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}