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
  private callbacks: Map<string, (trade: TradeWithHistory) => void> = new Map();
  private userId: string | null = null;
  private isMonitoring = false;
  private lastNotifiedTrades: Set<string> = new Set();

  initializeRealtimeMonitoring(userId: string, onTradeUpdate: (trade: TradeWithHistory) => void) {
    if (this.isMonitoring && this.userId === userId) {
      console.log('Monitoring already active for this user');
      return;
    }
    
    this.stopRealtimeMonitoring();
    
    this.userId = userId;
    const key = `user-${userId}`;
    this.callbacks.set(key, onTradeUpdate);
    this.isMonitoring = true;
    this.lastNotifiedTrades.clear();
    
    if (!this.autoCloseInterval) {
      this.autoCloseInterval = setInterval(() => this.checkAndCloseExpiredTrades(), 10000);
    }
    
    this.subscribeToTradeChanges(userId);
  }

  stopRealtimeMonitoring() {
    if (this.autoCloseInterval) {
      clearInterval(this.autoCloseInterval);
      this.autoCloseInterval = null;
    }
    this.callbacks.clear();
    this.isMonitoring = false;
    this.lastNotifiedTrades.clear();
  }

  // NEW: Update trading balance when trade opens
  private async debitTradingBalance(userId: string, amount: number): Promise<boolean> {
    const { data: currentBalance, error: fetchError } = await supabase
      .from('user_balances')
      .select('trading_balance')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching balance:', fetchError);
      return false;
    }

    const currentTradingBalance = currentBalance?.trading_balance || 0;
    
    if (currentTradingBalance < amount) {
      console.error('Insufficient trading balance');
      return false;
    }

    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ 
        trading_balance: currentTradingBalance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error debiting trading balance:', updateError);
      return false;
    }

    console.log(`✅ Debited €${amount} from trading balance`);
    return true;
  }

  // NEW: Update trading balance when trade closes
  private async creditTradingBalance(userId: string, amount: number): Promise<boolean> {
    const { data: currentBalance, error: fetchError } = await supabase
      .from('user_balances')
      .select('trading_balance')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching balance:', fetchError);
      return false;
    }

    const currentTradingBalance = currentBalance?.trading_balance || 0;

    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ 
        trading_balance: currentTradingBalance + amount,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error crediting trading balance:', updateError);
      return false;
    }

    console.log(`✅ Credited €${amount} to trading balance`);
    return true;
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
    const tradeValue = quantity * entryPrice;
    
    // Debit trading balance first
    const debited = await this.debitTradingBalance(userId, tradeValue);
    if (!debited) {
      console.error('Failed to debit trading balance');
      return null;
    }

    const expiryTime = options.expiryMinutes && options.expiryMinutes > 0
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
      // Refund the balance if trade creation fails
      await this.creditTradingBalance(userId, tradeValue);
      return null;
    }

    console.log(`✅ Trade created: ${data.id}, debited €${tradeValue}`);
    return data;
  }

  async closeTradeManually(tradeId: string, exitPrice: number, pnl: number): Promise<boolean> {
    console.log(`Closing trade ${tradeId} with P&L: €${pnl}`);
    
    // First get the trade details to know the original trade value
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('user_id, quantity, entry_price')
      .eq('id', tradeId)
      .single();

    if (fetchError || !trade) {
      console.error('Error fetching trade:', fetchError);
      return false;
    }

    const originalTradeValue = trade.quantity * trade.entry_price;
    const finalAmount = originalTradeValue + pnl; // Capital + profit/loss

    // Update trade status
    const { error: closeError } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        current_price: exitPrice,
        pnl: pnl
      })
      .eq('id', tradeId);

    if (closeError) {
      console.error('Error closing trade:', closeError);
      return false;
    }

    // Credit the trading balance with final amount (capital + profit/loss)
    const credited = await this.creditTradingBalance(trade.user_id, finalAmount);
    if (!credited) {
      console.error('Failed to credit trading balance');
      return false;
    }

    console.log(`✅ Trade closed: ${tradeId}, credited €${finalAmount} (Capital: €${originalTradeValue}, P&L: €${pnl})`);
    return true;
  }

  private async checkAndCloseExpiredTrades() {
    if (!this.userId) return;

    try {
      const now = new Date().toISOString();
      
      const { data: expiredTrades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'open')
        .lt('expiry_time', now);

      if (error) {
        console.error('Error checking expired trades:', error);
        return;
      }

      if (expiredTrades && expiredTrades.length > 0) {
        console.log(`Found ${expiredTrades.length} expired trades to close`);
        
        for (const trade of expiredTrades) {
          const originalValue = trade.quantity * trade.entry_price;
          const pnl = trade.pnl || 0;
          const finalAmount = originalValue + pnl;

          // Close the trade
          const { error: closeError } = await supabase
            .from('trades')
            .update({
              status: 'closed',
              closed_at: now,
              is_expired: true
            })
            .eq('id', trade.id);

          if (!closeError) {
            // Credit the trading balance
            await this.creditTradingBalance(trade.user_id, finalAmount);
            console.log(`✅ Auto-closed expired trade: ${trade.id}, credited €${finalAmount}`);
            
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

      // Check stop loss and take profit
      const { data: slTpTrades, error: slError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'open');

      if (!slError && slTpTrades) {
        for (const trade of slTpTrades) {
          const currentPrice = trade.current_price || trade.entry_price;
          let shouldClose = false;
          let closeReason = '';

          if (trade.stop_loss) {
            if (trade.side === 'buy' && currentPrice <= trade.stop_loss) {
              shouldClose = true;
              closeReason = 'stop_loss';
            } else if (trade.side === 'sell' && currentPrice >= trade.stop_loss) {
              shouldClose = true;
              closeReason = 'stop_loss';
            }
          }

          if (!shouldClose && trade.take_profit) {
            if (trade.side === 'buy' && currentPrice >= trade.take_profit) {
              shouldClose = true;
              closeReason = 'take_profit';
            } else if (trade.side === 'sell' && currentPrice <= trade.take_profit) {
              shouldClose = true;
              closeReason = 'take_profit';
            }
          }

          if (shouldClose) {
            const originalValue = trade.quantity * trade.entry_price;
            const pnl = trade.pnl || 0;
            const finalAmount = originalValue + pnl;

            const { error: closeError } = await supabase
              .from('trades')
              .update({
                status: 'closed',
                closed_at: new Date().toISOString()
              })
              .eq('id', trade.id);

            if (!closeError) {
              await this.creditTradingBalance(trade.user_id, finalAmount);
              console.log(`✅ Auto-closed by ${closeReason}: ${trade.id}`);
              
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
      }
    } catch (error) {
      console.error('Auto-close check error:', error);
    }
  }

  private subscribeToTradeChanges(userId: string) {
    const channel = supabase
      .channel(`advanced-trades:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.status === 'closed') {
            const callback = this.callbacks.get(`user-${userId}`);
            if (callback) {
              const tradeWithHistory = await this.getTradeWithHistory(newRecord.id);
              if (tradeWithHistory) {
                callback(tradeWithHistory);
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
    if (trade.expiry_time && trade.status === 'open') {
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

    console.log(`✅ Extended trade ${tradeId} by ${additionalMinutes} minutes`);
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