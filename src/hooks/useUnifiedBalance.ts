// src/hooks/useUnifiedBalance.ts - COMPLETE FIXED VERSION
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/withTimeout";

export interface CryptoPrice {
  symbol: string;
  name: string;
  price_eur: number;
  price_usd: number;
  change_24h: number;
}

export interface UnifiedBalance {
  id: string;
  user_id: string;
  balance_usdt: number;
  balance_btc: number;
  balance_eth: number;
  balance_ltc: number;
  balance_bnb: number;
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  ltc_balance: number;
  bnb_balance: number;
  litecoin_balance: number;
  funding_balance: number;
  trading_balance: number;
  bonus_balance: number;
  challenges_balance: number;
  main_balance: number;
  balance_eur: number;
  today_pnl: number;
  total_profit: number;
  is_test_account: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalculatedTotals {
  totalAssets: number;
  fundingBalance: number;
  tradingBalance: number;
  bonusBalance: number;
  challengesBalance: number;
  cryptoValueEUR: number;
  btcValueEUR: number;
  ethValueEUR: number;
  usdtValueEUR: number;
  ltcValueEUR: number;
  bnbValueEUR: number;
}

// Kept for reference / potential use elsewhere — no longer used by transferBalance,
// which now delegates the column/table mapping to the transfer_balance() DB function.
const getColumnName = (type: string): string => {
  const typeMap: Record<string, string> = {
    'funding': 'funding_balance',
    'funding_balance': 'funding_balance',
    'main': 'funding_balance',
    'main_balance': 'funding_balance',
    'trading': 'trading_balance',
    'trading_balance': 'trading_balance',
    'bonus': 'bonus_balance',
    'bonus_balance': 'bonus_balance',
    'challenges': 'challenges_balance',
    'challenges_balance': 'challenges_balance',
    'usdt': 'usd_balance',
    'balance_usdt': 'usd_balance',
    'btc': 'btc_balance',
    'balance_btc': 'btc_balance',
    'eth': 'eth_balance',
    'balance_eth': 'eth_balance',
    'ltc': 'ltc_balance',
    'balance_ltc': 'ltc_balance',
    'bnb': 'bnb_balance',
    'balance_bnb': 'bnb_balance',
  };
  return typeMap[type.toLowerCase()] || type;
};

// Small random delay so a tab-return doesn't fire every page's requests
// (and collide with the crypto-price cron job) in the exact same instant.
const jitterDelay = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 1500));

