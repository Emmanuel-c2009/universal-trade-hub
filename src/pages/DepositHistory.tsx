import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DepositRow {
  id: string;
  amount: number;
  currency: string;
  deposit_method: string;
  crypto_type: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
}

const PAGE_SIZE = 15;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-600 border-amber-500/40",
    under_review: "bg-blue-500/20 text-blue-600 border-blue-500/40",
    approved: "bg-emerald-500/20 text-emerald-600 border-emerald-500/40",
    completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/40",
    declined: "bg-destructive/20 text-destructive border-destructive/40",
    rejected: "bg-destructive/20 text-destructive border-destructive/40",
  };
  return <Badge variant="outline" className={map[status] || ""}>{status.replace(/_/g, " ")}</Badge>;
};

const progressPct = (status: string) => {
  if (["approved", "completed"].includes(status)) return 100;
  if (status === "declined" || status === "rejected") return 100;
  if (status === "under_review") return 66;
  return 33;
};

export default function DepositHistory() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileData);

    const { data, error } = await supabase
      .from("deposits")
      .select("id, amount, currency, deposit_method, crypto_type, status, created_at, reviewed_at, admin_notes")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load deposit history");
      console.error(error);
    } else {
      setRows((data || []) as DepositRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("deposit_history_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (methodFilter !== "all" && r.deposit_method !== methodFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, methodFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const exportCsv = () => {
    const header = ["Date", "Method", "Asset", "Amount", "Currency", "Status"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push([
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        r.deposit_method,
        r.crypto_type || "-",
        r.amount,
        r.currency,
        r.status,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deposit-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "Trader"}
        onMenuClick={() => setSidebarOpen(true)}
        avatarUrl={profile?.avatar_url}
        verificationStatus={profile?.profile_status}
        pageTitle="Deposit History"
      />

      <main className="container mx-auto px-4 pt-32 max-w-5xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/deposit")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Deposit
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Tabs value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="crypto">Crypto</TabsTrigger>
                <TabsTrigger value="card">Card</TabsTrigger>
                <TabsTrigger value="p2p">P2P</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <TabsList>
                <TabsTrigger value="all">All Status</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="declined">Declined</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
          ) : paginated.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No deposits found.</div>
          ) : (
            <div className="space-y-2">
              {paginated.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{r.deposit_method}</span>
                      {r.crypto_type && <Badge variant="secondary">{r.crypto_type}</Badge>}
                      {statusBadge(r.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.created_at), "MMM d, yyyy • HH:mm")}
                    </p>
                    {r.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Note: {r.admin_notes}</p>
                    )}
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          ["declined","rejected"].includes(r.status) ? "bg-destructive" :
                          ["approved","completed"].includes(r.status) ? "bg-emerald-500" : "bg-gold"
                        }`}
                        style={{ width: `${progressPct(r.status)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">€{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">{r.currency}</p>
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
