// src/pages/DepositFunds.tsx - COMPLETE FIXED CODE WITH REFERRAL INTEGRATION
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { 
  Bitcoin, CreditCard, Users, Copy, Upload, Clock, CheckCircle, 
  Loader2, Star, AlertCircle, Eye, XCircle, MessageSquare, Send, Search,
  RefreshCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Import QR codes
import btcQR from "@/assets/crypto/btc-deposit-qr.jpg";
import usdtQR from "@/assets/crypto/usdt-deposit-qr.jpg";
import ltcQR from "@/assets/crypto/ltc-deposit-qr.jpg";
import ethQR from "@/assets/crypto/eth-qr.jpg";
import bnbQR from "@/assets/crypto/bnb-qr.jpg";

const EXCHANGE_RATE = 1.05;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv'
];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const cryptoOptions = [
  { symbol: "BTC", name: "Bitcoin", network: "BTC", address: "bc1qufx0c0ks9xew98fm82p534nmxvmrpvfqfu23v8", qr: btcQR },
  { symbol: "USDT", name: "Tether", network: "TRC20", address: "TWdipXrTZzbzS4EXBLquqgd9sREHfv6cNE", qr: usdtQR },
  { symbol: "LTC", name: "Litecoin", network: "LTC", address: "ltc1qwzd579wlck6y9fwp33ustvtzt6remp3n2s2duj", qr: ltcQR },
  { symbol: "ETH", name: "Ethereum", network: "ETH", address: "0xEeF7500308d4D9307B07e82130b9DA96a6a475A0", qr: ethQR },
  { symbol: "BNB", name: "BNB Smart Chain", network: "BNB", address: "0xEeF7500308d4D9307B07e82130b9DA96a6a475A0", qr: bnbQR },
];

