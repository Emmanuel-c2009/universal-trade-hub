import { supabase } from '@/integrations/supabase/client';

export type TradingPlatform = 'metal_trader' | 'quick_trade' | 'copy_trading' | 'ai_bot' | 'stocks' | 'crypto';

export interface TradingSession {
  id: string;
  user_id: string;
  platform: TradingPlatform;
  allocated_amount: number;
  starting_balance: number;
  current_balance: number;
  realized_pnl: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
  last_activity: string;
  metadata: Record<string, any>;
}

export interface PlatformTrade {
  id: string;
  session_id: string;
  user_id: string;
  platform: TradingPlatform;
  asset_symbol: string;
  asset_name: string | null;
  trade_type: 'buy' | 'sell';
  quantity: number;
  entry_price: number;
  current_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number;
  fees: number;
  status: 'open' | 'closed' | 'pending' | 'cancelled';
  opened_at: string;
  closed_at: string | null;
  execution_data: Record<string, any>;
  created_at: string;
}

class TradingSessionService {
  // Get or create a trading session for a platform
  async getOrCreateSession(userId: string, platform: TradingPlatform): Promise<TradingSession | null> {
    // First try to get existing active session
    const { data: existing } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) return existing as TradingSession;

    // Get user's trading balance
    const { data: balance } = await supabase
      .from('user_balances')
      .select('trading_balance')
      .eq('user_id', userId)
      .single();

    const tradingBalance = balance?.trading_balance || 0;

    // Create new session
    const { data: newSession, error } = await supabase
      .from('trading_sessions')
      .insert({
        user_id: userId,
        platform,
        allocated_amount: 0,
        starting_balance: tradingBalance,
        current_balance: tradingBalance,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trading session:', error);
      return null;
    }

    return newSession as TradingSession;
  }

  // Get active session for a platform
  async getActiveSession(userId: string, platform: TradingPlatform): Promise<TradingSession | null> {
    const { data, error } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }

