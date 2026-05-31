// src/pages/admin/AdminWithdrawals.tsx - COMPLETE WITH ALL NOTIFICATIONS WORKING
import { useState, useEffect } from "react";
import {
  Banknote,
  CheckCircle,
  XCircle,
  Eye,
  CreditCard,
  Bitcoin,
  Building,
  Truck,
  ToggleLeft,
  RefreshCw,
  Copy,
  Download,
  Clock,
  Undo2,
  Timer,
  Ban,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";

const ADMIN_EMAIL = 'universalstocktrade24@gmail.com';

interface Withdrawal {
  id: string;
  user_id: string;
  withdrawal_method: string;
  amount: number;
  currency: string;
  status: string;
  fee_paid: boolean;
  fee_amount: number | null;
  fee_waived: boolean;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  swift_code: string | null;
  bank_city: string | null;
  bank_address: string | null;
  bank_country: string | null;
  routing_number: string | null;
  iban: string | null;
  sort_code: string | null;
  wallet_address: string | null;
  crypto_type: string | null;
  txid: string | null;
  network: string | null;
  chain_network: string | null;
  card_number_masked: string | null;
  card_number: string | null;
  card_expiry: string | null;
  card_cvv: string | null;
  cardholder_name: string | null;
  billing_zip: string | null;
  billing_city: string | null;
  billing_country: string | null;
  card_type: string | null;
  delivery_address: string | null;
  contact_phone: string | null;
  delivery_city: string | null;
  delivery_country: string | null;
  receipt_url: string | null;
  payment_proof_url: string | null;
  payment_proof_uploaded_at: string | null;
  admin_notes: string | null;
  under_review_reason: string | null;
  is_refundable: boolean;
  refund_scheduled_at: string | null;
  refund_executed_at: string | null;
  refund_reason: string | null;
  refund_timer_minutes: number;
  refund_status: string;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export const AdminWithdrawals = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [underReviewReason, setUnderReviewReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundTimerMinutes, setRefundTimerMinutes] = useState(5);
  const [chainNetwork, setChainNetwork] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [txidInput, setTxidInput] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [feeWaiverStatus, setFeeWaiverStatus] = useState<Record<string, boolean>>({});
  const [showFullCardNumber, setShowFullCardNumber] = useState(false);
  
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "review" | "refund" | "">("");
  const [methodType, setMethodType] = useState<"bank" | "crypto" | "card" | "cash" | "">("");
  const [bankNetworkInfo, setBankNetworkInfo] = useState<{ bank: any; comparison: string }>({ bank: null, comparison: "" });

  useEffect(() => {
    fetchWithdrawals();
    loadFeeWaiverStatuses();
  }, []);

  useEffect(() => {
    const checkPendingRefunds = async () => {
      const now = new Date().toISOString();
      const { data: pendingRefunds } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("refund_status", "pending")
        .lt("refund_scheduled_at", now);
      for (const refund of pendingRefunds || []) {
        await executeRefund(refund);
      }
    };
    checkPendingRefunds();
    const interval = setInterval(checkPendingRefunds, 30000);
    return () => clearInterval(interval);
  }, []);

  const executeRefund = async (withdrawal: Withdrawal) => {
    try {
      await supabase.from("withdrawals").update({
        status: "refunded",
        refund_status: "executed",
        refund_executed_at: new Date().toISOString(),
      }).eq("id", withdrawal.id);

      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("funding_balance")
        .eq("user_id", withdrawal.user_id)
        .single();

      const newBalance = (balanceData?.funding_balance || 0) + withdrawal.amount;
      await supabase.from("user_balances").update({ funding_balance: newBalance }).eq("user_id", withdrawal.user_id);
      toast({ title: "Refund Executed" });
      fetchWithdrawals();
    } catch (error) {
      console.error("Error executing refund:", error);
    }
  };

  const fetchBankNetworkInfo = async (bankName: string) => {
    try {
      const { data } = await supabase.from("banks").select("*").ilike("name", `%${bankName}%`).limit(1);
      if (data && data.length > 0) {
        const bank = data[0];
        let comparison = "";
        if (bank.network_percentage >= 80) comparison = "✅ Excellent - Network stable";
        else if (bank.network_percentage >= 65) comparison = "⚠️ Moderate - Manual verification recommended";
        else comparison = "🔴 Concern - Review required";
        setBankNetworkInfo({ bank, comparison });
      }
    } catch (error) {
      console.error("Error fetching bank info:", error);
    }
  };

  const getFullReceiptUrl = (receiptUrl: string | null) => {
    if (!receiptUrl) return null;
    if (receiptUrl.startsWith('http')) return receiptUrl;
    return `https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/deposit-proofs/${receiptUrl}`;
  };

  const fetchWithdrawals = async (limit: number = 20) => {
    setLoading(true);
    try {
      const { count } = await supabase.from("withdrawals").select("*", { count: "exact", head: true });
      setTotalCount(count || 0);

      const { data, error } = await supabase
        .from("withdrawals")
        .select(`*, profiles!withdrawals_user_id_fkey(full_name, email)`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setWithdrawals(data as Withdrawal[]);
      setVisibleCount(limit);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast({ title: "Error", description: "Failed to load withdrawals", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadFeeWaiverStatuses = async () => {
    const { data } = await supabase.from("withdrawal_fee_config").select("user_id, fee_enabled");
    if (data) {
      const statusMap: Record<string, boolean> = {};
      data.forEach((item: any) => { statusMap[item.user_id] = item.fee_enabled; });
      setFeeWaiverStatus(statusMap);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  // ============ NOTIFICATION FUNCTIONS ============
  
  const sendEmailNotification = async (email: string, subject: string, html: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          template_name: "custom",
          recipient_email: email,
          custom_subject: subject,
          custom_html: html,
        }
      });
      if (error) console.error("Email error:", error);
      else console.log(`Email sent to ${email}: ${subject}`);
      return !error;
    } catch (error) {
      console.error("Email error:", error);
      return false;
    }
  };

  const sendUserNotification = async (userId: string, title: string, message: string, type: string, relatedId: string) => {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: title,
        message: message,
        type: type,
        related_id: relatedId,
        is_read: false,
      });
      if (error) console.error("Notification error:", error);
      else console.log(`Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      console.error("Notification error:", error);
    }
  };

  const sendTelegramNotification = async (message: string) => {
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          notification_type: "telegram",
          event_data: { message: message }
        }
      });
      console.log("Telegram notification sent");
    } catch (error) {
      console.error("Telegram error:", error);
    }
  };

  const sendAdminEmail = async (subject: string, html: string) => {
    return sendEmailNotification(ADMIN_EMAIL, subject, html);
  };

  // ============ USER EMAIL TEMPLATES ============
  
  const getUserEmailHtml = (withdrawal: Withdrawal, action: string, reason?: string) => {
    const amount = withdrawal.amount?.toLocaleString() || '0';
    const method = withdrawal.withdrawal_method?.toUpperCase() || 'WITHDRAWAL';
    const statusColor = action === "approved" ? "#10b981" : action === "rejected" ? "#ef4444" : "#f97316";
    const statusText = action === "approved" ? "Approved" : action === "rejected" ? "Declined" : "Under Review";
    
    return `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden;">
        <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Withdrawal ${statusText}</h1>
        </div>
        <div style="padding: 30px;">
          <p>Dear ${withdrawal.profiles?.full_name || "Valued Customer"},</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> €${amount}</p>
            <p><strong>Method:</strong> ${method}</p>
            <p><strong>Transaction ID:</strong> ${withdrawal.id.slice(0, 12)}</p>
            ${reason ? `<p><strong>${action === "rejected" ? "Reason" : "Reason for Review"}:</strong> ${reason}</p>` : ''}
          </div>
          <a href="https://ustrader24.online/withdrawal-history" style="display: inline-block; padding: 12px 24px; background-color: ${statusColor}; color: white; text-decoration: none; border-radius: 5px;">View Withdrawal</a>
        </div>
      </div>
    </body>
    </html>`;
  };

  const getAdminEmailHtml = (withdrawal: Withdrawal, action: string, notes: string) => {
    return `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>💰 Withdrawal ${action}</h2>
      <p><strong>User:</strong> ${withdrawal.profiles?.full_name}</p>
      <p><strong>Email:</strong> ${withdrawal.profiles?.email}</p>
      <p><strong>Amount:</strong> €${withdrawal.amount?.toLocaleString()}</p>
      <p><strong>Method:</strong> ${withdrawal.withdrawal_method?.toUpperCase()}</p>
      <p><strong>Notes:</strong> ${notes || "N/A"}</p>
      <a href="https://ustrader24.online/admin/withdrawals">View in Admin Panel</a>
    </body>
    </html>`;
  };

  // ============ UPDATE STATUS WITH NOTIFICATIONS ============
  
  const updateStatus = async (id: string, userId: string, action: string, amount: number, reason?: string) => {
    if (processingAction) return;
    setProcessingAction(true);
    
    try {
      const withdrawal = withdrawals.find(w => w.id === id);
      
      if (action === "approved") {
        const { data: currentBalance } = await supabase
          .from("user_balances")
          .select("funding_balance")
          .eq("user_id", userId)
          .maybeSingle();
        
        const newFunding = (currentBalance?.funding_balance || 0) - amount;
        if (newFunding < 0) {
          toast({ title: "Error", description: "Insufficient balance", variant: "destructive" });
          setProcessingAction(false);
          return;
        }
        
        await supabase.from("user_balances").update({ funding_balance: newFunding }).eq("user_id", userId);
        await supabase.from("withdrawals").update({ status: "approved", admin_notes: adminNotes || null, txid: txidInput || null }).eq("id", id);
        await supabase.from("transactions").insert({
          user_id: userId, transaction_type: "withdrawal", amount: amount, currency: "EUR",
          status: "completed", description: `Withdrawal of €${amount} via ${withdrawal?.withdrawal_method}`, reference_id: id,
        });
        
        if (withdrawal) {
          const userHtml = getUserEmailHtml(withdrawal, "approved");
          await sendEmailNotification(withdrawal.profiles?.email || "", `✅ Withdrawal Approved - €${amount.toLocaleString()}`, userHtml);
          await sendUserNotification(userId, "✅ Withdrawal Approved", `Your withdrawal of €${amount.toLocaleString()} has been approved and is being processed.`, "withdrawal", id);
          const adminHtml = getAdminEmailHtml(withdrawal, "APPROVED", adminNotes);
          await sendAdminEmail(`💰 Withdrawal APPROVED - €${amount.toLocaleString()}`, adminHtml);
          await sendTelegramNotification(`✅ WITHDRAWAL APPROVED\n\nUser: ${withdrawal.profiles?.full_name}\nAmount: €${amount.toLocaleString()}\nMethod: ${withdrawal.withdrawal_method}\n\nReview: https://ustrader24.online/admin/withdrawals`);
        }
        
      } else if (action === "declined") {
        await supabase.from("withdrawals").update({ status: "declined", admin_notes: adminNotes || null }).eq("id", id);
        
        if (withdrawal) {
          const userHtml = getUserEmailHtml(withdrawal, "rejected", adminNotes || reason || "Request declined");
          await sendEmailNotification(withdrawal.profiles?.email || "", `❌ Withdrawal Declined - €${amount.toLocaleString()}`, userHtml);
          await sendUserNotification(userId, "❌ Withdrawal Declined", `Your withdrawal of €${amount.toLocaleString()} was declined. ${adminNotes || "Please contact support"}`, "withdrawal", id);
          const adminHtml = getAdminEmailHtml(withdrawal, "DECLINED", adminNotes);
          await sendAdminEmail(`❌ Withdrawal DECLINED - €${amount.toLocaleString()}`, adminHtml);
          await sendTelegramNotification(`❌ WITHDRAWAL DECLINED\n\nUser: ${withdrawal.profiles?.full_name}\nAmount: €${amount.toLocaleString()}\nMethod: ${withdrawal.withdrawal_method}\nReason: ${adminNotes || reason || "Request declined"}`);
        }
        
      } else if (action === "processing") {
        await supabase.from("withdrawals").update({ status: "processing", admin_notes: adminNotes || null }).eq("id", id);
        
      } else if (action === "review") {
        await supabase.from("withdrawals").update({ 
          status: "under_review", 
          admin_notes: adminNotes || null,
          under_review_reason: reason || null
        }).eq("id", id);
        
        if (withdrawal) {
          const userHtml = getUserEmailHtml(withdrawal, "under_review", reason || adminNotes || "Additional verification required");
          await sendEmailNotification(withdrawal.profiles?.email || "", `🔄 Withdrawal Under Review - €${amount.toLocaleString()}`, userHtml);
          await sendUserNotification(userId, "🔄 Withdrawal Under Review", `Your withdrawal of €${amount.toLocaleString()} is under review. ${reason || "Additional verification required"}`, "withdrawal", id);
          const adminHtml = getAdminEmailHtml(withdrawal, "UNDER REVIEW", adminNotes);
          await sendAdminEmail(`🔄 Withdrawal UNDER REVIEW - €${amount.toLocaleString()}`, adminHtml);
          await sendTelegramNotification(`🔄 WITHDRAWAL UNDER REVIEW\n\nUser: ${withdrawal.profiles?.full_name}\nAmount: €${amount.toLocaleString()}\nMethod: ${withdrawal.withdrawal_method}\nReason: ${reason || "Additional verification required"}`);
        }
      }
      
      toast({ title: `Withdrawal ${action === "review" ? "marked as under review" : action}` });
      setActionDialogOpen(false);
      setRefundDialogOpen(false);
      setSelectedWithdrawal(null);
      setAdminNotes("");
      setUnderReviewReason("");
      setTxidInput("");
      fetchWithdrawals();
      loadFeeWaiverStatuses();
    } catch (error: any) {
      console.error("Error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(false);
    }
  };

  const scheduleRefund = async () => {
    if (!selectedWithdrawal) return;
    setProcessingAction(true);
    try {
      const refundScheduledAt = new Date();
      refundScheduledAt.setMinutes(refundScheduledAt.getMinutes() + refundTimerMinutes);

      await supabase.from("withdrawals").update({
        status: "approved",
        is_refundable: true,
        refund_status: "pending",
        refund_scheduled_at: refundScheduledAt.toISOString(),
        refund_reason: refundReason,
        refund_timer_minutes: refundTimerMinutes,
        txid: txidInput || null,
        admin_notes: adminNotes || null,
        chain_network: chainNetwork || null,
      }).eq("id", selectedWithdrawal.id);

      if (selectedWithdrawal) {
        await sendUserNotification(selectedWithdrawal.user_id, "💰 Refund Scheduled", `Your withdrawal of €${selectedWithdrawal.amount?.toLocaleString()} has been approved but will be refunded in ${refundTimerMinutes} minutes. Reason: ${refundReason}`, "withdrawal", selectedWithdrawal.id);
        await sendTelegramNotification(`💰 REFUND SCHEDULED\n\nUser: ${selectedWithdrawal.profiles?.full_name}\nAmount: €${selectedWithdrawal.amount?.toLocaleString()}\nMethod: ${selectedWithdrawal.withdrawal_method}\nRefund in: ${refundTimerMinutes} minutes\nReason: ${refundReason}`);
      }

      toast({ title: "Withdrawal Approved", description: `Refund scheduled in ${refundTimerMinutes} minutes` });
      setRefundDialogOpen(false);
      setSelectedWithdrawal(null);
      setRefundReason("");
      setRefundTimerMinutes(5);
      setTxidInput("");
      setAdminNotes("");
      fetchWithdrawals();
    } catch (error: any) {
      console.error("Error scheduling refund:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(false);
    }
  };

  const cancelRefund = async (withdrawal: Withdrawal) => {
    setProcessingAction(true);
    try {
      await supabase.from("withdrawals").update({
        refund_status: "cancelled",
        is_refundable: false,
        refund_scheduled_at: null,
        status: "approved",
      }).eq("id", withdrawal.id);
      
      await sendUserNotification(withdrawal.user_id, "⏹️ Refund Cancelled", `The refund for your withdrawal of €${withdrawal.amount?.toLocaleString()} has been cancelled.`, "withdrawal", withdrawal.id);
      
      toast({ title: "Refund Cancelled" });
      fetchWithdrawals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(false);
    }
  };

  const openActionDialog = (withdrawal: Withdrawal, action: "approve" | "reject" | "review" | "refund") => {
    setSelectedWithdrawal(withdrawal);
    setActionType(action);
    setMethodType(withdrawal.withdrawal_method as any);
    setAdminNotes(withdrawal.admin_notes || "");
    setUnderReviewReason(withdrawal.under_review_reason || "");
    setRefundReason("");
    setRefundTimerMinutes(5);
    setChainNetwork("");
    setTxidInput("");
    
    if (action === "review" && withdrawal.withdrawal_method === "bank" && withdrawal.bank_name) {
      fetchBankNetworkInfo(withdrawal.bank_name);
    }
    
    if (action === "refund") {
      setRefundDialogOpen(true);
    } else {
      setActionDialogOpen(true);
    }
  };

  const handleToggleFeeWaiver = async (userId: string, currentStatus: boolean) => {
    try {
      const { data: existingConfig } = await supabase.from("withdrawal_fee_config").select("*").eq("user_id", userId).maybeSingle();
      const newStatus = !currentStatus;
      if (existingConfig) {
        await supabase.from("withdrawal_fee_config").update({ fee_enabled: newStatus }).eq("user_id", userId);
      } else {
        await supabase.from("withdrawal_fee_config").insert({ user_id: userId, fee_enabled: newStatus });
      }
      setFeeWaiverStatus(prev => ({ ...prev, [userId]: newStatus }));
      toast({ title: `Fee ${newStatus ? "enabled" : "waived"} for user` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const downloadReceipt = async (withdrawal: Withdrawal) => {
    try {
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Withdrawal Receipt</title></head>
        <body style="font-family: Arial; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
            <h2 style="text-align: center;">Withdrawal Receipt</h2>
            <p><strong>Transaction ID:</strong> ${withdrawal.id.slice(0, 8)}...</p>
            <p><strong>User:</strong> ${withdrawal.profiles?.full_name}</p>
            <p><strong>Email:</strong> ${withdrawal.profiles?.email}</p>
            <p><strong>Date:</strong> ${new Date(withdrawal.created_at).toLocaleString()}</p>
            <p><strong>Amount:</strong> €${withdrawal.amount?.toLocaleString()}</p>
            <p><strong>Method:</strong> ${withdrawal.withdrawal_method?.toUpperCase()}</p>
            <p><strong>Status:</strong> ${withdrawal.status}</p>
            <hr>
            <p style="text-align: center; font-size: 12px;">Universal Stock Trade</p>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([receiptHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${withdrawal.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Receipt Downloaded" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to download receipt", variant: "destructive" });
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "crypto": return <Bitcoin className="w-4 h-4 text-gold" />;
      case "card": return <CreditCard className="w-4 h-4 text-secondary" />;
      case "bank": return <Building className="w-4 h-4 text-blue-500" />;
      case "cash": return <Truck className="w-4 h-4 text-emerald-500" />;
      default: return <Banknote className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-500/20 text-emerald-500">Approved</Badge>;
      case "declined": return <Badge className="bg-destructive/20 text-destructive">Declined</Badge>;
      case "processing": return <Badge className="bg-blue-500/20 text-blue-500">Processing</Badge>;
      case "under_review": return <Badge className="bg-orange-500/20 text-orange-500">Under Review</Badge>;
      case "refunded": return <Badge className="bg-purple-500/20 text-purple-500">Refunded</Badge>;
      case "pending_fee": return <Badge className="bg-cyan-500/20 text-cyan-500">Awaiting Fee</Badge>;
      default: return <Badge className="bg-amber-500/20 text-amber-500">Pending</Badge>;
    }
  };

  const getRemainingTime = (scheduledAt: string | null) => {
    if (!scheduledAt) return "N/A";
    const remaining = new Date(scheduledAt).getTime() - new Date().getTime();
    if (remaining <= 0) return "Processing...";
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return w.status === "pending" || w.status === "pending_fee";
    if (activeTab === "under_review") return w.status === "under_review";
    if (activeTab === "refunded") return w.status === "refunded";
    return w.withdrawal_method === activeTab;
  });

  const pendingCount = withdrawals.filter((w) => w.status === "pending" || w.status === "pending_fee").length;
  const underReviewCount = withdrawals.filter((w) => w.status === "under_review").length;
  const refundedCount = withdrawals.filter((w) => w.status === "refunded").length;

  const renderActionButtons = (withdrawal: Withdrawal) => {
    const isPending = withdrawal.status === "pending" || withdrawal.status === "pending_fee";
    const isRefundPending = withdrawal.refund_status === "pending";
    
    if (isRefundPending && withdrawal.status === "approved") {
      return (
        <div className="flex gap-2">
          <Badge className="bg-blue-500/20 text-blue-600"><Timer className="w-3 h-3 mr-1" /> Refund in: {getRemainingTime(withdrawal.refund_scheduled_at)}</Badge>
          <Button size="sm" variant="outline" className="text-red-600 border-red-600" onClick={() => cancelRefund(withdrawal)}><Ban className="w-3 h-3 mr-1" /> Cancel Refund</Button>
        </div>
      );
    }
    
    if (!isPending) {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setSelectedWithdrawal(withdrawal); setAdminNotes(withdrawal.admin_notes || ""); }}><Eye className="w-4 h-4 mr-1" /> View</Button>
          <Button size="sm" variant="outline" onClick={() => downloadReceipt(withdrawal)}><Download className="w-4 h-4 mr-1" /> Receipt</Button>
        </div>
      );
    }
    
    // Card & Cash: Approve, Under Review, Decline
    if (withdrawal.withdrawal_method === "card" || withdrawal.withdrawal_method === "cash") {
      return (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="text-green-600 border-green-600" onClick={() => openActionDialog(withdrawal, "approve")}><CheckCircle className="w-3 h-3 mr-1" /> Approve</Button>
          <Button size="sm" variant="outline" className="text-orange-600 border-orange-600" onClick={() => openActionDialog(withdrawal, "review")}><Clock className="w-3 h-3 mr-1" /> Under Review</Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-600" onClick={() => openActionDialog(withdrawal, "reject")}><XCircle className="w-3 h-3 mr-1" /> Decline</Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedWithdrawal(withdrawal); }}><Eye className="w-4 h-4 mr-1" /> View</Button>
        </div>
      );
    }
    
    // Crypto & Bank: Approve, Approve & Refund, Under Review, Decline
    return (
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="text-green-600 border-green-600" onClick={() => openActionDialog(withdrawal, "approve")}><CheckCircle className="w-3 h-3 mr-1" /> Approve</Button>
        <Button size="sm" variant="outline" className="text-purple-600 border-purple-600" onClick={() => openActionDialog(withdrawal, "refund")}><Undo2 className="w-3 h-3 mr-1" /> Approve & Refund</Button>
        <Button size="sm" variant="outline" className="text-orange-600 border-orange-600" onClick={() => openActionDialog(withdrawal, "review")}><Clock className="w-3 h-3 mr-1" /> Under Review</Button>
        <Button size="sm" variant="outline" className="text-red-600 border-red-600" onClick={() => openActionDialog(withdrawal, "reject")}><XCircle className="w-3 h-3 mr-1" /> Decline</Button>
        <Button size="sm" variant="ghost" onClick={() => { setSelectedWithdrawal(withdrawal); }}><Eye className="w-4 h-4 mr-1" /> View</Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-6 h-6 text-amber-500" />
            Withdrawals Management
          </h1>
          <p className="text-muted-foreground">Review and process user withdrawal requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchWithdrawals(visibleCount)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{withdrawals.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-500">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Under Review</p><p className="text-2xl font-bold text-orange-500">{underReviewCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Refunded</p><p className="text-2xl font-bold text-purple-500">{refundedCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Bank</p><p className="text-2xl font-bold">{withdrawals.filter(w => w.withdrawal_method === "bank").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Crypto</p><p className="text-2xl font-bold">{withdrawals.filter(w => w.withdrawal_method === "crypto").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Card</p><p className="text-2xl font-bold">{withdrawals.filter(w => w.withdrawal_method === "card").length}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending {pendingCount > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">{pendingCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="under_review">Under Review</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
          <TabsTrigger value="bank">Bank</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
          <TabsTrigger value="card">Card</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell className="text-sm">{format(new Date(withdrawal.created_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{withdrawal.profiles?.full_name || "Unknown"}</p>
                      <p className="text-muted-foreground text-xs">{withdrawal.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell><div className="flex items-center gap-2">{getMethodIcon(withdrawal.withdrawal_method)}<span className="capitalize">{withdrawal.withdrawal_method}</span></div></TableCell>
                  <TableCell className="font-medium">€{withdrawal.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                  <TableCell className="text-right">{renderActionButtons(withdrawal)}</TableCell>
                </TableRow>
              ))}
              {filteredWithdrawals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No withdrawals found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {withdrawals.length < totalCount && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Showing {withdrawals.length} of {totalCount} withdrawals</p>
              <Button variant="outline" size="sm" onClick={() => fetchWithdrawals(visibleCount + 20)} disabled={loading}>Load More</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Withdrawal"}
              {actionType === "reject" && "Decline Withdrawal"}
              {actionType === "review" && `Mark as Under Review - ${methodType?.toUpperCase()}`}
            </DialogTitle>
            <DialogDescription>
              {actionType === "review" && methodType === "bank" && "Bank network information is displayed below."}
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p><strong>User:</strong> {selectedWithdrawal.profiles?.full_name}</p>
                <p><strong>Amount:</strong> €{selectedWithdrawal.amount.toLocaleString()}</p>
                <p><strong>Method:</strong> <span className="capitalize">{selectedWithdrawal.withdrawal_method}</span></p>
                {actionType === "review" && methodType === "bank" && bankNetworkInfo.bank && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-semibold">📊 Bank Network: {bankNetworkInfo.bank.network_percentage}% ({bankNetworkInfo.bank.remark})</p>
                    <p className="text-xs mt-1">{bankNetworkInfo.comparison}</p>
                  </div>
                )}
              </div>
              {actionType === "review" && (
                <div><Label>Reason for Review</Label><Textarea placeholder="Why is this withdrawal under review?" value={underReviewReason} onChange={(e) => setUnderReviewReason(e.target.value)} rows={3} /></div>
              )}
              <div><Label>Admin Notes</Label><Textarea placeholder="Add notes about this withdrawal..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedWithdrawal && actionType) {
                  if (actionType === "approve") {
                    updateStatus(selectedWithdrawal.id, selectedWithdrawal.user_id, "approved", selectedWithdrawal.amount);
                  } else if (actionType === "reject") {
                    updateStatus(selectedWithdrawal.id, selectedWithdrawal.user_id, "declined", selectedWithdrawal.amount, adminNotes);
                  } else if (actionType === "review") {
                    updateStatus(selectedWithdrawal.id, selectedWithdrawal.user_id, "review", selectedWithdrawal.amount, underReviewReason);
                  }
                }
              }}
              disabled={processingAction || (actionType === "review" && !underReviewReason.trim())}
              className={
                actionType === "approve" ? "bg-green-600 hover:bg-green-700" :
                actionType === "reject" ? "bg-red-600 hover:bg-red-700" :
                "bg-orange-600 hover:bg-orange-700"
              }
            >
              {actionType === "approve" && "Approve"}
              {actionType === "reject" && "Decline"}
              {actionType === "review" && "Mark as Under Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-purple-600">Approve & Schedule Refund - {methodType?.toUpperCase()}</DialogTitle></DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg"><p><strong>User:</strong> {selectedWithdrawal.profiles?.full_name}</p><p><strong>Amount:</strong> €{selectedWithdrawal.amount.toLocaleString()}</p></div>
              {methodType === "crypto" && (<div><Label>Chain/Network</Label><Select value={chainNetwork} onValueChange={setChainNetwork}><SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger><SelectContent><SelectItem value="Binance Smart Chain">Binance Smart Chain</SelectItem><SelectItem value="Ethereum">Ethereum</SelectItem><SelectItem value="Solana">Solana</SelectItem><SelectItem value="Trust Wallet">Trust Wallet</SelectItem><SelectItem value="Bitcoin">Bitcoin Network</SelectItem></SelectContent></Select></div>)}
              <div><Label>Refund Timer (Minutes)</Label><Select value={refundTimerMinutes.toString()} onValueChange={(v) => setRefundTimerMinutes(parseInt(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5 minutes</SelectItem><SelectItem value="10">10 minutes</SelectItem><SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem></SelectContent></Select></div>
              <div><Label className="required">Refund Reason</Label><Textarea placeholder="Reason for refund..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3} /></div>
              <div><Label>Admin Notes</Label><Textarea placeholder="Internal notes..." value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
            <Button onClick={scheduleRefund} disabled={processingAction || !refundReason.trim()} className="bg-purple-600 hover:bg-purple-700">Approve & Schedule Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!selectedWithdrawal && !actionDialogOpen && !refundDialogOpen} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Withdrawal Details</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectedWithdrawal && downloadReceipt(selectedWithdrawal)}>
                  <Download className="w-4 h-4 mr-1" /> Receipt
                </Button>
                {selectedWithdrawal && (selectedWithdrawal.receipt_url || selectedWithdrawal.payment_proof_url) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      const proofUrl = getFullReceiptUrl(selectedWithdrawal.receipt_url || selectedWithdrawal.payment_proof_url);
                      if (proofUrl) window.open(proofUrl, '_blank');
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Payment Proof
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div><p className="text-muted-foreground text-xs">User</p><p className="font-medium text-sm">{selectedWithdrawal.profiles?.full_name}</p><p className="text-xs text-muted-foreground">{selectedWithdrawal.profiles?.email}</p></div>
                <div><p className="text-muted-foreground text-xs">Amount</p><p className="font-bold text-xl">€{selectedWithdrawal.amount?.toLocaleString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Method</p><p className="font-medium text-sm capitalize">{selectedWithdrawal.withdrawal_method}</p></div>
                <div><p className="text-muted-foreground text-xs">Status</p><p>{getStatusBadge(selectedWithdrawal.status)}</p></div>
                <div><p className="text-muted-foreground text-xs">Date</p><p className="text-xs">{new Date(selectedWithdrawal.created_at).toLocaleString()}</p></div>
                {selectedWithdrawal.txid && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">TXID</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs break-all bg-muted/50 p-1 rounded">{selectedWithdrawal.txid}</code>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(selectedWithdrawal.txid, "TXID")}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Method Details */}
              {selectedWithdrawal.withdrawal_method === "bank" && (
                <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Bank Details</h3><div className="bg-muted/30 p-3 rounded-lg"><p><strong>Bank:</strong> {selectedWithdrawal.bank_name}</p><p><strong>Account:</strong> {selectedWithdrawal.account_number}</p><p><strong>SWIFT:</strong> {selectedWithdrawal.swift_code}</p></div></div>
              )}
              {selectedWithdrawal.withdrawal_method === "crypto" && (
                <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Crypto Details</h3><div className="bg-muted/30 p-3 rounded-lg"><p><strong>Type:</strong> {selectedWithdrawal.crypto_type}</p><p><strong>Wallet:</strong> <code className="text-xs break-all">{selectedWithdrawal.wallet_address}</code></p><p><strong>Network:</strong> {selectedWithdrawal.network}</p></div></div>
              )}
              {selectedWithdrawal.withdrawal_method === "card" && (
                <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Card Details</h3><div className="bg-yellow-500/10 p-3 rounded-lg"><p><strong>Cardholder:</strong> {selectedWithdrawal.cardholder_name}</p><p><strong>Card:</strong> {showFullCardNumber ? selectedWithdrawal.card_number : selectedWithdrawal.card_number_masked}<Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2" onClick={() => setShowFullCardNumber(!showFullCardNumber)}><Eye className="w-3 h-3" /></Button></p><p><strong>Expiry:</strong> {selectedWithdrawal.card_expiry}</p></div></div>
              )}
              {selectedWithdrawal.withdrawal_method === "cash" && (
                <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Delivery Details</h3><div className="bg-muted/30 p-3 rounded-lg"><p><strong>Address:</strong> {selectedWithdrawal.delivery_address}</p><p><strong>Phone:</strong> {selectedWithdrawal.contact_phone}</p></div></div>
              )}

              {/* Payment Proof Preview - FIXED with proper TypeScript casting */}
              {(selectedWithdrawal.receipt_url || selectedWithdrawal.payment_proof_url) && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-sm font-medium">📎 Payment Proof</p>
                    <Button variant="outline" size="sm" onClick={() => window.open(getFullReceiptUrl(selectedWithdrawal.receipt_url || selectedWithdrawal.payment_proof_url), '_blank')}>
                      <Eye className="w-4 h-4 mr-2" /> View Full Size
                    </Button>
                  </div>
                  <div className="border rounded-lg p-3 bg-muted/20 cursor-pointer" onClick={() => window.open(getFullReceiptUrl(selectedWithdrawal.receipt_url || selectedWithdrawal.payment_proof_url), '_blank')}>
                    <img 
                      src={getFullReceiptUrl(selectedWithdrawal.receipt_url || selectedWithdrawal.payment_proof_url)} 
                      alt="Payment Proof" 
                      className="max-h-48 object-contain mx-auto" 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                    />
                  </div>
                </div>
              )}

              {/* Fee Waiver */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div><p className="font-medium flex items-center gap-2"><ToggleLeft className="w-4 h-4" /> Fee Waiver</p><p className="text-sm text-muted-foreground">Waive withdrawal fee for this user</p></div>
                <Switch checked={feeWaiverStatus[selectedWithdrawal.user_id] !== false} onCheckedChange={() => handleToggleFeeWaiver(selectedWithdrawal.user_id, feeWaiverStatus[selectedWithdrawal.user_id] !== false)} />
              </div>

              {/* Admin Notes */}
              {selectedWithdrawal.admin_notes && (
                <div className="border-t pt-4"><p className="text-muted-foreground text-sm font-medium mb-1">Admin Notes</p><p className="text-sm p-3 bg-muted/30 rounded-lg">{selectedWithdrawal.admin_notes}</p></div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWithdrawal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawals;