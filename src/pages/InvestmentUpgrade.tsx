import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Check,
  X,
  Upload,
  ChevronRight,
  Crown,
  Zap,
  Star,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";

// Import QR codes
import usdtQr from "@/assets/crypto/usdt-qr.jpg";
import btcQr from "@/assets/crypto/btc-qr.jpg";
import ltcQr from "@/assets/crypto/ltc-qr.jpg";

interface InvestmentPlan {
  id: string;
  tier: number;
  name: string;
  upgrade_fee: number;
  capital_min: number;
  capital_max: number | null;
  features: string[];
  limitations: string[];
}

interface CryptoPayment {
  id: string;
  crypto_name: string;
  crypto_symbol: string;
  network: string;
  wallet_address: string;
  qr_code_url: string | null;
}

const qrImages: Record<string, string> = {
  USDT: usdtQr,
  BTC: btcQr,
  LTC: ltcQr,
};

export default function InvestmentUpgrade() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [cryptoPayments, setCryptoPayments] = useState<CryptoPayment[]>([]);
  const [currentPlan, setCurrentPlan] = useState<InvestmentPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("USDT");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "payment" | "confirm">("select");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) setProfile(profileData);

      // Fetch investment plans
      const { data: plansData } = await supabase
        .from("investment_plans")
        .select("*")
        .eq("is_active", true)
        .order("tier", { ascending: true });

      if (plansData) {
        const parsedPlans = plansData.map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : JSON.parse(p.features as string || "[]"),
          limitations: Array.isArray(p.limitations) ? p.limitations : JSON.parse(p.limitations as string || "[]"),
        }));
        setPlans(parsedPlans);
        
        // Default to first plan as current (user can have none)
        if (parsedPlans.length > 0) {
          setCurrentPlan(parsedPlans[0]);
        }
      }

      // Fetch user's current investment
      const { data: userInvestment } = await supabase
        .from("user_investments")
        .select("*, investment_plans(*)")
        .eq("user_id", session.user.id)
        .single();

      if (userInvestment && userInvestment.investment_plans) {
        const plan = userInvestment.investment_plans;
        setCurrentPlan({
          ...plan,
          features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string || "[]"),
          limitations: Array.isArray(plan.limitations) ? plan.limitations : JSON.parse(plan.limitations as string || "[]"),
        });
      }

      // Fetch crypto payment details
      const { data: cryptoData } = await supabase
        .from("crypto_payment_details")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cryptoData) setCryptoPayments(cryptoData);

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleSelectPlan = (plan: InvestmentPlan) => {
    if (currentPlan && plan.tier <= currentPlan.tier) {
      toast({
        title: "Cannot downgrade",
        description: "You can only upgrade to a higher tier plan",
        variant: "destructive",
      });
      return;
    }
    setSelectedPlan(plan);
    setStep("payment");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setPaymentProof(file);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Address copied to clipboard" });
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !paymentProof) {
      toast({
        title: "Missing information",
        description: "Please upload your payment proof",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Upload payment proof
      const fileExt = paymentProof.name.split(".").pop();
      const filePath = `${session.user.id}/upgrade-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, paymentProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      // Create upgrade request
      const { error } = await supabase.from("investment_upgrade_requests").insert({
        user_id: session.user.id,
        current_plan_id: currentPlan?.id || null,
        target_plan_id: selectedPlan.id,
        payment_proof_url: publicUrl,
        payment_crypto: selectedCrypto,
        payment_amount: selectedPlan.upgrade_fee,
      });

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: "Your upgrade request is being reviewed.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 5:
        return <Crown className="w-5 h-5 text-purple-500" />;
      case 4:
        return <Star className="w-5 h-5 text-gold" />;
      case 3:
        return <Shield className="w-5 h-5 text-secondary" />;
      default:
        return <Zap className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSelectedCryptoDetails = () => {
    return cryptoPayments.find((c) => c.crypto_symbol === selectedCrypto);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "User"}
        onMenuClick={() => setSidebarOpen(true)}
        notificationCount={0}
        messageCount={0}
      />

      <main className="container mx-auto px-4 pt-40 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Rocket className="w-8 h-8 text-secondary" />
            Upgrade Investment Plan
          </h1>
          <p className="text-muted-foreground mt-2">
            Unlock more features and higher limits
          </p>
        </div>

        {/* Current Plan */}
        {currentPlan && (
          <Card className="mb-8 bg-gradient-to-r from-secondary/10 to-gold/10 border-secondary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {getTierIcon(currentPlan.tier)}
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <h3 className="text-xl font-bold">{currentPlan.name}</h3>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  Tier {currentPlan.tier}
                </Badge>
              </div>
              {currentPlan.tier < 5 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress to next tier</span>
                    <span>{((currentPlan.tier / 5) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(currentPlan.tier / 5) * 100} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Available Plans */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const isCurrentOrLower =
                    currentPlan && plan.tier <= currentPlan.tier;
                  return (
                    <motion.div
                      key={plan.id}
                      whileHover={!isCurrentOrLower ? { scale: 1.02 } : {}}
                    >
                      <Card
                        className={`h-full ${
                          isCurrentOrLower
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:border-secondary/50"
                        } ${
                          plan.tier === 5
                            ? "border-2 border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent"
                            : ""
                        }`}
                        onClick={() => !isCurrentOrLower && handleSelectPlan(plan)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {getTierIcon(plan.tier)}
                              <Badge variant="outline">Tier {plan.tier}</Badge>
                            </div>
                            {plan.tier === 5 && (
                              <Badge className="bg-purple-500">Most Popular</Badge>
                            )}
                          </div>
                          <CardTitle className="mt-2">{plan.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-4">
                            <span className="text-3xl font-bold">
                              €{plan.upgrade_fee}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              upgrade fee
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <p className="text-sm text-muted-foreground">
                              Capital: €{plan.capital_min.toLocaleString()}
                              {plan.capital_max
                                ? ` - €${plan.capital_max.toLocaleString()}`
                                : "+"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            {plan.features.slice(0, 4).map((feature, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </div>
                            ))}
                            {plan.limitations.slice(0, 2).map((limitation, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                <span>{limitation}</span>
                              </div>
                            ))}
                          </div>

                          {!isCurrentOrLower && (
                            <Button className="w-full mt-4" variant="outline">
                              Select Plan
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                          {isCurrentOrLower && (
                            <div className="text-center text-sm text-muted-foreground mt-4">
                              {plan.tier === currentPlan?.tier
                                ? "Current Plan"
                                : "Lower Tier"}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === "payment" && selectedPlan && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <Button
                    variant="ghost"
                    onClick={() => setStep("select")}
                    className="w-fit mb-2"
                  >
                    ← Back to plans
                  </Button>
                  <CardTitle>
                    Upgrade to {selectedPlan.name} - €{selectedPlan.upgrade_fee}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={selectedCrypto}
                    onValueChange={setSelectedCrypto}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      {cryptoPayments.map((crypto) => (
                        <TabsTrigger
                          key={crypto.crypto_symbol}
                          value={crypto.crypto_symbol}
                        >
                          {crypto.crypto_symbol}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {cryptoPayments.map((crypto) => (
                      <TabsContent
                        key={crypto.crypto_symbol}
                        value={crypto.crypto_symbol}
                      >
                        <div className="text-center py-4">
                          <div className="bg-white p-4 rounded-xl inline-block mb-4">
                            <img
                              src={qrImages[crypto.crypto_symbol] || crypto.qr_code_url || ""}
                              alt={`${crypto.crypto_name} QR Code`}
                              className="w-48 h-48 mx-auto"
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium">
                              {crypto.crypto_name} ({crypto.network})
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <code className="bg-muted px-3 py-2 rounded text-sm break-all">
                                {crypto.wallet_address}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyAddress(crypto.wallet_address)}
                              >
                                {copied ? "Copied!" : "Copy"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Upload Payment Proof *
                      </label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        {paymentProof ? (
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-5 h-5 text-emerald-500" />
                            <span>{paymentProof.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentProof(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload screenshot or PDF
                            </p>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={!paymentProof || submitting}
                      className="w-full"
                      size="lg"
                    >
                      {submitting ? "Submitting..." : "Confirm Payment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
