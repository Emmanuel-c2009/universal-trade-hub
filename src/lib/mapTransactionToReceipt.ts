// src/lib/mapTransactionToReceipt.ts
import { TransactionData, TransactionType, TransactionStatus } from '@/components/UniversalReceipt';

// ============================================
// EXPORTED TYPES
// ============================================

export interface WithdrawalRow {
  id: string;
  user_id: string;
  withdrawal_method: string;
  amount: number;
  currency: string;
  fee_amount: number;
  fee_percentage: number;
  fee_percent?: number;
  status: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  swift_code: string | null;
  bank_country: string | null;
  bank_address?: string | null;
  bank_city?: string | null;
  crypto_type: string | null;
  wallet_address: string | null;
  network: string | null;
  txid: string | null;
  chain_network?: string | null;
  cardholder_name: string | null;
  card_number_masked: string | null;
  card_expiry: string | null;
  card_type?: string | null;
  delivery_address: string | null;
  contact_phone: string | null;
  delivery_city?: string | null;
  delivery_country?: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  user_full_name?: string | null;
  receipt_url?: string | null;
  payment_proof_url?: string | null;
  admin_notes?: string | null;
  refund_reason?: string | null;
  refund_status?: string | null;
  seller_name?: string | null;
  order_id?: string | null;
}

