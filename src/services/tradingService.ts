// src/services/tradingService.ts

import { supabase } from '@/integrations/supabase/client';

export interface TradeRecord {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  symbol: string;
  name: string;
  side: string;
  quantity: number;
  entry_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number | null;
  status: string | null;
  notes: string | null;
  tags: any; // Changed from Json to any to fix import error
  created_at: string | null;
  closed_at: string | null;
}

export interface PortfolioRecord {
  id: string;
  user_id: string;
  name: string;
  created_at: string | null;
  updated_at: string | null;
}

class TradingService {
  // Portfolio operations
  async getOrCreatePortfolio(userId: string): Promise<PortfolioRecord | null> {
    // First try to get existing portfolio
    const { data: existing } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return existing;

    // Create new portfolio
    const { data: newPortfolio, error } = await supabase
      .from('portfolios')
      .insert({ user_id: userId, name: 'Main Portfolio' })
      .select()
      .single();

    if (error) {
      console.error('Error creating portfolio:', error);
      return null;
    }

    return newPortfolio;
  }

  async getPortfolio(userId: string): Promise<PortfolioRecord | null> {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching portfolio:', error);
      return null;
    }

    return data;
  }

  // Trade operations
  async getOpenTrades(userId: string): Promise<TradeRecord[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching open trades:', error);
      return [];
    }

    return data || [];
  }

  async getClosedTrades(userId: string): Promise<TradeRecord[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false });

    if (error) {
      console.error('Error fetching closed trades:', error);
      return [];
    }

    return data || [];
  }

  async getAllTrades(userId: string): Promise<TradeRecord[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all trades:', error);
      return [];
    }

    return data || [];
  }

  async createTrade(trade: {
    userId: string;
    portfolioId?: string;
    symbol: string;
    name: string;
    side: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<TradeRecord | null> {
    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: trade.userId,
        portfolio_id: trade.portfolioId || null,
        symbol: trade.symbol,
        name: trade.name,
        side: trade.side,
        quantity: trade.quantity,
        entry_price: trade.entryPrice,
        current_price: trade.entryPrice,
        stop_loss: trade.stopLoss || null,
        take_profit: trade.takeProfit || null,
        status: 'open',
        pnl: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trade:', error);
      return null;
    }

    return data;
  }

  async closeTrade(tradeId: string, exitPrice: number, pnl: number): Promise<TradeRecord | null> {
    const { data, error } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        current_price: exitPrice,
        pnl: pnl,
        closed_at: new Date().toISOString()
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (error) {
      console.error('Error closing trade:', error);
      return null;
    }

    return data;
  }

  async updateTradePrice(tradeId: string, currentPrice: number, pnl: number): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .update({ 
        current_price: currentPrice, 
        pnl: pnl,
        updated_at: new Date().toISOString()
      })
      .eq('id', tradeId);

    if (error) {
      console.error('Error updating trade price:', error);
    }
  }

  async updateTradeJournal(tradeId: string, notes: string, tags: string[]): Promise<TradeRecord | null> {
    const { data, error } = await supabase
      .from('trades')
      .update({ 
        notes, 
        tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade journal:', error);
      return null;
    }

    return data;
  }

  async getTradeStats(userId: string): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfit: number;
    totalLoss: number;
    winRate: number;
    bestTrade: number;
    worstTrade: number;
    averageProfit: number;
  }> {
    const { data, error } = await supabase
      .from('trades')
      .select('pnl, status')
      .eq('user_id', userId)
      .eq('status', 'closed');

    if (error || !data) {
      console.error('Error fetching trade stats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        bestTrade: 0,
        worstTrade: 0,
        averageProfit: 0
      };
    }

    const closedTrades = data.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    const profits = winningTrades.map(t => t.pnl || 0);
    const losses = losingTrades.map(t => Math.abs(t.pnl || 0));
    
    const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
    const worstTrade = losses.length > 0 ? Math.max(...losses) : 0;

    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalProfit,
      totalLoss,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      bestTrade,
      worstTrade,
      averageProfit: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0
    };
  }

  // Subscribe to real-time trade updates
  subscribeToTrades(userId: string, onUpdate: (trade: TradeRecord) => void) {
    const channel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as TradeRecord);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to real-time price updates for open trades only
  async subscribeToOpenTradesPrices(userId: string, onPriceUpdate: (tradeId: string, currentPrice: number, pnl: number) => void) {
    const openTrades = await this.getOpenTrades(userId);
    
    // This would typically connect to a WebSocket for real-time prices
    // For now, we'll return a cleanup function
    const intervals: ReturnType<typeof setInterval>[] = [];
    
    // Set up polling for open trades (every 5 seconds)
    const interval = setInterval(async () => {
      const updatedTrades = await this.getOpenTrades(userId);
      for (const trade of updatedTrades) {
        if (trade.current_price && trade.entry_price) {
          const pnl = trade.side === 'buy'
            ? (trade.current_price - trade.entry_price) * trade.quantity
            : (trade.entry_price - trade.current_price) * trade.quantity;
          
          if (Math.abs(pnl - (trade.pnl || 0)) > 0.01) {
            onPriceUpdate(trade.id, trade.current_price, pnl);
          }
        }
      }
    }, 5000);
    
    intervals.push(interval);
    
    return () => {
      intervals.forEach(i => clearInterval(i));
    };
  }

  // Delete a trade (admin only or for testing)
  async deleteTrade(tradeId: string, userId: string): Promise<boolean> {
    // First verify the trade belongs to the user
    const { data: trade } = await supabase
      .from('trades')
      .select('user_id')
      .eq('id', tradeId)
      .single();
    
    if (!trade || trade.user_id !== userId) {
      console.error('Unauthorized delete attempt');
      return false;
    }
    
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId);
    
    if (error) {
      console.error('Error deleting trade:', error);
      return false;
    }
    
    return true;
  }
}

export const tradingService = new TradingService();