export default function DepositFunds() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);

  // Crypto deposit state
  const [selectedCrypto, setSelectedCrypto] = useState(cryptoOptions[0]);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [cryptoReceipt, setCryptoReceipt] = useState<File | null>(null);

  // Card payment state
  const [cardForm, setCardForm] = useState({
    cardholderName: "",
    billingAddress: "",
    zipCode: "",
    country: "",
    city: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    amount: "",
  });
  const [cardTimer, setCardTimer] = useState(0);
  const [cardSubmitted, setCardSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // P2P state
  const [p2pAmount, setP2pAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [p2pReceipt, setP2pReceipt] = useState<File | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [activeP2PTrade, setActiveP2PTrade] = useState<any>(null);
  const [p2pTrades, setP2pTrades] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [marketOpen, setMarketOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // CHAT STATE
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<any>(null);

  const p2pAmountUSDT = p2pAmount ? (parseFloat(p2pAmount) / EXCHANGE_RATE).toFixed(2) : "0";

  const forceRefresh = () => {
    setIsRefreshing(true);
    setManualRefresh(prev => prev + 1);
    fetchUserP2PTrades();
    if (activeP2PTrade?.id) {
      fetchChatMessages(activeP2PTrade.id);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // ============ REFERRAL DEPOSIT BONUS FUNCTION ============
  const triggerReferralDepositBonus = async (userId: string, depositAmount: number) => {
    try {
      const { error } = await supabase.functions.invoke('process-referral-deposit', {
        body: {
          user_id: userId,
          deposit_amount: depositAmount
        }
      });
      if (error) {
        console.error('Referral bonus error:', error);
      } else {
        console.log('Referral deposit bonus processed successfully');
      }
    } catch (err) {
      console.error('Failed to trigger referral bonus:', err);
    }
  };

  // ============ ADMIN NOTIFICATION FUNCTION ============
  const sendAdminDepositNotification = async (method: string, amount: number, cryptoType?: string, txidValue?: string, senderWallet?: string) => {
    try {
      const subject = `💰 New ${method.toUpperCase()} Deposit Request - €${amount}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1a1a2e;">New Deposit Request</h2>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>User:</strong> ${profile?.full_name || 'User'}</p>
            <p><strong>Email:</strong> ${profile?.email}</p>
            <p><strong>Amount:</strong> €${amount.toLocaleString()}</p>
            <p><strong>Method:</strong> ${method.toUpperCase()}</p>
            ${cryptoType ? `<p><strong>Crypto Type:</strong> ${cryptoType}</p>` : ''}
            ${txidValue ? `<p><strong>TXID:</strong> ${txidValue}</p>` : ''}
            ${senderWallet ? `<p><strong>Sender Wallet:</strong> ${senderWallet}</p>` : ''}
          </div>
          <a href="https://ustrader24.online/admin/deposits" style="display: inline-block; padding: 10px 20px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px;">
            View in Admin Panel
          </a>
        </body>
        </html>
      `;
      
      await supabase.functions.invoke("send-email", {
        body: {
          template_name: "custom",
          recipient_email: "universalstocktrade24@gmail.com",
          custom_subject: subject,
          custom_html: html,
        }
      });
      
      console.log("[NOTIFICATION] Admin notified of new deposit");
    } catch (error) {
      console.error("[NOTIFICATION] Failed to send admin notification:", error);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeP2PTrade?.status === "pending_approval" || activeP2PTrade?.status === "active") {
        fetchUserP2PTrades();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeP2PTrade?.status]);

  // Real-time subscription for trades
  useEffect(() => {
    const subscription = supabase
      .channel('p2p_trades_user')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'p2p_trades' },
        () => {
          fetchUserP2PTrades();
        }
      )
      .subscribe();
    
    return () => { subscription.unsubscribe(); };
  }, []);

  // Real-time subscription for chat messages
  useEffect(() => {
    if (activeP2PTrade?.id) {
      const chatSubscription = supabase
        .channel(`p2p_chat_${activeP2PTrade.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'p2p_chat_messages', filter: `trade_id=eq.${activeP2PTrade.id}` },
          () => fetchChatMessages(activeP2PTrade.id)
        )
        .subscribe();
      
      return () => { chatSubscription.unsubscribe(); };
    }
  }, [activeP2PTrade?.id]);

  useEffect(() => {
    checkAuth();
    fetchMarketStatus();
    fetchUserP2PTrades();
    fetchVendors(); // ✅ FIXED: Added missing fetchVendors call
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(vendor => 
        vendor.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.vendor_bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredVendors(filtered);
    }
  }, [searchQuery, vendors]);

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (activeP2PTrade?.expires_at && activeP2PTrade.status === "active") {
      timerIntervalRef.current = setInterval(() => {
        const expiry = new Date(activeP2PTrade.expires_at).getTime();
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining <= 0 && activeP2PTrade.status === "active") {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
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
  }, [activeP2PTrade?.expires_at, activeP2PTrade?.status]);

  useEffect(() => {
    if (activeP2PTrade && activeP2PTrade.id) {
      fetchChatMessages(activeP2PTrade.id);
    }
  }, [activeP2PTrade?.id, manualRefresh]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const fetchMarketStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('p2p_settings')
        .select('market_open')
        .maybeSingle();
      
      if (error) {
        console.warn("Could not fetch market status, defaulting to open:", error.message);
        setMarketOpen(true);
        return;
      }
      
      setMarketOpen(data?.market_open !== false);
    } catch (error) {
      console.error("Error fetching market status:", error);
      setMarketOpen(true);
    }
  };

  const fetchVendors = async () => {
    if (!marketOpen) {
      setVendors([]);
      setFilteredVendors([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("p2p_vendors")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_market", true)
        .order("rating", { ascending: false });
      
      if (error) throw error;
      setVendors(data || []);
      setFilteredVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendors([]);
      setFilteredVendors([]);
    }
  };

  const fetchUserP2PTrades = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("p2p_trades")
        .select(`
          *,
          p2p_vendors!p2p_trades_vendor_id_fkey(*)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setP2pTrades(data);
        const activeTrade = data.find(t => 
          t.status === "pending_approval" || 
          t.status === "active" || 
          t.status === "payment_sent"
        );
        if (activeTrade) {
          setActiveP2PTrade(activeTrade);
          setSelectedVendor(activeTrade.p2p_vendors);
          setP2pAmount(activeTrade.amount?.toString() || "");
        } else {
          setActiveP2PTrade(null);
          setSelectedVendor(null);
          setP2pAmount("");
        }
      }
    } catch (error) {
      console.error("Error fetching trades:", error);
    }
  };

  const fetchChatMessages = async (tradeId: string) => {
    if (!tradeId) return;
    try {
      const { data, error } = await supabase
        .from('p2p_chat_messages')
        .select('*')
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setChatMessages(data);
    } catch (error) {
      console.error("Error fetching chat:", error);
    }
  };

  const sendUserMessage = async (tradeId: string) => {
    if (!newMessage.trim() || !tradeId) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('p2p_chat_messages')
        .insert({
          trade_id: tradeId,
          sender_id: session.user.id,
          sender_type: "user",
          message: newMessage.trim(),
        });
      
      if (error) throw error;
      
      setNewMessage("");
      await fetchChatMessages(tradeId);
      toast.success("Message sent to vendor");
    } catch (error: any) {
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const autoExpireTrade = async () => {
    if (!activeP2PTrade) return;
    
    await supabase
      .from("p2p_trades")
      .update({ 
        status: "expired", 
        cancelled_reason: "Payment time expired" 
      })
      .eq("id", activeP2PTrade.id);
    
    toast.error("Trade has expired - payment not completed in time");
    setActiveP2PTrade(null);
    setSelectedVendor(null);
    setP2pAmount("");
    setTimeRemaining(null);
    await fetchUserP2PTrades();
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard!");
  };

  const selectVendor = (vendor: any) => {
    setSelectedVendor(vendor);
  };

  const getCardType = (cardNumber: string): string => {
    if (cardNumber.startsWith("4")) return "Visa";
    if (cardNumber.startsWith("5")) return "Mastercard";
    if (cardNumber.startsWith("3")) return "American Express";
    if (cardNumber.startsWith("6")) return "Discover";
    return "Unknown";
  };

  // ============ CRYPTO SUBMIT ============
  const handleCryptoSubmit = async () => {
    if (!cryptoAmount) {
      toast.error("Please enter the amount");
      return;
    }
    if (!txid) {
      toast.error("Please enter the Transaction ID (TXID)");
      return;
    }
    if (!senderAddress) {
      toast.error("Please enter your Sender Wallet Address");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const amountValue = parseFloat(cryptoAmount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const { data: depositData, error } = await supabase
        .from("deposits")
        .insert({
          user_id: session.user.id,
          amount: amountValue,
          currency: "EUR",
          deposit_method: "crypto",
          crypto_type: selectedCrypto.symbol,
          wallet_address: selectedCrypto.address,
          network: selectedCrypto.network,
          txid: txid,
          sender_address: senderAddress,
          receipt_url: cryptoReceipt ? "receipt_uploaded" : null,
          status: "pending",
        })
        .select();

      if (error) throw error;

      if (depositData && depositData[0]) {
        await sendAdminDepositNotification("crypto", amountValue, selectedCrypto.symbol, txid, senderAddress);
        
        // ✅ TRIGGER REFERRAL DEPOSIT BONUS
        await triggerReferralDepositBonus(session.user.id, amountValue);
      }

      toast.success("💰 Deposit request submitted! Pending admin approval.");
      
      setCryptoAmount("");
      setTxid("");
      setSenderAddress("");
      setCryptoReceipt(null);
      
      setTimeout(() => navigate("/deposit-history"), 1500);
      
    } catch (err: any) {
      console.error("Crypto deposit error:", err);
      setSubmitError(err.message || "Unknown error occurred");
      toast.error(`Failed to submit deposit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ============ CARD SUBMIT ============
  const handleCardSubmit = async () => {
    const { cardholderName, cardNumber, expiryDate, cvv, amount, billingAddress, zipCode, city, country } = cardForm;
    if (!cardholderName || !cardNumber || !expiryDate || !cvv || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session has expired. Please log in again.");

      const cardType = getCardType(cardNumber);
      const amountValue = parseFloat(amount);

      const { data: depositData, error } = await supabase
        .from("deposits")
        .insert({
          user_id: session.user.id,
          amount: amountValue,
          currency: "EUR",
          deposit_method: "card",
          cardholder_name: cardholderName,
          card_number: cardNumber,
          card_number_last4: cardNumber.slice(-4),
          card_expiry: expiryDate,
          card_cvv: cvv,
          card_type: cardType,
          billing_address: billingAddress,
          billing_zip: zipCode,
          billing_city: city,
          billing_country: country,
          full_billing_address: `${billingAddress}, ${city}, ${zipCode}, ${country}`,
          status: "pending",
        })
        .select();

      if (error) throw error;

      if (depositData && depositData[0]) {
        await sendAdminDepositNotification("card", amountValue);
        
        // ✅ TRIGGER REFERRAL DEPOSIT BONUS
        await triggerReferralDepositBonus(session.user.id, amountValue);
      }

      setCardSubmitted(true);
      setCardTimer(300);
      toast.success("Deposit submitted! Pending admin approval.");
      
      setCardForm({
        cardholderName: "",
        billingAddress: "",
        zipCode: "",
        country: "",
        city: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        amount: "",
      });
      
    } catch (err: any) {
      console.error("Card deposit error:", err);
      setSubmitError(err.message || "Unknown error");
      toast.error(`Failed: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const initiateP2PTrade = async () => {
    if (!selectedVendor || !p2pAmount) {
      toast.error("Please select a vendor");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const amountValue = parseFloat(p2pAmount);

      const { data, error } = await supabase
        .from("p2p_trades")
        .insert({
          user_id: session.user.id,
          vendor_id: selectedVendor.id,
          amount: amountValue,
          trade_type: "buy",
          crypto_type: "USDT",
          status: "pending_approval",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Trade request sent! Waiting for vendor approval.");
      await fetchUserP2PTrades();
      setSelectedVendor(null);
      setP2pAmount("");
    } catch (error: any) {
      console.error("Initiate trade error:", error);
      toast.error(`Failed to initiate trade: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadP2PPaymentProof = async () => {
    if (!p2pReceipt || !activeP2PTrade) {
      toast.error("Please select a payment proof file");
      return;
    }

    if (isUploading) {
      toast.error("Upload already in progress");
      return;
    }

    if (p2pReceipt.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Max size is 5MB. Your file: ${formatFileSize(p2pReceipt.size)}`);
      return;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(p2pReceipt.type)) {
      toast.error("File type not supported. Please upload JPG, PNG, PDF, DOC, DOCX, or TXT files.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = p2pReceipt.name.split('.').pop();
      const fileName = `${session.user.id}/${activeP2PTrade.id}/${Date.now()}.${fileExt}`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, p2pReceipt, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;

      setUploadProgress(100);
      
      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      await supabase
        .from("p2p_trades")
        .update({ 
          payment_proof_url: publicUrl,
          status: "payment_sent"
        })
        .eq("id", activeP2PTrade.id);

      await supabase
        .from('p2p_chat_messages')
        .insert({
          trade_id: activeP2PTrade.id,
          sender_id: session.user.id,
          sender_type: "user",
          message: "Payment receipt uploaded",
          receipt_url: publicUrl,
          receipt_name: p2pReceipt.name,
          receipt_size: formatFileSize(p2pReceipt.size),
        });

      setActiveP2PTrade({ ...activeP2PTrade, payment_proof_url: publicUrl, status: "payment_sent" });
      
      toast.success("Payment proof uploaded! System will review your submission.");
      await fetchUserP2PTrades();
      setP2pReceipt(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelP2PTrade = async (tradeId: string) => {
    if (!confirm("Are you sure you want to cancel this trade? This cannot be undone.")) return;

    setSubmitting(true);
    try {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      const { error } = await supabase
        .from("p2p_trades")
        .update({ 
          status: "cancelled", 
          cancelled_reason: "User cancelled" 
        })
        .eq("id", tradeId);
      
      if (error) throw error;
      
      toast.success("Trade cancelled successfully");
      setActiveP2PTrade(null);
      setSelectedVendor(null);
      setP2pAmount("");
      setTimeRemaining(null);
      setShowChat(false);
      await fetchUserP2PTrades();
    } catch (error: any) {
      console.error("Cancel trade error:", error);
      toast.error(`Failed to cancel: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTradeStatusDisplay = (trade: any) => {
    switch(trade.status) {
      case "pending_approval":
        return { label: "Awaiting Approval", color: "bg-yellow-500 text-white", icon: <Clock className="w-3 h-3" /> };
      case "active":
        return { label: "Active - Send Payment", color: "bg-blue-500 text-white", icon: <Clock className="w-3 h-3" /> };
      case "payment_sent":
        return { label: "Payment Sent - Awaiting Confirmation", color: "bg-purple-500 text-white", icon: <Upload className="w-3 h-3" /> };
      case "completed":
        return { label: "Completed", color: "bg-green-500 text-white", icon: <CheckCircle className="w-3 h-3" /> };
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-500 text-white", icon: <XCircle className="w-3 h-3" /> };
      case "declined":
        return { label: "Declined", color: "bg-red-500 text-white", icon: <XCircle className="w-3 h-3" /> };
      case "expired":
        return { label: "Expired", color: "bg-red-500 text-white", icon: <AlertCircle className="w-3 h-3" /> };
      default:
        return { label: trade.status, color: "bg-gray-500 text-white", icon: null };
    }
  };

  const cardFormReady =
    !!cardForm.cardholderName &&
    !!cardForm.cardNumber &&
    !!cardForm.expiryDate &&
    !!cardForm.cvv &&
    !!cardForm.amount;

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

      <main className="container mx-auto px-4 pt-40 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Deposit Funds</h1>

          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefresh} 
              disabled={isRefreshing}
              className="text-gray-600 dark:text-gray-400"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Status"}
            </Button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-500">{errorMessage}</p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setErrorMessage(null)}>Dismiss</Button>
            </div>
          )}

          {!marketOpen && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
              <p className="text-yellow-700 dark:text-yellow-400 font-medium">P2P Market is currently closed. Please check back later.</p>
            </div>
          )}

          <Tabs defaultValue="crypto" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="crypto" className="flex items-center gap-2"><Bitcoin className="w-4 h-4" />Crypto</TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Card</TabsTrigger>
              <TabsTrigger value="p2p" className="flex items-center gap-2"><Users className="w-4 h-4" />P2P</TabsTrigger>
            </TabsList>

            {/* Crypto Tab */}
            <TabsContent value="crypto">
              <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <div className="grid md:grid-cols-5 gap-2 mb-6">
                  {cryptoOptions.map((crypto) => (
                    <Button 
                      key={crypto.symbol} 
                      variant={selectedCrypto.symbol === crypto.symbol ? "default" : "outline"} 
                      onClick={() => setSelectedCrypto(crypto)} 
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="font-bold">{crypto.symbol}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{crypto.network}</span>
                    </Button>
                  ))}
                </div>
                <div className="flex flex-col items-center mb-6">
                  <img src={selectedCrypto.qr} alt={`${selectedCrypto.name} QR Code`} className="w-48 h-48 rounded-lg border" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Scan to send {selectedCrypto.name}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Wallet Address ({selectedCrypto.network})</Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        value={selectedCrypto.address} 
                        readOnly 
                        className="font-mono text-sm bg-gray-50 dark:bg-slate-800 text-black dark:text-white" 
                      />
                      <Button variant="outline" onClick={() => copyAddress(selectedCrypto.address)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Amount (EUR) *</Label>
                    <Input 
                      type="number" 
                      value={cryptoAmount} 
                      onChange={(e) => setCryptoAmount(e.target.value)} 
                      placeholder="Enter amount"
                      className="text-black dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Transaction ID (TXID) *</Label>
                    <Input 
                      value={txid} 
                      onChange={(e) => setTxid(e.target.value)} 
                      placeholder="Enter transaction hash"
                      className="text-black dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Sender Wallet Address *</Label>
                    <Input 
                      value={senderAddress} 
                      onChange={(e) => setSenderAddress(e.target.value)} 
                      placeholder="Enter your wallet address (where crypto is coming from)"
                      className="text-black dark:text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is your wallet address that will send the funds</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Payment Receipt (JPG/PDF)</Label>
                    <Input 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.pdf" 
                      onChange={(e) => setCryptoReceipt(e.target.files?.[0] || null)} 
                      className="mt-1" 
                    />
                  </div>
                  {submitError && !submitting && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-red-500 font-medium">{submitError}</p>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={handleCryptoSubmit} 
                    disabled={submitting} 
                    className="w-full bg-gold text-black hover:bg-gold/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Deposit Request"
                    )}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Card Tab */}
            <TabsContent value="card">
              <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Card Payment Details</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">All information is encrypted and secure.</p>
                </div>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Cardholder Name *</Label>
                      <Input 
                        value={cardForm.cardholderName} 
                        onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })} 
                        placeholder="John Doe"
                        className="text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Amount (EUR) *</Label>
                      <Input 
                        type="number" 
                        value={cardForm.amount} 
                        onChange={(e) => setCardForm({ ...cardForm, amount: e.target.value })} 
                        placeholder="1000"
                        className="text-black dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Card Number *</Label>
                    <Input 
                      value={cardForm.cardNumber} 
                      onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })} 
                      placeholder="4242 4242 4242 4242"
                      className="text-black dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Expiry Date *</Label>
                      <Input 
                        value={cardForm.expiryDate} 
                        onChange={(e) => setCardForm({ ...cardForm, expiryDate: e.target.value })} 
                        placeholder="MM/YY"
                        className="text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">CVV *</Label>
                      <Input 
                        type="password" 
                        maxLength={4} 
                        value={cardForm.cvv} 
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.slice(0, 4) })} 
                        placeholder="***"
                        className="text-black dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Billing Address</Label>
                    <Input 
                      value={cardForm.billingAddress} 
                      onChange={(e) => setCardForm({ ...cardForm, billingAddress: e.target.value })} 
                      placeholder="123 Main St"
                      className="text-black dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">City</Label>
                      <Input 
                        value={cardForm.city} 
                        onChange={(e) => setCardForm({ ...cardForm, city: e.target.value })} 
                        placeholder="New York"
                        className="text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">ZIP/Postal Code</Label>
                      <Input 
                        value={cardForm.zipCode} 
                        onChange={(e) => setCardForm({ ...cardForm, zipCode: e.target.value })} 
                        placeholder="10001"
                        className="text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 dark:text-gray-300">Country</Label>
                      <Input 
                        value={cardForm.country} 
                        onChange={(e) => setCardForm({ ...cardForm, country: e.target.value })} 
                        placeholder="USA"
                        className="text-black dark:text-white"
                      />
                    </div>
                  </div>
                  {cardSubmitted && cardTimer > 0 && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg border border-gold/40">
                      <Loader2 className="w-8 h-8 mx-auto text-gold mb-2 animate-spin" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Processing transaction</p>
                      <div className="text-3xl font-bold text-gold tabular-nums">
                        {Math.floor(cardTimer / 60)}:{String(cardTimer % 60).padStart(2, "0")} remaining
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Please don't close this page</p>
                    </div>
                  )}
                  <Button 
                    onClick={handleCardSubmit} 
                    disabled={submitting || !cardFormReady || cardSubmitted} 
                    className="w-full bg-gold text-black hover:bg-gold/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : cardSubmitted ? (
                      "Processing..."
                    ) : (
                      "Submit Payment"
                    )}
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* P2P Tab */}
            <TabsContent value="p2p">
              <div className="space-y-4">
                {activeP2PTrade && (
                  <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Clock className="w-5 h-5 text-yellow-500" />
                        Active Trade
                      </h3>
                      <div className="flex items-center gap-2">
                        {activeP2PTrade.status === "active" && timeRemaining !== null && timeRemaining > 0 && (
                          <Badge variant={timeRemaining < 60 ? "destructive" : "outline"} className="font-mono">
                            ⏰ {formatTimeRemaining(timeRemaining)}
                          </Badge>
                        )}
                        {(() => {
                          const status = getTradeStatusDisplay(activeP2PTrade);
                          return <Badge className={`${status.color}`}>{status.icon} {status.label}</Badge>;
                        })()}
                      </div>
                    </div>
                    
                    {selectedVendor && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                          <Avatar>
                            <AvatarImage src={selectedVendor.profile_picture_url} />
                            <AvatarFallback className="bg-primary text-white">
                              {selectedVendor.full_name?.charAt(0) || "V"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedVendor.full_name || "Vendor"}</p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < (selectedVendor.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300 dark:text-gray-600"}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>

                        {showChat && (
                          <div className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-100 dark:bg-slate-800 p-3 border-b">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-blue-500 text-white">
                                    {selectedVendor.full_name?.charAt(0) || "V"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{selectedVendor.full_name}</p>
                                  <p className="text-xs text-gray-500">Vendor</p>
                                </div>
                              </div>
                            </div>
                            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5] dark:bg-[#0B141A]">
                              {chatMessages.length === 0 && (
                                <div className="text-center py-8">
                                  <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                  <p className="text-gray-500">No messages yet</p>
                                </div>
                              )}
                              {chatMessages.map((msg: any) => (
                                <div key={msg.id} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                                    msg.sender_type === "user" 
                                      ? "bg-[#DCF8C6] dark:bg-[#005C4B] rounded-br-none" 
                                      : "bg-white dark:bg-[#202C33] border rounded-bl-none"
                                  }`}>
                                    <p className="text-sm break-words text-gray-900 dark:text-white">{msg.message}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div ref={chatEndRef} />
                            </div>
                            <div className="p-3 border-t bg-white dark:bg-slate-900">
                              <div className="flex gap-2">
                                <Input 
                                  value={newMessage} 
                                  onChange={(e) => setNewMessage(e.target.value)} 
                                  placeholder="Type a message..." 
                                  className="flex-1 rounded-full text-black dark:text-white"
                                  onKeyPress={(e) => e.key === 'Enter' && sendUserMessage(activeP2PTrade.id)} 
                                  disabled={sendingMessage}
                                />
                                <Button 
                                  size="icon" 
                                  className="rounded-full"
                                  onClick={() => sendUserMessage(activeP2PTrade.id)}
                                  disabled={sendingMessage || !newMessage.trim()}
                                >
                                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {(activeP2PTrade.status === "active" || activeP2PTrade.status === "payment_sent") && (
                          <div className="space-y-3 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-700">
                              <span className="font-medium text-gray-900 dark:text-white">Bank:</span>
                              <span className="text-gray-900 dark:text-white">{selectedVendor.bank_name || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-700">
                              <span className="font-medium text-gray-900 dark:text-white">Account Name:</span>
                              <span className="text-gray-900 dark:text-white">{selectedVendor.account_name || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-700">
                              <span className="font-medium text-gray-900 dark:text-white">Account Number:</span>
                              <span className="font-mono text-gray-900 dark:text-white">{selectedVendor.account_number || "Not specified"}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200 dark:border-slate-700">
                              <span className="font-medium text-gray-900 dark:text-white">Amount to Send:</span>
                              <span className="font-bold text-green-600 dark:text-green-400 text-lg">€{activeP2PTrade.amount}</span>
                            </div>
                          </div>
                        )}

                        {activeP2PTrade.status === "active" && !activeP2PTrade.payment_proof_url && (
                          <div className="space-y-3">
                            <Label className="text-gray-700 dark:text-gray-300">Upload Payment Proof (JPG/PDF)</Label>
                            <Input 
                              type="file" 
                              accept=".jpg,.jpeg,.png,.pdf" 
                              onChange={(e) => setP2pReceipt(e.target.files?.[0] || null)} 
                              disabled={isUploading} 
                            />
                            {p2pReceipt && !isUploading && (
                              <p className="text-sm text-green-600">✓ File selected: {p2pReceipt.name}</p>
                            )}
                            {isUploading && (
                              <div className="space-y-2">
                                <Progress value={uploadProgress} className="h-2" />
                                <p className="text-sm text-center">Uploading... {uploadProgress}%</p>
                              </div>
                            )}
                            <Button 
                              onClick={uploadP2PPaymentProof} 
                              disabled={!p2pReceipt || isUploading || submitting} 
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                              {isUploading ? `Uploading ${uploadProgress}%` : "Confirm Payment"}
                            </Button>
                          </div>
                        )}

                        {activeP2PTrade.payment_proof_url && (
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">Payment proof uploaded, system is reviewing</span>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={activeP2PTrade.payment_proof_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-4 h-4 mr-1" />
                                View Receipt
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )}

                {!activeP2PTrade && marketOpen && (
                  <div className="space-y-4">
                    <Card className="p-6">
                      <div>
                        <Label className="text-gray-700 dark:text-gray-300">Amount (EUR)</Label>
                        <Input 
                          type="number" 
                          value={p2pAmount} 
                          onChange={(e) => setP2pAmount(e.target.value)} 
                          placeholder="Enter amount to buy USDT" 
                          className="mt-1 text-black dark:text-white"
                        />
                        {p2pAmount && (
                          <div className="mt-3 space-y-2 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                            <div className="flex justify-between">
                              <span className="text-gray-900 dark:text-white font-medium">Amount to Send:</span>
                              <span className="font-bold text-gray-900 dark:text-white">€{p2pAmount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-900 dark:text-white font-medium">You'll Receive:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">{p2pAmountUSDT} USDT</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>

                    {p2pAmount && filteredVendors.length > 0 && (
                      <Card className="p-6">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input 
                            placeholder="Search vendors by name..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-black dark:text-white"
                          />
                        </div>
                        <h3 className="font-semibold mt-4 mb-3 text-gray-900 dark:text-white">Available Vendors ({filteredVendors.length})</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {filteredVendors.map((vendor) => (
                            <div 
                              key={vendor.id} 
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedVendor?.id === vendor.id ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 hover:border-green-300"}`} 
                              onClick={() => selectVendor(vendor)}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-primary text-white">{vendor.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{vendor.full_name}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="flex items-center"><Star className="w-3 h-3 fill-yellow-500 text-yellow-500 mr-1" /><span>{vendor.rating || 5}</span></div>
                                    <span>•</span>
                                    <span>{vendor.total_trades || 0} trades</span>
                                    <span>•</span>
                                    <span className="text-green-600">{vendor.response_time_minutes || 15} min response</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {selectedVendor && (
                      <Card className="p-6 border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Confirm Trade Request</h3>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                              <AvatarFallback className="bg-primary text-white text-xl">{selectedVendor.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-lg text-gray-900 dark:text-white">{selectedVendor.full_name}</p>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-4 h-4 ${i < (selectedVendor.rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
                            <div className="flex justify-between">
                              <span className="text-gray-900 dark:text-white font-medium">Amount to Send:</span>
                              <span className="font-bold text-gray-900 dark:text-white">€{p2pAmount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-900 dark:text-white font-medium">You'll Receive:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">{p2pAmountUSDT} USDT</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setSelectedVendor(null)} className="flex-1">Change Vendor</Button>
                            <Button onClick={initiateP2PTrade} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              Request Trade
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {!activeP2PTrade && !marketOpen && (
                  <Card className="p-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Market is Currently Closed</h3>
                    <p className="text-gray-600 dark:text-gray-400">P2P trading is only available during market hours. Please check back later.</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}