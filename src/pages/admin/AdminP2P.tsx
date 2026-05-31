// src/pages/admin/AdminP2P.tsx - UPDATED WITH FUNDING_BALANCE & NOTIFICATIONS
import { useState, useEffect, useRef } from "react";
import {
  Users, Plus, Edit, Trash2, Star, CheckCircle, XCircle, Eye, Upload, Copy,
  Send, MessageSquare, Clock, DollarSign, TrendingUp, AlertCircle,
  RefreshCw, Timer, Power, EyeOff, Eye as EyeIcon, Loader2, ThumbsUp, ThumbsDown,
  Download, FileText, Image as ImageIcon, File
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// File helper functions
const getFileIcon = (url: string) => {
  if (!url) return <File className="w-4 h-4" />;
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <ImageIcon className="w-4 h-4" />;
  if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
  if (['doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-blue-500" />;
  if (['txt', 'csv'].includes(ext)) return <FileText className="w-4 h-4 text-gray-500" />;
  return <File className="w-4 h-4" />;
};

const getFileNameFromUrl = (url: string) => {
  if (!url) return 'payment-proof';
  const parts = url.split('/');
  return parts[parts.length - 1] || 'payment-proof';
};

interface P2PVendor {
  id: string;
  full_name: string;
  email: string | null;
  account_name: string;
  account_number: string;
  bank_name: string | null;
  rating: number;
  total_trades: number;
  profile_picture_url: string | null;
  is_active: boolean;
  show_on_market: boolean;
  accepted_currencies: string[];
  accepted_fiat: string[];
  vendor_bio: string | null;
  response_time_minutes: number;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  vendor_instructions: string | null;
  created_at: string;
}

interface P2PTrade {
  id: string;
  user_id: string;
  vendor_id: string;
  amount: number;
  trade_type: string;
  crypto_type: string;
  status: string;
  payment_proof_url: string | null;
  admin_notes: string | null;
  expires_at: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string; phone?: string };
  p2p_vendors?: P2PVendor;
}

interface P2PSettings {
  id: string;
  market_open: boolean;
  default_escrow_minutes: number;
}

export const AdminP2P = () => {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<P2PVendor[]>([]);
  const [trades, setTrades] = useState<P2PTrade[]>([]);
  const [settings, setSettings] = useState<P2PSettings>({ id: "", market_open: true, default_escrow_minutes: 60 });
  const [loading, setLoading] = useState(true);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<P2PVendor | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<P2PTrade | null>(null);
  const [tradeDetailOpen, setTradeDetailOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [activeTab, setActiveTab] = useState<"vendors" | "trades">("trades");
  const [updatingMarket, setUpdatingMarket] = useState(false);
  const [updatingVendor, setUpdatingVendor] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [fileDownloading, setFileDownloading] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<any>(null);
  
  const [stats, setStats] = useState({
    totalTrades: 0,
    pendingApproval: 0,
    activeTrades: 0,
    completedTrades: 0,
    totalVolume: 0,
    activeVendors: 0,
  });

  const [vendorForm, setVendorForm] = useState({
    full_name: "",
    email: "",
    account_name: "",
    account_number: "",
    bank_name: "",
    rating: 5,
    is_active: true,
    show_on_market: true,
    accepted_currencies: ["USDT"],
    accepted_fiat: ["EUR"],
    vendor_bio: "",
    response_time_minutes: 15,
    telegram_chat_id: "",
    telegram_username: "",
    vendor_instructions: "",
  });

  const downloadFile = async (url: string, fileName?: string) => {
    if (!url) {
      toast({ title: "No file to download", variant: "destructive" });
      return;
    }
    
    setFileDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || getFileNameFromUrl(url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast({ title: "Download started" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setFileDownloading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedTrade || hasMarkedRead) return;
    
    try {
      setUnreadCount(0);
      setHasMarkedRead(true);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // ============ UPDATED BALANCE CREDIT FUNCTION - USES FUNDING_BALANCE ============
  const creditUserBalance = async (userId: string, amount: number, tradeId: string, cryptoType: string = "USDT") => {
    try {
      console.log(`[P2P] Adding ${amount} to funding_balance for user ${userId}`);
      
      // Get current funding_balance
      const { data: currentBalance, error: fetchError } = await supabase
        .from("user_balances")
        .select("funding_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) {
        console.error("[P2P] Fetch error:", fetchError);
        toast({ title: "Error fetching balance", variant: "destructive" });
        return false;
      }

      const currentFunding = currentBalance?.funding_balance || 0;
      const newFunding = currentFunding + amount;
      
      console.log(`[P2P] funding_balance: ${currentFunding} + ${amount} = ${newFunding}`);
      
      // Update funding_balance
      const { error: updateError } = await supabase
        .from("user_balances")
        .update({ 
          funding_balance: newFunding,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("[P2P] Update error:", updateError);
        toast({ title: "Update Failed", description: updateError.message, variant: "destructive" });
        return false;
      }
      
      console.log("[P2P] Balance update successful");
      
      // Record transaction
      try {
        await supabase.from("transactions").insert({
          user_id: userId,
          transaction_type: "p2p_buy",
          amount: amount,
          currency: cryptoType,
          crypto_amount: amount,
          crypto_type: cryptoType,
          status: "completed",
          description: `P2P purchase of ${amount} ${cryptoType}`,
          reference_id: tradeId,
        });
        console.log("[P2P] Transaction recorded");
      } catch (txError) {
        console.error("[P2P] Transaction error:", txError);
      }
      
      // Get user profile for notifications
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();
      
      // Send in-app notification to user
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "💰 P2P Trade Completed!",
          message: `${amount} ${cryptoType} has been added to your funding balance.`,
          type: "p2p_trade",
          related_id: tradeId,
          is_read: false,
        });
        console.log("[P2P] In-app notification sent");
      } catch (notifError) {
        console.error("[P2P] Notification error:", notifError);
      }
      
      // Send email notification to user
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            notification_type: "p2p_trade_completed",
            event_data: {
              user_email: userProfile?.email,
              user_name: userProfile?.full_name,
              amount: amount,
              crypto_type: cryptoType,
              trade_id: tradeId,
            }
          }
        });
        console.log("[P2P] Email notification sent");
      } catch (emailError) {
        console.error("[P2P] Email error:", emailError);
      }
      
      // Send admin notification
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            template_name: "custom",
            recipient_email: "universalstocktrade24@gmail.com",
            custom_subject: `💰 P2P Trade Completed - ${amount} ${cryptoType}`,
            custom_html: `
              <h2>P2P Trade Completed</h2>
              <p><strong>User:</strong> ${userProfile?.full_name || 'Unknown'}</p>
              <p><strong>Email:</strong> ${userProfile?.email}</p>
              <p><strong>Amount:</strong> ${amount} ${cryptoType}</p>
              <p><strong>Trade ID:</strong> ${tradeId}</p>
              <p><strong>Balance Updated:</strong> €${newFunding.toLocaleString()}</p>
            `,
          }
        });
        console.log("[P2P] Admin email sent");
      } catch (adminEmailError) {
        console.error("[P2P] Admin email error:", adminEmailError);
      }
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('refreshDashboard'));
      
      toast({ title: "Success", description: `${amount} ${cryptoType} added to user's funding balance` });
      return true;
    } catch (error: any) {
      console.error("[P2P] Critical error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };
  // ============ END BALANCE CREDIT FUNCTION ============

  useEffect(() => {
    fetchData();
    fetchStats();
    fetchSettings();
    
    const tradesSubscription = supabase
      .channel('p2p_trades_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_trades' }, () => {
        fetchData();
        fetchStats();
      })
      .subscribe();
    
    const vendorsSubscription = supabase
      .channel('p2p_vendors_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_vendors' }, () => {
        fetchData();
      })
      .subscribe();
    
    return () => {
      tradesSubscription.unsubscribe();
      vendorsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedTrade) {
      fetchChatMessages(selectedTrade.id);
      setHasMarkedRead(false);
      setUnreadCount(0);
      
      if (selectedTrade.status === "active" && selectedTrade.expires_at) {
        setTimerActive(true);
      }
      
      const subscription = supabase
        .channel(`chat_${selectedTrade.id}`)
        .on('postgres_changes' as any,
          { event: '*', schema: 'public', table: 'p2p_chat_messages', filter: `trade_id=eq.${selectedTrade.id}` },
          () => fetchChatMessages(selectedTrade.id)
        )
        .subscribe();
      
      return () => { subscription.unsubscribe(); };
    }
  }, [selectedTrade]);

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (selectedTrade?.expires_at && selectedTrade.status === "active" && timerActive) {
      timerIntervalRef.current = setInterval(() => {
        const expiry = new Date(selectedTrade.expires_at!).getTime();
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          setTimerActive(false);
          autoExpireTrade();
        }
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [selectedTrade?.expires_at, selectedTrade?.status, timerActive]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchStats = async () => {
    const { data: tradesData } = await supabase.from("p2p_trades").select("*");
    const { data: vendorsData } = await supabase.from("p2p_vendors").select("*").eq("is_active", true);
    
    if (tradesData) {
      setStats({
        totalTrades: tradesData.length,
        pendingApproval: tradesData.filter(t => t.status === "pending_approval").length,
        activeTrades: tradesData.filter(t => t.status === "active").length,
        completedTrades: tradesData.filter(t => t.status === "completed").length,
        totalVolume: tradesData.reduce((sum, t) => sum + (t.amount || 0), 0),
        activeVendors: vendorsData?.length || 0,
      });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase
        .from('p2p_settings' as any)
        .select('*')
        .maybeSingle());
      
      if (error && error.code === 'PGRST116') {
        const { data: newSettings } = await (supabase
          .from('p2p_settings' as any)
          .insert({ market_open: true, default_escrow_minutes: 60 })
          .select()
          .maybeSingle());
        if (newSettings) {
          setSettings({ 
            id: newSettings.id, 
            market_open: newSettings.market_open, 
            default_escrow_minutes: newSettings.default_escrow_minutes 
          });
        }
      } else if (data) {
        setSettings({ 
          id: data.id, 
          market_open: data.market_open, 
          default_escrow_minutes: data.default_escrow_minutes 
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setSettings({ id: "", market_open: true, default_escrow_minutes: 60 });
    }
  };

  const fetchData = async () => {
    try {
      const [vendorsRes, tradesRes] = await Promise.all([
        supabase.from("p2p_vendors").select("*").order("created_at", { ascending: false }),
        supabase.from("p2p_trades").select(`
          *,
          profiles!p2p_trades_user_id_fkey(full_name, email, phone),
          p2p_vendors!p2p_trades_vendor_id_fkey(*)
        `).order("created_at", { ascending: false }),
      ]);

      if (vendorsRes.data) setVendors(vendorsRes.data as unknown as P2PVendor[]);
      if (tradesRes.data) setTrades(tradesRes.data as unknown as P2PTrade[]);
    } catch (error) {
      console.error("Error fetching P2P data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async (tradeId: string) => {
    try {
      const { data } = await (supabase
        .from('p2p_chat_messages' as any)
        .select('*')
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true }));
      
      if (data) setChatMessages(data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const sendChatMessage = async (tradeId: string, userId: string) => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await (supabase
        .from('p2p_chat_messages' as any)
        .insert({
          trade_id: tradeId,
          sender_id: user?.id,
          sender_type: "admin",
          message: newMessage.trim(),
        }));
      
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Admin Message",
        message: newMessage.trim(),
        type: "p2p_chat",
        related_id: tradeId,
      });
      
      await supabase.functions.invoke("send-email", {
        body: {
          notification_type: "p2p_chat_message",
          event_data: {
            trade_id: tradeId,
            message: newMessage.trim(),
            sender_name: "Admin",
            sender_type: "admin",
          }
        }
      });
      
      setNewMessage("");
      fetchChatMessages(tradeId);
      toast({ title: "Message sent" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOpenChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setTimeout(() => {
        markMessagesAsRead();
      }, 500);
    }
  };

  const toggleMarketStatus = async () => {
    if (updatingMarket) return;
    
    setUpdatingMarket(true);
    const newStatus = !settings.market_open;
    
    try {
      let settingsId = settings.id;
      if (!settingsId) {
        const { data: existing } = await (supabase
          .from('p2p_settings' as any)
          .select('id')
          .maybeSingle());
        if (existing) {
          settingsId = existing.id;
        } else {
          const { data: newSettings } = await (supabase
            .from('p2p_settings' as any)
            .insert({ market_open: true, default_escrow_minutes: 60 })
            .select()
            .maybeSingle());
          if (newSettings) settingsId = newSettings.id;
        }
      }
      
      if (settingsId) {
        await (supabase
          .from('p2p_settings' as any)
          .update({ market_open: newStatus })
          .eq('id', settingsId));
        
        setSettings({ ...settings, market_open: newStatus, id: settingsId });
        toast({ title: newStatus ? "Market OPEN" : "Market CLOSED" });
      }
    } catch (error) {
      console.error("Error updating market:", error);
      toast({ title: "Error updating market", variant: "destructive" });
    }
    setUpdatingMarket(false);
  };

  const toggleVendorVisibility = async (vendorId: string, currentStatus: boolean) => {
    if (updatingVendor === vendorId) return;
    
    setUpdatingVendor(vendorId);
    const newStatus = !currentStatus;
    
    const { error } = await supabase
      .from("p2p_vendors")
      .update({ show_on_market: newStatus })
      .eq("id", vendorId);
    
    if (!error) {
      setVendors(vendors.map(v => v.id === vendorId ? { ...v, show_on_market: newStatus } : v));
      toast({ title: newStatus ? "Vendor Visible" : "Vendor Hidden" });
    }
    setUpdatingVendor(null);
  };

  const handleApproveTrade = async (tradeId: string, userId: string, amount: number, cryptoType: string = "USDT") => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + settings.default_escrow_minutes);
    
    const { error } = await (supabase
      .from("p2p_trades")
      .update({
        status: "active",
        expires_at: expiresAt.toISOString(),
      } as any)
      .eq("id", tradeId));
    
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Trade Approved!",
        message: `Your P2P trade of ${amount} ${cryptoType} has been approved. Please complete payment within ${settings.default_escrow_minutes} minutes.`,
        type: "p2p_trade",
        related_id: tradeId,
      });
      
      await supabase.functions.invoke("send-email", {
        body: {
          notification_type: "p2p_trade_approved",
          event_data: { trade_id: tradeId, amount: amount, crypto_type: cryptoType }
        }
      });
      
      toast({ title: "Trade approved! Timer started." });
      fetchData();
      fetchStats();
      if (selectedTrade?.id === tradeId) {
        setSelectedTrade(null);
        setTradeDetailOpen(false);
      }
    }
  };

  const handleDeclineTrade = async (tradeId: string, userId: string, amount: number, reason: string) => {
    const { error } = await supabase
      .from("p2p_trades")
      .update({
        status: "declined",
        admin_notes: reason,
      })
      .eq("id", tradeId);
    
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Trade Declined",
        message: `Your P2P trade of €${amount} was declined. Reason: ${reason}`,
        type: "p2p_trade",
        related_id: tradeId,
      });
      
      await supabase.functions.invoke("send-email", {
        body: {
          notification_type: "p2p_trade_declined",
          event_data: { trade_id: tradeId, amount: amount, reason: reason }
        }
      });
      
      toast({ title: "Trade declined" });
      fetchData();
      fetchStats();
      if (selectedTrade?.id === tradeId) {
        setSelectedTrade(null);
        setTradeDetailOpen(false);
      }
    }
  };

  const handleCompleteTrade = async (tradeId: string, userId: string, amount: number, cryptoType: string = "USDT") => {
    console.log(`[COMPLETE] Starting trade completion for ${tradeId}`);
    console.log(`[COMPLETE] Amount: ${amount}, Crypto: ${cryptoType}, User: ${userId}`);
    
    // First, update the trade status
    const { error: tradeError } = await supabase
      .from("p2p_trades")
      .update({ status: "completed" })
      .eq("id", tradeId);
    
    if (tradeError) {
      console.error("[COMPLETE] Error updating trade status:", tradeError);
      toast({ title: "Error updating trade status", variant: "destructive" });
      return;
    }
    
    console.log("[COMPLETE] Trade status updated to completed");
    
    // Credit the user's balance (uses funding_balance with notifications)
    const credited = await creditUserBalance(userId, amount, tradeId, cryptoType);
    
    if (credited) {
      toast({ title: `Trade completed! ${amount} ${cryptoType} added to user's funding balance.` });
    } else {
      toast({ title: "Trade completed but balance update failed", variant: "destructive" });
    }
    
    fetchData();
    fetchStats();
    setTradeDetailOpen(false);
  };

  const handleCancelTrade = async (tradeId: string, userId: string, amount: number) => {
    if (!confirm("Cancel this trade? This cannot be undone.")) return;
    
    const { error } = await supabase
      .from("p2p_trades")
      .update({ status: "cancelled" })
      .eq("id", tradeId);
    
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Trade Cancelled",
        message: `Your P2P trade of €${amount} has been cancelled.`,
        type: "p2p_trade",
        related_id: tradeId,
      });
      
      await supabase.functions.invoke("send-email", {
        body: {
          notification_type: "p2p_trade_cancelled",
          event_data: { trade_id: tradeId, amount: amount }
        }
      });
      
      toast({ title: "Trade cancelled" });
      fetchData();
      fetchStats();
      setTradeDetailOpen(false);
    }
  };

  const autoExpireTrade = async () => {
    if (!selectedTrade) return;
    
    const { error } = await supabase
      .from("p2p_trades")
      .update({ status: "expired" })
      .eq("id", selectedTrade.id);
    
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: selectedTrade.user_id,
        title: "Trade Expired",
        message: `Your P2P trade of €${selectedTrade.amount} has expired.`,
        type: "p2p_trade",
        related_id: selectedTrade.id,
      });
      
      toast({ title: "Trade expired" });
      fetchData();
      setTradeDetailOpen(false);
    }
  };

  const extendTradeTime = async (tradeId: string, minutes: number) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade?.expires_at) return;
    
    const currentExpiry = new Date(trade.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + minutes * 60000);
    
    const { error } = await (supabase
      .from("p2p_trades")
      .update({ expires_at: newExpiry.toISOString() } as any)
      .eq("id", tradeId));
    
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: trade.user_id,
        title: "Trade Time Extended",
        message: `System has extended your trade time by ${minutes} minutes.`,
        type: "p2p_trade",
        related_id: tradeId,
      });
      
      toast({ title: `Trade time extended by ${minutes} minutes` });
      fetchData();
      if (selectedTrade?.id === tradeId) {
        setTimerActive(true);
      }
    }
  };

  const handleSaveVendor = async () => {
    try {
      const vendorData = {
        full_name: vendorForm.full_name,
        email: vendorForm.email || null,
        account_name: vendorForm.account_name,
        account_number: vendorForm.account_number,
        bank_name: vendorForm.bank_name || null,
        rating: vendorForm.rating,
        is_active: vendorForm.is_active,
        show_on_market: vendorForm.show_on_market,
        accepted_currencies: vendorForm.accepted_currencies,
        accepted_fiat: vendorForm.accepted_fiat,
        vendor_bio: vendorForm.vendor_bio || null,
        response_time_minutes: vendorForm.response_time_minutes,
        telegram_chat_id: vendorForm.telegram_chat_id || null,
        telegram_username: vendorForm.telegram_username || null,
        vendor_instructions: vendorForm.vendor_instructions || null,
      };

      if (editingVendor) {
        await supabase.from("p2p_vendors").update(vendorData).eq("id", editingVendor.id);
        toast({ title: "Vendor updated" });
      } else {
        await supabase.from("p2p_vendors").insert(vendorData);
        toast({ title: "Vendor created" });
      }

      setVendorModalOpen(false);
      setEditingVendor(null);
      resetVendorForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetVendorForm = () => {
    setVendorForm({
      full_name: "",
      email: "",
      account_name: "",
      account_number: "",
      bank_name: "",
      rating: 5,
      is_active: true,
      show_on_market: true,
      accepted_currencies: ["USDT"],
      accepted_fiat: ["EUR"],
      vendor_bio: "",
      response_time_minutes: 15,
      telegram_chat_id: "",
      telegram_username: "",
      vendor_instructions: "",
    });
  };

  const openEditVendor = (vendor: P2PVendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      full_name: vendor.full_name,
      email: vendor.email || "",
      account_name: vendor.account_name,
      account_number: vendor.account_number,
      bank_name: vendor.bank_name || "",
      rating: vendor.rating,
      is_active: vendor.is_active,
      show_on_market: vendor.show_on_market,
      accepted_currencies: vendor.accepted_currencies || ["USDT"],
      accepted_fiat: vendor.accepted_fiat || ["EUR"],
      vendor_bio: vendor.vendor_bio || "",
      response_time_minutes: vendor.response_time_minutes || 15,
      telegram_chat_id: vendor.telegram_chat_id || "",
      telegram_username: vendor.telegram_username || "",
      vendor_instructions: vendor.vendor_instructions || "",
    });
    setVendorModalOpen(true);
  };

  const handleToggleVendorStatus = async (vendor: P2PVendor) => {
    await supabase.from("p2p_vendors").update({ is_active: !vendor.is_active }).eq("id", vendor.id);
    toast({ title: `Vendor ${!vendor.is_active ? "activated" : "deactivated"}` });
    fetchData();
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm("Delete this vendor?")) return;
    await supabase.from("p2p_vendors").delete().eq("id", vendorId);
    toast({ title: "Vendor deleted" });
    fetchData();
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }> = {
      pending_approval: { variant: "secondary", label: "Awaiting Approval", icon: <Clock className="w-3 h-3" /> },
      active: { variant: "default", label: "Active - Send Payment", icon: <Clock className="w-3 h-3" /> },
      payment_sent: { variant: "default", label: "Payment Submitted", icon: <Upload className="w-3 h-3" /> },
      completed: { variant: "default", label: "Completed", icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { variant: "destructive", label: "Cancelled", icon: <XCircle className="w-3 h-3" /> },
      declined: { variant: "destructive", label: "Declined", icon: <XCircle className="w-3 h-3" /> },
      expired: { variant: "destructive", label: "Expired", icon: <AlertCircle className="w-3 h-3" /> },
    };
    const { variant, label, icon } = config[status] || config.pending_approval;
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        {icon}
        {label}
      </Badge>
    );
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">P2P Marketplace</h1>
          <p className="text-muted-foreground">Manage vendors, approve trades, and communicate</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
            <Power className={`w-4 h-4 ${settings.market_open ? "text-green-500" : "text-red-500"}`} />
            <span className="text-sm font-medium">Market</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${!settings.market_open ? "text-muted-foreground" : "text-green-500"}`}>OFF</span>
              <Switch checked={settings.market_open} onCheckedChange={() => toggleMarketStatus()} disabled={updatingMarket} />
              <span className={`text-xs ${settings.market_open ? "text-green-500" : "text-muted-foreground"}`}>ON</span>
            </div>
          </div>
          <Button onClick={() => { setEditingVendor(null); resetVendorForm(); setVendorModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Vendor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Trades</p><p className="text-2xl font-bold">{stats.totalTrades}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Awaiting Approval</p><p className="text-2xl font-bold text-yellow-500">{stats.pendingApproval}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Trades</p><p className="text-2xl font-bold text-blue-500">{stats.activeTrades}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-500">{stats.completedTrades}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Volume</p><p className="text-2xl font-bold">{stats.totalVolume.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Vendors</p><p className="text-2xl font-bold">{stats.activeVendors}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="trades" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="trades">Trades ({trades.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timer</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{format(new Date(trade.created_at), "MMM dd, HH:mm")}</TableCell>
                      <TableCell><div><p className="font-medium">{trade.profiles?.full_name || "Unknown"}</p><p className="text-xs text-muted-foreground">{trade.profiles?.email}</p></div></TableCell>
                      <TableCell>{trade.p2p_vendors?.full_name || "Unknown"}</TableCell>
                      <TableCell>{trade.crypto_type} {trade.amount?.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      <TableCell className="text-sm">{trade.status === "active" && trade.expires_at ? format(new Date(trade.expires_at), "HH:mm:ss") : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedTrade(trade); setTradeDetailOpen(true); fetchChatMessages(trade.id); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {trade.status === "pending_approval" && (
                            <>
                              <Button size="sm" variant="outline" className="text-emerald-500 border-emerald-500" onClick={() => handleApproveTrade(trade.id, trade.user_id, trade.amount, trade.crypto_type)}>
                                <ThumbsUp className="w-4 h-4 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => {
                                const reason = prompt("Enter reason for declining:");
                                if (reason) handleDeclineTrade(trade.id, trade.user_id, trade.amount, reason);
                              }}>
                                <ThumbsDown className="w-4 h-4 mr-1" />Decline
                              </Button>
                            </>
                          )}
                          {(trade.status === "active" || trade.status === "payment_sent") && (
                            <>
                              <Button size="sm" variant="outline" className="text-emerald-500" onClick={() => handleCompleteTrade(trade.id, trade.user_id, trade.amount, trade.crypto_type)}>
                                <CheckCircle className="w-4 h-4 mr-1" />Complete & Credit
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancelTrade(trade.id, trade.user_id, trade.amount)}>
                                <XCircle className="w-4 h-4 mr-1" />Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Currencies</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell><div className="flex items-center gap-3"><Avatar><AvatarFallback>{vendor.full_name.charAt(0)}</AvatarFallback></Avatar><span className="font-medium">{vendor.full_name}</span></div></TableCell>
                      <TableCell>{vendor.email || "-"}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Switch checked={vendor.show_on_market} onCheckedChange={() => toggleVendorVisibility(vendor.id, vendor.show_on_market)} disabled={updatingVendor === vendor.id} />{updatingVendor === vendor.id && <Loader2 className="w-3 h-3 animate-spin" />}</div></TableCell>
                      <TableCell><Badge variant="outline">{vendor.accepted_currencies?.join(", ") || "USDT"}</Badge></TableCell>
                      <TableCell>{vendor.telegram_username || "-"}</TableCell>
                      <TableCell><Badge variant={vendor.is_active ? "default" : "secondary"}>{vendor.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="icon" variant="ghost" onClick={() => openEditVendor(vendor)}><Edit className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => handleToggleVendorStatus(vendor)}>{vendor.is_active ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}</Button><Button size="icon" variant="ghost" onClick={() => handleDeleteVendor(vendor.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trade Detail Modal */}
      <Dialog open={tradeDetailOpen} onOpenChange={setTradeDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Trade Details</DialogTitle></DialogHeader>
          {selectedTrade && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Trade ID</p><p className="font-mono text-sm">{selectedTrade.id.slice(0, 8)}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium">{selectedTrade.crypto_type} {selectedTrade.amount}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>{getStatusBadge(selectedTrade.status)}</div>
                <div><p className="text-xs text-muted-foreground">Timer</p>{selectedTrade.status === "active" && selectedTrade.expires_at && (<div className="flex items-center gap-2"><Timer className="w-4 h-4" /><span className="font-mono">{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : format(new Date(selectedTrade.expires_at), "HH:mm:ss")}</span><Button size="sm" variant="ghost" onClick={() => { const minutes = prompt("Enter minutes to extend:", "15"); if (minutes) extendTradeTime(selectedTrade.id, parseInt(minutes)); }}>Extend</Button></div>)}</div>
              </div>

              <div className="flex items-center justify-between gap-3">
                {selectedTrade.payment_proof_url && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(selectedTrade.payment_proof_url!, '_blank')} className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadFile(selectedTrade.payment_proof_url!)} disabled={fileDownloading} className="flex items-center gap-1">
                      <Download className="w-3 h-3" />Download
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleOpenChat} className="flex items-center gap-1 relative ml-auto">
                  <MessageSquare className="w-3 h-3" />
                  {showChat ? "Hide Chat" : "Show Chat"}
                  {unreadCount > 0 && !showChat && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center rounded-full">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>

              {showChat && (
                <div className="border rounded-lg overflow-hidden bg-background">
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback></Avatar>
                        <div><p className="font-medium text-sm">Admin Support</p><p className="text-xs text-muted-foreground">Online</p></div>
                      </div>
                      {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>}
                    </div>
                  </div>
                  <div className="h-96 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5] dark:bg-[#0B141A]">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8"><MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No messages yet</p></div>
                    )}
                    {chatMessages.map((msg: any) => {
                      const isUnread = msg.sender_type !== "admin" && !hasMarkedRead;
                      return (
                        <div key={msg.id} className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${msg.sender_type === "admin" ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-black dark:text-white rounded-br-none" : "bg-white dark:bg-[#202C33] text-black dark:text-white rounded-bl-none"}`}>
                            <p className="text-sm break-words">{msg.message}</p>
                            {msg.receipt_url && (
                              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-600">
                                <div className="rounded-lg overflow-hidden bg-black/5">
                                  {msg.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <div className="relative group cursor-pointer" onClick={() => window.open(msg.receipt_url, '_blank')}>
                                      <img src={msg.receipt_url} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg" />
                                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); window.open(msg.receipt_url, '_blank'); }}><Eye className="w-3 h-3 mr-1" />View</Button>
                                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); downloadFile(msg.receipt_url, msg.receipt_name); }}><Download className="w-3 h-3 mr-1" />Save</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 flex items-center gap-3">
                                      {getFileIcon(msg.receipt_url)}
                                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{msg.receipt_name || "Payment Receipt"}</p><p className="text-xs opacity-70">{msg.receipt_size || "Document"}</p></div>
                                      <Button variant="ghost" size="sm" className="h-7" onClick={() => window.open(msg.receipt_url, '_blank')}><Eye className="w-3 h-3" /></Button>
                                      <Button variant="ghost" size="sm" className="h-7" onClick={() => downloadFile(msg.receipt_url, msg.receipt_name)}><Download className="w-3 h-3" /></Button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-center mt-1 opacity-70">📎 Payment receipt attached</p>
                              </div>
                            )}
                            <p className="text-xs mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            {isUnread && <span className="text-xs ml-2 text-blue-500 font-semibold">● New</span>}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 border-t bg-background">
                    <div className="flex gap-2">
                      <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-full" onKeyPress={(e) => e.key === 'Enter' && sendChatMessage(selectedTrade.id, selectedTrade.user_id)} />
                      <Button size="icon" className="rounded-full" onClick={() => sendChatMessage(selectedTrade.id, selectedTrade.user_id)} disabled={!newMessage.trim()}><Send className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">Reply will be sent to user and Telegram</p>
                  </div>
                </div>
              )}

              {selectedTrade.status === "pending_approval" && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveTrade(selectedTrade.id, selectedTrade.user_id, selectedTrade.amount, selectedTrade.crypto_type)}>
                    <ThumbsUp className="w-4 h-4 mr-2" />Approve Trade
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { const reason = prompt("Enter reason for declining:"); if (reason) handleDeclineTrade(selectedTrade.id, selectedTrade.user_id, selectedTrade.amount, reason); }}>
                    <ThumbsDown className="w-4 h-4 mr-2" />Decline Trade
                  </Button>
                </div>
              )}
              {(selectedTrade.status === "active" || selectedTrade.status === "payment_sent") && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleCompleteTrade(selectedTrade.id, selectedTrade.user_id, selectedTrade.amount, selectedTrade.crypto_type)}>
                    <CheckCircle className="w-4 h-4 mr-2" />Complete & Credit Funds
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleCancelTrade(selectedTrade.id, selectedTrade.user_id, selectedTrade.amount)}>
                    <XCircle className="w-4 h-4 mr-2" />Cancel Trade
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTradeDetailOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Vendor Modal */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div><h3 className="font-semibold border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4 mt-4"><div><Label>Full Name *</Label><Input value={vendorForm.full_name} onChange={(e) => setVendorForm({...vendorForm, full_name: e.target.value})} /></div><div><Label>Email</Label><Input value={vendorForm.email} onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})} type="email" /></div><div className="col-span-2"><Label>Bio / Description</Label><Textarea value={vendorForm.vendor_bio} onChange={(e) => setVendorForm({...vendorForm, vendor_bio: e.target.value})} rows={2} /></div></div>
            </div>
            <div><h3 className="font-semibold border-b pb-2">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4 mt-4"><div><Label>Bank Name</Label><Input value={vendorForm.bank_name} onChange={(e) => setVendorForm({...vendorForm, bank_name: e.target.value})} /></div><div><Label>Account Name</Label><Input value={vendorForm.account_name} onChange={(e) => setVendorForm({...vendorForm, account_name: e.target.value})} /></div><div><Label>Account Number</Label><Input value={vendorForm.account_number} onChange={(e) => setVendorForm({...vendorForm, account_number: e.target.value})} /></div><div><Label>Rating (1-5)</Label><Select value={vendorForm.rating.toString()} onValueChange={(v) => setVendorForm({...vendorForm, rating: parseInt(v)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(r => <SelectItem key={r} value={r.toString()}>{"★".repeat(r)} ({r})</SelectItem>)}</SelectContent></Select></div></div>
            </div>
            <div><h3 className="font-semibold border-b pb-2">Currency Settings</h3>
              <div className="grid grid-cols-2 gap-4 mt-4"><div><Label>Crypto Currencies</Label><Input value={vendorForm.accepted_currencies.join(", ")} onChange={(e) => setVendorForm({...vendorForm, accepted_currencies: e.target.value.split(",").map(c => c.trim())})} placeholder="USDT, BTC, ETH" /></div><div><Label>Fiat Currencies</Label><Input value={vendorForm.accepted_fiat.join(", ")} onChange={(e) => setVendorForm({...vendorForm, accepted_fiat: e.target.value.split(",").map(c => c.trim())})} placeholder="EUR, USD, GBP" /></div><div><Label>Response Time (minutes)</Label><Input type="number" value={vendorForm.response_time_minutes} onChange={(e) => setVendorForm({...vendorForm, response_time_minutes: parseInt(e.target.value)})} /></div></div>
            </div>
            <div><h3 className="font-semibold border-b pb-2">Vendor Notes</h3><Textarea value={vendorForm.vendor_instructions} onChange={(e) => setVendorForm({...vendorForm, vendor_instructions: e.target.value})} rows={3} placeholder="Instructions for buyers..." /></div>
            <div><h3 className="font-semibold border-b pb-2">Telegram Integration</h3>
              <div className="grid grid-cols-2 gap-4 mt-4"><div><Label>Telegram Chat ID</Label><Input value={vendorForm.telegram_chat_id} onChange={(e) => setVendorForm({...vendorForm, telegram_chat_id: e.target.value})} placeholder="123456789" /></div><div><Label>Telegram Username</Label><Input value={vendorForm.telegram_username} onChange={(e) => setVendorForm({...vendorForm, telegram_username: e.target.value})} placeholder="@username" /></div></div>
              <p className="text-xs text-muted-foreground mt-2">⚠️ Note: All vendor messages will be forwarded to the main admin Telegram account.</p>
            </div>
            <div><h3 className="font-semibold border-b pb-2">Visibility Settings</h3>
              <div className="flex items-center justify-between mt-4"><span>Show on P2P Market</span><Switch checked={vendorForm.show_on_market} onCheckedChange={(v) => setVendorForm({...vendorForm, show_on_market: v})} /></div>
              <div className="flex items-center justify-between mt-2"><span>Vendor Active</span><Switch checked={vendorForm.is_active} onCheckedChange={(v) => setVendorForm({...vendorForm, is_active: v})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setVendorModalOpen(false)}>Cancel</Button><Button onClick={handleSaveVendor}>{editingVendor ? "Update Vendor" : "Create Vendor"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminP2P;