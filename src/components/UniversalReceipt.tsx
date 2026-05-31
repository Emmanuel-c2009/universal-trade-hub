// src/components/UniversalReceipt.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Download, Share2, Printer, X } from 'lucide-react';
import { getCryptoToEUR, getEURToUSD, getEURToTargetCurrency } from '@/services/rateService';
import {
  getStatusDisplayText,
  getStatusColor,
  getStepStatus,
  getStepDisplayText,
  getStepIcon,
} from '@/lib/mapTransactionToReceipt';

// ============================================
// CUSTOM CRYPTO ICONS (Using Supabase images)
// ============================================

const cryptoImageMap: Record<string, string> = {
  'BTC': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/bitcoin.png',
  'ETH': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/ethereum.png',
  'BNB': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/bnb.png',
  'LTC': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/litecoin.png',
  'USDT': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/usdt.png',
  'SOL': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/solana.png',
  'XRP': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/xrp.png',
  'DOGE': 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/crypto-icons/dogecoin.png',
};

const getCryptoIcon = (currency: string): JSX.Element => {
  const imageUrl = cryptoImageMap[currency?.toUpperCase()];
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={currency} 
        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  const symbols: Record<string, string> = {
    'BTC': '₿', 'ETH': 'Ξ', 'USDT': '₮', 'BNB': '◈', 
    'SOL': '◎', 'XRP': 'XRP', 'DOGE': 'Ð', 'LTC': 'Ł',
  };
  return <span style={{ fontSize: '26px' }}>{symbols[currency?.toUpperCase()] || '₿'}</span>;
};

// ============================================
// TYPES
// ============================================

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type TransactionType = 
  | 'crypto_deposit' 
  | 'crypto_withdrawal'
  | 'bank_withdrawal'
  | 'card_deposit'
  | 'card_withdrawal'
  | 'p2p_deposit'
  | 'crypto_swap'
  | 'balance_transfer'
  | 'cash_mailing_withdrawal';

export interface CryptoAmount {
  amount: number;
  currency: string;
  icon: string;
  color: string;
}

export interface TransactionData {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  displayStatus?: string;
  createdAt: string;
  completedAt?: string;
  confirmedDate?: string;
  refundedAt?: string;
  failedAt?: string;
  
  cryptoAmount?: CryptoAmount;
  fiatAmount?: number;
  fiatCurrency?: string;
  targetCurrency?: string;
  feeAmount?: number;
  feeCurrency?: string;
  feePercent?: number;
  txHash?: string;
  walletAddress?: string;
  senderAddress?: string;
  recipientAddress?: string;
  network?: string;
  cryptoType?: string;
  
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  swiftCode?: string;
  bankCountry?: string;
  
  cardLast4?: string;
  cardholderName?: string;
  
  deliveryAddress?: string;
  contactPhone?: string;
  courier?: string;
  trackingId?: string;
  userFullName?: string;
  
  sellerName?: string;
  orderId?: string;
  
  withdrawalAccount?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getTransactionTitle = (type: TransactionType): string => {
  const titles: Record<TransactionType, string> = {
    'crypto_deposit': 'Crypto Deposit',
    'crypto_withdrawal': 'Crypto Withdrawal',
    'bank_withdrawal': 'Bank Withdrawal',
    'card_deposit': 'Card Deposit',
    'card_withdrawal': 'Card Withdrawal',
    'p2p_deposit': 'P2P Deposit',
    'crypto_swap': 'Crypto Swap',
    'balance_transfer': 'Balance Transfer',
    'cash_mailing_withdrawal': 'Cash Mail',
  };
  return titles[type] || 'Transaction';
};

const getFullCurrencyName = (currency: string): string => {
  const names: Record<string, string> = {
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'USDT': 'Tether', 'BNB': 'Binance Coin',
    'SOL': 'Solana', 'XRP': 'Ripple', 'DOGE': 'Dogecoin', 'LTC': 'Litecoin',
  };
  return names[currency?.toUpperCase()] || currency;
};

const formatNumber = (num: number | null | undefined, decimals: number = 2): string => {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  const safeDecimals = Math.min(Math.max(0, decimals || 2), 8);
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: safeDecimals,
      maximumFractionDigits: safeDecimals,
    }).format(num);
  } catch {
    return num.toFixed(safeDecimals);
  }
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Pending';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

