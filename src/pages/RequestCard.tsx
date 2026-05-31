import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Check, Shield, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";

interface CardType {
  id: string;
  name: string;
  slug: string;
  fee: number;
  color_theme: string;
  daily_atm_limit: number;
  monthly_limit: number;
  features: string[];
}

export default function RequestCard() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch card types
      const { data: types } = await supabase
        .from("card_types")
        .select("*")
        .eq("is_active", true)
        .order("fee", { ascending: true });

      if (types) {
        setCardTypes(types.map(t => ({
          ...t,
          features: Array.isArray(t.features) ? t.features : JSON.parse(t.features as string || "[]")
        })));
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || "",
          date_of_birth: profileData.date_of_birth || "",
          address: profileData.address || "",
          city: profileData.city || "",
          state: profileData.state || "",
          country: profileData.country || "",
          postal_code: "",
        });
      }

      // Check for existing application
      const { data: applications } = await supabase
        .from("card_applications")
        .select("*, card_types(*)")
        .eq("user_id", session.user.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (applications && applications.length > 0) {
        setExistingApplication(applications[0]);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!selectedCard || !agreeTerms) {
      toast({
        title: "Error",
        description: "Please select a card and agree to the terms",
        variant: "destructive",
      });
      return;
    }

    if (!formData.full_name || !formData.date_of_birth || !formData.address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.from("card_applications").insert({
        user_id: session.user.id,
        card_type_id: selectedCard,
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postal_code,
      });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Your card application has been submitted for review.",
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

  const getCardColor = (theme: string) => {
    switch (theme) {
      case "gold":
        return "from-yellow-500 to-amber-600";
      case "black":
        return "from-gray-800 to-gray-900";
      default:
        return "from-blue-500 to-blue-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <DashboardHeader
          userName={profile?.full_name || "User"}
          onMenuClick={() => setSidebarOpen(true)}
          notificationCount={0}
          messageCount={0}
        />
        <main className="container mx-auto px-4 pt-40 max-w-4xl">
          <Card className="p-8 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-secondary" />
            <h2 className="text-2xl font-bold mb-2">Application Already Submitted</h2>
            <p className="text-muted-foreground mb-4">
              You already have a {existingApplication.status} card application for{" "}
              <strong>{existingApplication.card_types?.name}</strong>.
            </p>
            <Button onClick={() => navigate("/cards/my-card")}>
              View My Card
            </Button>
          </Card>
        </main>
        <BottomNav />
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
          <h1 className="text-3xl font-bold">Request Physical Card</h1>
          <p className="text-muted-foreground mt-2">Choose your card and complete your application</p>
        </div>

        {/* Card Selection */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {cardTypes.map((card) => (
            <motion.div
              key={card.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  selectedCard === card.id
                    ? "ring-2 ring-secondary border-secondary"
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedCard(card.id)}
              >
                <CardHeader className="pb-2">
                  {/* Card Visual */}
                  <div
                    className={`h-40 rounded-xl bg-gradient-to-br ${getCardColor(
                      card.color_theme
                    )} p-4 flex flex-col justify-between text-white shadow-lg`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-8 rounded bg-gradient-to-br from-yellow-300 to-yellow-500" />
                      {card.slug === "global-plus" && (
                        <Star className="w-6 h-6 text-yellow-300" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm opacity-80">Universal Stock Trade</div>
                      <div className="text-lg font-bold">{card.name}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold">${card.fee}</span>
                    <span className="text-sm text-muted-foreground">one-time fee</span>
                  </div>
                  <ul className="space-y-2">
                    {card.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {selectedCard === card.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-2 bg-secondary/20 rounded-lg text-center text-sm text-secondary font-medium"
                    >
                      Selected
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Application Form */}
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="postal">Postal Code</Label>
                  <Input
                    id="postal"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>
              </div>
            </Card>

            {/* Terms */}
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Terms and Conditions</h2>
              <div className="bg-muted/50 p-4 rounded-lg mb-4 max-h-40 overflow-y-auto text-sm text-muted-foreground">
                <p className="mb-2">By submitting this application, you agree to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide accurate and truthful information</li>
                  <li>Accept the terms and conditions of the selected card</li>
                  <li>Pay the one-time card fee upon approval</li>
                  <li>Use the card responsibly and within legal guidelines</li>
                  <li>Notify Universal Stock Trade of any changes to your personal information</li>
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="cursor-pointer">
                  I agree to the terms and conditions
                </Label>
              </div>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !agreeTerms}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              size="lg"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
