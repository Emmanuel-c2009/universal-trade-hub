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

    const { data: eurData, error: eurError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (eurError) {
      console.error('[Balance] EUR fetch error:', eurError);
    }

    const { data: cryptoData, error: cryptoError } = await supabase
      .from('user_wallet_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (cryptoError) {
      console.error('[Balance] Crypto fetch error:', cryptoError);
    }

    const { data: todayProfit, error: todayError } = await supabase
      .rpc('get_user_today_profit', { user_id_param: userId });

    if (todayError) {
      console.error('[Balance] Today P&L fetch error:', todayError);
    }

    const { data: totalProfit, error: totalError } = await supabase
      .rpc('get_user_total_profit', { user_id_param: userId });

    if (totalError) {
      console.error('[Balance] Total profit fetch error:', totalError);
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
    setLoading(false);
  }, [userId]);

  const refreshBalance = useCallback(async () => {
    setLoading(true);
    await fetchBalance();
  }, [fetchBalance]);

  const fetchCryptoPrices = useCallback(async () => {
    const { data, error } = await supabase
      .from('crypto_prices')
      .select('*');

    if (!error && data) {
      setCryptoPrices(data);
      console.log('[Prices] Loaded', data.length, 'crypto prices');
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

  // Fetch initial data + ONE consolidated realtime channel
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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBalance();
        fetchCryptoPrices();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const priceInterval = setInterval(fetchCryptoPrices, 30000);

    return () => {
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

  // ---- transferBalance: now protected with timeouts, cannot hang forever ----
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

    const fromColumn = getColumnName(fromType);
    const toColumn = getColumnName(toType);

    try {
      const isCrypto = ['btc_balance', 'eth_balance', 'usd_balance', 'ltc_balance', 'bnb_balance'].includes(fromColumn);

      let currentBalanceData;

      if (isCrypto) {
        const { data } = await withTimeout(
          supabase.from('user_wallet_balances').select('*').eq('user_id', userId).single(),
          8000,
          "Fetch wallet balance"
        );
        currentBalanceData = data;
      } else {
        const { data } = await withTimeout(
          supabase.from('user_balances').select('*').eq('user_id', userId).single(),
          8000,
          "Fetch balance"
        );
        currentBalanceData = data;
      }

      const currentFromBalance = currentBalanceData?.[fromColumn] || 0;

      if (currentFromBalance < amount) {
        console.error('[Transfer] Insufficient balance');
        return false;
      }

      let fromAmount = amount;
      let toAmount = amount;

      if (cryptoSymbol && exchangeRate && exchangeRate !== 1) {
        const isFromCrypto = ['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(fromType.toLowerCase());
        if (isFromCrypto) {
          toAmount = amount * exchangeRate;
        } else {
          toAmount = amount / exchangeRate;
        }
      }

      const updates: Record<string, number | string> = {};
      updates[fromColumn] = currentFromBalance - fromAmount;
      updates[toColumn] = (currentBalanceData?.[toColumn] || 0) + toAmount;
      updates.updated_at = new Date().toISOString();

      const tableName = isCrypto ? 'user_wallet_balances' : 'user_balances';
      const { error: updateError } = await withTimeout(
        supabase.from(tableName).update(updates).eq('user_id', userId),
        8000,
        "Update balance"
      );

      if (updateError) {
        console.error('[Transfer] Update error:', updateError);
        return false;
      }

      await withTimeout(
        supabase.from('balance_transfers').insert({
          user_id: userId,
          from_balance_type: fromType,
          to_balance_type: toType,
          amount: amount,
          crypto_amount: cryptoSymbol ? toAmount : null,
          crypto_symbol: cryptoSymbol,
          exchange_rate: exchangeRate,
          status: 'completed',
          created_at: new Date().toISOString()
        }),
        8000,
        "Log transfer"
      );

      console.log('[Transfer] ✅ Transfer successful!');
      await refreshBalance();
      return true;
    } catch (error) {
      console.error('[Transfer] Unexpected error or timeout:', error);
      return false; // guaranteed — never hangs
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
