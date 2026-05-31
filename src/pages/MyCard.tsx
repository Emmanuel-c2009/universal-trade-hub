import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { format } from "date-fns";

interface UserCard {
  id: string;
  card_number: string;
  card_holder: string;
  expiry_date: string;
  cvv: string;
  card_network: string;
  status: string;
  daily_limit: number;
  monthly_limit: number;
  card_types: {
    name: string;
    color_theme: string;
    features: string[];
  };
}

interface CardTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  merchant: string;
  location: string;
  status: string;
  created_at: string;
}

export default function MyCard() {
  const [userCard, setUserCard] = useState<UserCard | null>(null);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
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

      // Fetch user's card
      const { data: cardData } = await supabase
        .from("user_cards")
        .select("*, card_types(*)")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .single();

      if (cardData) {
        setUserCard({
          ...cardData,
          card_types: {
            ...cardData.card_types,
            features: Array.isArray(cardData.card_types.features)
              ? cardData.card_types.features
              : JSON.parse(cardData.card_types.features as string || "[]"),
          },
        });

        // Fetch transactions
        const { data: txData } = await supabase
          .from("card_transactions")
          .select("*")
          .eq("card_id", cardData.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (txData) setTransactions(txData);
      }

      setLoading(false);
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel("user_cards_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_cards" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const maskCardNumber = (number: string) => {
    if (showDetails) return number.replace(/(.{4})/g, "$1 ").trim();
    return `**** **** **** ${number.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const getCardGradient = (theme: string) => {
    switch (theme) {
      case "gold":
        return "from-yellow-400 via-amber-500 to-yellow-600";
      case "black":
        return "from-gray-700 via-gray-800 to-gray-900";
      default:
        return "from-blue-400 via-blue-500 to-blue-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-500";
      case "blocked":
        return "bg-destructive/20 text-destructive";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (!userCard) {
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
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Active Card</h2>
            <p className="text-muted-foreground mb-4">
              You don't have an active card yet. Apply for one now!
            </p>
            <Button onClick={() => navigate("/cards/request")}>
              Request Card
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

      <main className="container mx-auto px-4 pt-40 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Card</h1>
          <p className="text-muted-foreground mt-2">Manage your Universal Stock Trade card</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 3D Card */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-full max-w-[400px] perspective-1000 cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                className="relative w-full aspect-[1.586/1] preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring" }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front of Card */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${getCardGradient(
                    userCard.card_types.color_theme
                  )} p-6 shadow-2xl backface-hidden`}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="text-white/80 text-sm font-medium">
                      Universal Stock Trade
                    </div>
                    <div className="text-white font-bold text-lg">
                      {userCard.card_network.toUpperCase()}
                    </div>
                  </div>

                  {/* Chip */}
                  <div className="w-14 h-10 rounded bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 mb-6 shadow-inner" />

                  {/* Card Number */}
                  <div className="text-white text-xl md:text-2xl font-mono tracking-wider mb-4">
                    {maskCardNumber(userCard.card_number)}
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-white/60 text-xs">CARD HOLDER</div>
                      <div className="text-white font-medium uppercase">
                        {userCard.card_holder}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">EXPIRES</div>
                      <div className="text-white font-medium">
                        {showDetails
                          ? format(new Date(userCard.expiry_date), "MM/yy")
                          : "**/**"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back of Card */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${getCardGradient(
                    userCard.card_types.color_theme
                  )} shadow-2xl backface-hidden`}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  {/* Magnetic Strip */}
                  <div className="w-full h-12 bg-gray-900 mt-6" />

                  <div className="p-6">
                    {/* Signature + CVV */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1 h-10 bg-white/80 rounded flex items-center justify-end pr-4">
                        <span className="font-mono font-bold">
                          {showDetails ? userCard.cvv : "***"}
                        </span>
                      </div>
                    </div>

                    <div className="text-white/80 text-xs leading-relaxed">
                      This card is property of Universal Stock Trade. Use of this
                      card is subject to the cardholder agreement. If found,
                      please return to any Universal Stock Trade branch.
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Click card to flip
            </p>

            {/* Card Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? (
                  <EyeOff className="w-4 h-4 mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {showDetails ? "Hide" : "Show"} Details
              </Button>
              {showDetails && (
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(userCard.card_number)}
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Copy Number
                </Button>
              )}
            </div>
          </div>

          {/* Card Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Card Status</span>
                  <Badge className={getStatusColor(userCard.status)}>
                    {userCard.status.charAt(0).toUpperCase() +
                      userCard.status.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Type</span>
                  <span className="font-medium">{userCard.card_types.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Limit</span>
                  <span className="font-medium">
                    ${userCard.daily_limit?.toLocaleString() || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Limit</span>
                  <span className="font-medium">
                    ${userCard.monthly_limit?.toLocaleString() || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium">
                    {format(new Date(userCard.expiry_date), "MMMM yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className={
                    userCard.status === "blocked"
                      ? "border-emerald-500 text-emerald-500"
                      : "border-destructive text-destructive"
                  }
                >
                  {userCard.status === "blocked" ? (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      Unblock Card
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Block Card
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Lost
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transaction History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transactions yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {format(new Date(tx.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="capitalize">
                        {tx.transaction_type.replace("_", " ")}
                      </TableCell>
                      <TableCell>{tx.merchant || "-"}</TableCell>
                      <TableCell>{tx.location || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {tx.currency} {tx.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "successful"
                              ? "default"
                              : tx.status === "declined"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
