import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface UserBalance {
  id: string;
  user_id: string;
  main_balance: number;
  trading_balance: number;
  litecoin_balance: number;
  bonus_balance: number;
  is_test_account: boolean;
}

export const useRealtimeBalance = (userId: string | null) => {
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching balance:', error);
    } else {
      setBalance(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchBalance();

    if (!userId) return;

    // Set up realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`user_balances:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setBalance(payload.new as UserBalance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
};
