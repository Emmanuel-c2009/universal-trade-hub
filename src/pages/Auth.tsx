import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    country: "",
    dob: "",
    password: "",
  });

  // ✅ REFERRAL CODE CAPTURE
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode && refCode !== 'null') {
      localStorage.setItem('referral_code', refCode);
      console.log('✅ Referral code saved:', refCode);
    }
  }, []);

  const emailsMatch = formData.email === formData.confirmEmail && formData.confirmEmail !== "";
  const isOver18 = formData.dob ? new Date().getFullYear() - new Date(formData.dob).getFullYear() >= 18 : false;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      setResetEmailSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        
        toast.success("Successfully logged in!");
        
        // Check if user needs verification
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_status")
          .eq("id", data.user?.id)
          .single();
        
        if (profile?.profile_status !== "verified") {
          navigate("/verification");
        } else {
          navigate("/dashboard");
        }
      } else {
        if (!emailsMatch) {
          toast.error("Email addresses do not match");
          setLoading(false);
          return;
        }

        if (!isOver18) {
          toast.error("You must be 18 years or older to register");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              country: formData.country,
              date_of_birth: formData.dob,
            },
          },
        });

        if (error) throw error;

        const referralCode = localStorage.getItem('referral_code');
        if (referralCode && data.user) {
          try {
            await supabase.functions.invoke('process-referral-signup', {
              body: {
                referred_id: data.user.id,
                referral_code: referralCode
              }
            });
            localStorage.removeItem('referral_code');
          } catch (err) {
            console.error('Error processing referral:', err);
          }
        }

        toast.success("Registration successful! Please check your email to confirm.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (forgotPasswordMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/20 to-background py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/">
              <img src={logo} alt="Universal Stock Trade" className="h-16 w-auto mx-auto mb-4" />
            </Link>
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              {resetEmailSent ? "Check your email" : "Enter your email to reset"}
            </p>
          </div>

          <Card className="p-8 bg-card/80 backdrop-blur-sm border-border">
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">
                  We've sent a password reset link to <strong>{formData.email}</strong>
                </p>
                <Button
                  onClick={() => {
                    setForgotPasswordMode(false);
                    setResetEmailSent(false);
                    setFormData({ ...formData, email: "" });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email Address</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    placeholder="john@example.com"
                  />
                </div>

                <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordMode(false)}
                    className="text-gold hover:text-gold-glow transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  // Main Auth View
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/20 to-background py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logo} alt="Universal Stock Trade" className="h-16 w-auto mx-auto mb-4" />
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to access your dashboard" : "Join thousands of funded traders"}
          </p>
        </div>

        <Card className="p-8 bg-card/80 backdrop-blur-sm border-border">
          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    required
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmEmail">Confirm Email Address</Label>
                  <div className="relative">
                    <Input
                      id="confirmEmail"
                      type="email"
                      value={formData.confirmEmail}
                      onChange={(e) => handleInputChange("confirmEmail", e.target.value)}
                      required
                      placeholder="john@example.com"
                      className={formData.confirmEmail ? (emailsMatch ? "border-green-500" : "border-red-500") : ""}
                    />
                    {formData.confirmEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailsMatch ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                      <SelectItem value="France">🇫🇷 France</SelectItem>
                      <SelectItem value="Spain">🇪🇸 Spain</SelectItem>
                      <SelectItem value="Italy">🇮🇹 Italy</SelectItem>
                      <SelectItem value="Netherlands">🇳🇱 Netherlands</SelectItem>
                      <SelectItem value="Belgium">🇧🇪 Belgium</SelectItem>
                      <SelectItem value="Austria">🇦🇹 Austria</SelectItem>
                      <SelectItem value="Portugal">🇵🇹 Portugal</SelectItem>
                      <SelectItem value="Poland">🇵🇱 Poland</SelectItem>
                      <SelectItem value="Lithuania">🇱🇹 Lithuania</SelectItem>
                      <SelectItem value="Other">🌍 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange("dob", e.target.value)}
                    required
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  />
                  {formData.dob && !isOver18 && (
                    <p className="text-sm text-red-500">You must be 18 years or older to register</p>
                  )}
                </div>
              </>
            )}

            {isLogin && (
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email Address</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  placeholder="john@example.com"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode(true)}
                  className="text-sm text-gold hover:text-gold-glow transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              size="lg"
              disabled={loading || (!isLogin && !emailsMatch) || (!isLogin && !isOver18)}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create My Account"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-gold hover:text-gold-glow transition-colors"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}