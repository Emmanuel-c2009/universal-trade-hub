// src/services/advancedTradingService.ts

import { supabase } from '@/integrations/supabase/client';
import { TradeRecord } from './tradingService';

export interface AdvancedTradeOptions {
  expiryMinutes?: number;
  stopLoss?: number;
  takeProfit?: number;
  orderType?: 'market' | 'limit' | 'stop' | 'stop_limit';
  limitPrice?: number;
  notes?: string;
  tags?: string[];
}

export interface TradeWithHistory extends TradeRecord {
  price_history?: PriceHistoryPoint[];
  timeRemaining?: number;
  isExpiringSoon?: boolean;
}

export interface PriceHistoryPoint {
  price: number;
  pnl: number;
  timestamp: string;
}

class AdvancedTradingService {
  private autoCloseInterval: ReturnType<typeof setInterval> | null = null;
  private priceUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: Map<string, (trade: TradeWithHistory) => void> = new Map();
  private userId: string | null = null;
  private isMonitoring = false;
  private lastNotifiedTrades: Set<string> = new Set(); // Track already notified trades

  initializeRealtimeMonitoring(userId: string, onTradeUpdate: (trade: TradeWithHistory) => void) {
    // Prevent duplicate initialization
    if (this.isMonitoring && this.userId === userId) {
      console.log('Monitoring already active for this user');
      return;
    }
    
    // Stop existing monitoring
    this.stopRealtimeMonitoring();
    
    this.userId = userId;
    const key = `user-${userId}`;
    this.callbacks.set(key, onTradeUpdate);
    this.isMonitoring = true;
    this.lastNotifiedTrades.clear();
    
    // Start auto-close checker (runs every 10 seconds instead of 5 to reduce frequency)
    if (!this.autoCloseInterval) {
      this.autoCloseInterval = setInterval(() => this.checkAutoClose(), 10000);
    }
    
    // Start price update sync (runs every 30 seconds)
    if (!this.priceUpdateInterval) {
      this.priceUpdateInterval = setInterval(() => this.syncPriceUpdates(), 30000);
    }
    
    // Subscribe to real-time trade changes
    this.subscribeToTradeChanges(userId);
  }

