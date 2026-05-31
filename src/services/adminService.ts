import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  profile_status: string | null;
  created_at: string | null;
  phone: string | null;
  country: string | null;
  balance?: {
    main_balance: number;
    trading_balance: number;
    litecoin_balance: number;
    bonus_balance: number;
    btc_balance: number;
    eth_balance: number;
    usdt_balance: number;
    bnb_balance: number;
    is_test_account: boolean;
  } | null;
}

export interface SupportedCrypto {
  id: string;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
  logo_url: string | null;
  is_active: boolean;
  allow_deposit: boolean;
  allow_withdrawal: boolean;
  allow_trading: boolean;
  min_deposit: number;
  min_withdrawal: number;
  withdrawal_fee: number;
  display_order: number;
}

export interface UserCryptoWallet {
  id: string;
  user_id: string;
  crypto_id: string;
  balance: number;
  deposit_address: string | null;
  crypto?: SupportedCrypto;
}

// Fetch all users with balances (admin only)
export const fetchAllUsersWithBalances = async (): Promise<AdminUser[]> => {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw profilesError;
  }

  const { data: balances, error: balancesError } = await supabase
    .from('user_balances')
    .select('*');

  if (balancesError) {
    console.error('Error fetching balances:', balancesError);
  }

  return (profiles || []).map(profile => ({
    ...profile,
    balance: balances?.find(b => b.user_id === profile.id) || null,
  }));
};

// Fetch supported cryptos (cast to bypass type gen lag)
export const fetchSupportedCryptos = async (): Promise<SupportedCrypto[]> => {
  const { data, error } = await (supabase as any)
    .from('supported_cryptos')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data || []) as SupportedCrypto[];
};

// Add new cryptocurrency
export const addSupportedCrypto = async (crypto: Omit<SupportedCrypto, 'id'>) => {
  const { data, error } = await (supabase as any)
    .from('supported_cryptos')
    .insert(crypto)
    .select()
    .single();

  if (error) throw error;
  return data as SupportedCrypto;
};