export interface DepositRow {
  id: string;
  user_id: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  crypto_type?: string | null;
  crypto_amount?: number | null;
  tx_hash?: string | null;
  txid?: string | null;
  wallet_address?: string | null;
  receiving_address?: string | null;
  sender_address?: string | null;
  network?: string | null;
  cardholder_name?: string | null;
  card_number_masked?: string | null;
  seller_name?: string | null;
  order_id?: string | null;
  created_at: string;
  updated_at: string;
  fee_amount?: number | null;
  fee_percentage?: number | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

// ============================================
// STATUS MAPPING FUNCTIONS
// ============================================

const mapStatus = (status: string): TransactionStatus => {
  const s = status?.toLowerCase() || '';
  if (s === 'approved' || s === 'completed') return 'completed';
  if (s === 'refunded') return 'refunded';
  if (s === 'declined' || s === 'rejected') return 'failed';
  if (s === 'processing') return 'processing';
  return 'pending';
};

export const getStatusDisplayText = (status: string): string => {
  const s = status?.toLowerCase() || '';
  if (s === 'approved' || s === 'completed') return 'Completed';
  if (s === 'refunded') return 'Refunded';
  if (s === 'declined' || s === 'rejected') return 'Failed';
  if (s === 'processing') return 'Processing';
  return 'Submitted';
};

export const getStatusColor = (status: string): string => {
  const s = status?.toLowerCase() || '';
  if (s === 'approved' || s === 'completed') return '#10b981';
  if (s === 'refunded') return '#8b5cf6';
  if (s === 'declined' || s === 'rejected') return '#ef4444';
  if (s === 'processing') return '#0066ff';
  return '#fbbf24';
};

// ============================================
// STEP STATUS FUNCTIONS
// ============================================

export const getStepStatus = (
  transactionStatus: string,
  step: 'submitted' | 'processing' | 'completed'
): 'completed' | 'processing' | 'pending' | 'failed' | 'refunded' => {
  const status = transactionStatus?.toLowerCase() || '';
  
  if (status === 'refunded') {
    if (step === 'submitted') return 'completed';
    return 'refunded';
  }
  
  if (status === 'declined' || status === 'rejected' || status === 'failed') {
    if (step === 'submitted') return 'completed';
    return 'failed';
  }
  
  const isComplete = status === 'approved' || status === 'completed';
  
  if (step === 'submitted') return 'completed';
  if (step === 'processing') {
    if (isComplete) return 'completed';
    if (status === 'processing') return 'processing';
    return 'pending';
  }
  if (step === 'completed') {
    if (isComplete) return 'completed';
    return 'pending';
  }
  
  return 'pending';
};

export const getStepDisplayText = (
  transactionStatus: string,
  step: 'submitted' | 'processing' | 'completed'
): string => {
  const stepStatus = getStepStatus(transactionStatus, step);
  switch (stepStatus) {
    case 'completed': return 'Completed';
    case 'processing': return 'In Progress';
    case 'failed': return 'Failed';
    case 'refunded': return 'Refunded';
    default: return 'Pending';
  }
};

export const getStepIcon = (
  transactionStatus: string,
  step: 'submitted' | 'processing' | 'completed'
): string => {
  const stepStatus = getStepStatus(transactionStatus, step);
  switch (stepStatus) {
    case 'completed': return '✓';
    case 'processing': return '⏳';
    case 'failed': return '✗';
    case 'refunded': return '↺';
    default: return '○';
  }
};

// ============================================
// CRYPTO HELPER FUNCTIONS
// ============================================

const getCryptoIcon = (currency: string): string => {
  const icons: Record<string, string> = {
    'BTC': '₿', 'ETH': 'Ξ', 'USDT': '₮', 'BNB': '◈', 
    'SOL': '◎', 'XRP': 'XRP', 'DOGE': 'Ð', 'LTC': 'Ł',
    'TRX': 'TRX', 'ADA': '₳', 'MATIC': '◆', 'DOT': '●',
    'AVAX': '❄', 'LINK': '🔗', 'UNI': '🦄',
  };
  return icons[currency?.toUpperCase()] || '₿';
};

const getCryptoColor = (currency: string): string => {
  const colors: Record<string, string> = {
    'BTC': '#f7931a', 'ETH': '#627eea', 'USDT': '#26a17b', 
    'BNB': '#f3ba2f', 'SOL': '#00ffbd', 'XRP': '#23292f',
    'DOGE': '#c3a634', 'LTC': '#bfbbbb', 'TRX': '#eb0029',
    'ADA': '#0033ad', 'MATIC': '#8247e5', 'DOT': '#e6007a',
    'AVAX': '#e84142', 'LINK': '#2a5ada', 'UNI': '#ff007a',
  };
  return colors[currency?.toUpperCase()] || '#f7931a';
};

// ============================================
// DEPOSIT MAPPING FUNCTION
// ============================================

export const mapDepositToReceipt = (deposit: DepositRow, profile?: ProfileRow): TransactionData => {
  let receiptType: TransactionType = 'card_deposit';
  
  if (deposit.crypto_type || deposit.method?.toLowerCase() === 'crypto') {
    receiptType = 'crypto_deposit';
  } else if (deposit.method?.toLowerCase() === 'p2p' || deposit.seller_name) {
    receiptType = 'p2p_deposit';
  } else {
    receiptType = 'card_deposit';
  }

  const receiptStatus = mapStatus(deposit.status);
  const displayStatus = getStatusDisplayText(deposit.status);
  const cryptoType = deposit.crypto_type || 'BTC';

  let cryptoAmount = null;
  if (deposit.crypto_amount) {
    cryptoAmount = deposit.crypto_amount;
  }

  const walletAddress = deposit.wallet_address || deposit.receiving_address || null;
  const senderAddress = deposit.sender_address || null;
  const txHashValue = deposit.txid || null;

  return {
    id: deposit.id,
    type: receiptType,
    status: receiptStatus,
    displayStatus: displayStatus,
    createdAt: deposit.created_at,
    completedAt: deposit.status === 'approved' || deposit.status === 'completed' ? deposit.updated_at : undefined,
    confirmedDate: deposit.status === 'approved' || deposit.status === 'completed' ? deposit.updated_at : undefined,
    
    cryptoAmount: receiptType === 'crypto_deposit' && cryptoAmount ? {
      amount: cryptoAmount,
      currency: cryptoType,
      icon: getCryptoIcon(cryptoType),
      color: getCryptoColor(cryptoType),
    } : undefined,
    fiatAmount: Math.abs(deposit.amount),
    fiatCurrency: deposit.currency || 'EUR',
    
    cryptoType: receiptType === 'crypto_deposit' ? cryptoType : undefined,
    txHash: txHashValue,
    walletAddress: walletAddress,
    senderAddress: senderAddress,
    network: deposit.network || cryptoType,
    
    cardholderName: deposit.cardholder_name,
    cardLast4: deposit.card_number_masked?.slice(-4),
    
    sellerName: deposit.seller_name,
    orderId: deposit.order_id,
    
    feeAmount: deposit.fee_amount || undefined,
    feePercent: deposit.fee_percentage || undefined,
    feeCurrency: 'EUR',
    
    withdrawalAccount: 'Funding Account',
  };
};

// ============================================
// WITHDRAWAL MAPPING FUNCTION - FIXED FEE PERCENTAGE
// ============================================

export const mapWithdrawalToReceipt = (withdrawal: WithdrawalRow, profile?: ProfileRow): TransactionData => {
  let receiptType: TransactionType = 'crypto_withdrawal';
  const method = withdrawal.withdrawal_method?.toLowerCase() || '';
  const isBankWithdrawal = method === 'bank';
  const isCardWithdrawal = method === 'card';
  const isCashWithdrawal = method === 'cash';
  
  switch (method) {
    case 'bank':
      receiptType = 'bank_withdrawal';
      break;
    case 'card':
      receiptType = 'card_withdrawal';
      break;
    case 'cash':
      receiptType = 'cash_mailing_withdrawal';
      break;
    default:
      receiptType = 'crypto_withdrawal';
  }

  const cryptoType = withdrawal.crypto_type || 'BTC';
  const receiptStatus = mapStatus(withdrawal.status);
  const displayStatus = getStatusDisplayText(withdrawal.status);
  
  // ✅ FIXED: Calculate fee percentage from fee amount if percentage is 0
  let feeAmountValue = withdrawal.fee_amount || 0;
  let feePercentValue = withdrawal.fee_percentage || withdrawal.fee_percent || 0;
  
  // If fee_percentage is 0 but fee_amount exists and amount > 0, calculate the percentage
  if (feePercentValue === 0 && feeAmountValue > 0 && withdrawal.amount > 0) {
    feePercentValue = (feeAmountValue / withdrawal.amount) * 100;
    // Round to 2 decimal places
    feePercentValue = Math.round(feePercentValue * 100) / 100;
    console.log(`📊 Calculated fee percentage: ${feePercentValue}% from fee amount ${feeAmountValue} on amount ${withdrawal.amount}`);
  }

  const targetCurrency = isBankWithdrawal && withdrawal.currency !== 'EUR' ? withdrawal.currency : undefined;
  const userFullName = profile?.full_name || withdrawal.user_full_name || 'N/A';

  return {
    id: withdrawal.id,
    type: receiptType,
    status: receiptStatus,
    displayStatus: displayStatus,
    createdAt: withdrawal.created_at,
    completedAt: withdrawal.status === 'approved' || withdrawal.status === 'completed' ? withdrawal.updated_at : undefined,
    confirmedDate: withdrawal.status === 'approved' || withdrawal.status === 'completed' ? withdrawal.reviewed_at || withdrawal.updated_at : undefined,
    refundedAt: withdrawal.status === 'refunded' ? withdrawal.updated_at : undefined,
    failedAt: withdrawal.status === 'declined' || withdrawal.status === 'rejected' ? withdrawal.updated_at : undefined,
    
    cryptoAmount: method === 'crypto' ? {
      amount: 0,
      currency: cryptoType,
      icon: getCryptoIcon(cryptoType),
      color: getCryptoColor(cryptoType),
    } : undefined,
    fiatAmount: Math.abs(withdrawal.amount),
    fiatCurrency: withdrawal.currency || 'EUR',
    
    targetCurrency: targetCurrency,
    cryptoType: cryptoType,
    
    feeAmount: feeAmountValue,
    feeCurrency: 'EUR',  // Always use EUR for fees
    feePercent: feePercentValue,
    
    txHash: withdrawal.txid,
    recipientAddress: withdrawal.wallet_address,
    network: withdrawal.network || withdrawal.chain_network || cryptoType,
    
    bankName: withdrawal.bank_name,
    accountName: withdrawal.account_name,
    accountNumber: withdrawal.account_number,
    swiftCode: withdrawal.swift_code,
    bankCountry: withdrawal.bank_country,
    
    cardholderName: withdrawal.cardholder_name,
    cardLast4: withdrawal.card_number_masked?.slice(-4),
    
    deliveryAddress: withdrawal.delivery_address,
    contactPhone: withdrawal.contact_phone,
    courier: 'DHL / FedEx',
    userFullName: userFullName,
    
    withdrawalAccount: 'Funding Account',
  };
};

// ============================================
// LEGACY FUNCTION FOR TRANSACTIONS TABLE
// ============================================

export const mapTransactionToReceipt = (tx: any, profile?: ProfileRow): TransactionData => {
  if (tx.withdrawal_method) {
    return mapWithdrawalToReceipt(tx, profile);
  }
  
  if (tx.method || tx.source_table === 'deposits') {
    return mapDepositToReceipt(tx as DepositRow, profile);
  }
  
  let metadata = tx.metadata;
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
  }

