// src/hooks/useUnifiedBalance.ts - COMPLETE UPDATED VERSION
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

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
  // Crypto Balances (original database names)
  balance_usdt: number;
  balance_eur: number;
  balance_btc: number;
  balance_eth: number;
  balance_ltc: number;
  balance_bnb: number;
  // Crypto Balances (display names for component)
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  ltc_balance: number;
  bnb_balance: number;
  litecoin_balance: number;
  // Fiat Balances
  funding_balance: number;
  trading_balance: number;
  bonus_balance: number;
  challenges_balance: number;
  // Legacy
  main_balance: number;
  // Trading Stats (NEW)
  today_pnl: number;
  total_profit: number;
  is_test_account: boolean;
  // Meta
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
    'usdt': 'balance_usdt',
    'balance_usdt': 'balance_usdt',
    'btc': 'balance_btc',
    'balance_btc': 'balance_btc',
    'eth': 'balance_eth',
    'balance_eth': 'balance_eth',
    'ltc': 'balance_ltc',
    'balance_ltc': 'balance_ltc',
    'bnb': 'balance_bnb',
    'balance_bnb': 'balance_bnb',
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

    // Fetch main balance data
    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Balance] Fetch error:', error);
    }

    // Fetch today's P&L
    const { data: todayProfit, error: todayError } = await supabase
      .rpc('get_user_today_profit', { user_id_param: userId });

    if (todayError) {
      console.error('[Balance] Today P&L fetch error:', todayError);
    }

    // Fetch total profit
    const { data: totalProfit, error: totalError } = await supabase
      .rpc('get_user_total_profit', { user_id_param: userId });

    if (totalError) {
      console.error('[Balance] Total profit fetch error:', totalError);
    }

    if (data) {
      const balanceData = data as any;
      setBalance({
        id: balanceData.id,
        user_id: balanceData.user_id,
        // Original crypto balances
        balance_usdt: balanceData.balance_usdt || 0,
        balance_eur: balanceData.balance_eur || 0,
        balance_btc: balanceData.balance_btc || 0,
        balance_eth: balanceData.balance_eth || 0,
        balance_ltc: balanceData.balance_ltc || 0,
        balance_bnb: balanceData.balance_bnb || 0,
        // Display crypto balances
        btc_balance: balanceData.balance_btc || 0,
        eth_balance: balanceData.balance_eth || 0,
        usdt_balance: balanceData.balance_usdt || 0,
        ltc_balance: balanceData.balance_ltc || 0,
        bnb_balance: balanceData.balance_bnb || 0,
        litecoin_balance: balanceData.balance_ltc || 0,
        // Fiat balances
        funding_balance: balanceData.funding_balance || 0,
        trading_balance: balanceData.trading_balance || 0,
        bonus_balance: balanceData.bonus_balance || 0,
        challenges_balance: balanceData.challenges_balance || 0,
        main_balance: balanceData.funding_balance || balanceData.main_balance || 0,
        // Trading stats
        today_pnl: todayProfit || 0,
        total_profit: totalProfit || 0,
        is_test_account: balanceData.is_test_account || false,
        created_at: balanceData.created_at,
        updated_at: balanceData.updated_at,
      });
      console.log('[Balance] ✅ Funding Balance (Main):', balanceData.funding_balance);
      console.log('[Balance] ✅ BTC Balance:', balanceData.balance_btc);
      console.log('[Balance] ✅ Today P&L:', todayProfit);
      console.log('[Balance] ✅ Total Profit:', totalProfit);
    } else {
      console.log('[Balance] ❌ No record found');
    }
    
    setLoading(false);
  }, [userId]);

  // Add refreshBalance method
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

  // Calculate totals when balance or prices change
  useEffect(() => {
    if (!balance) return;

    const usdtPrice = cryptoPrices.find(p => p.symbol === 'USDT')?.price_eur || 0.92;
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
      totalAssets: totalAssets,
      fundingBalance: fundingBalance,
      tradingBalance: tradingBalance,
      bonusBalance: bonusBalance,
      challengesBalance: challengesBalance,
      cryptoValueEUR: cryptoValueEUR,
      btcValueEUR: btcValueEUR,
      ethValueEUR: ethValueEUR,
      usdtValueEUR: usdtValueEUR,
      ltcValueEUR: ltcValueEUR,
      bnbValueEUR: bnbValueEUR,
    });
  }, [balance, cryptoPrices]);

  // Fetch initial data
  useEffect(() => {
    fetchBalance();
    fetchCryptoPrices();

    if (!userId) return;

    const balanceChannel: RealtimeChannel = supabase
      .channel(`unified_balances:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Balance] Real-time update received');
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as any;
            setBalance(prev => prev ? {
              ...prev,
              funding_balance: newData.funding_balance ?? prev.funding_balance,
              balance_usdt: newData.balance_usdt ?? prev.balance_usdt,
              balance_btc: newData.balance_btc ?? prev.balance_btc,
              balance_eth: newData.balance_eth ?? prev.balance_eth,
              balance_ltc: newData.balance_ltc ?? prev.balance_ltc,
              balance_bnb: newData.balance_bnb ?? prev.balance_bnb,
              trading_balance: newData.trading_balance ?? prev.trading_balance,
              bonus_balance: newData.bonus_balance ?? prev.bonus_balance,
              challenges_balance: newData.challenges_balance ?? prev.challenges_balance,
              updated_at: newData.updated_at,
            } : null);
          }
        }
      )
      .subscribe();

    const pricesChannel: RealtimeChannel = supabase
      .channel('crypto_prices_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crypto_prices',
        },
        () => {
          fetchCryptoPrices();
        }
      )
      .subscribe();

    const priceInterval = setInterval(fetchCryptoPrices, 30000);

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(pricesChannel);
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
      const { data: currentBalance, error: fetchError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('[Transfer] Fetch error:', fetchError);
        return false;
      }

      const currentFromBalance = currentBalance[fromColumn] || 0;
      
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
      updates[toColumn] = (currentBalance[toColumn] || 0) + toAmount;
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('user_balances')
        .update(updates)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Transfer] Update error:', updateError);
        return false;
      }

      await supabase
        .from('balance_transfers')
        .insert({
          user_id: userId,
          from_balance_type: fromType,
          to_balance_type: toType,
          amount: amount,
          crypto_amount: cryptoSymbol ? toAmount : null,
          crypto_symbol: cryptoSymbol,
          exchange_rate: exchangeRate,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      console.log('[Transfer] ✅ Transfer successful!');
      await refreshBalance(); // Refresh after transfer
      return true;
    } catch (error) {
      console.error('[Transfer] Unexpected error:', error);
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
      const fromColumn = `balance_${fromCrypto.toLowerCase()}`;
      const toColumn = `balance_${toCrypto.toLowerCase()}`;

      const { data: currentBalance, error: fetchError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('[Swap] Fetch error:', fetchError);
        return false;
      }

      const currentFromBalance = currentBalance[fromColumn] || 0;
      
      if (currentFromBalance < amount) {
        console.error('[Swap] Insufficient balance');
        return false;
      }

      const fee = amount * (feePercent / 100);
      const swapAmount = amount - fee;
      const receivedAmount = swapAmount * exchangeRate;

      const updates: Record<string, number | string> = {};
      updates[fromColumn] = currentFromBalance - amount;
      updates[toColumn] = (currentBalance[toColumn] || 0) + receivedAmount;
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('user_balances')
        .update(updates)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Swap] Update error:', updateError);
        return false;
      }

      console.log('[Swap] ✅ Swap successful!');
      await refreshBalance(); // Refresh after swap
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
    refreshBalance, // Added this method
    transferBalance,
    swapCrypto,
    getBalanceByType,
  };
};