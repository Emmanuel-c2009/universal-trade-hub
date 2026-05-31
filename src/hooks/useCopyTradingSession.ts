import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tradingSessionService, TradingSession } from '@/services/tradingSessionService';
import { useUnifiedBalance } from './useUnifiedBalance';

export interface CopySession {
  id: string;
  user_id: string;
  session_id: string | null;
  expert_id: string;
  expert_name: string;
  allocated_amount: number;
  current_profit: number;
  duration_hours: number;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed' | 'stopped';
  created_at: string;
}

interface UseCopyTradingSessionReturn {
  tradingSession: TradingSession | null;
  copySessions: CopySession[];
  loading: boolean;
  tradingBalance: number;
  totalAllocated: number;
  totalProfit: number;
  startCopySession: (expertId: string, expertName: string, amount: number, durationHours: number) => Promise<boolean>;
  stopCopySession: (sessionId: string) => Promise<boolean>;
  refreshSessions: () => Promise<void>;
}

export const useCopyTradingSession = (userId: string | null): UseCopyTradingSessionReturn => {
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(null);
  const [copySessions, setCopySessions] = useState<CopySession[]>([]);
  const [loading, setLoading] = useState(true);
  const { totals } = useUnifiedBalance(userId);

  const totalAllocated = copySessions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.allocated_amount, 0);
  
  const totalProfit = copySessions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.current_profit, 0);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get or create copy trading session
      const session = await tradingSessionService.getOrCreateSession(userId, 'copy_trading');
      setTradingSession(session);

      // Fetch copy sessions
      const { data: sessions } = await supabase
        .from('copy_trading_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setCopySessions((sessions || []) as CopySession[]);
    } catch (error) {
      console.error('Error loading copy trading data:', error);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to copy session updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`copy-sessions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'copy_trading_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCopySessions(prev => [payload.new as CopySession, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCopySessions(prev => prev.map(s => 
              s.id === payload.new.id ? payload.new as CopySession : s
            ));
          } else if (payload.eventType === 'DELETE') {
            setCopySessions(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const startCopySession = useCallback(async (
    expertId: string,
    expertName: string,
    amount: number,
    durationHours: number
  ): Promise<boolean> => {
    if (!userId) return false;

    // First allocate funds from trading balance
    const allocationResult = await tradingSessionService.allocateFunds(userId, 'copy_trading', amount);
    if (!allocationResult.success) {
      console.error('Failed to allocate funds:', allocationResult.error);
      return false;
    }

    // Create copy session
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + durationHours);

    const { data, error } = await supabase
      .from('copy_trading_sessions')
      .insert({
        user_id: userId,
        session_id: allocationResult.session?.id,
        expert_id: expertId,
        expert_name: expertName,
        allocated_amount: amount,
        duration_hours: durationHours,
        end_time: endTime.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating copy session:', error);
      // Rollback the allocation
      await tradingSessionService.returnFunds(userId, 'copy_trading', amount);
      return false;
    }

    setCopySessions(prev => [data as CopySession, ...prev]);
    return true;
  }, [userId]);

  const stopCopySession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!userId) return false;

    const session = copySessions.find(s => s.id === sessionId);
    if (!session) return false;

    // Update session status
    const { error } = await supabase
      .from('copy_trading_sessions')
      .update({ 
        status: 'stopped',
        end_time: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error stopping copy session:', error);
      return false;
    }

    // Return funds (including any profit) to trading balance
    const totalReturn = session.allocated_amount + session.current_profit;
    await tradingSessionService.returnFunds(userId, 'copy_trading', totalReturn);

    setCopySessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status: 'stopped' as const } : s
    ));

    return true;
  }, [userId, copySessions]);

  const refreshSessions = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    tradingSession,
    copySessions,
    loading,
    tradingBalance: totals.tradingBalance,
    totalAllocated,
    totalProfit,
    startCopySession,
    stopCopySession,
    refreshSessions,
  };
};