  let receiptType: TransactionType = 'crypto_deposit';
  const txType = tx.transaction_type?.toLowerCase() || '';
  const description = tx.description?.toLowerCase() || '';
  const sourceTable = tx.source_table || '';
  
  if (sourceTable === 'deposits' || txType === 'credit' || description.includes('deposit')) {
    if (tx.crypto_type || metadata?.crypto_type || description.includes('crypto')) {
      receiptType = 'crypto_deposit';
    } else if (description.includes('p2p') || metadata?.p2p || metadata?.method === 'p2p') {
      receiptType = 'p2p_deposit';
    } else {
      receiptType = 'card_deposit';
    }
  } else if (sourceTable === 'withdrawals' || description.includes('withdrawal')) {
    const withdrawalMethod = metadata?.withdrawal_method || 
                           (description.includes('bank') ? 'bank' :
                            description.includes('card') ? 'card' :
                            description.includes('cash') ? 'cash' : 'crypto');
    switch (withdrawalMethod) {
      case 'bank': receiptType = 'bank_withdrawal'; break;
      case 'card': receiptType = 'card_withdrawal'; break;
      case 'cash': receiptType = 'cash_mailing_withdrawal'; break;
      default: receiptType = 'crypto_withdrawal';
    }
  } else if (txType.includes('swap') || description.includes('swap')) {
    receiptType = 'crypto_swap';
  } else if (txType.includes('transfer') || description.includes('transfer')) {
    receiptType = 'balance_transfer';
  }

