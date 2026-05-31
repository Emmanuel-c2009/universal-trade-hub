// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";

export default function BlockchainGateway() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState(null);
  const [gatewayAddresses, setGatewayAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [txid, setTxid] = useState("");
  const [countdown, setCountdown] = useState(300);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState("withdrawal");
  const [faqOpen, setFaqOpen] = useState({});
  
  // Auto-Shuffle states
  const [shuffleSettings, setShuffleSettings] = useState({
    enabled: false,
    interval: 1,
    mode: "random"
  });
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const [isShuffleActive, setIsShuffleActive] = useState(false);
  const shuffleTimerRef = useRef(null);
  const addressCycleCountRef = useRef(0);

  // Load TradingView Widget
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"]');
    if (existingScript) existingScript.remove();
    
    const script = document.createElement('script');
    script.src = 'https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
    script.type = 'module';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    loadData();
    loadShuffleSettings();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      if (paymentSubmitted) return;
      toast.error("Payment window expired. Please start a new withdrawal request.");
      stopShuffleTimer();
      sessionStorage.removeItem("pendingWithdrawal");
      setTimeout(() => navigate("/withdraw"), 2000);
      return;
    }
    const interval = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [countdown, navigate, paymentSubmitted]);

  useEffect(() => {
    if (!isShuffleActive || !shuffleSettings.enabled || gatewayAddresses.length <= 1) return;

    if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);

    const intervalMs = shuffleSettings.interval * 60 * 1000;
    shuffleTimerRef.current = setInterval(() => performAddressShuffle(), intervalMs);

    return () => {
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    };
  }, [isShuffleActive, shuffleSettings, gatewayAddresses]);

  const loadShuffleSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("settings_value")
        .eq("settings_key", "auto_shuffle_settings")
        .single();

      if (!error && data) {
        const settings = data.settings_value;
        setShuffleSettings({
          enabled: settings?.enabled || false,
          interval: settings?.interval || 1,
          mode: settings?.mode || "random"
        });
        
        const shouldShuffle = sessionStorage.getItem("auto_shuffle_active") === "true";
        setIsShuffleActive(shouldShuffle && (settings?.enabled || false));
      }
    } catch (error) {
      console.error("Error loading shuffle settings:", error);
    }
  };

  const performAddressShuffle = () => {
    if (!gatewayAddresses.length || paymentSubmitted) return;

    let newAddress;
    let newIndex;
    let message = "";

    if (shuffleSettings.mode === "random") {
      const availableAddresses = gatewayAddresses.filter(addr => addr.id !== selectedAddress?.id);
      if (availableAddresses.length === 0) {
        newAddress = gatewayAddresses[0];
        newIndex = 0;
      } else {
        const randomIndex = Math.floor(Math.random() * availableAddresses.length);
        newAddress = availableAddresses[randomIndex];
        newIndex = gatewayAddresses.findIndex(addr => addr.id === newAddress.id);
      }
      message = "🔄 Payment address has been changed randomly";
    } else {
      const currentIdx = gatewayAddresses.findIndex(addr => addr.id === selectedAddress?.id);
      const nextIdx = (currentIdx + 1) % gatewayAddresses.length;
      newIndex = nextIdx;
      newAddress = gatewayAddresses[nextIdx];
      
      if (nextIdx === 0 && currentIdx !== -1) addressCycleCountRef.current++;
      
      if (addressCycleCountRef.current >= 1) {
        toast.warning("⚠️ All addresses have been cycled. Transaction cancelled.");
        stopShuffleTimer();
        sessionStorage.removeItem("pendingWithdrawal");
        setTimeout(() => navigate("/withdraw"), 3000);
        return;
      }
      message = `🔄 Payment address has been changed (${currentIdx + 1} → ${nextIdx + 1} of ${gatewayAddresses.length})`;
    }

    setSelectedAddress(newAddress);
    setShuffleIndex(newIndex);
    setCountdown(300);
    toast.info(message, { duration: 5000 });
    console.log(`Auto-shuffle: Address changed to ${newAddress.crypto_symbol} - ${newAddress.wallet_address.substring(0, 20)}...`);
  };

  const stopShuffleTimer = () => {
    if (shuffleTimerRef.current) {
      clearInterval(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    setIsShuffleActive(false);
    sessionStorage.setItem("auto_shuffle_active", "false");
  };

  // ============ EMAIL NOTIFICATION FUNCTIONS ============
  const sendEmailNotification = async (email, subject, html) => {
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          template_name: "custom",
          recipient_email: email,
          custom_subject: subject,
          custom_html: html,
        }
      });
      console.log("Email sent successfully:", subject);
      return true;
    } catch (error) {
      console.error("Email error:", error);
      return false;
    }
  };

  const sendUserNotification = async (userId, title, message, type, relatedId) => {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: title,
        message: message,
        type: type,
        related_id: relatedId,
        is_read: false,
      });
      console.log("Notification created:", title);
    } catch (error) {
      console.error("Notification error:", error);
    }
  };

  const sendPaymentSubmittedEmail = async (userEmail, userName, amount, txid, method, withdrawalId) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Proof Submitted</h1>
          </div>
          <div style="padding: 30px;">
            <p>Dear ${userName || "Valued Customer"},</p>
            <div style="text-align: center; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">€${amount.toLocaleString()}</div>
            </div>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Transaction ID:</strong> ${withdrawalId?.slice(0, 12)}</p>
              <p><strong>TXID:</strong> ${txid}</p>
              <p><strong>Method:</strong> ${method?.toUpperCase()}</p>
              <p><strong>Status:</strong> <span style="color: #f59e0b;">Pending Admin Review</span></p>
            </div>
            <p>Your blockchain fee payment proof has been submitted. Our team will verify it within 1-2 business days.</p>
            <a href="https://ustrader24.online/withdrawal-history" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: black; text-decoration: none; border-radius: 5px;">Track Withdrawal</a>
          </div>
        </div>
      </body>
      </html>
    `;
    return sendEmailNotification(userEmail, "Payment Proof Received - Under Review", html);
  };

  const loadData = async () => {
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
    setProfile(profileData);

    const pending = sessionStorage.getItem("pendingWithdrawal");
    if (!pending) {
      toast.error("No pending withdrawal found");
      navigate("/withdraw");
      return;
    }

    const parsed = JSON.parse(pending);
    const calculatedFee = (parsed.originalAmount * parsed.feePercent) / 100;
    parsed.feeAmount = calculatedFee;
    setWithdrawalData(parsed);

    const { data: addresses, error } = await supabase
      .from("blockchain_addresses")
      .select("*")
      .eq("address_type", "gateway")
      .eq("is_active", true);

    if (error) {
      console.error("Error loading gateway addresses:", error);
      toast.error("Failed to load payment methods");
    }

    console.log("Loaded gateway addresses from database:", addresses);
    setGatewayAddresses(addresses || []);
    
    const shouldShuffle = sessionStorage.getItem("auto_shuffle_active") === "true";
    
    if (addresses && addresses.length > 0) {
      if (shouldShuffle && shuffleSettings.enabled) {
        setSelectedAddress(addresses[0]);
        setIsShuffleActive(true);
        toast.info("Auto-shuffle mode is active. Address will change automatically.", { duration: 5000 });
      } else {
        setSelectedAddress(addresses[0]);
      }
    } else {
      toast.error("No payment methods available. Please contact support.");
    }

    setCountdown(5 * 60);
    setLoading(false);
  };

  const copyAddress = () => {
    if (selectedAddress?.wallet_address) {
      navigator.clipboard.writeText(selectedAddress.wallet_address);
      toast.success("Address copied to clipboard!");
    }
  };

  const handleConnectWallet = () => {
    window.open('https://trustwallet.com/connect', '_blank');
    toast.info("Opening wallet connection...");
  };

  // ============ FIXED: UPDATED PAYMENT SUBMIT WITH EMAIL NOTIFICATIONS ============
  const handlePaymentSubmit = async () => {
    if (!txid) {
      toast.error("Please enter Transaction ID (TXID)");
      return;
    }
    if (!receipt) {
      toast.error("Please upload payment receipt");
      return;
    }
    if (!selectedAddress) {
      toast.error("Please select a payment method");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired");
      
      let receiptUrl = null;
      const fileName = `fee_payments/${session.user.id}/${Date.now()}-${receipt.name}`;
      const { error: uploadError } = await supabase.storage
        .from("deposit-proofs")
        .upload(fileName, receipt);
      
      if (!uploadError) receiptUrl = fileName;
      
      const pending = sessionStorage.getItem("pendingWithdrawal");
      const pendingData = pending ? JSON.parse(pending) : null;
      const withdrawalId = pendingData?.requestId || null;
      
      // Record fee payment
      const { error: paymentError } = await supabase.from("blockchain_fee_payments").insert({
        user_id: session.user.id,
        withdrawal_request_id: withdrawalId,
        amount: withdrawalData?.feeAmount || 0,
        method: withdrawalData?.method,
        gateway_address: selectedAddress.wallet_address,
        crypto_type: selectedAddress.crypto_symbol,
        network: selectedAddress.network,
        txid: txid,
        receipt_url: receiptUrl,
        status: "pending",
      });
      
      if (paymentError) throw paymentError;
      
      // CRITICAL FIX: Update withdrawal status from "pending_fee" to "pending"
      // This allows admin to see and approve the withdrawal
      if (withdrawalId) {
        const { error: updateError } = await supabase
          .from("withdrawals")
          .update({ 
            status: "pending",  // ← CHANGED from "processing" to "pending"
            fee_paid: true,
            fee_amount: withdrawalData?.feeAmount,
            fee_txid: txid,
            receipt_url: receiptUrl,
            payment_proof_url: receiptUrl,
            payment_proof_uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", withdrawalId);
        
        if (updateError) {
          console.error("Error updating withdrawal status:", updateError);
        } else {
          console.log("Withdrawal status updated to pending for admin review");
        }
      }
      
      // Send email notification to user
      await sendPaymentSubmittedEmail(
        session.user.email,
        profile?.full_name,
        withdrawalData?.feeAmount || 0,
        txid,
        withdrawalData?.method,
        withdrawalId
      );
      
      // Send notification to user's dashboard bell
      await sendUserNotification(
        session.user.id,
        "💰 Fee Payment Submitted",
        `Your blockchain fee payment of €${(withdrawalData?.feeAmount || 0).toLocaleString()} has been submitted and is pending admin verification.`,
        "withdrawal",
        withdrawalId
      );
      
      setPaymentSubmitted(true);
      toast.success("✅ Fee payment submitted! Admin will verify shortly.");
      
      // Stop auto-shuffle if active
      stopShuffleTimer();
      sessionStorage.removeItem("pendingWithdrawal");
      
      setTimeout(() => navigate("/withdrawal-history"), 3000);
    } catch (error) {
      console.error("Payment submission error:", error);
      toast.error("Failed to submit payment: " + (error.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Cancel withdrawal?')) {
      stopShuffleTimer();
      sessionStorage.removeItem("pendingWithdrawal");
      toast.info("Withdrawal cancelled.");
      navigate("/withdraw");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = () => (countdown / 300) * 100;

  const toggleFaq = (id) => {
    setFaqOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCryptoIcon = (symbol) => {
    const icons = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'USDT': '◈',
      'LTC': 'Ł',
      'BCH': '₿',
      'BNB': '◈',
      'TRX': '◈',
      'SOL': '◎',
      'XRP': '✕',
      'DOGE': 'Ð',
    };
    return icons[symbol] || '🪙';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0821] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DA123E]"></div>
      </div>
    );
  }

  if (paymentSubmitted) {
    return (
      <div className="min-h-screen bg-[#0b0821] pb-20 lg:pb-0">
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <DashboardHeader userName={profile?.full_name || "Trader"} onMenuClick={() => setSidebarOpen(true)} />
        <main className="container mx-auto px-4 pt-40 max-w-2xl">
          <div className="bg-gradient-to-r from-[#1a0b2e] to-[#0b0821] border border-[#DA123E]/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Submitted Successfully!</h2>
            <p className="text-[#9ea1a8] mb-6">Your blockchain fee payment has been received. Your withdrawal is now under review.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-[#0c6cf2] to-[#DA123E] text-white px-6 py-2 rounded-full text-sm font-medium">Go to Dashboard</button>
              <button onClick={() => navigate("/withdraw")} className="bg-transparent border border-[#DA123E]/50 text-[#DA123E] px-6 py-2 rounded-full text-sm font-medium">New Withdrawal</button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const withdrawAmount = withdrawalData?.originalAmount || 10000;
  const feePercent = withdrawalData?.feePercent || 8;
  const feeAmount = withdrawalData?.feeAmount || (withdrawAmount * feePercent) / 100;

  return (
    <div className="min-h-screen bg-[#0b0821] text-white">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader userName={profile?.full_name || "Trader"} onMenuClick={() => setSidebarOpen(true)} avatarUrl={profile?.avatar_url} verificationStatus={profile?.profile_status} />

      {/* Navigation Bar */}
      <div className="navbar" style={{ background: '#0b0821', borderBottom: '1px solid #1a0b2e', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="nav-container" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '56px' }}>
          <div className="logo" onClick={() => setCurrentPage("withdrawal")} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="220" height="30" viewBox="0 0 220 30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: '30px', width: 'auto' }}>
              <g transform="translate(0, 3)">
                <path d="M3.9 7L12 11L20.1 7L14 0.9C13.7 0.6 12.92 0.1 12 0.1C11.08 0.1 10.3 0.6 10 0.9L3.9 7Z" fill="#BD0E4E"/>
                <path d="M23 9.9L21.8 8.7L13.1 12.9V23.7C13.3 23.7 13.9 23.3 14.1 23.1C14.3 22.9 22.7 14.5333 23 14.2C23.3 13.8667 23.9 12.96 23.9 12C23.9 11.04 23.3 10.2 23 9.9Z" fill="#B40D2C"/>
                <path d="M1 9.9L2.2 8.7L10.9 12.9V23.7C10.7 23.7 10.1 23.3 9.9 23.1C9.7 22.9 1.3 14.5333 1 14.2C0.7 13.8667 0.1 12.96 0.1 12C0.1 11.04 0.7 10.2 1 9.9Z" fill="#DA123E"/>
              </g>
              <text x="28" y="14" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#FFFFFF" letterSpacing="1">POPPY</text>
              <text x="28" y="24" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="600" fill="#DA123E" letterSpacing="1.2">BLOCKCHAIN</text>
            </svg>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <a onClick={() => setCurrentPage("products")} style={{ color: '#9ea1a8', textDecoration: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Products</a>
            <a onClick={() => setCurrentPage("resources")} style={{ color: '#9ea1a8', textDecoration: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Resources</a>
            <a onClick={() => setCurrentPage("learn")} style={{ color: '#9ea1a8', textDecoration: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Learn</a>
          </div>
        </div>
      </div>

      {/* Withdrawal Page */}
      {currentPage === "withdrawal" && (
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          {/* Auto-Shuffle Status Banner */}
          {isShuffleActive && (
            <div className="mb-4 p-3 bg-gradient-to-r from-[#DA123E]/20 to-[#0c6cf2]/20 border border-[#DA123E]/30 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-[#DA123E]">🔄</span>
                <span className="text-white">Auto-Shuffle Active</span>
                <span className="text-[#9ea1a8]">• Changes every {shuffleSettings.interval} min</span>
                <span className="text-[#9ea1a8]">• Mode: {shuffleSettings.mode === "random" ? "Random" : "Sequential"}</span>
              </div>
            </div>
          )}

          {/* Animated Blockchain Logo Header */}
          <div className="visual-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', padding: '30px 0 15px', background: 'linear-gradient(180deg, #0b0821 0%, #1a0b2e 100%)' }}>
            <div className="blockchain-logo" style={{ 
              width: '160px',
              height: 'auto',
              animation: 'float 4s ease-in-out infinite, glowPulse 4s ease-in-out infinite'
            }}>
              <svg width="162" height="24" viewBox="0 0 162 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
                <g clipPath="url(#clip0_1073_394)">
                  <g clipPath="url(#clip1_1073_394)">
                    <path d="M3.89999 7.00001L12 11L20.1 7.00001L14 0.900006C13.7 0.600006 12.92 0.100006 12 0.100006C11.08 0.100006 10.3 0.600006 9.99999 0.900006L3.89999 7.00001Z" fill="#BD0E4E"/>
                    <path d="M23 9.9L21.8 8.7L13.1 12.9V23.7C13.3 23.7 13.9 23.3 14.1 23.1C14.3 22.9 22.7 14.5333 23 14.2C23.3 13.8667 23.9 12.96 23.9 12C23.9 11.04 23.3 10.2 23 9.9Z" fill="#B40D2C"/>
                    <path d="M0.999993 9.9L2.19999 8.7L10.9 12.9V23.7C10.7 23.7 10.1 23.3 9.89999 23.1C9.69999 22.9 1.29999 14.5333 0.999993 14.2C0.699994 13.8667 0.0999937 12.96 0.0999937 12C0.0999937 11.04 0.699994 10.2 0.999993 9.9Z" fill="#DA123E"/>
                  </g>
                </g>
                <path d="M157.241 13.197C157.241 12.126 156.975 11.3475 156.444 10.8615C155.922 10.3665 155.216 10.119 154.325 10.119C153.767 10.119 153.267 10.245 152.826 10.497C152.385 10.74 152.034 11.082 151.773 11.523C151.512 11.955 151.382 12.45 151.382 13.008L150.464 12.8595C150.464 11.6535 150.72 10.623 151.233 9.768C151.746 8.913 152.394 8.256 153.177 7.797C153.96 7.329 154.761 7.095 155.58 7.095C156.552 7.095 157.407 7.302 158.145 7.716C158.892 8.13 159.477 8.742 159.9 9.552C160.332 10.353 160.548 11.334 160.548 12.495V21H157.241V13.197ZM148.061 7.5H151.382V21H148.061V7.5Z" fill="white"/>
                <path d="M142.29 2L145.84 2V5.5H142.29V2ZM142.398 7.5H145.719V21H142.398V7.5Z" fill="white"/>
                <path d="M139.073 7.5V18H140.333V21H138.766C137.109 21 135.766 19.6569 135.766 18V7.5H139.073ZM136.792 14.196C136.792 15.627 136.567 16.8825 136.117 17.9625C135.676 19.0335 135.05 19.866 134.24 20.46C133.439 21.054 132.499 21.351 131.419 21.351C130.285 21.351 129.29 21.054 128.435 20.46C127.589 19.866 126.928 19.0335 126.451 17.9625C125.983 16.8825 125.749 15.627 125.749 14.196C125.749 12.765 125.983 11.5185 126.451 10.4565C126.928 9.3945 127.589 8.571 128.435 7.986C129.29 7.392 130.285 7.095 131.419 7.095C132.499 7.095 133.439 7.392 134.24 7.986C135.05 8.571 135.676 9.3945 136.117 10.4565C136.567 11.5185 136.792 12.765 136.792 14.196ZM129.11 14.196C129.11 15.555 129.403 16.608 129.988 17.355C130.582 18.102 131.396 18.4755 132.431 18.4755C133.493 18.4755 134.312 18.102 134.888 17.355C135.473 16.608 135.766 15.555 135.766 14.196C135.766 12.855 135.473 11.8155 134.888 11.0775C134.312 10.3395 133.493 9.9705 132.431 9.9705C131.396 9.9705 130.582 10.3395 129.988 11.0775C129.403 11.8155 129.11 12.855 129.11 14.196Z" fill="white"/>
                <path d="M120.373 13.197C120.373 12.126 120.108 11.3475 119.577 10.8615C119.055 10.3665 118.348 10.119 117.457 10.119C116.899 10.119 116.395 10.245 115.945 10.497C115.504 10.74 115.153 11.082 114.892 11.523C114.64 11.955 114.514 12.45 114.514 13.008L113.583 12.8595C113.592 11.6535 113.853 10.623 114.366 9.76801C114.879 8.91301 115.527 8.25601 116.31 7.79701C117.093 7.32901 117.894 7.09501 118.713 7.09501C119.685 7.09501 120.54 7.30201 121.278 7.71601C122.025 8.13001 122.61 8.74201 123.033 9.55201C123.465 10.353 123.681 11.334 123.681 12.495V21H120.373V13.197ZM111.22 2H114.514V21H111.193L111.22 2Z" fill="white"/>
                <path d="M96.3403 14.196C96.3403 12.765 96.6193 11.5185 97.1773 10.4565C97.7353 9.3945 98.5138 8.571 99.5128 7.986C100.521 7.392 101.695 7.095 103.036 7.095C104.242 7.095 105.327 7.3245 106.29 7.7835C107.253 8.2425 108.022 8.8995 108.598 9.7545C109.174 10.6005 109.48 11.6175 109.516 12.8055H106.155C106.119 11.8695 105.817 11.163 105.25 10.686C104.683 10.209 103.945 9.9705 103.036 9.9705C101.983 9.9705 101.164 10.3395 100.579 11.0775C100.003 11.8155 99.7153 12.855 99.7153 14.196C99.7153 15.555 100.003 16.608 100.579 17.355C101.164 18.102 101.983 18.4755 103.036 18.4755C103.936 18.4755 104.67 18.2595 105.237 17.8275C105.804 17.3955 106.11 16.7475 106.155 15.8835H109.516C109.453 17.0355 109.134 18.021 108.558 18.84C107.982 19.65 107.217 20.271 106.263 20.703C105.309 21.135 104.233 21.351 103.036 21.351C101.704 21.351 100.534 21.054 99.5263 20.46C98.5273 19.866 97.7443 19.0335 97.1773 17.9625C96.6193 16.8825 96.3403 15.627 96.3403 14.196Z" fill="white"/>
                <path d="M84.0549 2L87.4027 2L87.3759 21H84.0549L84.0549 2ZM93 7.5H97L91.2504 13.899L96.8934 21H92.9649L88.8204 15.7755L87.0789 17.8815L85.8774 15.573L93 7.5Z" fill="white"/>
                <path d="M68.9047 14.196C68.9047 12.765 69.1837 11.5185 69.7417 10.4565C70.2997 9.3945 71.0782 8.571 72.0772 7.986C73.0852 7.392 74.2597 7.095 75.6007 7.095C76.8067 7.095 77.8912 7.3245 78.8542 7.7835C79.8172 8.2425 80.5867 8.8995 81.1627 9.7545C81.7387 10.6005 82.0447 11.6175 82.0807 12.8055H78.7192C78.6832 11.8695 78.3817 11.163 77.8147 10.686C77.2477 10.209 76.5097 9.9705 75.6007 9.9705C74.5477 9.9705 73.7287 10.3395 73.1437 11.0775C72.5677 11.8155 72.2797 12.855 72.2797 14.196C72.2797 15.555 72.5677 16.608 73.1437 17.355C73.7287 18.102 74.5477 18.4755 75.6007 18.4755C76.5007 18.4755 77.2342 18.2595 77.8012 17.8275C78.3682 17.3955 78.6742 16.7475 78.7192 15.8835H82.0807C82.0177 17.0355 81.6982 18.021 81.1222 18.84C80.5462 19.65 79.7812 20.271 78.8272 20.703C77.8732 21.135 76.7977 21.351 75.6007 21.351C74.2687 21.351 73.0987 21.054 72.0907 20.46C71.0917 19.866 70.3087 19.0335 69.7417 17.9625C69.1837 16.8825 68.9047 15.627 68.9047 14.196Z" fill="white"/>
                <path d="M54.099 14.196C54.099 12.765 54.378 11.5185 54.936 10.4565C55.503 9.3945 56.2905 8.571 57.2985 7.986C58.3065 7.392 59.481 7.095 60.822 7.095C62.154 7.095 63.3195 7.392 64.3185 7.986C65.3265 8.571 66.1095 9.3945 66.6675 10.4565C67.2255 11.5185 67.5045 12.765 67.5045 14.196C67.5045 15.627 67.2255 16.8825 66.6675 17.9625C66.1095 19.0335 65.3265 19.866 64.3185 20.46C63.3195 21.054 62.154 21.351 60.822 21.351C59.481 21.351 58.3065 21.054 57.2985 20.46C56.2905 19.866 55.503 19.0335 54.936 17.9625C54.378 16.8825 54.099 15.627 54.099 14.196ZM64.1295 14.196C64.1295 12.855 63.837 11.8155 63.252 11.0775C62.676 10.3395 61.866 9.9705 60.822 9.9705C59.769 9.9705 58.9455 10.3395 58.3515 11.0775C57.7665 11.8155 57.474 12.855 57.474 14.196C57.474 15.555 57.7665 16.608 58.3515 17.355C58.9455 18.102 59.769 18.4755 60.822 18.4755C61.866 18.4755 62.676 18.102 63.252 17.355C63.837 16.608 64.1295 15.555 64.1295 14.196Z" fill="white"/>
                <path d="M48.7734 2L52.1212 2V21H48.8002L48.7734 2Z" fill="white"/>
                <path d="M40.895 2C41.9632 2 42.9024 2.20446 43.7127 2.61337C44.5322 3.02229 45.1676 3.58699 45.6188 4.30746C46.07 5.01819 46.2956 5.8555 46.2956 6.81937C46.2956 7.77351 46.0608 8.62542 45.5912 9.3751C45.1308 10.1248 44.5046 10.6895 43.7127 11.0692C44.7164 11.4586 45.5129 12.0915 46.1022 12.9677C46.7007 13.8342 47 14.8468 47 16.0054C47 16.9985 46.779 17.8698 46.337 18.6195C45.9042 19.3692 45.2919 19.9534 44.5 20.372C43.7081 20.7907 42.7873 21 41.7376 21H32V2H40.895ZM40.4945 5.08148H35.3978V9.81322H40.4945C41.2403 9.81322 41.8158 9.59416 42.221 9.15603C42.6262 8.70817 42.8287 8.11427 42.8287 7.37433C42.8287 6.66359 42.6262 6.10377 42.221 5.69485C41.8158 5.28593 41.2403 5.08148 40.4945 5.08148ZM40.7017 12.8801H35.3978V17.9331H40.9088C41.7007 17.9331 42.3315 17.7141 42.8011 17.2759C43.2799 16.8281 43.5193 16.2342 43.5193 15.4942C43.5193 14.6861 43.2615 14.0484 42.7459 13.5811C42.2394 13.1138 41.558 12.8801 40.7017 12.8801Z" fill="white"/>
                <defs>
                  <clipPath id="clip0_1073_394">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                  <clipPath id="clip1_1073_394">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="shadow" style={{ 
              position: 'absolute', 
              bottom: '5px', 
              width: '100px', 
              height: '15px', 
              background: 'rgba(218, 18, 62, 0.3)', 
              borderRadius: '50%', 
              filter: 'blur(8px)', 
              animation: 'shadowScale 4s ease-in-out infinite' 
            }}></div>
          </div>

          {/* TradingView Ticker */}
          <div className="ticker-container" style={{ marginBottom: '20px', borderRadius: '14px', overflowX: 'auto' }}>
            <script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js"></script>
            <tv-ticker-tape 
              symbols="BINANCE:XRPUSDT,BINANCE:SOLUSDT,BINANCE:DOGEUSDT,BINANCE:BNBUSDT,ICMARKETS:BTCUSD"
              symbol-url="https://www.ustrader24.online/"
              no-arrows>
            </tv-ticker-tape>
          </div>

          <div className="page-header" style={{ marginBottom: '20px' }}>
            <div className="page-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a0b2e', padding: '5px 12px', borderRadius: '40px', fontSize: '11px', color: '#DA123E', marginBottom: '16px' }}>
              <span>🔗</span> Blockchain Network Fee
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'white', marginBottom: '6px', letterSpacing: '-0.3px' }}>Complete blockchain payment</h1>
            <p style={{ color: '#9ea1a8', fontSize: '13px' }}>Pay the network fee to process your withdrawal</p>
          </div>

          {/* Timer */}
          <div className="timer-card" style={{ background: 'rgba(26, 11, 46, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
            <div className="timer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div className="timer-label" style={{ color: '#9ea1a8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><span>⏱️</span> Payment window</div>
              <div className="timer-value" id="timerDisplay" style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 700, color: '#DA123E', letterSpacing: '1px' }}>{formatTime(countdown)}</div>
            </div>
            <div className="progress-track" style={{ height: '4px', background: '#1a0b2e', borderRadius: '4px', overflow: 'hidden' }}>
              <div className="progress-fill" id="progressFill" style={{ width: `${getProgressPercent()}%`, height: '100%', background: 'linear-gradient(90deg, #0c6cf2, #DA123E)', borderRadius: '4px', transition: 'width 0.3s linear' }}></div>
            </div>
            <div className="timer-note" style={{ fontSize: '10px', color: '#6a6d75', marginTop: '10px' }}>Complete payment before timer expires</div>
          </div>

          {/* Withdrawal summary */}
          <div className="card" style={{ background: 'rgba(26, 11, 46, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '20px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>Withdrawal summary</div>
            <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(218, 18, 62, 0.15)', flexWrap: 'wrap' }}>
              <span className="summary-label" style={{ color: '#9ea1a8', fontSize: '13px' }}>Withdrawal amount</span>
              <span className="summary-value" style={{ fontWeight: 500, color: 'white', fontSize: '13px' }}>€{withdrawAmount.toLocaleString()}</span>
            </div>
            <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(218, 18, 62, 0.15)', flexWrap: 'wrap' }}>
              <span className="summary-label" style={{ color: '#9ea1a8', fontSize: '13px' }}>Network fee ({feePercent}%)</span>
              <span className="summary-value fee-value" style={{ fontWeight: 600, color: '#DA123E', fontSize: '13px' }}>€{feeAmount.toLocaleString()}</span>
            </div>
            <div className="summary-row payable-row" style={{ borderTop: '1px solid rgba(218, 18, 62, 0.3)', borderBottom: 'none', marginTop: '6px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className="summary-label payable-label" style={{ fontWeight: 600, fontSize: '14px', color: '#9ea1a8' }}>Payable amount:</span>
              <span className="payable-amount" style={{ fontSize: '22px', fontWeight: 700, color: '#DA123E' }}>€{feeAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Explanation Box */}
          <div className="explanation-box" style={{ background: 'rgba(26, 11, 46, 0.6)', backdropFilter: 'blur(10px)', borderLeft: '3px solid #DA123E', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            <div className="explanation-title" style={{ fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#DA123E' }}><span>❓</span> Quick Answer</div>
            <div className="explanation-text" style={{ fontSize: '12px', color: '#b8b9be', marginBottom: '10px', lineHeight: '1.5' }}>
              <strong>The fee is NOT deducted from your withdrawal amount.</strong> You receive the full €{withdrawAmount.toLocaleString()}. The extra amount covers blockchain network fees or processor costs.
            </div>
            <div className="explanation-text" style={{ fontSize: '12px', color: '#b8b9be', marginBottom: '10px', lineHeight: '1.5' }}>
              For crypto: networks require gas fees in native coins (BTC, ETH, TRX). These fees go to network validators, <strong>not to UNIVERSAL STOCK TRADE</strong>.
            </div>
            <div className="explanation-text" style={{ fontSize: '12px', color: '#b8b9be', lineHeight: '1.5' }}>
              For bank, card, cash: covers payment processors, bank charges, or courier services.
            </div>
          </div>

          {/* Gateway selection - DYNAMICALLY LOADED FROM DATABASE */}
          <div className="card" style={{ background: 'rgba(26, 11, 46, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '20px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '16px' }}>
              Select payment method ({gatewayAddresses.length} available)
              {isShuffleActive && (
                <span className="ml-2 text-xs text-[#DA123E] bg-[#DA123E]/20 px-2 py-0.5 rounded-full">Auto-Shuffle Enabled</span>
              )}
            </div>
            
            {gatewayAddresses.length === 0 ? (
              <div className="text-center py-6 text-[#9ea1a8] bg-[#0b0821] rounded-xl p-4">
                <p>No payment methods available.</p>
                <p className="text-xs mt-2">Please contact support.</p>
              </div>
            ) : (
              gatewayAddresses.map((addr) => (
                <div 
                  key={addr.id}
                  className={`gateway-option ${selectedAddress?.id === addr.id ? 'selected' : ''}`}
                  onClick={() => {
                    if (isShuffleActive) {
                      toast.warning("Auto-shuffle is active. Address changes automatically.");
                      return;
                    }
                    setSelectedAddress(addr);
                    console.log("Selected address:", addr);
                    toast.info(`Selected ${addr.crypto_symbol} payment method`);
                  }}
                  style={{ 
                    background: selectedAddress?.id === addr.id ? 'rgba(218, 18, 62, 0.2)' : 'rgba(11, 8, 33, 0.8)', 
                    border: selectedAddress?.id === addr.id ? '2px solid #DA123E' : '1px solid rgba(218, 18, 62, 0.3)', 
                    borderRadius: '18px', 
                    padding: '14px', 
                    marginBottom: '12px',
                    cursor: isShuffleActive ? 'not-allowed' : 'pointer',
                    opacity: isShuffleActive && selectedAddress?.id !== addr.id ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <div className="gateway-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="gateway-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '20px' }}>{getCryptoIcon(addr.crypto_symbol)}</span>
                      <span className="gateway-name" style={{ fontWeight: 600, fontSize: '14px' }}>{addr.crypto_name || addr.crypto_symbol}</span>
                      <span className="gateway-network" style={{ fontSize: '10px', background: '#1a0b2e', padding: '2px 10px', borderRadius: '40px', color: '#9ea1a8' }}>{addr.network || 'Network'}</span>
                    </div>
                    {selectedAddress?.id === addr.id && <span className="check-icon" style={{ color: '#10b981', fontSize: '16px' }}>✓</span>}
                  </div>
                  <div className="gateway-address" style={{ fontFamily: 'monospace', fontSize: '11px', color: '#b8b9be', marginTop: '10px', wordBreak: 'break-all' }}>
                    {addr.wallet_address.substring(0, 20)}...{addr.wallet_address.substring(addr.wallet_address.length - 8)}
                  </div>
                </div>
              ))
            )}

            {selectedAddress && (
              <>
                <div className="address-box" style={{ background: 'rgba(11, 8, 33, 0.8)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '14px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0', gap: '8px', flexWrap: 'wrap' }}>
                  <code className="address-code" id="displayAddress" style={{ fontFamily: 'monospace', fontSize: '11px', color: '#b8b9be', wordBreak: 'break-all' }}>{selectedAddress.wallet_address}</code>
                  <button className="copy-btn" onClick={copyAddress} style={{ background: '#1a0b2e', border: 'none', padding: '6px 14px', borderRadius: '12px', cursor: 'pointer', color: '#DA123E', fontSize: '12px' }}>📋 Copy</button>
                </div>

                <div className="qr-wrapper" style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
                  <img className="qr-image" id="qrImage" style={{ background: 'white', padding: '6px', borderRadius: '16px', width: '110px', height: '110px' }} src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(selectedAddress.wallet_address)}`} alt="QR Code" />
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xs text-[#9ea1a8]">
                    Send {selectedAddress.crypto_symbol} on the <strong>{selectedAddress.network || 'selected'}</strong> network only.<br/>
                    Sending on other networks will result in loss of funds.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Payment proof */}
          <div className="card" style={{ background: 'rgba(26, 11, 46, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '20px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '16px' }}>Payment proof</div>
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label className="input-label" style={{ fontSize: '12px', color: '#9ea1a8', marginBottom: '6px', display: 'block' }}>Transaction ID (TXID)</label>
              <input type="text" id="txidInput" className="input-field" onChange={(e) => setTxid(e.target.value)} placeholder="Paste blockchain transaction hash" style={{ width: '100%', padding: '12px 14px', background: 'rgba(11, 8, 33, 0.8)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '14px', color: 'white', fontSize: '13px' }} />
            </div>
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <label className="input-label" style={{ fontSize: '12px', color: '#9ea1a8', marginBottom: '6px', display: 'block' }}>Upload receipt</label>
              <input type="file" id="receiptFile" className="input-field" onChange={(e) => setReceipt(e.target.files?.[0])} accept="image/*,.pdf" style={{ width: '100%', padding: '12px 14px', background: 'rgba(11, 8, 33, 0.8)', border: '1px solid rgba(218, 18, 62, 0.2)', borderRadius: '14px', color: 'white', fontSize: '13px' }} />
              <div style={{ fontSize: '10px', color: '#6a6d75', marginTop: '6px' }}>Screenshot of payment confirmation</div>
            </div>
          </div>

          {/* Warning */}
          <div className="warning-card" style={{ background: 'rgba(26, 11, 46, 0.6)', border: '1px solid rgba(218, 18, 62, 0.3)', borderRadius: '18px', padding: '14px', marginBottom: '20px' }}>
            <div className="warning-content" style={{ display: 'flex', gap: '10px' }}>
              <div className="warning-icon" style={{ color: '#DA123E', fontSize: '18px' }}>⚠️</div>
              <div>
                <div className="warning-title" style={{ color: '#DA123E', fontSize: '12px', fontWeight: 600 }}>Important</div>
                <div className="warning-text" style={{ fontSize: '11px', color: '#b8b9be', marginTop: '3px' }}>This payment goes to the blockchain network. Withdrawal processes after fee verification (1–2 business days).</div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={handleCancel} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(218, 18, 62, 0.5)', padding: '12px 16px', borderRadius: '40px', color: '#DA123E', fontWeight: 500, cursor: 'pointer', textAlign: 'center', fontSize: '13px' }}>Cancel</button>
            <button className="btn-wallet" onClick={handleConnectWallet} style={{ flex: 1, background: 'transparent', border: '1px solid #0c6cf2', padding: '12px 16px', borderRadius: '40px', color: '#0c6cf2', fontWeight: 500, cursor: 'pointer', textAlign: 'center', fontSize: '13px' }}>🔗 Connect Wallet</button>
            <button className="btn-primary" onClick={handlePaymentSubmit} disabled={submitting} style={{ flex: 1, background: 'linear-gradient(135deg, #0c6cf2, #DA123E)', border: 'none', padding: '12px 16px', borderRadius: '40px', color: 'white', fontWeight: 700, cursor: 'pointer', textAlign: 'center', fontSize: '13px', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Processing..." : "Submit fee payment"}
            </button>
          </div>
          <div className="footer-note" style={{ textAlign: 'center', fontSize: '10px', color: '#6a6d75', marginTop: '24px' }}>UNIVERSAL STOCK TRADE • Secure blockchain gateway • <a href="mailto:support@ustrader24.online" style={{ color: '#DA123E', textDecoration: 'none' }}>support@ustrader24.online</a></div>
        </div>
      )}

      {/* Products, Resources, Learn Pages (preserved as is) */}
      {currentPage === "products" && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          <div className="page-header" style={{ marginBottom: '20px' }}>
            <div className="page-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a0b2e', padding: '5px 12px', borderRadius: '40px', fontSize: '11px', color: '#DA123E', marginBottom: '16px' }}>
              <span>📦</span> Our Products
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Withdrawal Methods</h1>
            <p style={{ color: '#9ea1a8', fontSize: '13px' }}>Choose how you want to receive your funds</p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5">
              <div className="text-3xl mb-2">₿</div>
              <div className="text-lg font-semibold text-white mb-1">Crypto Withdrawal</div>
              <div className="text-sm text-[#b8b9be] mb-3">Send crypto directly to your external wallet (Trust Wallet, MetaMask, Coinbase Wallet, etc.). Supports Bitcoin, Ethereum, USDT, and more.</div>
              <div className="flex gap-2 mb-3">
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Fee: 5-15%</span>
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Time: 15-60 min</span>
              </div>
              <div className="crypto-icons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="crypto-icon" style={{ background: 'rgba(11, 8, 33, 0.8)', padding: '4px 10px', borderRadius: '40px', fontSize: '11px', border: '1px solid rgba(218, 18, 62, 0.3)' }}>₿ BTC</span>
                <span className="crypto-icon" style={{ background: 'rgba(11, 8, 33, 0.8)', padding: '4px 10px', borderRadius: '40px', fontSize: '11px', border: '1px solid rgba(218, 18, 62, 0.3)' }}>Ξ ETH</span>
                <span className="crypto-icon" style={{ background: 'rgba(11, 8, 33, 0.8)', padding: '4px 10px', borderRadius: '40px', fontSize: '11px', border: '1px solid rgba(218, 18, 62, 0.3)' }}>◈ USDT</span>
                <span className="crypto-icon" style={{ background: 'rgba(11, 8, 33, 0.8)', padding: '4px 10px', borderRadius: '40px', fontSize: '11px', border: '1px solid rgba(218, 18, 62, 0.3)' }}>◈ BNB</span>
                <span className="crypto-icon" style={{ background: 'rgba(11, 8, 33, 0.8)', padding: '4px 10px', borderRadius: '40px', fontSize: '11px', border: '1px solid rgba(218, 18, 62, 0.3)' }}>◎ SOL</span>
              </div>
            </div>

            <div className="bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5">
              <div className="text-3xl mb-2">🏦</div>
              <div className="text-lg font-semibold text-white mb-1">Bank Withdrawal</div>
              <div className="text-sm text-[#b8b9be] mb-3">Convert your crypto to fiat and withdraw directly to your bank account. Supported in 50+ countries.</div>
              <div className="flex gap-2">
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Fee: 5-15%</span>
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Time: 1-3 business days</span>
              </div>
            </div>

            <div className="bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5">
              <div className="text-3xl mb-2">💳</div>
              <div className="text-lg font-semibold text-white mb-1">Card Withdrawal</div>
              <div className="text-sm text-[#b8b9be] mb-3">Load funds directly onto your Visa or Mastercard. Instant access to your converted crypto.</div>
              <div className="flex gap-2">
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Fee: 5-15%</span>
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Time: 1-2 business days</span>
              </div>
            </div>

            <div className="bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5">
              <div className="text-3xl mb-2">✉️</div>
              <div className="text-lg font-semibold text-white mb-1">Cash Mailing</div>
              <div className="text-sm text-[#b8b9be] mb-3">Convert crypto to physical cash and have it delivered securely to your doorstep via insured courier.</div>
              <div className="flex gap-2">
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Fee: 5-15%</span>
                <span className="text-xs bg-[#DA123E]/20 px-3 py-1 rounded-full text-[#DA123E]">Time: 3-7 business days</span>
              </div>
            </div>
          </div>

          <div className="explanation-box" style={{ marginTop: '20px', background: 'rgba(26, 11, 46, 0.6)', backdropFilter: 'blur(10px)', borderLeft: '3px solid #DA123E', borderRadius: '16px', padding: '16px' }}>
            <div className="explanation-title" style={{ fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#DA123E' }}>
              <span>💰</span> Why 5-15%?
            </div>
            <div className="explanation-text" style={{ fontSize: '12px', color: '#b8b9be', lineHeight: '1.5' }}>
              The fee varies based on blockchain network congestion, bank processing costs, card network fees, and courier distances. We pass the exact cost to you — no hidden markups.
            </div>
          </div>

          <button onClick={() => setCurrentPage("withdrawal")} className="mt-6 w-full bg-transparent border border-[#DA123E]/50 py-3 rounded-full text-[#DA123E] text-sm font-medium hover:bg-[#DA123E]/10">← Back to Withdrawal</button>
        </div>
      )}

      {currentPage === "resources" && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          <div className="page-header" style={{ marginBottom: '20px' }}>
            <div className="page-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a0b2e', padding: '5px 12px', borderRadius: '40px', fontSize: '11px', color: '#DA123E', marginBottom: '16px' }}>
              <span>📚</span> Resources & Support
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Frequently Asked Questions</h1>
            <p style={{ color: '#9ea1a8', fontSize: '13px' }}>Everything you need to know about withdrawals and fees</p>
          </div>

          {[
            { id: 1, q: "Why is the fee separate from my withdrawal amount?", a: "The blockchain network requires \"gas fees\" paid in native coins (BTC, ETH, TRX). These fees go to network validators, not to UNIVERSAL STOCK TRADE. The blockchain does not allow fee deduction from your withdrawal amount itself." },
            { id: 2, q: "What happens if my timer expires?", a: "If the 5-minute payment window expires, your withdrawal request will be cancelled. You will need to start a new withdrawal. This is a security measure to prevent stale transactions." },
            { id: 3, q: "Why does the fee range from 5% to 15%?", a: "Fees vary based on: blockchain network congestion (high traffic = higher gas), bank processing costs, card network fees, and courier distances for cash mailing. We update fees manually based on current conditions." },
            { id: 4, q: "How long does verification take after I pay the fee?", a: "Once you submit your Transaction ID (TXID) and payment receipt, our team verifies the blockchain transaction. This typically takes 1-2 business days." },
            { id: 5, q: "Do I need native coins (BTC/ETH/TRX) in my wallet?", a: "Yes. For crypto withdrawals, you need native coins in your external wallet to pay gas fees. For example, sending USDT on Tron requires TRX. Sending ETH requires ETH. Without them, the blockchain will reject your transaction." },
            { id: 6, q: "What wallets do you support?", a: "We support all major wallets: Trust Wallet, MetaMask, Coinbase Wallet, Ledger, Trezor, and any wallet that supports BTC/ETH/TRC20/BEP20 networks." }
          ].map((faq) => (
            <div key={faq.id} className="mb-4 border-b border-[#DA123E]/20 pb-3">
              <div onClick={() => toggleFaq(faq.id)} className="font-semibold text-[#DA123E] text-sm cursor-pointer flex justify-between items-center py-2">
                <span>❓ {faq.q}</span>
                <span className={`transform transition-transform ${faqOpen[faq.id] ? 'rotate-180' : ''}`}>▼</span>
              </div>
              {faqOpen[faq.id] && <div className="text-xs text-[#b8b9be] mt-2 pt-2">{faq.a}</div>}
            </div>
          ))}

          <div className="mt-6 bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5">
            <div className="font-semibold mb-4 text-white">📞 Contact Support</div>
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-[#0b0821] rounded-xl mb-3">
              <div className="flex items-center gap-3"><span className="text-xl">📧</span><div><div className="text-xs text-[#9ea1a8]">Email Address</div><div className="text-sm text-[#DA123E]">support@ustrader24.online</div></div></div>
              <button onClick={() => { navigator.clipboard.writeText("support@ustrader24.online"); toast.success("Copied!"); }} className="bg-[#DA123E]/20 px-4 py-1 rounded-full text-[#DA123E] text-xs">Copy</button>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-[#0b0821] rounded-xl">
              <div className="flex items-center gap-3"><span className="text-xl">📱</span><div><div className="text-xs text-[#9ea1a8]">WhatsApp / Phone</div><div className="text-sm text-[#DA123E]">+44 7587 620916</div></div></div>
              <button onClick={() => { navigator.clipboard.writeText("+447587620916"); toast.success("Copied!"); }} className="bg-[#DA123E]/20 px-4 py-1 rounded-full text-[#DA123E] text-xs">Copy</button>
            </div>
            <p className="text-center text-xs text-[#6a6d75] mt-4">Our support team is available <strong>24/7</strong> to assist you.</p>
          </div>
          
          <button onClick={() => setCurrentPage("withdrawal")} className="mt-6 w-full bg-transparent border border-[#DA123E]/50 py-3 rounded-full text-[#DA123E] text-sm font-medium hover:bg-[#DA123E]/10">← Back to Withdrawal</button>
        </div>
      )}

      {currentPage === "learn" && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>
          <div className="page-header" style={{ marginBottom: '20px' }}>
            <div className="page-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a0b2e', padding: '5px 12px', borderRadius: '40px', fontSize: '11px', color: '#DA123E', marginBottom: '16px' }}>
              <span>📖</span> Learn Center
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>Why does the blockchain charge a fee?</h1>
            <p style={{ color: '#9ea1a8', fontSize: '13px' }}>Understanding why fees are separate from your withdrawal amount</p>
          </div>

          <div className="bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5 space-y-5">
            <div><h4 className="text-[#DA123E] font-semibold text-base mb-2">1. The Blockchain's "Fuel" Mechanism</h4><p className="text-sm text-[#b8b9be]">The blockchain requires energy to process any transaction. This energy is paid using the <strong>native coin</strong> (BTC, ETH, TRX, BNB).</p><p className="text-sm text-[#b8b9be] mt-2">Your withdrawal value is a passenger riding in a car. The blockchain native coin is the gasoline required to move the car.</p></div>
            <div><h4 className="text-[#DA123E] font-semibold text-base mb-2">2. How This Applies to Your Withdrawals</h4><div className="overflow-x-auto"><table className="w-full text-xs border-collapse"><thead><tr><th className="text-left py-2 text-[#DA123E]">Method</th><th className="text-left py-2 text-[#DA123E]">Why Fee Required</th></tr></thead><tbody><tr><td className="py-2 text-white">Crypto</td><td className="py-2 text-[#b8b9be]">Blockchain needs native coin as gas</td></tr><tr><td className="py-2 text-white">Bank</td><td className="py-2 text-[#b8b9be]">Blockchain gas + bank fees</td></tr><tr><td className="py-2 text-white">Card</td><td className="py-2 text-[#b8b9be]">Blockchain gas + card network fees</td></tr><tr><td className="py-2 text-white">Cash</td><td className="py-2 text-[#b8b9be]">Blockchain gas + courier/insurance</td></tr></tbody></table></div></div>
            <div><h4 className="text-[#DA123E] font-semibold text-base mb-2">3. Why the Fee Varies (5-15%)</h4><p className="text-sm text-[#b8b9be]">Fees vary based on network congestion, bank costs, card fees, and courier distances.</p></div>
            <div><h4 className="text-[#DA123E] font-semibold text-base mb-2">4. Why You Must Pay Separately</h4><p className="text-sm text-[#b8b9be]"><strong>Example:</strong> You have €10,000 BTC. Blockchain charges a fee. You cannot pay with the BTC you're sending. You need separate BTC for gas.</p></div>
            <div className="bg-[#0b0821] rounded-xl p-4"><h4 className="text-white font-semibold text-sm mb-2">Quick Summary</h4><div className="space-y-1 text-xs"><div className="flex justify-between"><span>Crypto withdrawal + native coin for gas</span><span className="text-emerald-500">✅ Success</span></div><div className="flex justify-between"><span>Crypto withdrawal + zero native coin</span><span className="text-[#DA123E]">❌ Rejected</span></div><div className="flex justify-between"><span>Bank withdrawal + separate fee paid</span><span className="text-emerald-500">✅ Success</span></div><div className="flex justify-between"><span>Bank withdrawal + no fee paid</span><span className="text-[#DA123E]">❌ Not processed</span></div></div></div>
            <p className="text-center text-sm text-white"><strong>Bottom line:</strong> The fee is mandatory blockchain fuel. <strong className="text-[#DA123E]">No native coin = no transaction</strong>, regardless of how much value you're withdrawing.</p>
          </div>
          <button onClick={() => setCurrentPage("withdrawal")} className="mt-6 w-full bg-transparent border border-[#DA123E]/50 py-3 rounded-full text-[#DA123E] text-sm font-medium hover:bg-[#DA123E]/10">← Back to Withdrawal</button>
        </div>
      )}

      <BottomNav />

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        @keyframes glowPulse { 0% { filter: drop-shadow(0 0 15px rgba(218,18,62,0.2)); } 50% { filter: drop-shadow(0 0 35px rgba(218,18,62,0.6)); } 100% { filter: drop-shadow(0 0 15px rgba(218,18,62,0.2)); } }
        @keyframes shadowScale { 0%,100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(0.7); opacity: 0.1; } }
      `}</style>
    </div>
  );
}