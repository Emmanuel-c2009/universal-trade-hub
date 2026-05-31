// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Download, Share2, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

export default function WithdrawalHistory() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
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

    await fetchWithdrawals();
  };

  const fetchWithdrawals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawals:", error);
    } else {
      setWithdrawals(data || []);
    }
    setLoading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
      case "completed":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "declined":
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "processing":
      case "pending":
      case "pending_fee":
      case "pending_verification":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
      case "completed":
        return "Completed";
      case "declined":
      case "failed":
        return "Declined";
      case "processing":
        return "Processing";
      case "pending_fee":
        return "Awaiting Fee Payment";
      case "pending_verification":
        return "Verifying Fee";
      default:
        return "Pending";
    }
  };

  const downloadReceipt = (withdrawal) => {
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Withdrawal Receipt - Universal Stock Trade</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #0b0821; color: white; }
          .receipt { max-width: 500px; margin: 0 auto; background: #1a0b2e; padding: 30px; border-radius: 20px; border: 1px solid #DA123E; }
          .header { text-align: center; border-bottom: 1px solid #DA123E; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #DA123E; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(218,18,62,0.2); }
          .status { color: ${withdrawal.status === 'approved' ? '#10b981' : withdrawal.status === 'declined' ? '#ef4444' : '#f59e0b'}; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6a6d75; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">UNIVERSAL STOCK TRADE</div>
            <p>Withdrawal Receipt</p>
          </div>
          <div class="row"><strong>Transaction ID:</strong> <span>${withdrawal.id.slice(0, 12)}...</span></div>
          <div class="row"><strong>Date:</strong> <span>${new Date(withdrawal.created_at).toLocaleString()}</span></div>
          <div class="row"><strong>Amount:</strong> <span>€${withdrawal.amount?.toLocaleString()}</span></div>
          <div class="row"><strong>Method:</strong> <span>${withdrawal.withdrawal_method}</span></div>
          <div class="row"><strong>Status:</strong> <span class="status">${getStatusText(withdrawal.status)}</span></div>
          ${withdrawal.fee_txid ? `<div class="row"><strong>Fee TXID:</strong> <span style="font-size:10px;">${withdrawal.fee_txid}</span></div>` : ''}
          ${withdrawal.fee_amount ? `<div class="row"><strong>Fee Paid:</strong> <span>€${withdrawal.fee_amount}</span></div>` : ''}
          <div class="footer">
            <p>Universal Stock Trade • Secure Trading Platform</p>
            <p>support@ustrader24.online</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawal_receipt_${withdrawal.id.slice(0, 8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded!");
  };

  const shareReceipt = (withdrawal) => {
    const shareText = `Universal Stock Trade Withdrawal\n\nAmount: €${withdrawal.amount?.toLocaleString()}\nStatus: ${getStatusText(withdrawal.status)}\nDate: ${new Date(withdrawal.created_at).toLocaleDateString()}\n\nThank you for trading with Universal Stock Trade!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Withdrawal Receipt',
        text: shareText,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Receipt details copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0821] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DA123E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0821] text-white pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "Trader"}
        onMenuClick={() => setSidebarOpen(true)}
        avatarUrl={profile?.avatar_url}
        verificationStatus={profile?.profile_status}
      />

      <main className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Withdrawal History</h1>
          <button onClick={() => navigate("/withdraw")} className="bg-gradient-to-r from-[#0c6cf2] to-[#DA123E] px-4 py-2 rounded-full text-sm font-medium">
            New Withdrawal
          </button>
        </div>

        {withdrawals.length === 0 ? (
          <div className="bg-[#1a0b2e] rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">No Withdrawals Yet</h2>
            <p className="text-[#9ea1a8] mb-6">You haven't made any withdrawal requests yet.</p>
            <button onClick={() => navigate("/withdraw")} className="bg-gradient-to-r from-[#0c6cf2] to-[#DA123E] px-6 py-3 rounded-full font-medium">
              Make Your First Withdrawal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="bg-[#1a0b2e]/60 backdrop-blur border border-[#DA123E]/20 rounded-2xl p-5 hover:border-[#DA123E]/50 transition-all">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(withdrawal.status)}
                    <div>
                      <p className="text-lg font-bold text-white">€{withdrawal.amount?.toLocaleString()}</p>
                      <p className="text-xs text-[#9ea1a8] capitalize">{withdrawal.withdrawal_method}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      withdrawal.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' :
                      withdrawal.status === 'declined' ? 'bg-red-500/20 text-red-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {getStatusText(withdrawal.status)}
                    </span>
                    <p className="text-xs text-[#6a6d75] mt-1">{new Date(withdrawal.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="border-t border-[#DA123E]/20 mt-3 pt-3 flex flex-wrap gap-3">
                  <button onClick={() => { setSelectedWithdrawal(withdrawal); setShowReceiptModal(true); }} className="text-[#DA123E] text-sm flex items-center gap-1 hover:text-[#0c6cf2]">
                    <Eye className="w-3 h-3" /> View Details
                  </button>
                  <button onClick={() => downloadReceipt(withdrawal)} className="text-[#DA123E] text-sm flex items-center gap-1 hover:text-[#0c6cf2]">
                    <Download className="w-3 h-3" /> Download Receipt
                  </button>
                  <button onClick={() => shareReceipt(withdrawal)} className="text-[#DA123E] text-sm flex items-center gap-1 hover:text-[#0c6cf2]">
                    <Share2 className="w-3 h-3" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-3 justify-center">
          <button onClick={() => navigate("/dashboard")} className="bg-transparent border border-[#DA123E]/50 px-6 py-2 rounded-full text-[#DA123E] text-sm hover:bg-[#DA123E]/10">
            Back to Dashboard
          </button>
          <button onClick={() => navigate("/withdraw")} className="bg-gradient-to-r from-[#0c6cf2] to-[#DA123E] px-6 py-2 rounded-full text-white text-sm">
            New Withdrawal
          </button>
        </div>
      </main>

      {/* Details Modal */}
      {showReceiptModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReceiptModal(false)}>
          <div className="bg-[#1a0b2e] border border-[#DA123E]/30 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Transaction Details</h2>
              <button onClick={() => setShowReceiptModal(false)} className="text-[#9ea1a8] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-[#9ea1a8]">Transaction ID:</span><span className="font-mono text-xs">{selectedWithdrawal.id}</span></div>
              <div className="flex justify-between"><span className="text-[#9ea1a8]">Date:</span><span>{new Date(selectedWithdrawal.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#9ea1a8]">Amount:</span><span className="font-bold text-gold">€{selectedWithdrawal.amount?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[#9ea1a8]">Method:</span><span className="capitalize">{selectedWithdrawal.withdrawal_method}</span></div>
              <div className="flex justify-between"><span className="text-[#9ea1a8]">Status:</span><span className={selectedWithdrawal.status === 'approved' ? 'text-emerald-500' : selectedWithdrawal.status === 'declined' ? 'text-red-500' : 'text-yellow-500'}>{getStatusText(selectedWithdrawal.status)}</span></div>
              {selectedWithdrawal.fee_txid && <div className="flex justify-between"><span className="text-[#9ea1a8]">Fee TXID:</span><span className="font-mono text-xs break-all">{selectedWithdrawal.fee_txid}</span></div>}
              {selectedWithdrawal.fee_amount && <div className="flex justify-between"><span className="text-[#9ea1a8]">Fee Paid:</span><span>€{selectedWithdrawal.fee_amount}</span></div>}
              {selectedWithdrawal.receipt_url && <div className="mt-2"><span className="text-[#9ea1a8]">Receipt:</span><a href={selectedWithdrawal.receipt_url} target="_blank" className="text-[#DA123E] text-sm block mt-1 break-all">View Receipt</a></div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => downloadReceipt(selectedWithdrawal)} className="flex-1 bg-[#DA123E]/20 py-2 rounded-full text-[#DA123E] text-sm">Download</button>
              <button onClick={() => setShowReceiptModal(false)} className="flex-1 bg-gradient-to-r from-[#0c6cf2] to-[#DA123E] py-2 rounded-full text-white text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}