// ============================================
// CURRENCY FLAG COMPONENTS
// ============================================

const EurFlagIcon = () => (
  <span style={{ fontSize: '20px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    🇪🇺
  </span>
);

const UsaFlagIcon = () => (
  <span style={{ fontSize: '20px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
    🇺🇸
  </span>
);

const getCurrencyFlag = (currency: string): JSX.Element => {
  const flags: Record<string, string> = {
    'NGN': '🇳🇬', 'USD': '🇺🇸', 'GBP': '🇬🇧', 'EUR': '🇪🇺',
    'CAD': '🇨🇦', 'AUD': '🇦🇺', 'JPY': '🇯🇵', 'CNY': '🇨🇳', 'INR': '🇮🇳',
  };
  const flag = flags[currency?.toUpperCase()] || '🏦';
  return <span style={{ fontSize: '20px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>{flag}</span>;
};

// ============================================
// PDF DOWNLOAD FUNCTION
// ============================================

const downloadAsPDF = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const receiptHtml = element.innerHTML;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to download PDF');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>Transaction Receipt</title><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; background: white; padding: 40px; display: flex; justify-content: center; }
      .receipt-print { max-width: 480px; width: 100%; background: white; border-radius: 28px; overflow: hidden; box-shadow: none; }
      @media print { body { padding: 0; } .receipt-print { box-shadow: none; } }
    </style>
    </head>
    <body><div class="receipt-print">${receiptHtml}</div></body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 1000);
};

// ============================================
// IMAGE DOWNLOAD & SHARE FUNCTIONS
// ============================================

const downloadAsImage = async (element: HTMLElement) => {
  try {
    const images = element.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    }));
    await new Promise(resolve => setTimeout(resolve, 500));
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    const canvas = await html2canvas(element, {
      scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, allowTaint: false,
    });
    const link = document.createElement('a');
    link.download = `receipt-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    return true;
  } catch (error) {
    console.error('Image download failed:', error);
    alert('Failed to download image. Please try using PDF instead.');
    return false;
  }
};

const shareAsImage = async (element: HTMLElement) => {
  try {
    const images = element.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    }));
    await new Promise(resolve => setTimeout(resolve, 500));
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    const canvas = await html2canvas(element, {
      scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, allowTaint: false,
    });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'receipt.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ title: 'Transaction Receipt', text: 'Universal Stock Trade Transaction', files: [file] }); }
        catch { console.log('Share cancelled'); }
      } else {
        const link = document.createElement('a');
        link.download = `receipt-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        alert('Share not supported. Image downloaded instead.');
      }
    });
  } catch (error) {
    console.error('Share failed:', error);
    alert('Share failed. Image downloaded instead.');
    await downloadAsImage(element);
  }
};

// ============================================
// STYLES
// ============================================

const multiLineAddressStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap',
  textAlign: 'right',
  maxWidth: '280px',
  lineHeight: '1.5',
  color: '#000000',
};

const addressValueStyle: React.CSSProperties = {
  color: '#000000',
  fontWeight: 'bold',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  textAlign: 'right',
  wordBreak: 'break-all',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
};

const receiptContainerStyle: React.CSSProperties = {
  width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
};

const topBarStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' };
const leftActionsStyle: React.CSSProperties = { display: 'flex', gap: '8px' };
const iconBtnStyle: React.CSSProperties = { background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a' };
const topLogoStyle: React.CSSProperties = { width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const logoImageStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const closeIconStyle: React.CSSProperties = { background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a' };

const headerStyle: React.CSSProperties = { textAlign: 'center', padding: '20px 24px 0' };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: '1.35rem', fontWeight: 600, color: '#0f172a' };
const statusBadgeStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '100px', fontWeight: 500, fontSize: '0.8rem', marginTop: '12px', border: '1px solid' };
const dotStyle: React.CSSProperties = { width: '8px', height: '8px', borderRadius: '50%' };

const amountCardStyle: React.CSSProperties = { textAlign: 'center', padding: '24px 24px 16px' };
const primaryAmountRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' };
const primaryAmountStyle: React.CSSProperties = { fontSize: '2.2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", display: 'inline-flex', alignItems: 'center', gap: '6px' };
const secondaryAmountRowStyle: React.CSSProperties = { marginTop: '4px' };
const secondaryAmountStyle: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 600, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' };
const cardAmountRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' };
const cardAmountStyle: React.CSSProperties = { fontSize: '2.2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", display: 'inline-flex', alignItems: 'center', gap: '6px' };
const cryptoAmountRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' };
const cryptoIconContainerStyle: React.CSSProperties = { width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const cryptoAmountLargeStyle: React.CSSProperties = { fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' };
const eurAmountRowStyle: React.CSSProperties = { marginTop: '4px' };
const eurAmountStyle: React.CSSProperties = { fontSize: '1rem', fontWeight: 500, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' };

const timelineContainerStyle: React.CSSProperties = { padding: '16px 24px' };
const timelineStepWrapperStyle: React.CSSProperties = { position: 'relative' };
const timelineStepStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', position: 'relative', zIndex: 2, backgroundColor: '#ffffff' };
const timelineIconStyle: React.CSSProperties = { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600 };
const timelineContentStyle: React.CSSProperties = { flex: 1 };
const timelineTitleStyle: React.CSSProperties = { fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' };
const timelineDateStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#64748b', marginTop: '2px' };
const timelineStatusStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 500 };
const timelineLineStyle: React.CSSProperties = { position: 'absolute', left: '18px', top: '48px', width: '2px', height: '28px', zIndex: 1 };

const infoGridStyle: React.CSSProperties = { borderTop: '1px solid #f1f5f9', padding: '20px 24px', display: 'grid', gap: '14px' };
const infoItemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' };
const labelStyle: React.CSSProperties = { color: '#64748b', fontSize: '0.8rem', fontWeight: 500 };

const footerSectionStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafcff' };
const qrCodeStyle: React.CSSProperties = { width: '60px', height: '60px', background: '#ffffff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', padding: '5px' };
const qrImageStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'contain' };
const footerLogoContainerStyle: React.CSSProperties = { textAlign: 'right' };

const importantNoteStyle: React.CSSProperties = { padding: '12px 24px 20px 24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fefce8' };
const importantNoteTextStyle: React.CSSProperties = { fontSize: '9px', color: '#854d0e', textAlign: 'center', lineHeight: '1.4', margin: 0 };

const UniversalStockTradeLogo = () => (
  <svg width="160" height="28" viewBox="0 0 220 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0, 3)">
      <path d="M3.9 7L12 11L20.1 7L14 0.9C13.7 0.6 12.92 0.1 12 0.1C11.08 0.1 10.3 0.6 10 0.9L3.9 7Z" fill="#BD0E4E"/>
      <path d="M23 9.9L21.8 8.7L13.1 12.9V23.7C13.3 23.7 13.9 23.3 14.1 23.1C14.3 22.9 22.7 14.5333 23 14.2C23.3 13.8667 23.9 12.96 23.9 12C23.9 11.04 23.3 10.2 23 9.9Z" fill="#B40D2C"/>
      <path d="M1 9.9L2.2 8.7L10.9 12.9V23.7C10.7 23.7 10.1 23.3 9.9 23.1C9.7 22.9 1.3 14.5333 1 14.2C0.7 13.8667 0.1 12.96 0.1 12C0.1 11.04 0.7 10.2 1 9.9Z" fill="#DA123E"/>
    </g>
    <text x="28" y="14" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="#0f172a" letterSpacing="1">UNIVERSAL</text>
    <text x="28" y="24" fontFamily="Arial, sans-serif" fontSize="6.5" fontWeight="600" fill="#DA123E" letterSpacing="1.2">STOCK TRADE</text>
  </svg>
);

const WrappedAddress: React.FC<{ address: string | undefined }> = ({ address }) => {
  if (!address) {
    return <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>Not provided</span>;
  }
  
  const chunkSize = 24;
  const chunks: string[] = [];
  for (let i = 0; i < address.length; i += chunkSize) {
    chunks.push(address.slice(i, i + chunkSize));
  }
  
  return (
    <span style={multiLineAddressStyle}>
      {chunks.map((chunk, index) => (
        <React.Fragment key={index}>
          {chunk}
          {index < chunks.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
};

const SimpleAddressValue: React.FC<{ value: string | undefined }> = ({ value }) => {
  if (!value) {
    return <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>Not provided</span>;
  }
  return <span style={addressValueStyle}>{value}</span>;
};

// ============================================
// MAIN RECEIPT COMPONENT
// ============================================

interface UniversalReceiptProps {
  data: TransactionData;
  onClose: () => void;
}

const UniversalReceipt: React.FC<UniversalReceiptProps> = ({ data, onClose }) => {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [targetRate, setTargetRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const title = getTransactionTitle(data.type);
  const displayStatus = data.displayStatus || getStatusDisplayText(data.status);
  const statusColor = getStatusColor(data.status);

  const cryptoCurrency = data.cryptoAmount?.currency || data.cryptoType || 'BTC';
  const fullCurrencyName = getFullCurrencyName(cryptoCurrency);

  const isBankWithdrawal = data.type === 'bank_withdrawal';
  const isCardWithdrawal = data.type === 'card_withdrawal';
  const isCardDeposit = data.type === 'card_deposit';
  const isCryptoDeposit = data.type === 'crypto_deposit';
  const isP2PDeposit = data.type === 'p2p_deposit';
  const isCashWithdrawal = data.type === 'cash_mailing_withdrawal';
  const isDeposit = isCardDeposit || isCryptoDeposit || isP2PDeposit;

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoadingRate(true);
      try {
        const rate = await getCryptoToEUR(cryptoCurrency);
        setExchangeRate(rate);
        const usdRateValue = await getEURToUSD();
        setUsdRate(usdRateValue);
        if (isBankWithdrawal && data.targetCurrency && data.targetCurrency !== 'EUR') {
          const targetRateValue = await getEURToTargetCurrency(data.targetCurrency);
          setTargetRate(targetRateValue);
        }
      } catch (error) {
        console.error('Failed to fetch rates:', error);
        setExchangeRate(68000);
        setUsdRate(1.09);
        if (isBankWithdrawal && data.targetCurrency) {
          const fallbackRates = { 'NGN': 1650, 'USD': 1.09, 'GBP': 0.85, 'CAD': 1.48 };
          setTargetRate(fallbackRates[data.targetCurrency] || 1);
        }
      } finally {
        setIsLoadingRate(false);
      }
    };
    fetchRates();
  }, [cryptoCurrency, isBankWithdrawal, data.targetCurrency]);

  const calculateCryptoAmount = (): number | null => {
    if (data.cryptoAmount?.amount) return data.cryptoAmount.amount;
    if (data.fiatAmount && exchangeRate && exchangeRate > 0) return data.fiatAmount / exchangeRate;
    return null;
  };

  const cryptoAmountValue = calculateCryptoAmount();
  const eurAmount = data.fiatAmount || (cryptoAmountValue && exchangeRate ? cryptoAmountValue * exchangeRate : null);
  const usdAmount = (eurAmount && usdRate) ? eurAmount * usdRate : null;
  const calculatedTargetAmount = (eurAmount && targetRate) ? eurAmount * targetRate : null;

  const handleDownload = async () => { await downloadAsPDF('receipt-content'); };
  const handleShare = async () => { if (receiptRef.current) await shareAsImage(receiptRef.current); };
  const handlePrint = async () => { await downloadAsPDF('receipt-content'); };

  const getStepDate = (step: 'submitted' | 'processing' | 'completed'): string => {
    switch (step) {
      case 'submitted': return formatDate(data.createdAt);
      case 'processing':
        if (data.status === 'completed') return formatDate(data.createdAt);
        if (data.status === 'refunded') return formatDate(data.refundedAt || data.createdAt);
        if (data.status === 'failed') return formatDate(data.failedAt || data.createdAt);
        return formatDate(data.createdAt);
      case 'completed':
        if (data.status === 'completed') return formatDate(data.completedAt || data.createdAt);
        if (data.status === 'refunded') return formatDate(data.refundedAt || data.createdAt);
        if (data.status === 'failed') return formatDate(data.failedAt || data.createdAt);
        return 'Pending';
      default: return 'Pending';
    }
  };

  const steps = [
    { key: 'submitted' as const, label: 'Submitted' },
    { key: 'processing' as const, label: 'Processing' },
    { key: 'completed' as const, label: 'Completed' },
  ];

  const getConnectionColor = (stepIndex: number) => {
    const currentStep = steps[stepIndex];
    const nextStep = steps[stepIndex + 1];
    if (!nextStep) return '#e2e8f0';
    const currentStepStatus = getStepStatus(data.status, currentStep.key);
    const nextStepStatus = getStepStatus(data.status, nextStep.key);
    if (currentStepStatus === 'completed' && nextStepStatus !== 'pending') return '#10b981';
    if (currentStepStatus === 'processing') return '#0066ff';
    return '#e2e8f0';
  };

  const shouldShowNetworkFee = data.feeAmount !== undefined && data.feeAmount > 0;

  // Format fee display - FIXED to show correct currency for crypto withdrawals
  const getFeeDisplay = () => {
    if (!shouldShowNetworkFee) return null;
    
    const feeAmount = data.feeAmount || 0;
    const feePercent = data.feePercent || 0;
    
    // For crypto withdrawals, use EUR instead of USD
    if (data.type === 'crypto_withdrawal') {
      return `€${formatNumber(feeAmount)} EUR (${feePercent}%)`;
    }
    
    // For card withdrawals
    if (data.type === 'card_withdrawal') {
      return `€${formatNumber(feeAmount)} EUR (${feePercent}%)`;
    }
    
    // For bank withdrawals
    if (data.type === 'bank_withdrawal') {
      return `€${formatNumber(feeAmount)} EUR (${feePercent}%)`;
    }
    
    // For cash withdrawals
    if (data.type === 'cash_mailing_withdrawal') {
      return `€${formatNumber(feeAmount)} EUR (${feePercent}%)`;
    }
    
    // Default
    return `${formatNumber(feeAmount)} ${data.feeCurrency || 'EUR'} (${feePercent}%)`;
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={receiptContainerStyle} onClick={(e) => e.stopPropagation()}>
        
        <div style={topBarStyle}>
          <div style={leftActionsStyle}>
            <button onClick={handleDownload} style={iconBtnStyle} title="Download PDF"><Download size={18} /></button>
            <button onClick={handlePrint} style={iconBtnStyle} title="Print"><Printer size={18} /></button>
            <button onClick={handleShare} style={iconBtnStyle} title="Share"><Share2 size={18} /></button>
          </div>
          <div style={topLogoStyle}>
            <img src="https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/Public-assets/logo.png" alt="Universal Stock Trade" style={logoImageStyle} />
          </div>
          <button onClick={onClose} style={closeIconStyle}><X size={20} /></button>
        </div>

        <div id="receipt-content" ref={receiptRef}>
          
          <div style={headerStyle}>
            <h2 style={titleStyle}>{title}</h2>
            <div style={{ ...statusBadgeStyle, backgroundColor: `${statusColor}20`, borderColor: statusColor }}>
              <span style={{ ...dotStyle, backgroundColor: statusColor }}></span>
              <span style={{ fontWeight: 'bold', color: statusColor }}>{displayStatus}</span>
            </div>
          </div>

          <div style={amountCardStyle}>
            {(isCashWithdrawal || isBankWithdrawal) && eurAmount && (
              <>
                <div style={primaryAmountRowStyle}>
                  <span style={primaryAmountStyle}>€{formatNumber(eurAmount)} EUR <EurFlagIcon /></span>
                </div>
                {isCashWithdrawal && usdAmount && (
                  <div style={secondaryAmountRowStyle}>
                    <span style={secondaryAmountStyle}>${formatNumber(usdAmount)} USD <UsaFlagIcon /></span>
                  </div>
                )}
                {isBankWithdrawal && data.targetCurrency && data.targetCurrency !== 'EUR' && (
                  <div style={secondaryAmountRowStyle}>
                    {isLoadingRate ? <span style={secondaryAmountStyle}>Loading exchange rate...</span> : (
                      <span style={secondaryAmountStyle}>{formatNumber(calculatedTargetAmount || 0)} {data.targetCurrency}{getCurrencyFlag(data.targetCurrency)}</span>
                    )}
                  </div>
                )}
              </>
            )}
            
            {(isCardWithdrawal || isCardDeposit || isP2PDeposit) && eurAmount && (
              <div style={cardAmountRowStyle}>
                <span style={cardAmountStyle}>€{formatNumber(eurAmount)} EUR <EurFlagIcon /></span>
              </div>
            )}
            
            {isCryptoDeposit && cryptoAmountValue && (
              <div style={cryptoAmountRowStyle}>
                <div style={cryptoIconContainerStyle}>{getCryptoIcon(cryptoCurrency)}</div>
                <span style={cryptoAmountLargeStyle}>{formatNumber(cryptoAmountValue, cryptoCurrency === 'BTC' ? 8 : 4)} {cryptoCurrency}</span>
              </div>
            )}
            
            {isCryptoDeposit && eurAmount && (
              <div style={eurAmountRowStyle}>
                <span style={eurAmountStyle}>≈ €{formatNumber(eurAmount)} EUR <EurFlagIcon /></span>
              </div>
            )}
            
            {cryptoAmountValue && !isLoadingRate && !isBankWithdrawal && !isCardWithdrawal && !isCashWithdrawal && !isCryptoDeposit && !isCardDeposit && !isP2PDeposit && (
              <div style={cryptoAmountRowStyle}>
                <div style={cryptoIconContainerStyle}>{getCryptoIcon(cryptoCurrency)}</div>
                <span style={cryptoAmountLargeStyle}>{formatNumber(cryptoAmountValue, cryptoCurrency === 'BTC' ? 8 : 4)} {cryptoCurrency}</span>
              </div>
            )}
            
            {eurAmount && !isLoadingRate && !isBankWithdrawal && !isCardWithdrawal && !isCashWithdrawal && !isCryptoDeposit && !isCardDeposit && !isP2PDeposit && (
              <div style={eurAmountRowStyle}>
                <span style={eurAmountStyle}>≈ €{formatNumber(eurAmount)} EUR <EurFlagIcon /></span>
              </div>
            )}
          </div>

          <div style={timelineContainerStyle}>
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(data.status, step.key);
              const stepDisplayText = getStepDisplayText(data.status, step.key);
              const stepIcon = getStepIcon(data.status, step.key);
              const stepDate = getStepDate(step.key);
              
              let iconBgColor = '#f1f5f9', iconColor = '#64748b', textColor = '#64748b';
              if (stepStatus === 'completed') { iconBgColor = '#10b98120'; iconColor = '#10b981'; textColor = '#10b981'; }
              else if (stepStatus === 'processing') { iconBgColor = '#0066ff20'; iconColor = '#0066ff'; textColor = '#0066ff'; }
              else if (stepStatus === 'failed') { iconBgColor = '#ef444420'; iconColor = '#ef4444'; textColor = '#ef4444'; }
              else if (stepStatus === 'refunded') { iconBgColor = '#8b5cf620'; iconColor = '#8b5cf6'; textColor = '#8b5cf6'; }
              
              return (
                <div key={step.key} style={timelineStepWrapperStyle}>
                  <div style={timelineStepStyle}>
                    <div style={{ ...timelineIconStyle, backgroundColor: iconBgColor, color: iconColor }}>{stepIcon}</div>
                    <div style={timelineContentStyle}>
                      <div style={timelineTitleStyle}>{step.label}</div>
                      <div style={timelineDateStyle}>{stepDate}</div>
                    </div>
                    <div style={{ ...timelineStatusStyle, color: textColor, fontWeight: stepStatus === 'completed' ? 'bold' : 'normal' }}>{stepDisplayText}</div>
                  </div>
                  {index < steps.length - 1 && <div style={{ ...timelineLineStyle, backgroundColor: getConnectionColor(index) }} />}
                </div>
              );
            })}
          </div>

          <div style={infoGridStyle}>
            
            {/* ============ CRYPTO DEPOSIT - REARRANGED ORDER ============ */}
            {isCryptoDeposit && (
              <>
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Currency</span>
                  <span style={addressValueStyle}>{fullCurrencyName} ({cryptoCurrency})</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Network</span>
                  <span style={addressValueStyle}>{data.network || cryptoCurrency}</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>UST Wallet</span>
                  <WrappedAddress address={data.walletAddress} />
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Sender Wallet</span>
                  <WrappedAddress address={data.senderAddress} />
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction Hash (TXID)</span>
                  <WrappedAddress address={data.txHash} />
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
                
                {(data.status === 'completed' || data.completedAt) && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Confirmed Date</span>
                    <span style={addressValueStyle}>{formatDate(data.confirmedDate || data.completedAt || data.createdAt)}</span>
                  </div>
                )}
              </>
            )}
            
            {/* ============ CARD DEPOSIT - WITH NEW FIELDS ============ */}
            {isCardDeposit && (
              <>
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Cardholder Name</span>
                  <span style={addressValueStyle}>{data.cardholderName || 'N/A'}</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Card Number</span>
                  <span style={addressValueStyle}>•••• {data.cardLast4 || 'N/A'}</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Deposit Account</span>
                  <span style={addressValueStyle}>Funding Account</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
                
                {(data.status === 'completed' || data.completedAt) && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Confirmed Date</span>
                    <span style={addressValueStyle}>{formatDate(data.confirmedDate || data.completedAt || data.createdAt)}</span>
                  </div>
                )}
              </>
            )}
            
            {/* ============ CARD WITHDRAWAL ============ */}
            {isCardWithdrawal && (
              <>
                {data.cardholderName && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Cardholder Name</span>
                    <span style={addressValueStyle}>{data.cardholderName}</span>
                  </div>
                )}
                {data.cardLast4 && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Card Number</span>
                    <span style={addressValueStyle}>•••• {data.cardLast4}</span>
                  </div>
                )}
                
                {shouldShowNetworkFee && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Network Fee</span>
                    <span style={addressValueStyle}>{getFeeDisplay()}</span>
                  </div>
                )}
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Withdrawal Account</span>
                  <span style={addressValueStyle}>Funding Account</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
                
                {(data.status === 'completed' || data.completedAt) && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Confirmed Date</span>
                    <span style={addressValueStyle}>{formatDate(data.confirmedDate || data.completedAt || data.createdAt)}</span>
                  </div>
                )}
              </>
            )}
            
            {/* ============ CRYPTO WITHDRAWAL ============ */}
            {data.type === 'crypto_withdrawal' && (
              <>
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Crypto Currency</span>
                  <span style={addressValueStyle}>{cryptoCurrency}</span>
                </div>
                
                {data.recipientAddress && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Recipient Address</span>
                    <WrappedAddress address={data.recipientAddress} />
                  </div>
                )}
                
                {data.network && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Network</span>
                    <span style={addressValueStyle}>{data.network}</span>
                  </div>
                )}
                
                {shouldShowNetworkFee && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Network Fee</span>
                    <span style={addressValueStyle}>{getFeeDisplay()}</span>
                  </div>
                )}
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Withdrawal Account</span>
                  <span style={addressValueStyle}>Funding Account</span>
                </div>
                
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
                
                {data.txHash && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>TX Hash</span>
                    <WrappedAddress address={data.txHash} />
                  </div>
                )}
                
                {(data.status === 'completed' || data.completedAt) && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Confirmed Date</span>
                    <span style={addressValueStyle}>{formatDate(data.confirmedDate || data.completedAt || data.createdAt)}</span>
                  </div>
                )}
              </>
            )}
            
            {/* ============ P2P DEPOSIT ============ */}
            {isP2PDeposit && (
              <>
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Cryptocurrency</span>
                  <span style={addressValueStyle}>{data.cryptoType || 'USDT'}</span>
                </div>
                {data.sellerName && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Vendor Name</span>
                    <span style={addressValueStyle}>{data.sellerName}</span>
                  </div>
                )}
                {data.orderId && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Trade ID</span>
                    <span style={addressValueStyle}>{data.orderId}</span>
                  </div>
                )}
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
              </>
            )}
            
            {/* ============ BANK WITHDRAWAL ============ */}
            {isBankWithdrawal && (
              <>
                {data.bankName && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Bank Name</span>
                    <span style={addressValueStyle}>{data.bankName}</span>
                  </div>
                )}
                {data.accountName && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Account Name</span>
                    <span style={addressValueStyle}>{data.accountName}</span>
                  </div>
                )}
                {data.accountNumber && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Account Number</span>
                    <span style={addressValueStyle}>•••• {data.accountNumber.slice(-4)}</span>
                  </div>
                )}
                {data.swiftCode && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>SWIFT / BIC Code</span>
                    <span style={addressValueStyle}>{data.swiftCode}</span>
                  </div>
                )}
                {shouldShowNetworkFee && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Network Fee</span>
                    <span style={addressValueStyle}>{getFeeDisplay()}</span>
                  </div>
                )}
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Withdrawal Account</span>
                  <span style={addressValueStyle}>Funding Account</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
              </>
            )}
            
            {/* ============ CASH WITHDRAWAL ============ */}
            {isCashWithdrawal && (
              <>
                {data.accountName && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Recipient Name</span>
                    <span style={addressValueStyle}>{data.accountName}</span>
                  </div>
                )}
                {data.userFullName && data.userFullName !== 'N/A' && !data.accountName && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Recipient Name</span>
                    <span style={addressValueStyle}>{data.userFullName}</span>
                  </div>
                )}
                {data.deliveryAddress && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Delivery Address</span>
                    <span style={addressValueStyle}>{data.deliveryAddress}</span>
                  </div>
                )}
                {data.contactPhone && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Contact Phone</span>
                    <span style={addressValueStyle}>{data.contactPhone}</span>
                  </div>
                )}
                {data.courier && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Courier</span>
                    <span style={addressValueStyle}>{data.courier}</span>
                  </div>
                )}
                {data.trackingId && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Tracking ID</span>
                    <span style={addressValueStyle}>{data.trackingId}</span>
                  </div>
                )}
                {shouldShowNetworkFee && (
                  <div style={infoItemStyle}>
                    <span style={labelStyle}>Network Fee</span>
                    <span style={addressValueStyle}>{getFeeDisplay()}</span>
                  </div>
                )}
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Withdrawal Account</span>
                  <span style={addressValueStyle}>Funding Account</span>
                </div>
                <div style={infoItemStyle}>
                  <span style={labelStyle}>Transaction ID</span>
                  <span style={{ ...addressValueStyle, fontSize: '0.7rem' }}>{data.id.slice(0, 8)}...{data.id.slice(-8)}</span>
                </div>
              </>
            )}
            
            {/* ============ NETWORK FEE FOR OTHER TRANSACTIONS ============ */}
            {shouldShowNetworkFee && !isCardDeposit && !isCryptoDeposit && !isP2PDeposit && data.type !== 'crypto_withdrawal' && data.type !== 'card_withdrawal' && data.type !== 'bank_withdrawal' && data.type !== 'cash_mailing_withdrawal' && (
              <div style={infoItemStyle}>
                <span style={labelStyle}>Network Fee</span>
                <span style={addressValueStyle}>{getFeeDisplay()}</span>
              </div>
            )}
            
          </div>

          <div style={footerSectionStyle}>
            <div style={qrCodeStyle}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=https://www.ustrader24.online/transaction/${data.id}`} alt="QR Code" style={qrImageStyle} />
            </div>
            <div style={footerLogoContainerStyle}>
              <UniversalStockTradeLogo />
              <p style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>support@ustrader24.online</p>
            </div>
          </div>

          <div style={importantNoteStyle}>
            <p style={importantNoteTextStyle}>
              ⚠️ <strong>Important:</strong> This transaction is recorded on the blockchain. 
              Please keep this receipt for your records. For any issues, contact support within 30 days.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default UniversalReceipt;