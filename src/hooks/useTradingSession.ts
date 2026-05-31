import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  tradingSessionService, 
  TradingSession, 
  PlatformTrade, 
  TradingPlatform 
} from '@/services/tradingSessionService';
import { useUnifiedBalance } from './useUnifiedBalance';

interface UseTradingSessionReturn {
  session: TradingSession | null;
  trades: PlatformTrade[];
  tradeHistory: PlatformTrade[];
  loading: boolean;
  isConnected: boolean;
  balance: number;
  equity: number;
  allocatedAmount: number;
  unrealizedPnl: number;
  realizedPnl: number;
  // Actions
  allocateFunds: (amount: number) => Promise<boolean>;
  returnFunds: (amount: number) => Promise<boolean>;
  openTrade: (trade: {
    symbol: string;
    name?: string;
    type: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => Promise<PlatformTrade | null>;
  closeTrade: (tradeId: string, exitPrice: number) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

export const useTradingSession = (
  userId: string | null,
  platform: TradingPlatform
): UseTradingSessionReturn => {
  const [session, setSession] = useState<TradingSession | null>(null);
  const [trades, setTrades] = useState<PlatformTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<PlatformTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const { balance: unifiedBalance, totals } = useUnifiedBalance(userId);

  const tradingBalance = totals.tradingBalance;

  // Calculate metrics
  const unrealizedPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const realizedPnl = session?.realized_pnl || 0;
  const allocatedAmount = session?.allocated_amount || 0;
  const balance = session?.current_balance || tradingBalance;
  const equity = balance + unrealizedPnl;

  // Load session and trades
  const loadSessionData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get or create session
      const sessionData = await tradingSessionService.getOrCreateSession(userId, platform);
      setSession(sessionData);

      if (sessionData) {
        // Load open trades
        const openTrades = await tradingSessionService.getOpenTrades(sessionData.id);
        setTrades(openTrades);

        // Load trade history
        const history = await tradingSessionService.getTradeHistory(userId, platform);
        setTradeHistory(history);
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }

    setLoading(false);
  }, [userId, platform]);

  // Initial load
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session?.id) return;

    const unsubSession = tradingSessionService.subscribeToSession(session.id, (updated) => {
      setSession(updated);
    });

    const unsubTrades = tradingSessionService.subscribeToTrades(session.id, (trade) => {
      if (trade.status === 'open') {
        setTrades(prev => {
          const idx = prev.findIndex(t => t.id === trade.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = trade;
            return updated;
          }
          return [trade, ...prev];
        });
      } else if (trade.status === 'closed') {
        setTrades(prev => prev.filter(t => t.id !== trade.id));
        setTradeHistory(prev => [trade, ...prev]);
      }
    });

    return () => {
      unsubSession();
      unsubTrades();
    };
  }, [session?.id]);

  // Actions
  const allocateFunds = useCallback(async (amount: number): Promise<boolean> => {
    if (!userId) return false;
    const result = await tradingSessionService.allocateFunds(userId, platform, amount);
    if (result.success && result.session) {
      setSession(result.session);
    }
    return result.success;
  }, [userId, platform]);

  const returnFunds = useCallback(async (amount: number): Promise<boolean> => {
    if (!userId) return false;
    const result = await tradingSessionService.returnFunds(userId, platform, amount);
    if (result.success) {
      await loadSessionData();
    }
    return result.success;
  }, [userId, platform, loadSessionData]);

  const openTrade = useCallback(async (tradeData: {
    symbol: string;
    name?: string;
    type: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<PlatformTrade | null> => {
    if (!userId || !session) return null;

    const trade = await tradingSessionService.openTrade({
      userId,
      sessionId: session.id,
      platform,
      ...tradeData,
    });

    if (trade) {
      setTrades(prev => [trade, ...prev]);
    }

    return trade;
  }, [userId, session, platform]);

  const closeTrade = useCallback(async (tradeId: string, exitPrice: number): Promise<boolean> => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return false;

    const pnl = trade.trade_type === 'buy'
      ? (exitPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - exitPrice) * trade.quantity;

    const closedTrade = await tradingSessionService.closeTrade(tradeId, exitPrice, pnl);
    
    if (closedTrade) {
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      setTradeHistory(prev => [closedTrade, ...prev]);
      return true;
    }

    return false;
  }, [trades]);

  const refreshSession = useCallback(async () => {
    await loadSessionData();
  }, [loadSessionData]);

  return {
    session,
    trades,
    tradeHistory,
    loading,
    isConnected: !!session,
    balance,
    equity,
    allocatedAmount,
    unrealizedPnl,
    realizedPnl,
    allocateFunds,
    returnFunds,
    openTrade,
    closeTrade,
    refreshSession,
  };
};