// Update cryptocurrency
export const updateSupportedCrypto = async (id: string, updates: Partial<SupportedCrypto>) => {
  const { data, error } = await (supabase as any)
    .from('supported_cryptos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SupportedCrypto;
};

// Fetch user's crypto wallets
export const fetchUserCryptoWallets = async (userId: string): Promise<UserCryptoWallet[]> => {
  const { data, error } = await (supabase as any)
    .from('user_crypto_wallets')
    .select(`
      *,
      crypto:supported_cryptos(*)
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []) as UserCryptoWallet[];
};

// Create wallet for user
export const createUserCryptoWallet = async (userId: string, cryptoId: string) => {
  const { data, error } = await (supabase as any)
    .from('user_crypto_wallets')
    .insert({ user_id: userId, crypto_id: cryptoId, balance: 0 })
    .select()
    .single();

  if (error) throw error;
  return data as UserCryptoWallet;
};

// Update wallet balance (admin)
export const updateUserCryptoWalletBalance = async (
  walletId: string,
  newBalance: number,
  userId: string,
  cryptoSymbol: string,
  previousBalance: number,
  reason: string
) => {
  const { error: updateError } = await (supabase as any)
    .from('user_crypto_wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', walletId);

  if (updateError) throw updateError;

  // Log the change
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('balance_audit_log').insert({
    user_id: userId,
    admin_id: user?.id,
    balance_type: `crypto_${cryptoSymbol.toLowerCase()}`,
    previous_value: previousBalance,
    new_value: newBalance,
    change_amount: newBalance - previousBalance,
    reason,
  });

  return true;
};

// Send user notification
export const sendUserNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  referenceId?: string,
  referenceTable?: string
) => {
  const { error } = await (supabase as any).from('user_notifications').insert({
    user_id: userId,
    notification_type: type,
    title,
    message,
    reference_id: referenceId,
    reference_table: referenceTable,
  });

  if (error) throw error;
};

// Approve deposit (complete workflow)
export const approveDeposit = async (depositId: string, adminNotes?: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch deposit
  const { data: deposit, error: fetchError } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single();

  if (fetchError || !deposit) throw fetchError || new Error('Deposit not found');

  // Update deposit status
  const { error: updateError } = await supabase
    .from('deposits')
    .update({
      status: 'approved',
      admin_notes: adminNotes,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', depositId);

  if (updateError) throw updateError;

  // Create transaction record
  await supabase.from('transactions').insert({
    user_id: deposit.user_id,
    transaction_type: 'deposit',
    amount: deposit.amount,
    balance_type: 'main',
    channel: deposit.deposit_method,
    status: 'completed',
    description: `${deposit.deposit_method} deposit approved - ${deposit.crypto_type || 'Fiat'}`,
    reference_id: depositId,
  });

  // Update user balance
  const { data: balance } = await supabase
    .from('user_balances')
    .select('main_balance')
    .eq('user_id', deposit.user_id)
    .single();

  if (balance) {
    await supabase
      .from('user_balances')
      .update({ main_balance: balance.main_balance + deposit.amount })
      .eq('user_id', deposit.user_id);
  }

  // Notify user
  await sendUserNotification(
    deposit.user_id,
    'deposit_approved',
    'Deposit Approved',
    `Your ${deposit.deposit_method} deposit of ${deposit.currency} ${deposit.amount} has been approved and credited to your account.`,
    depositId,
    'deposits'
  );

  return true;
};

// Decline deposit
export const declineDeposit = async (depositId: string, adminNotes?: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: deposit, error: fetchError } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', depositId)
    .single();

  if (fetchError || !deposit) throw fetchError || new Error('Deposit not found');

  const { error: updateError } = await supabase
    .from('deposits')
    .update({
      status: 'declined',
      admin_notes: adminNotes,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', depositId);

  if (updateError) throw updateError;

  await sendUserNotification(
    deposit.user_id,
    'deposit_declined',
    'Deposit Declined',
    `Your ${deposit.deposit_method} deposit of ${deposit.currency} ${deposit.amount} was declined. ${adminNotes ? 'Reason: ' + adminNotes : ''}`,
    depositId,
    'deposits'
  );

  return true;
};

// Approve withdrawal (with TXID for crypto)
export const approveWithdrawal = async (
  withdrawalId: string,
  txid?: string,
  adminNotes?: string
) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single();

  if (fetchError || !withdrawal) throw fetchError || new Error('Withdrawal not found');

  // Check balance first
  const { data: balance } = await supabase
    .from('user_balances')
    .select('main_balance')
    .eq('user_id', withdrawal.user_id)
    .single();

  if (!balance || balance.main_balance < withdrawal.amount) {
    throw new Error('Insufficient balance');
  }

  // Update withdrawal status
  const { error: updateError } = await supabase
    .from('withdrawals')
    .update({
      status: 'approved',
      admin_notes: adminNotes,
      txid: txid || null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId);

  if (updateError) throw updateError;

  // Create transaction record
  await supabase.from('transactions').insert({
    user_id: withdrawal.user_id,
    transaction_type: 'withdrawal',
    amount: -withdrawal.amount,
    balance_type: 'main',
    channel: withdrawal.withdrawal_method,
    status: 'completed',
    description: `${withdrawal.withdrawal_method} withdrawal approved${txid ? ' - TXID: ' + txid : ''}`,
    reference_id: withdrawalId,
  });

  // Deduct from balance
  await supabase
    .from('user_balances')
    .update({ main_balance: Math.max(0, balance.main_balance - withdrawal.amount) })
    .eq('user_id', withdrawal.user_id);

  // Notify user
  await sendUserNotification(
    withdrawal.user_id,
    'withdrawal_approved',
    'Withdrawal Approved',
    `Your ${withdrawal.withdrawal_method} withdrawal of ${withdrawal.currency} ${withdrawal.amount} has been processed.${txid ? ' Transaction ID: ' + txid : ''}`,
    withdrawalId,
    'withdrawals'
  );

  return true;
};

// Decline withdrawal
export const declineWithdrawal = async (withdrawalId: string, adminNotes?: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single();

  if (fetchError || !withdrawal) throw fetchError || new Error('Withdrawal not found');

  const { error: updateError } = await supabase
    .from('withdrawals')
    .update({
      status: 'declined',
      admin_notes: adminNotes,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId);

  if (updateError) throw updateError;

  await sendUserNotification(
    withdrawal.user_id,
    'withdrawal_declined',
    'Withdrawal Declined',
    `Your ${withdrawal.withdrawal_method} withdrawal of ${withdrawal.currency} ${withdrawal.amount} was declined. ${adminNotes ? 'Reason: ' + adminNotes : ''}`,
    withdrawalId,
    'withdrawals'
  );

  return true;
};

// Get admin notifications (unread)
export const getAdminNotifications = async () => {
  const { data, error } = await (supabase as any)
    .from('admin_notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
};

// Mark admin notification as read
export const markAdminNotificationRead = async (notificationId: string) => {
  await (supabase as any)
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
};

// Calculate real-time trading metrics from platform_trades
export const calculateUserTradingMetrics = async (userId: string) => {
  // Get all closed trades
  const { data: trades, error } = await supabase
    .from('platform_trades')
    .select('pnl, status, closed_at')
    .eq('user_id', userId)
    .eq('status', 'closed');

  if (error) throw error;

  const closedTrades = trades || [];
  const totalTrades = closedTrades.length;
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  // Today's P&L
  const today = new Date().toISOString().split('T')[0];
  const todaysTrades = closedTrades.filter(t => 
    t.closed_at && t.closed_at.startsWith(today)
  );
  const todayPnl = todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  return {
    totalTrades,
    totalProfit,
    winRate,
    todayPnl,
  };
};