  const cryptoType = metadata?.crypto_type || tx.crypto_type || 'BTC';
  const fiatAmount = Math.abs(tx.amount);
  const fiatCurrency = tx.currency || 'EUR';
  const receiptStatus = mapStatus(tx.status);
  const displayStatus = getStatusDisplayText(tx.status);
  
  let feeAmount = metadata?.fee_amount || metadata?.feeAmount;
  let feePercent = metadata?.fee_percent || metadata?.feePercent;
  
  // Calculate percentage if missing
  if ((!feePercent || feePercent === 0) && feeAmount && feeAmount > 0 && fiatAmount > 0) {
    feePercent = (feeAmount / fiatAmount) * 100;
    feePercent = Math.round(feePercent * 100) / 100;
  }
  
  if (!feeAmount && fiatAmount) {
    feeAmount = fiatAmount * 0.1;
    feePercent = 10;
  }

  let cryptoAmount = null;
  if (tx.crypto_amount) {
    cryptoAmount = tx.crypto_amount;
  } else if (metadata?.crypto_amount) {
    cryptoAmount = metadata.crypto_amount;
  }

  const walletAddress = metadata?.wallet_address || metadata?.receiving_address || null;
  const senderAddress = metadata?.sender_address || null;
  const isWithdrawalType = receiptType === 'crypto_withdrawal' || 
                           receiptType === 'bank_withdrawal' || 
                           receiptType === 'card_withdrawal' || 
                           receiptType === 'cash_mailing_withdrawal';
  
  const txHashValue = metadata?.txid || tx.txid || null;

  const result: TransactionData = {
    id: tx.id,
    type: receiptType,
    status: receiptStatus,
    displayStatus: displayStatus,
    createdAt: tx.created_at,
    completedAt: tx.status === 'approved' || tx.status === 'completed' ? tx.created_at : undefined,
    confirmedDate: tx.status === 'approved' || tx.status === 'completed' ? tx.created_at : undefined,
    
    cryptoAmount: cryptoAmount ? {
      amount: cryptoAmount,
      currency: cryptoType,
      icon: getCryptoIcon(cryptoType),
      color: getCryptoColor(cryptoType),
    } : undefined,
    fiatAmount: fiatAmount,
    fiatCurrency: fiatCurrency,
    
    cryptoType: receiptType === 'crypto_deposit' ? cryptoType : undefined,
    
    txHash: txHashValue,
    walletAddress: walletAddress,
    senderAddress: senderAddress,
    network: metadata?.network || cryptoType,
    
    feeAmount: isWithdrawalType ? feeAmount : undefined,
    feeCurrency: 'EUR',
    feePercent: feePercent,
    
    bankName: metadata?.bank_name,
    accountName: metadata?.account_name,
    accountNumber: metadata?.account_number,
    swiftCode: metadata?.swift_code,
    
    cardholderName: metadata?.cardholder_name || tx.cardholder_name,
    cardLast4: metadata?.card_last4 || tx.card_number_masked?.slice(-4),
    
    deliveryAddress: metadata?.delivery_address,
    contactPhone: metadata?.contact_phone,
    courier: metadata?.courier,
    userFullName: metadata?.user_full_name || profile?.full_name,
    
    sellerName: metadata?.seller_name || tx.seller_name,
    orderId: metadata?.order_id || tx.order_id,
    
    withdrawalAccount: isWithdrawalType ? 'Funding Account' : undefined,
  };

  Object.keys(result).forEach(key => {
    if (result[key as keyof TransactionData] === undefined) {
      delete result[key as keyof TransactionData];
    }
  });

  return result;
};