    return data as TradingSession | null;
  }

  // Get all active sessions for a user
  async getAllActiveSessions(userId: string): Promise<TradingSession[]> {
    const { data, error } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return (data || []) as TradingSession[];
  }

  // Allocate funds to a platform from Trading Balance
  async allocateFunds(
    userId: string, 
    platform: TradingPlatform, 
    amount: number
  ): Promise<{ success: boolean; session?: TradingSession; error?: string }> {
    // Get current trading balance
    const { data: balance } = await supabase
      .from('user_balances')
      .select('trading_balance')
      .eq('user_id', userId)
      .single();

    if (!balance || balance.trading_balance < amount) {
      return { success: false, error: 'Insufficient trading balance' };
    }

    // Get or create session
    const session = await this.getOrCreateSession(userId, platform);
    if (!session) {
      return { success: false, error: 'Failed to create trading session' };
    }

    // Update session with allocated amount
    const { data: updatedSession, error: sessionError } = await supabase
      .from('trading_sessions')
      .update({
        allocated_amount: session.allocated_amount + amount,
        current_balance: session.current_balance + amount,
        last_activity: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();

    if (sessionError) {
      return { success: false, error: 'Failed to allocate funds' };
    }

    // Deduct from trading balance (Note: In production, use a transaction)
    await supabase
      .from('user_balances')
      .update({ trading_balance: balance.trading_balance - amount })
      .eq('user_id', userId);

    // Log the transfer
    await supabase.from('balance_transfers').insert({
      user_id: userId,
      from_balance_type: 'trading',
      to_balance_type: `platform_${platform}`,
      amount,
      status: 'completed',
    });

    return { success: true, session: updatedSession as TradingSession };
  }

  // Return funds from platform to Trading Balance
  async returnFunds(
    userId: string,
    platform: TradingPlatform,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.getActiveSession(userId, platform);
    if (!session || session.current_balance < amount) {
      return { success: false, error: 'Insufficient platform balance' };
    }

    // Update session
    await supabase
      .from('trading_sessions')
      .update({
        current_balance: session.current_balance - amount,
        allocated_amount: Math.max(0, session.allocated_amount - amount),
        last_activity: new Date().toISOString(),
      })
      .eq('id', session.id);

    // Get current trading balance and add funds back
    const { data: balance } = await supabase
      .from('user_balances')
      .select('trading_balance')
      .eq('user_id', userId)
      .single();

    await supabase
      .from('user_balances')
      .update({ trading_balance: (balance?.trading_balance || 0) + amount })
      .eq('user_id', userId);

    return { success: true };
  }

  // Open a trade on a platform
  async openTrade(trade: {
    userId: string;
    sessionId: string;
    platform: TradingPlatform;
    symbol: string;
    name?: string;
    type: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    metadata?: Record<string, any>;
  }): Promise<PlatformTrade | null> {
    const { data, error } = await supabase
      .from('platform_trades')
      .insert({
        session_id: trade.sessionId,
        user_id: trade.userId,
        platform: trade.platform,
        asset_symbol: trade.symbol,
        asset_name: trade.name || trade.symbol,
        trade_type: trade.type,
        quantity: trade.quantity,
        entry_price: trade.entryPrice,
        current_price: trade.entryPrice,
        stop_loss: trade.stopLoss || null,
        take_profit: trade.takeProfit || null,
        status: 'open',
        pnl: 0,
        fees: 0,
        execution_data: trade.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error opening trade:', error);
      return null;
    }

    // Update session last activity
    await supabase
      .from('trading_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', trade.sessionId);

    return data as PlatformTrade;
  }

  // Close a trade
  async closeTrade(
    tradeId: string,
    exitPrice: number,
    pnl: number
  ): Promise<PlatformTrade | null> {
    const { data, error } = await supabase
      .from('platform_trades')
      .update({
        exit_price: exitPrice,
        current_price: exitPrice,
        pnl,
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (error) {
      console.error('Error closing trade:', error);
      return null;
    }

    const trade = data as PlatformTrade;

    // Update session with realized P&L
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('id', trade.session_id)
      .single();

    if (session) {
      await supabase
        .from('trading_sessions')
        .update({
          current_balance: session.current_balance + pnl,
          realized_pnl: session.realized_pnl + pnl,
          last_activity: new Date().toISOString(),
        })
        .eq('id', trade.session_id);
    }

    return trade;
  }

  // Update trade's current price
  async updateTradePrice(tradeId: string, currentPrice: number): Promise<void> {
    // Get the trade to calculate P&L
    const { data: trade } = await supabase
      .from('platform_trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (!trade) return;

    const pnl = trade.trade_type === 'buy'
      ? (currentPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - currentPrice) * trade.quantity;

    await supabase
      .from('platform_trades')
      .update({ current_price: currentPrice, pnl })
      .eq('id', tradeId);
  }

  // Get open trades for a session
  async getOpenTrades(sessionId: string): Promise<PlatformTrade[]> {
    const { data, error } = await supabase
      .from('platform_trades')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Error fetching open trades:', error);
      return [];
    }

    return (data || []) as PlatformTrade[];
  }

  // Get all trades for a user on a platform
  async getPlatformTrades(userId: string, platform: TradingPlatform): Promise<PlatformTrade[]> {
    const { data, error } = await supabase
      .from('platform_trades')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching platform trades:', error);
      return [];
    }

    return (data || []) as PlatformTrade[];
  }

  // Get trade history (closed trades)
  async getTradeHistory(userId: string, platform?: TradingPlatform): Promise<PlatformTrade[]> {
    let query = supabase
      .from('platform_trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(100);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trade history:', error);
      return [];
    }

    return (data || []) as PlatformTrade[];
  }

  // Subscribe to session updates
  subscribeToSession(sessionId: string, onUpdate: (session: TradingSession) => void) {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as TradingSession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to trade updates for a session
  subscribeToTrades(sessionId: string, onUpdate: (trade: PlatformTrade) => void) {
    const channel = supabase
      .channel(`trades-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_trades',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as PlatformTrade);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const tradingSessionService = new TradingSessionService();
