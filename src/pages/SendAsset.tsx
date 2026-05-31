import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Send, User, CheckCircle, Loader2, AlertCircle, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SendAsset() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipient, setRecipient] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    const { data: balanceData } = await supabase
      .from("user_balances")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setProfile(profileData);
    setBalances(balanceData);
    setLoading(false);
  };

  const searchRecipient = async () => {
    if (!recipientQuery.trim()) {
      toast.error("Please enter an email or phone number");
      return;
    }

    setSearching(true);
    setRecipient(null);

    const { data: { session } } = await supabase.auth.getSession();

    // Search by email or phone
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, country, profile_status")
      .or(`email.eq.${recipientQuery},phone.eq.${recipientQuery}`)
      .neq("id", session?.user.id)
      .single();

    if (error || !data) {
      toast.error("Recipient not found. Please check the email or phone number.");
    } else {
      setRecipient(data);
      toast.success("Recipient verified!");
    }

    setSearching(false);
  };

  const handleSend = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
      toast.error("Please verify recipient and enter a valid amount");
      return;
    }

    if (!balances || balances.main_balance < parseFloat(amount)) {
      toast.error("Insufficient funding balance");
      return;
    }

    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Debit sender
      const { error: debitError } = await supabase
        .from("user_balances")
        .update({ main_balance: balances.main_balance - parseFloat(amount) })
        .eq("user_id", session.user.id);

      if (debitError) throw debitError;

      // Get recipient balance
      const { data: recipientBalance } = await supabase
        .from("user_balances")
        .select("main_balance")
        .eq("user_id", recipient.id)
        .single();

      // Credit recipient
      const newRecipientBalance = (recipientBalance?.main_balance || 0) + parseFloat(amount);
      const { error: creditError } = await supabase
        .from("user_balances")
        .upsert({
          user_id: recipient.id,
          main_balance: newRecipientBalance,
        });

      if (creditError) throw creditError;

      // Record transfer
      const { error: transferError } = await supabase.from("asset_transfers").insert({
        sender_id: session.user.id,
        recipient_id: recipient.id,
        amount: parseFloat(amount),
        notes,
        status: "completed",
      });

      if (transferError) throw transferError;

      // Record transactions for both parties
      await supabase.from("transactions").insert([
        {
          user_id: session.user.id,
          amount: -parseFloat(amount),
          transaction_type: "debit",
          channel: "send_asset",
          balance_type: "main",
          description: `Sent to ${recipient.full_name || recipient.email}`,
          status: "completed",
        },
        {
          user_id: recipient.id,
          amount: parseFloat(amount),
          transaction_type: "credit",
          channel: "receive_asset",
          balance_type: "main",
          description: `Received from ${profile?.full_name || profile?.email}`,
          status: "completed",
        },
      ]);

      toast.success("Transfer completed successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error("Transfer failed. Please try again.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "Trader"}
        onMenuClick={() => setSidebarOpen(true)}
        avatarUrl={profile?.avatar_url}
        verificationStatus={profile?.profile_status}
      />

      <main className="container mx-auto px-4 pt-40 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-gold/20">
              <Send className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Send Asset</h1>
              <p className="text-sm text-muted-foreground">Transfer funds to another member</p>
            </div>
          </div>

          <Card className="p-6 mb-4">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-gold">
                ${balances?.main_balance?.toLocaleString() || "0.00"}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              {/* Recipient Search */}
              <div>
                <Label>Recipient Email or Phone</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder="Enter email or phone number"
                    disabled={!!recipient}
                  />
                  {!recipient ? (
                    <Button onClick={searchRecipient} disabled={searching}>
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setRecipient(null)}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Verified Recipient Display */}
              {recipient && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={recipient.avatar_url} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{recipient.full_name || "User"}</h3>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">{recipient.email}</p>
                      {recipient.country && (
                        <p className="text-xs text-muted-foreground">{recipient.country}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Amount */}
              <div>
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl font-bold h-14"
                />
                {parseFloat(amount) > (balances?.main_balance || 0) && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Insufficient balance
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note..."
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={submitting || !recipient || !amount || parseFloat(amount) > (balances?.main_balance || 0)}
                className="w-full h-12 bg-gold text-black hover:bg-gold/90 text-lg"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                Send ${amount || "0.00"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