export const useUnifiedBalance = (userId: string | null) => {
  const [balance, setBalance] = useState<UnifiedBalance | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<CalculatedTotals>({
    totalAssets: 0,
    fundingBalance: 0,
    tradingBalance: 0,
    bonusBalance: 0,
    challengesBalance: 0,
    cryptoValueEUR: 0,
    btcValueEUR: 0,
    ethValueEUR: 0,
    usdtValueEUR: 0,
    ltcValueEUR: 0,
    bnbValueEUR: 0,
  });

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log('[Balance] Fetching for user:', userId);

    try {
      let eurData: any = null;
      let cryptoData: any = null;
      let todayProfit: any = null;
      let totalProfit: any = null;

      try {
        const { data, error } = await withTimeout(
          supabase.from('user_balances').select('*').eq('user_id', userId).maybeSingle(),
          8000,
          "Fetch EUR balance"
        );
        if (error) console.error('[Balance] EUR fetch error:', error);
        eurData = data;
      } catch (err) {
        console.error('[Balance] EUR fetch timed out or failed:', err);
      }

      try {
        const { data, error } = await withTimeout(
          supabase.from('user_wallet_balances').select('*').eq('user_id', userId).maybeSingle(),
          8000,
          "Fetch crypto balance"
        );
        if (error) console.error('[Balance] Crypto fetch error:', error);
        cryptoData = data;
      } catch (err) {
        console.error('[Balance] Crypto fetch timed out or failed:', err);
      }

      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_user_today_profit', { user_id_param: userId }),
          8000,
          "Fetch today profit"
        );
        if (error) console.error('[Balance] Today P&L fetch error:', error);
        todayProfit = data;
      } catch (err) {
        console.error('[Balance] Today P&L fetch timed out or failed:', err);
      }

      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_user_total_profit', { user_id_param: userId }),
          8000,
          "Fetch total profit"
        );
        if (error) console.error('[Balance] Total profit fetch error:', error);
        totalProfit = data;
      } catch (err) {
        console.error('[Balance] Total profit fetch timed out or failed:', err);
      }

      const eurBalances = eurData || {};
      const cryptoBalances = cryptoData || {};

      const combinedBalance: UnifiedBalance = {
        id: eurBalances.id || cryptoBalances.id || '',
        user_id: userId,
        balance_usdt: cryptoBalances.usd_balance || 0,
        balance_btc: cryptoBalances.btc_balance || 0,
        balance_eth: cryptoBalances.eth_balance || 0,
        balance_ltc: cryptoBalances.ltc_balance || 0,
        balance_bnb: cryptoBalances.bnb_balance || 0,
        btc_balance: cryptoBalances.btc_balance || 0,
        eth_balance: cryptoBalances.eth_balance || 0,
        usdt_balance: cryptoBalances.usd_balance || 0,
        ltc_balance: cryptoBalances.ltc_balance || 0,
        bnb_balance: cryptoBalances.bnb_balance || 0,
        litecoin_balance: cryptoBalances.ltc_balance || 0,
        funding_balance: eurBalances.funding_balance || 0,
        trading_balance: eurBalances.trading_balance || 0,
        bonus_balance: eurBalances.bonus_balance || 0,
        challenges_balance: eurBalances.challenges_balance || 0,
        main_balance: eurBalances.funding_balance || 0,
        balance_eur: eurBalances.balance_eur || 0,
        today_pnl: todayProfit || 0,
        total_profit: totalProfit || 0,
        is_test_account: eurBalances.is_test_account || false,
        created_at: eurBalances.created_at || cryptoBalances.last_updated || new Date().toISOString(),
        updated_at: eurBalances.updated_at || cryptoBalances.last_updated || new Date().toISOString(),
      };

      setBalance(combinedBalance);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshBalance = useCallback(async () => {
    setLoading(true);
    await fetchBalance();
  }, [fetchBalance]);

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('crypto_prices').select('*'),
        8000,
        "Fetch crypto prices"
      );

      if (!error && data) {
        setCryptoPrices(data);
        console.log('[Prices] Loaded', data.length, 'crypto prices');
      } else if (error) {
        console.error('[Prices] Fetch error:', error);
      }
    } catch (err) {
      console.error('[Prices] Fetch timed out or failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!balance) return;

    const usdtPrice = cryptoPrices.find(p => p.symbol === 'USDT')?.price_eur || 1;
    const btcPrice = cryptoPrices.find(p => p.symbol === 'BTC')?.price_eur || 85000;
    const ethPrice = cryptoPrices.find(p => p.symbol === 'ETH')?.price_eur || 2800;
    const ltcPrice = cryptoPrices.find(p => p.symbol === 'LTC')?.price_eur || 95;
    const bnbPrice = cryptoPrices.find(p => p.symbol === 'BNB')?.price_eur || 550;

    const usdtValueEUR = (balance.balance_usdt || 0) * usdtPrice;
    const btcValueEUR = (balance.balance_btc || 0) * btcPrice;
    const ethValueEUR = (balance.balance_eth || 0) * ethPrice;
    const ltcValueEUR = (balance.balance_ltc || 0) * ltcPrice;
    const bnbValueEUR = (balance.balance_bnb || 0) * bnbPrice;

    const cryptoValueEUR = usdtValueEUR + btcValueEUR + ethValueEUR + ltcValueEUR + bnbValueEUR;

    const fundingBalance = balance.funding_balance || 0;
    const tradingBalance = balance.trading_balance || 0;
    const bonusBalance = balance.bonus_balance || 0;
    const challengesBalance = balance.challenges_balance || 0;

    const fiatTotalEUR = fundingBalance + tradingBalance + bonusBalance + challengesBalance;
    const totalAssets = fiatTotalEUR + cryptoValueEUR;

    setTotals({
      totalAssets,
      fundingBalance,
      tradingBalance,
      bonusBalance,
      challengesBalance,
      cryptoValueEUR,
      btcValueEUR,
      ethValueEUR,
      usdtValueEUR,
      ltcValueEUR,
      bnbValueEUR,
    });
  }, [balance, cryptoPrices]);

  useEffect(() => {
    fetchBalance();
    fetchCryptoPrices();

    if (!userId) return;

    const channel: RealtimeChannel = supabase
      .channel(`unified_dashboard:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_balances', filter: `user_id=eq.${userId}` },
        () => {
          console.log('[Balance] EUR balance update received');
          fetchBalance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_wallet_balances', filter: `user_id=eq.${userId}` },
        () => {
          console.log('[Balance] Crypto balance update received');
          fetchBalance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crypto_prices' },
        () => {
          fetchCryptoPrices();
        }
      )
      .subscribe();

    // On returning to this tab: wait a short, randomized moment before
    // refetching, instead of firing immediately. This spreads out requests
    // across pages/tabs and avoids landing every request in the exact same
    // instant a background cron job (or other pages) may also be firing.
    let cancelled = false;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // ============================================
        // TEMPORARY DIAGNOSTIC — remove once root cause is confirmed
        // ============================================
        // Times getSession() in isolation, completely separately from
        // the balance/price fetches below, so we can see directly
        // whether IT is what's hanging, or whether it resolves fine
        // and something else is the real blocker.
        const diagStart = performance.now();
        console.log('🔍 [DIAG] getSession() called at visibility change...');
        supabase.auth.getSession().then((result) => {
          const ms = Math.round(performance.now() - diagStart);
          console.log(`🔍 [DIAG] getSession() RESOLVED after ${ms}ms — session:`, result?.data?.session ? 'present' : 'MISSING/NULL', result?.error ? `error: ${result.error.message}` : '');
        }).catch((err) => {
          const ms = Math.round(performance.now() - diagStart);
          console.log(`🔍 [DIAG] getSession() REJECTED after ${ms}ms:`, err);
        });
        // ============================================
        // END TEMPORARY DIAGNOSTIC
        // ============================================

        jitterDelay().then(() => {
          if (!cancelled) {
            fetchBalance();
            fetchCryptoPrices();
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const priceInterval = setInterval(fetchCryptoPrices, 30000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(priceInterval);
    };
  }, [userId, fetchBalance, fetchCryptoPrices]);

  const getBalanceByType = (type: string): number => {
    if (!balance) return 0;
    switch (type.toLowerCase()) {
      case 'funding':
      case 'funding_balance':
      case 'main':
      case 'main_balance':
        return balance.funding_balance || 0;
      case 'trading':
      case 'trading_balance':
        return balance.trading_balance || 0;
      case 'bonus':
      case 'bonus_balance':
        return balance.bonus_balance || 0;
      case 'challenges':
      case 'challenges_balance':
        return balance.challenges_balance || 0;
      case 'usdt':
      case 'balance_usdt':
        return balance.balance_usdt || 0;
      case 'btc':
      case 'balance_btc':
        return balance.balance_btc || 0;
      case 'eth':
      case 'balance_eth':
        return balance.balance_eth || 0;
      case 'ltc':
      case 'balance_ltc':
        return balance.balance_ltc || 0;
      case 'bnb':
      case 'balance_bnb':
        return balance.balance_bnb || 0;
      default:
        return 0;
    }
  };

  // ---- transferBalance: now delegates to the atomic transfer_balance() DB function ----
  const transferBalance = async (
    fromType: string,
    toType: string,
    amount: number,
    cryptoSymbol?: string,
    exchangeRate?: number
  ): Promise<boolean> => {
    if (!userId) {
      console.error('[Transfer] No user ID');
      return false;
    }

    if (amount <= 0) {
      console.error('[Transfer] Invalid amount');
      return false;
    }

    try {
      const { data, error } = await withTimeout(
        supabase.rpc('transfer_balance', {
          p_user_id: userId,
          p_from_type: fromType,
          p_to_type: toType,
          p_amount: amount,
          p_crypto_symbol: cryptoSymbol ?? null,
          p_exchange_rate: exchangeRate ?? null,
        }),
        8000,
        "Transfer balance"
      );

      if (error) {
        console.error(
          '[Transfer] RPC error:',
          'message:', error.message,
          '| details:', error.details,
          '| hint:', error.hint,
          '| code:', error.code
        );
        return false;
      }

      console.log('[Transfer] ✅ Transfer successful!');
      await refreshBalance();
      return true;
    } catch (error: any) {
      console.error('[Transfer] Unexpected error or timeout:', error?.message || error);
      return false;
    }
  };

  const swapCrypto = async (
    fromCrypto: string,
    toCrypto: string,
    amount: number,
    exchangeRate: number,
    feePercent: number = 0.5
  ): Promise<boolean> => {
    if (!userId) {
      console.error('[Swap] No user ID');
      return false;
    }

    try {
      const fromColumn = `${fromCrypto.toLowerCase()}_balance`;
      const toColumn = `${toCrypto.toLowerCase()}_balance`;

      const { data: currentBalance, error: fetchError } = await withTimeout(
        supabase.from('user_wallet_balances').select('*').eq('user_id', userId).single(),
        8000,
        "Fetch wallet balance"
      );

      if (fetchError) {
        console.error('[Swap] Fetch error:', fetchError);
        return false;
      }

      const currentFromBalance = currentBalance?.[fromColumn] || 0;

      if (currentFromBalance < amount) {
        console.error('[Swap] Insufficient balance');
        return false;
      }

      const fee = amount * (feePercent / 100);
      const swapAmount = amount - fee;
      const receivedAmount = swapAmount * exchangeRate;

      const updates: Record<string, number | string> = {};
      updates[fromColumn] = currentFromBalance - amount;
      updates[toColumn] = (currentBalance?.[toColumn] || 0) + receivedAmount;
      updates.last_updated = new Date().toISOString();

      const { error: updateError } = await withTimeout(
        supabase.from('user_wallet_balances').update(updates).eq('user_id', userId),
        8000,
        "Update wallet balance"
      );

      if (updateError) {
        console.error('[Swap] Update error:', updateError);
        return false;
      }

      console.log('[Swap] ✅ Swap successful!');
      await refreshBalance();
      return true;
    } catch (error) {
      console.error('[Swap] Unexpected error:', error);
      return false;
    }
  };

  return {
    balance,
    cryptoPrices,
    totals,
    loading,
    refetch: fetchBalance,
    refreshBalance,
    transferBalance,
    swapCrypto,
    getBalanceByType,
  };
};
    
