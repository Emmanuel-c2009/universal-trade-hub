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
  const [isValidToken, setIsValidToken] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Let Supabase handle the token automatically
    // The token is already verified when the user clicks the link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsValidToken(false);
        toast.error("Invalid or expired reset link. Please request a new one.");
      }
    };
    
    checkSession();
  }, []);

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
      
      // Sign out after password change
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
      
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/20 to-background py-12 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired. Please request a new one from the login page.
          </p>
          <Link to="/auth">
            <Button variant="hero" className="w-full">Back to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/20 to-background py-12 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Password Updated!</h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully changed. Redirecting to login...
          </p>
          <Link to="/auth">
            <Button variant="hero" className="w-full">Go to Login</Button>
          </Link>
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