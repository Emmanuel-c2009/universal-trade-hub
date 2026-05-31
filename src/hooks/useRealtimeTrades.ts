import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";

export interface AIBotTrade {
  id: string;
  user_id: string;
  subscription_id: string;
  bot_id: string;
  trading_pair: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  investment_amount: number;
  profit_loss: number;
  profit_loss_percentage: number;
  status: string;
  started_at: string;
  closed_at: string | null;
  metadata: Json;
  bot?: {
    name: string;
    avatar_url?: string | null;
  } | null;
}

export const useRealtimeTrades = (userId: string | null) => {
  const [activeTrades, setActiveTrades] = useState<AIBotTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<AIBotTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch active trades
    const { data: activeData, error: activeError } = await supabase
      .from('ai_bot_trades')
      .select(`
        *,
        bot:ai_bots(name, avatar_url)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (activeError) {
      console.error('Error fetching active trades:', activeError);
    } else {
      setActiveTrades((activeData as AIBotTrade[]) || []);
    }

    // Fetch trade history
    const { data: historyData, error: historyError } = await supabase
      .from('ai_bot_trades')
      .select(`
        *,
        bot:ai_bots(name, avatar_url)
      `)
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(50);

    if (historyError) {
      console.error('Error fetching trade history:', historyError);
    } else {
      setTradeHistory((historyData as AIBotTrade[]) || []);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTrades();

    if (!userId) return;

    // Set up realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`ai_bot_trades:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_bot_trades',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTrade = payload.new as AIBotTrade;
            if (newTrade.status === 'active') {
              setActiveTrades(prev => [newTrade, ...prev]);
            } else {
              setTradeHistory(prev => [newTrade, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTrade = payload.new as AIBotTrade;
            if (updatedTrade.status === 'closed') {
              // Move from active to history
              setActiveTrades(prev => prev.filter(t => t.id !== updatedTrade.id));
              setTradeHistory(prev => [updatedTrade, ...prev]);
            } else {
              // Update in active trades
              setActiveTrades(prev => 
                prev.map(t => t.id === updatedTrade.id ? updatedTrade : t)
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchTrades]);

  return { activeTrades, tradeHistory, loading, refetch: fetchTrades };
};
