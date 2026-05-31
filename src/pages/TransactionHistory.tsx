// src/pages/TransactionHistory.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  Search,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Bot,
  CreditCard,
  RefreshCw,
  Zap,
  Building2,
  Bitcoin,
  Truck,
  Eye,
  Copy,
  FileText,
  Landmark,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { format } from "date-fns";
import { toast } from "sonner";

import UniversalReceipt from "@/components/UniversalReceipt";
import { useReceipt } from "@/hooks/useReceipt";
import { 
  mapWithdrawalToReceipt, 
  mapDepositToReceipt, 
  mapTransactionToReceipt,
  WithdrawalRow,
  DepositRow 
} from "@/lib/mapTransactionToReceipt";

interface UnifiedTransaction {
  id: string;
  transaction_type: string;
  channel: string;
  amount: number;
  balance_type: string;
  status: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  source_table: string;
  original_data: any;
}

const getFullStorageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/deposit-proofs/${path}`;
};

const channelIcons: Record<string, any> = {
  ai_bot: Bot, quick_trade: Zap, copy_trading: TrendingUp, mt5_metals: TrendingUp,
  mt5: TrendingUp, stock_trade: TrendingUp, crypto_trading: TrendingUp,
  card_payment: CreditCard, deposit: ArrowDownRight, withdrawal: ArrowUpRight,
  bank_withdrawal: Landmark, crypto_withdrawal: Bitcoin, card_withdrawal: CreditCard, cash_withdrawal: Truck,
  crypto_deposit: Bitcoin, card_deposit: CreditCard, p2p_deposit: Users,
};

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<UnifiedTransaction[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showFullCardNumber, setShowFullCardNumber] = useState(false);
  const navigate = useNavigate();

  const { receiptData, isOpen, openReceipt, closeReceipt } = useReceipt();

  const getDepositType = (deposit: any): { channel: string; description: string; displayName: string } => {
    if (deposit.crypto_type || deposit.crypto_amount || deposit.tx_hash || deposit.txid || deposit.network) {
      return {
        channel: "crypto_deposit",
        description: `Crypto Deposit via ${deposit.crypto_type || "BTC"}`,
        displayName: "Crypto Deposit",
      };
    }
    if (deposit.seller_name || deposit.order_id) {
      return {
        channel: "p2p_deposit",
        description: `P2P Deposit from ${deposit.seller_name || "Seller"}`,
        displayName: "P2P Deposit",
      };
    }
    if (deposit.metadata?.crypto_type || deposit.metadata?.tx_hash) {
      return {
        channel: "crypto_deposit",
        description: `Crypto Deposit via ${deposit.metadata?.crypto_type || "BTC"}`,
        displayName: "Crypto Deposit",
      };
    }
    if (deposit.metadata?.seller_name || deposit.metadata?.order_id) {
      return {
        channel: "p2p_deposit",
        description: `P2P Deposit from ${deposit.metadata?.seller_name || "Seller"}`,
        displayName: "P2P Deposit",
      };
    }
    return {
      channel: "card_deposit",
      description: `Deposit via Card`,
      displayName: "Card Deposit",
    };
  };

  const generateReceiptHTML = (transaction: UnifiedTransaction) => {
    const data = transaction.original_data;
    const isWithdrawal = transaction.source_table === "withdrawals";
    const isDeposit = transaction.source_table === "deposits";
    const statusColor = transaction.status === "completed" ? "#10b981" : transaction.status === "pending" ? "#f59e0b" : "#ef4444";
    const statusText = transaction.status === "completed" ? "Completed" : transaction.status === "pending" ? "Pending" : "Failed";
    
    let methodDetails = "";
    if (isWithdrawal && data.withdrawal_method === "bank") {
      methodDetails = `
        <tr><td style="padding: 10px 0; color: #666;">Bank Name</td><td style="padding: 10px 0; text-align: right;">${data.bank_name || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Account Name</td><td style="padding: 10px 0; text-align: right;">${data.account_name || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Account Number</td><td style="padding: 10px 0; text-align: right;">${data.account_number || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">SWIFT Code</td><td style="padding: 10px 0; text-align: right;">${data.swift_code || "N/A"}</td>
        </tr>
      `;
    } else if (isWithdrawal && data.withdrawal_method === "crypto") {
      methodDetails = `
        <tr><td style="padding: 10px 0; color: #666;">Crypto Type</td><td style="padding: 10px 0; text-align: right;">${data.crypto_type || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Wallet Address</td><td style="padding: 10px 0; text-align: right;"><code style="font-size: 10px;">${data.wallet_address || "N/A"}</code></td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Network</td><td style="padding: 10px 0; text-align: right;">${data.network || "N/A"}</td>
        </tr>
      `;
    } else if (isWithdrawal && data.withdrawal_method === "card") {
      methodDetails = `
        <tr><td style="padding: 10px 0; color: #666;">Cardholder Name</td><td style="padding: 10px 0; text-align: right;">${data.cardholder_name || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Card Number</td><td style="padding: 10px 0; text-align: right;">${data.card_number_masked || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Expiry Date</td><td style="padding: 10px 0; text-align: right;">${data.card_expiry || "N/A"}</td>
        </tr>
      `;
    } else if (isWithdrawal && data.withdrawal_method === "cash") {
      methodDetails = `
        <tr><td style="padding: 10px 0; color: #666;">Delivery Address</td><td style="padding: 10px 0; text-align: right;">${data.delivery_address || "N/A"}</td>
        </tr>
        <tr><td style="padding: 10px 0; color: #666;">Contact Phone</td><td style="padding: 10px 0; text-align: right;">${data.contact_phone || "N/A"}</td>
        </tr>
      `;
    } else if (isDeposit) {
      const depositType = getDepositType(data);
      methodDetails = `
        <tr><td style="padding: 10px 0; color: #666;">Method</td><td style="padding: 10px 0; text-align: right;">${depositType.displayName}</td>
        </tr>
        ${data.crypto_type ? `<tr><td style="padding: 10px 0; color: #666;">Crypto Type</td><td style="padding: 10px 0; text-align: right;">${data.crypto_type}</td></tr>` : ''}
        ${data.crypto_amount ? `<tr><td style="padding: 10px 0; color: #666;">Crypto Amount</td><td style="padding: 10px 0; text-align: right;">${data.crypto_amount} ${data.crypto_type || 'BTC'}</td></tr>` : ''}
        ${data.seller_name ? `<tr><td style="padding: 10px 0; color: #666;">Seller</td><td style="padding: 10px 0; text-align: right;">${data.seller_name}</td></tr>` : ''}
        ${data.tx_hash ? `<tr><td style="padding: 10px 0; color: #666;">TX Hash</td><td style="padding: 10px 0; text-align: right;"><code style="font-size: 10px;">${data.tx_hash}</code></td></tr>` : ''}
        ${data.txid ? `<tr><td style="padding: 10px 0; color: #666;">TXID</td><td style="padding: 10px 0; text-align: right;"><code style="font-size: 10px;">${data.txid}</code></td></tr>` : ''}
      `;
    }
    
    return `<!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Transaction Receipt - ${transaction.id.slice(0, 8)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
      .receipt { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.15); }
      .header { background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%); padding: 30px; text-align: center; border-bottom: 3px solid #DA123E; }
      .status-badge { display: inline-block; padding: 6px 20px; background: ${statusColor}20; border: 1px solid ${statusColor}; border-radius: 40px; color: ${statusColor}; font-size: 12px; font-weight: 600; margin-top: 15px; }
      .content { padding: 30px; }
      .amount-section { text-align: center; padding: 25px; background: #f8f9fa; border-radius: 12px; margin-bottom: 30px; }
      .amount-label { font-size: 14px; color: #666; margin-bottom: 8px; }
      .amount-value { font-size: 42px; font-weight: 700; color: ${transaction.transaction_type === "credit" ? "#10b981" : "#DA123E"}; }
      .section-title { font-size: 18px; font-weight: 600; margin: 25px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #DA123E; color: #1a1a2e; }
      .details-table { width: 100%; border-collapse: collapse; }
      .details-table tr { border-bottom: 1px solid #eee; }
      .details-table td { padding: 12px 0; }
      .details-table td:first-child { color: #666; font-weight: 500; }
      .details-table td:last-child { text-align: right; font-weight: 500; }
      .footer { padding: 20px 30px; text-align: center; font-size: 11px; color: #999; background: #f8f9fa; border-top: 1px solid #eee; }
      @media print { body { background: white; padding: 0; } .receipt { box-shadow: none; margin: 0; } .header { background: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <svg width="200" height="28" viewBox="0 0 220 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(0, 3)">
              <path d="M3.9 7L12 11L20.1 7L14 0.9C13.7 0.6 12.92 0.1 12 0.1C11.08 0.1 10.3 0.6 10 0.9L3.9 7Z" fill="#BD0E4E"/>
              <path d="M23 9.9L21.8 8.7L13.1 12.9V23.7C13.3 23.7 13.9 23.3 14.1 23.1C14.3 22.9 22.7 14.5333 23 14.2C23.3 13.8667 23.9 12.96 23.9 12C23.9 11.04 23.3 10.2 23 9.9Z" fill="#B40D2C"/>
              <path d="M1 9.9L2.2 8.7L10.9 12.9V23.7C10.7 23.7 10.1 23.3 9.9 23.1C9.7 22.9 1.3 14.5333 1 14.2C0.7 13.8667 0.1 12.96 0.1 12C0.1 11.04 0.7 10.2 1 9.9Z" fill="#DA123E"/>
            </g>
            <text x="28" y="14" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#FFFFFF" letterSpacing="1">UNIVERSAL</text>
            <text x="28" y="24" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="600" fill="#DA123E" letterSpacing="1.2">STOCK TRADE</text>
          </svg>
          <div class="status-badge">${statusText}</div>
        </div>
        <div class="content">
          <div class="amount-section">
            <div class="amount-label">Total Amount</div>
            <div class="amount-value">${transaction.transaction_type === "credit" ? "+" : "-"} €${Math.abs(transaction.amount).toLocaleString()}</div>
          </div>
          <div class="section-title">Transaction Information</div>
          <table class="details-table">
            <tr><td style="padding: 10px 0; color: #666;">Transaction ID</td><td style="padding: 10px 0; text-align: right;">${transaction.id.slice(0, 12)}...</td></tr>
            <tr><td style="padding: 10px 0; color: #666;">Date & Time</td><td style="padding: 10px 0; text-align: right;">${new Date(transaction.created_at).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px 0; color: #666;">Channel</td><td style="padding: 10px 0; text-align: right;">${getChannelDisplayName(transaction.channel, transaction.original_data)}</td></tr>
            <tr><td style="padding: 10px 0; color: #666;">Description</td><td style="padding: 10px 0; text-align: right;">${transaction.description || "N/A"}</td></tr>
            ${isWithdrawal ? `<tr><td style="padding: 10px 0; color: #666;">Withdrawal Method</td><td style="padding: 10px 0; text-align: right;">${data.withdrawal_method?.toUpperCase()}</td></tr>` : ''}
            ${data.fee_amount ? `<tr><td style="padding: 10px 0; color: #666;">Fee Paid</td><td style="padding: 10px 0; text-align: right;">€${data.fee_amount.toLocaleString()}</td></tr>` : ''}
          </table>
          ${methodDetails ? `<div class="section-title">Payment Details</div><table class="details-table">${methodDetails}</table>` : ""}
          ${data.txid ? `<div class="section-title">Blockchain Verification</div><table class="details-table"><tr><td style="padding: 10px 0; color: #666;">TXID</td><td style="padding: 10px 0; text-align: right;"><code style="font-size: 10px;">${data.txid}</code></td></tr></table>` : ""}
        </div>
        <div class="footer">
          <p>Universal Stock Trade • Secure Blockchain Gateway</p>
          <p>support@ustrader24.online • www.ustrader24.online</p>
        </div>
      </div>
    </body>
    </html>`;
  };

  const downloadAsPDF = async (transaction: UnifiedTransaction) => {
    const receiptHtml = generateReceiptHTML(transaction);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(receiptHtml);
      iframeDoc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }
    toast.success("Opening receipt for PDF download...");
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openNewReceipt = (transaction: UnifiedTransaction) => {
    let receiptData;
    if (transaction.original_data?.withdrawal_method) {
      const withdrawalRow: WithdrawalRow = {
        id: transaction.id,
        user_id: profile?.id || '',
        withdrawal_method: transaction.original_data.withdrawal_method,
        amount: transaction.amount,
        currency: transaction.original_data.currency || 'EUR',
        fee_amount: transaction.original_data.fee_amount || 0,
        fee_percentage: transaction.original_data.fee_percentage || 0,
        status: transaction.status,
        bank_name: transaction.original_data.bank_name || null,
        account_name: transaction.original_data.account_name || null,
        account_number: transaction.original_data.account_number || null,
        swift_code: transaction.original_data.swift_code || null,
        bank_country: transaction.original_data.bank_country || null,
        crypto_type: transaction.original_data.crypto_type || null,
        wallet_address: transaction.original_data.wallet_address || null,
        network: transaction.original_data.network || null,
        txid: transaction.original_data.txid || null,
        cardholder_name: transaction.original_data.cardholder_name || null,
        card_number_masked: transaction.original_data.card_number_masked || null,
        card_expiry: transaction.original_data.card_expiry || null,
        delivery_address: transaction.original_data.delivery_address || null,
        contact_phone: transaction.original_data.contact_phone || null,
        created_at: transaction.created_at,
        updated_at: transaction.created_at,
      };
      receiptData = mapWithdrawalToReceipt(withdrawalRow, profile);
    } else if (transaction.source_table === 'deposits') {
      const depositRow: DepositRow = {
        id: transaction.id,
        user_id: profile?.id || '',
        method: transaction.original_data?.method || 'card',
        amount: transaction.amount,
        currency: transaction.original_data?.currency || 'EUR',
        status: transaction.status,
        crypto_type: transaction.original_data?.crypto_type || null,
        crypto_amount: transaction.original_data?.crypto_amount || null,
        tx_hash: transaction.original_data?.tx_hash || null,
        txid: transaction.original_data?.txid || null,
        wallet_address: transaction.original_data?.wallet_address || transaction.original_data?.receiving_address || null,
        sender_address: transaction.original_data?.sender_address || null,
        network: transaction.original_data?.network || null,
        cardholder_name: transaction.original_data?.cardholder_name || null,
        card_number_masked: transaction.original_data?.card_number_masked || null,
        seller_name: transaction.original_data?.seller_name || null,
        order_id: transaction.original_data?.order_id || null,
        created_at: transaction.created_at,
        updated_at: transaction.created_at,
      };
      receiptData = mapDepositToReceipt(depositRow, profile);
    } else if (transaction.source_table === 'p2p_trades') {
      const p2pTrade = transaction.original_data;
      receiptData = {
        id: transaction.id,
        type: 'p2p_deposit',
        status: 'completed',
        displayStatus: 'Completed',
        createdAt: transaction.created_at,
        completedAt: transaction.created_at,
        fiatAmount: transaction.amount,
        fiatCurrency: 'EUR',
        cryptoType: p2pTrade?.crypto_type || 'USDT',
        sellerName: p2pTrade?.p2p_vendors?.full_name || p2pTrade?.vendor_name,
        orderId: transaction.id,
        withdrawalAccount: 'Funding Account',
      };
    } else {
      receiptData = mapTransactionToReceipt({
        id: transaction.id,
        user_id: profile?.id || "",
        transaction_type: transaction.transaction_type === "credit" ? "deposit" : "withdrawal",
        amount: transaction.amount,
        currency: "EUR",
        crypto_amount: transaction.original_data?.crypto_amount || null,
        crypto_type: transaction.original_data?.crypto_type || null,
        status: transaction.status,
        description: transaction.description || null,
        reference_id: transaction.reference_id,
        metadata: transaction.original_data,
        created_at: transaction.created_at,
        source_table: transaction.source_table,
      }, profile);
    }
    openReceipt(receiptData);
  };

  const getChannelDisplayName = (channel: string, originalData: any): string => {
    if (originalData?.withdrawal_method === 'bank') return 'Bank Withdrawal';
    if (originalData?.withdrawal_method === 'crypto') return 'Crypto Withdrawal';
    if (originalData?.withdrawal_method === 'card') return 'Card Withdrawal';
    if (originalData?.withdrawal_method === 'cash') return 'Cash Withdrawal';
    if (originalData?.crypto_type || originalData?.tx_hash || originalData?.txid || originalData?.crypto_amount) return 'Crypto Deposit';
    if (originalData?.seller_name || originalData?.order_id) return 'P2P Deposit';
    const names: Record<string, string> = {
      ai_bot: "AI Bot", quick_trade: "Quick Trade", copy_trading: "Copy Trading", mt5_metals: "MT5 Metals",
      mt5: "MT5", stock_trade: "Stock Trade", crypto_trading: "Crypto Trading", card_payment: "Card Payment",
      swap: "Swap", swap_coin: "Swap Coin", transfer_balance: "Transfer Balance", deposit: "Deposit",
      withdrawal: "Withdrawal", bank_withdrawal: "Bank Withdrawal", crypto_withdrawal: "Crypto Withdrawal",
      card_withdrawal: "Card Withdrawal", cash_withdrawal: "Cash Withdrawal", crypto_deposit: "Crypto Deposit",
      card_deposit: "Card Deposit", p2p_deposit: "P2P Deposit",
    };
    return names[channel] || channel.replace("_", " ");
  };

  const getChannelIcon = (channel: string, originalData: any) => {
    let iconChannel = channel;
    if (originalData?.crypto_type || originalData?.tx_hash || originalData?.txid) iconChannel = 'crypto_deposit';
    else if (originalData?.seller_name) iconChannel = 'p2p_deposit';
    else if (originalData?.withdrawal_method === 'bank') iconChannel = 'bank_withdrawal';
    else if (originalData?.withdrawal_method === 'crypto') iconChannel = 'crypto_withdrawal';
    else if (originalData?.withdrawal_method === 'card') iconChannel = 'card_withdrawal';
    else if (originalData?.withdrawal_method === 'cash') iconChannel = 'cash_withdrawal';
    const Icon = channelIcons[iconChannel] || Receipt;
    return <Icon className="w-4 h-4" />;
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profileData) setProfile(profileData);
      const allTransactions: UnifiedTransaction[] = [];

      // Transactions table
      const { data: txData } = await supabase.from("transactions").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (txData) {
        txData.forEach((tx: any) => {
          allTransactions.push({
            id: tx.id, transaction_type: tx.transaction_type, channel: tx.channel, amount: tx.amount,
            balance_type: tx.balance_type, status: tx.status, description: tx.description,
            reference_id: tx.reference_id, created_at: tx.created_at, source_table: "transactions", original_data: tx,
          });
        });
      }

      // Withdrawals table
      const { data: withdrawalData } = await supabase.from("withdrawals").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (withdrawalData) {
        withdrawalData.forEach((wd: any) => {
          let channel = "withdrawal";
          if (wd.withdrawal_method === "bank") channel = "bank_withdrawal";
          else if (wd.withdrawal_method === "crypto") channel = "crypto_withdrawal";
          else if (wd.withdrawal_method === "card") channel = "card_withdrawal";
          else if (wd.withdrawal_method === "cash") channel = "cash_withdrawal";
          allTransactions.push({
            id: wd.id, transaction_type: "debit", channel: channel, amount: wd.amount,
            balance_type: "funding_balance", status: wd.status === "approved" ? "completed" : wd.status,
            description: `Withdrawal via ${wd.withdrawal_method?.toUpperCase()}`,
            reference_id: wd.id,
            created_at: wd.created_at,
            source_table: "withdrawals",
            original_data: wd,
          });
        });
      }

      // Deposits table
      const { data: depositData } = await supabase.from("deposits").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (depositData) {
        depositData.forEach((dd: any) => {
          const depositType = getDepositType(dd);
          allTransactions.push({
            id: dd.id,
            transaction_type: "credit",
            channel: depositType.channel,
            amount: dd.amount,
            balance_type: "funding_balance",
            status: dd.status === "approved" ? "completed" : dd.status,
            description: depositType.description,
            reference_id: dd.id,
            created_at: dd.created_at,
            source_table: "deposits",
            original_data: dd,
          });
        });
      }

      // P2P TRADES TABLE
      const { data: p2pTradesData } = await supabase
        .from("p2p_trades")
        .select(`*, p2p_vendors!p2p_trades_vendor_id_fkey(full_name)`)
        .eq("user_id", session.user.id)
        .in("status", ["completed", "active", "payment_sent"])
        .order("created_at", { ascending: false });

      if (p2pTradesData) {
        p2pTradesData.forEach((trade: any) => {
          allTransactions.push({
            id: trade.id,
            transaction_type: "credit",
            channel: "p2p_deposit",
            amount: trade.amount,
            balance_type: "funding_balance",
            status: trade.status === "completed" ? "completed" : "pending",
            description: `P2P - Bought ${trade.crypto_type || 'USDT'} from Vendor`,
            reference_id: trade.id,
            created_at: trade.created_at,
            source_table: "p2p_trades",
            original_data: trade,
          });
        });
      }

      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    let filtered = [...transactions];
    if (searchTerm) filtered = filtered.filter(tx => tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || tx.id.toLowerCase().includes(searchTerm.toLowerCase()));
    if (typeFilter !== "all") filtered = filtered.filter(tx => tx.transaction_type === typeFilter);
    if (channelFilter !== "all") filtered = filtered.filter(tx => tx.channel === channelFilter);
    if (dateRange !== "all") {
      const now = new Date();
      let startDate = new Date();
      if (dateRange === "today") startDate.setHours(0, 0, 0, 0);
      else if (dateRange === "week") startDate.setDate(now.getDate() - 7);
      else if (dateRange === "month") startDate.setMonth(now.getMonth() - 1);
      else if (dateRange === "year") startDate.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= startDate);
    }
    setFilteredTransactions(filtered);
  }, [searchTerm, typeFilter, channelFilter, dateRange, transactions]);

  const openDetails = (transaction: UnifiedTransaction) => {
    setSelectedTransaction(transaction);
    setShowFullCardNumber(false);
    setDetailsOpen(true);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Channel", "Amount", "Balance Type", "Status", "Description", "Reference ID"];
    const rows = filteredTransactions.map((tx) => [
      format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"), tx.transaction_type, tx.channel,
      tx.amount.toString(), tx.balance_type, tx.status, tx.description || "", tx.reference_id || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.click();
    toast.success("CSV exported successfully");
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === "approved" || s === "completed") return <Badge className="bg-emerald-500/20 text-emerald-500">Completed</Badge>;
    if (s === "refunded") return <Badge className="bg-purple-500/20 text-purple-500">Refunded</Badge>;
    if (s === "pending_fee" || s === "pending" || s === "processing") return <Badge className="bg-yellow-500/20 text-yellow-500">Pending</Badge>;
    if (s === "declined" || s === "rejected" || s === "failed") return <Badge className="bg-destructive/20 text-destructive">Failed</Badge>;
    return <Badge variant="outline">{status || "Unknown"}</Badge>;
  };
  
  const getAmountColor = (type: string) => type === "credit" ? "text-emerald-500" : "text-destructive";

  const renderTransactionDetails = () => {
    if (!selectedTransaction) return null;
    const data = selectedTransaction.original_data;
    const isWithdrawal = selectedTransaction.source_table === "withdrawals";
    const isDeposit = selectedTransaction.source_table === "deposits";
    const isP2P = selectedTransaction.source_table === "p2p_trades";
    
    // Calculate fee percentage if not stored
    let feePercentage = data.fee_percentage || 0;
    if (feePercentage === 0 && data.fee_amount > 0 && selectedTransaction.amount > 0) {
      feePercentage = (data.fee_amount / Math.abs(selectedTransaction.amount)) * 100;
      feePercentage = Math.round(feePercentage * 100) / 100;
    }
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div><p className="text-muted-foreground text-xs">Transaction ID</p><p className="font-mono text-sm">{selectedTransaction.id.slice(0, 12)}...</p></div>
          <div><p className="text-muted-foreground text-xs">Date</p><p className="text-sm">{new Date(selectedTransaction.created_at).toLocaleString()}</p></div>
          <div><p className="text-muted-foreground text-xs">Amount</p><p className={`text-xl font-bold ${getAmountColor(selectedTransaction.transaction_type)}`}>{selectedTransaction.transaction_type === "credit" ? "+" : "-"}€{Math.abs(selectedTransaction.amount).toLocaleString()}</p></div>
          <div><p className="text-muted-foreground text-xs">Status</p><p>{getStatusBadge(selectedTransaction.status)}</p></div>
        </div>

        {isWithdrawal && (
          <>
            <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Withdrawal Details</h3><div className="bg-muted/30 p-3 rounded-lg space-y-2"><p><strong>Method:</strong> <span className="capitalize">{data.withdrawal_method}</span></p>{data.fee_amount > 0 && <p><strong>Fee Paid:</strong> €{data.fee_amount?.toLocaleString()} ({feePercentage}%)</p>}{data.txid && (<div className="flex items-center gap-2"><p><strong>TXID:</strong></p><code className="text-xs break-all flex-1">{data.txid}</code><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(data.txid, "TXID")}><Copy className="w-3 h-3" /></Button></div>)}</div></div>
            {data.withdrawal_method === "bank" && data.bank_name && (<div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Bank Account Details</h3><div className="bg-muted/30 p-3 rounded-lg"><p><strong>Bank Name:</strong> {data.bank_name || "N/A"}</p><p><strong>Account Name:</strong> {data.account_name || "N/A"}</p><p><strong>Account Number:</strong> {data.account_number || "N/A"}</p><p><strong>SWIFT Code:</strong> {data.swift_code || "N/A"}</p></div></div>)}
            {data.withdrawal_method === "crypto" && data.crypto_type && (<div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Crypto Wallet Details</h3><div className="bg-muted/30 p-3 rounded-lg"><p><strong>Crypto Type:</strong> {data.crypto_type || "N/A"}</p><p><strong>Wallet Address:</strong> <code className="text-xs break-all">{data.wallet_address || "N/A"}</code></p><p><strong>Network:</strong> {data.network || "N/A"}</p></div></div>)}
            {data.withdrawal_method === "card" && data.cardholder_name && (<div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Card Details</h3><div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg"><p><strong>Cardholder:</strong> {data.cardholder_name || "N/A"}</p><p><strong>Card Number:</strong> {showFullCardNumber ? data.card_number : data.card_number_masked || "****"}</p><Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2" onClick={() => setShowFullCardNumber(!showFullCardNumber)}><Eye className="w-3 h-3" /></Button><p><strong>Expiry:</strong> {data.card_expiry || "N/A"}</p></div></div>)}
            {data.withdrawal_method === "cash" && data.delivery_address && (<div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Delivery Details</h3><div className="bg-muted/30 p-3 rounded-lg"><p><strong>Delivery Address:</strong> {data.delivery_address || "N/A"}</p><p><strong>Contact Phone:</strong> {data.contact_phone || "N/A"}</p></div></div>)}
            {(data.receipt_url || data.payment_proof_url) && (<div className="border-t pt-4"><p className="text-sm font-semibold mb-2">Payment Proof</p><div className="border rounded-lg p-3 bg-muted/20 cursor-pointer" onClick={() => window.open(getFullStorageUrl(data.receipt_url || data.payment_proof_url), '_blank')}><img src={getFullStorageUrl(data.receipt_url || data.payment_proof_url)} alt="Payment Proof" className="max-h-48 object-contain mx-auto" /></div></div>)}
          </>
        )}
        
        {isDeposit && (
          <>
            <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">Deposit Details</h3><div className="bg-muted/30 p-3 rounded-lg">
              <p><strong>Method:</strong> <span className="capitalize">{getDepositType(data).displayName}</span></p>
              {data.crypto_type && <p><strong>Crypto Type:</strong> {data.crypto_type}</p>}
              {data.crypto_amount && <p><strong>Crypto Amount:</strong> {data.crypto_amount} {data.crypto_type || 'BTC'}</p>}
              {data.wallet_address && <p><strong>Wallet Address:</strong> <code className="text-xs break-all">{data.wallet_address}</code></p>}
              {data.sender_address && <p><strong>Sender Address:</strong> <code className="text-xs break-all">{data.sender_address}</code></p>}
              {data.txid && <p><strong>TXID:</strong> <code className="text-xs break-all">{data.txid}</code></p>}
              {data.tx_hash && <p><strong>TX Hash:</strong> <code className="text-xs break-all">{data.tx_hash}</code></p>}
              {data.seller_name && <p><strong>Seller:</strong> {data.seller_name}</p>}
              {data.order_id && <p><strong>Order ID:</strong> {data.order_id}</p>}
              {data.cardholder_name && <p><strong>Cardholder:</strong> {data.cardholder_name}</p>}
              {data.card_number_masked && <p><strong>Card Number:</strong> {data.card_number_masked}</p>}
            </div></div>
          </>
        )}
        
        {isP2P && (
          <>
            <div className="border-t pt-4"><h3 className="font-semibold text-sm mb-2">P2P Transaction Details</h3><div className="bg-muted/30 p-3 rounded-lg">
              <p><strong>Amount:</strong> €{data.amount}</p>
              <p><strong>Crypto Received:</strong> {data.amount} USDT</p>
              <p><strong>Vendor:</strong> {data.p2p_vendors?.full_name || data.vendor_name || "N/A"}</p>
              <p><strong>Status:</strong> {data.status}</p>
            </div></div>
          </>
        )}
      </div>
    );
  };

  const totalCredits = filteredTransactions.filter(tx => tx.transaction_type === "credit").reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalDebits = filteredTransactions.filter(tx => tx.transaction_type === "debit").reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div></div>;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader userName={profile?.full_name || "User"} onMenuClick={() => setSidebarOpen(true)} notificationCount={0} messageCount={0} />
      <main className="container mx-auto px-4 pt-40 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div><h1 className="text-3xl font-bold flex items-center gap-3"><Receipt className="w-8 h-8 text-secondary" />Transaction History</h1><p className="text-muted-foreground mt-2">View all your deposits, withdrawals, and trading transactions</p></div>
          <Button variant="outline" onClick={exportToCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Transactions</p><p className="text-2xl font-bold">{filteredTransactions.length}</p></div><Receipt className="w-8 h-8 text-muted-foreground" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Credits</p><p className="text-2xl font-bold text-emerald-500">+€{totalCredits.toLocaleString()}</p></div><ArrowDownRight className="w-8 h-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Debits</p><p className="text-2xl font-bold text-destructive">-€{totalDebits.toLocaleString()}</p></div><ArrowUpRight className="w-8 h-8 text-destructive" /></div></CardContent></Card>
        </div>

        <Card className="mb-6"><CardContent className="pt-6"><div className="flex flex-col md:flex-row gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="credit">Credits</SelectItem><SelectItem value="debit">Debits</SelectItem></SelectContent></Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Channel" /></SelectTrigger><SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          <SelectItem value="ai_bot">AI Bot</SelectItem><SelectItem value="quick_trade">Quick Trade</SelectItem><SelectItem value="copy_trading">Copy Trading</SelectItem>
          <SelectItem value="crypto_deposit">Crypto Deposit</SelectItem><SelectItem value="card_deposit">Card Deposit</SelectItem><SelectItem value="p2p_deposit">P2P Deposit</SelectItem>
          <SelectItem value="bank_withdrawal">Bank Withdrawal</SelectItem><SelectItem value="crypto_withdrawal">Crypto Withdrawal</SelectItem><SelectItem value="card_withdrawal">Card Withdrawal</SelectItem><SelectItem value="cash_withdrawal">Cash Withdrawal</SelectItem>
        </SelectContent></Select>
        <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Date Range" /></SelectTrigger><SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="week">Last 7 Days</SelectItem><SelectItem value="month">Last 30 Days</SelectItem><SelectItem value="year">Last Year</SelectItem></SelectContent></Select>
        </div></CardContent></Card>

        <Card><CardContent className="pt-6">{filteredTransactions.length === 0 ? (<div className="text-center py-12"><Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No transactions found</p></div>) : (<div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Channel</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {filteredTransactions.map((tx) => (
            <TableRow 
              key={`${tx.source_table}_${tx.id}`}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => openDetails(tx)}
            >
              <TableCell className="whitespace-nowrap">{format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}</TableCell>
              <TableCell><div className="flex items-center gap-2">{getChannelIcon(tx.channel, tx.original_data)}<span className="capitalize">{getChannelDisplayName(tx.channel, tx.original_data)}</span></div></TableCell>
              <TableCell className="max-w-[250px] truncate">{tx.description || "-"}</TableCell>
              <TableCell className={`font-medium ${getAmountColor(tx.transaction_type)}`}>{tx.transaction_type === "credit" ? "+" : "-"}€{Math.abs(tx.amount).toLocaleString()}</TableCell>
              <TableCell>{getStatusBadge(tx.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openNewReceipt(tx); }}><Eye className="w-4 h-4 mr-1" /> Receipt</Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); downloadAsPDF(tx); }}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody></Table></div>)}</CardContent></Card>
      </main>

      {/* Details Dialog - Opens when clicking on a transaction row */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Transaction Details</span>
              <Button variant="outline" size="sm" onClick={() => selectedTransaction && downloadAsPDF(selectedTransaction)}>
                <FileText className="w-4 h-4 mr-1" /> Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {renderTransactionDetails()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Receipt Modal - Opens when clicking Receipt button */}
      {isOpen && receiptData && <UniversalReceipt data={receiptData} onClose={closeReceipt} />}

      <BottomNav />
    </div>
  );
}