  stopRealtimeMonitoring() {
    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
      this.autoCloseInterval = null;
    }
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    this.callbacks.clear();
    this.isMonitoring = false;
    this.lastNotifiedTrades.clear();
  }

  async createAdvancedTrade(
    userId: string,
    portfolioId: string | undefined,
    symbol: string,
    name: string,
    side: 'buy' | 'sell',
    quantity: number,
    entryPrice: number,
    options: AdvancedTradeOptions
  ): Promise<TradeRecord | null> {
    const expiryTime = options.expiryMinutes 
      ? new Date(Date.now() + options.expiryMinutes * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: userId,
        portfolio_id: portfolioId || null,
        symbol: symbol,
        name: name,
        side: side,
        quantity: quantity,
        entry_price: entryPrice,
        current_price: entryPrice,
        stop_loss: options.stopLoss || null,
        take_profit: options.takeProfit || null,
        order_type: options.orderType || 'market',
        expiry_time: expiryTime,
        status: 'open',
        pnl: 0,
        notes: options.notes || null,
        tags: options.tags || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating advanced trade:', error);
      return null;
    }

    // Insert initial price history (ignore RLS errors)
    try {
      await supabase
        .from('trade_price_history')
        .insert({
          trade_id: data.id,
          price: entryPrice,
          pnl: 0,
          timestamp: new Date().toISOString()
        });
    } catch (err) {
      // Silently ignore - price history is not critical
      console.log('Price history insert skipped (RLS pending)');
    }

    return data;
  }

  async getTradeWithHistory(tradeId: string): Promise<TradeWithHistory | null> {
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) {
      return null;
    }

    let timeRemaining: number | undefined;
    let isExpiringSoon = false;
    if (trade.expiry_time) {
      timeRemaining = new Date(trade.expiry_time).getTime() - Date.now();
      isExpiringSoon = timeRemaining > 0 && timeRemaining < 5 * 60 * 1000;
    }

    return {
      ...trade,
      price_history: [],
      timeRemaining,
      isExpiringSoon
    };
  }

  async getOpenTradesWithStatus(userId: string): Promise<TradeWithHistory[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    const tradesWithHistory: TradeWithHistory[] = [];
    for (const trade of data) {
      const tradeWithHistory = await this.getTradeWithHistory(trade.id);
      if (tradeWithHistory) {
        tradesWithHistory.push(tradeWithHistory);
      }
    }

    return tradesWithHistory;
  }

  async updateTradePriceInDB(tradeId: string, currentPrice: number, pnl: number): Promise<void> {
    try {
      // Direct update without RPC to avoid permission issues
      const { error } = await supabase
        .from('trades')
        .update({ 
          current_price: currentPrice, 
          pnl: pnl,
          last_price_update: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (error) {
        // Silently fail - price updates are not critical
        console.log('Price update skipped:', error.message);
      }
    } catch (error) {
      // Silently fail
    }
  }

  private async checkAutoClose() {
    if (!this.userId) return;

    try {
      // Get all open trades
      const { data: openTrades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'open');

      if (error || !openTrades) return;

      let hasChanges = false;

      for (const trade of openTrades) {
        let shouldClose = false;
        let closeReason = '';
        let closePrice = trade.current_price || trade.entry_price;
        let closePnl = trade.pnl || 0;

        // Check expiry
        if (trade.expiry_time && new Date(trade.expiry_time) <= new Date()) {
          shouldClose = true;
          closeReason = 'expired';
        }

        // Check Stop Loss
        if (!shouldClose && trade.stop_loss) {
          if (trade.side === 'buy' && closePrice <= trade.stop_loss) {
            shouldClose = true;
            closeReason = 'stop loss';
          } else if (trade.side === 'sell' && closePrice >= trade.stop_loss) {
            shouldClose = true;
            closeReason = 'stop loss';
          }
        }

        // Check Take Profit
        if (!shouldClose && trade.take_profit) {
          if (trade.side === 'buy' && closePrice >= trade.take_profit) {
            shouldClose = true;
            closeReason = 'take profit';
          } else if (trade.side === 'sell' && closePrice <= trade.take_profit) {
            shouldClose = true;
            closeReason = 'take profit';
          }
        }

        if (shouldClose) {
          // Close the trade
          const { error: closeError } = await supabase
            .from('trades')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              pnl: closePnl
            })
            .eq('id', trade.id);

          if (!closeError) {
            hasChanges = true;
            
            // Only show notification once per trade
            if (!this.lastNotifiedTrades.has(trade.id)) {
              this.lastNotifiedTrades.add(trade.id);
              const callback = this.callbacks.get(`user-${this.userId}`);
              if (callback) {
                const closedTrade = await this.getTradeWithHistory(trade.id);
                if (closedTrade) {
                  callback(closedTrade);
                }
              }
            }
          }
        }
      }

      // Clear notified trades that are no longer open
      const openTradeIds = new Set(openTrades.map(t => t.id));
      for (const notifiedId of this.lastNotifiedTrades) {
        if (!openTradeIds.has(notifiedId)) {
          this.lastNotifiedTrades.delete(notifiedId);
        }
      }

    } catch (error) {
      console.error('Auto-close check error:', error);
    }
  }

  private async syncPriceUpdates() {
    if (!this.userId) return;

    const openTrades = await this.getOpenTradesWithStatus(this.userId);
    
    for (const trade of openTrades) {
      if (trade.current_price && trade.entry_price) {
        const pnl = trade.side === 'buy'
          ? (trade.current_price - trade.entry_price) * trade.quantity
          : (trade.entry_price - trade.current_price) * trade.quantity;
        
        await this.updateTradePriceInDB(trade.id, trade.current_price, pnl);
      }
    }
  }

  private subscribeToTradeChanges(userId: string) {
    const channel = supabase
      .channel(`advanced-trades:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // Only trigger for status changes to closed
          if (payload.eventType === 'UPDATE') {
            const oldRecord = payload.old as any;
            const newRecord = payload.new as any;
            if (oldRecord.status !== 'closed' && newRecord.status === 'closed') {
              const callback = this.callbacks.get(`user-${userId}`);
              if (callback) {
                const tradeWithHistory = await this.getTradeWithHistory(newRecord.id);
                if (tradeWithHistory) {
                  callback(tradeWithHistory);
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async extendTradeExpiry(tradeId: string, additionalMinutes: number): Promise<boolean> {
    const { data: trade } = await supabase
      .from('trades')
      .select('expiry_time')
      .eq('id', tradeId)
      .single();

    if (!trade) return false;

    const currentExpiry = trade.expiry_time ? new Date(trade.expiry_time) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + additionalMinutes * 60 * 1000);

    const { error } = await supabase
      .from('trades')
      .update({ expiry_time: newExpiry.toISOString() })
      .eq('id', tradeId);

    if (error) {
      console.error('Error extending expiry:', error);
      return false;
    }

    return true;
  }

  async getAdvancedTradeStats(userId: string): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfit: number;
    totalLoss: number;
    winRate: number;
    averageHoldingTime: number;
    bestTrade: number;
    worstTrade: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }> {
    const { data, error } = await supabase
      .from('trades')
      .select('pnl, side, created_at, closed_at, quantity, entry_price')
      .eq('user_id', userId)
      .eq('status', 'closed');

    if (error || !data) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        averageHoldingTime: 0,
        bestTrade: 0,
        worstTrade: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      };
    }

    const closedTrades = data.filter(t => t.closed_at);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    let totalHoldingMinutes = 0;
    closedTrades.forEach(trade => {
      if (trade.created_at && trade.closed_at) {
        const holdingMs = new Date(trade.closed_at).getTime() - new Date(trade.created_at).getTime();
        totalHoldingMinutes += holdingMs / (1000 * 60);
      }
    });
    const averageHoldingTime = closedTrades.length > 0 ? totalHoldingMinutes / closedTrades.length : 0;
    
    const profits = winningTrades.map(t => t.pnl || 0);
    const losses = losingTrades.map(t => Math.abs(t.pnl || 0));
    
    const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
    const worstTrade = losses.length > 0 ? Math.max(...losses) : 0;
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
    
    const allReturns = [...profits.map(p => p / 100), ...losses.map(l => -l / 100)];
    const avgReturn = allReturns.reduce((a, b) => a + b, 0) / (allReturns.length || 1);
    const variance = allReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (allReturns.length || 1);
    const sharpeRatio = Math.sqrt(variance) > 0 ? avgReturn / Math.sqrt(variance) : 0;
    
    let cumulativeReturn = 0;
    let maxReturn = 0;
    let maxDrawdown = 0;
    
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    for (const trade of sortedTrades) {
      cumulativeReturn += trade.pnl || 0;
      if (cumulativeReturn > maxReturn) {
        maxReturn = cumulativeReturn;
      }
      const drawdown = maxReturn - cumulativeReturn;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalProfit,
      totalLoss,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      averageHoldingTime,
      bestTrade,
      worstTrade,
      profitFactor: profitFactor === 999 ? 999 : profitFactor,
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      maxDrawdown
    };
  }
}

export const advancedTradingService = new AdvancedTradingService();