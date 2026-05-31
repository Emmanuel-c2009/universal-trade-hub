import { supabase } from '@/integrations/supabase/client';

export interface AIBot {
  id: string;
  name: string;
  description: string | null;
  monthly_cost: number;
  star_rating: number;
  profit_range_min: number;
  profit_range_max: number;
  avatar_url: string | null;
  trading_pairs: string[];
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AIBotSubscription {
  id: string;
  user_id: string;
  bot_id: string;
  status: string;
  allocated_amount: number;
  started_at: string;
  expires_at: string;
  created_at: string | null;
  updated_at: string | null;
  bot?: AIBot;
}

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
  metadata: unknown;
  
  created_at: string | null;
  bot?: AIBot;
}

export interface UserBalance {
  id: string;
  user_id: string;
  main_balance: number;
  trading_balance: number;
  litecoin_balance: number;
  bonus_balance: number;
  is_test_account: boolean;
  created_at: string | null;
  updated_at: string | null;
}

class AIBotService {
  // Fetch all active AI bots
  async getActiveBots(): Promise<AIBot[]> {
    const { data, error } = await supabase
      .from('ai_bots')
      .select('*')
      .eq('is_active', true)
      .order('star_rating', { ascending: false });

    if (error) {
      console.error('Error fetching AI bots:', error);
      return [];
    }

    return data || [];
  }

  // Fetch user balance
  async getUserBalance(userId: string): Promise<UserBalance | null> {
    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user balance:', error);
      return null;
    }

    // If no balance record exists, create one
    if (!data) {
      const { data: newBalance, error: insertError } = await supabase
        .from('user_balances')
        .insert({ user_id: userId })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user balance:', insertError);
        return null;
      }
      return newBalance;
    }

    return data;
  }

  // Get user subscriptions
  async getUserSubscriptions(userId: string): Promise<AIBotSubscription[]> {
    const { data, error } = await supabase
      .from('ai_bot_subscriptions')
      .select(`
        *,
        bot:ai_bots(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    return data || [];
  }

  // Subscribe to a bot
  async subscribeToBot(
    userId: string,
    botId: string,
    allocatedAmount: number,
    durationMonths: number = 1
  ): Promise<AIBotSubscription | null> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const { data, error } = await supabase
      .from('ai_bot_subscriptions')
      .insert({
        user_id: userId,
        bot_id: botId,
        allocated_amount: allocatedAmount,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return null;
    }

    return data;
  }

  // Get active trades
  async getActiveTrades(userId: string): Promise<AIBotTrade[]> {
    const { data, error } = await supabase
      .from('ai_bot_trades')
      .select(`
        *,
        bot:ai_bots(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching active trades:', error);
      return [];
    }

    return data || [];
  }

  // Get trade history
  async getTradeHistory(userId: string, limit: number = 50): Promise<AIBotTrade[]> {
    const { data, error } = await supabase
      .from('ai_bot_trades')
      .select(`
        *,
        bot:ai_bots(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trade history:', error);
      return [];
    }

    return data || [];
  }

  // Create a new trade
  async createTrade(
    userId: string,
    subscriptionId: string,
    botId: string,
    tradingPair: string,
    tradeType: 'buy' | 'sell',
    entryPrice: number,
    investmentAmount: number
  ): Promise<AIBotTrade | null> {
    const { data, error } = await supabase
      .from('ai_bot_trades')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        bot_id: botId,
        trading_pair: tradingPair,
        trade_type: tradeType,
        entry_price: entryPrice,
        investment_amount: investmentAmount,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trade:', error);
      return null;
    }

    return data;
  }

  // Close a trade
  async closeTrade(
    tradeId: string,
    exitPrice: number,
    profitLoss: number,
    profitLossPercentage: number
  ): Promise<AIBotTrade | null> {
    const { data, error } = await supabase
      .from('ai_bot_trades')
      .update({
        exit_price: exitPrice,
        profit_loss: profitLoss,
        profit_loss_percentage: profitLossPercentage,
        status: 'closed',
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

  // Update user balance
  async updateBalance(
    userId: string,
    balanceType: 'main' | 'trading' | 'litecoin' | 'bonus',
    amount: number
  ): Promise<boolean> {
    const column = `${balanceType}_balance`;
    
    // First get current balance
    const { data: current, error: fetchError } = await supabase
      .from('user_balances')
      .select(column)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current balance:', fetchError);
      return false;
    }

    const newBalance = (current[column] as number) + amount;

    const { error } = await supabase
      .from('user_balances')
      .update({ [column]: newBalance })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating balance:', error);
      return false;
    }

    return true;
  }

  // Record transaction
  async recordTransaction(
    userId: string,
    transactionType: 'deposit' | 'withdrawal' | 'trade' | 'swap' | 'subscription' | 'transfer' | 'bonus' | 'adjustment',
    channel: string,
    amount: number,
    balanceType: 'main' | 'trading' | 'litecoin' | 'bonus',
    description?: string,
    referenceId?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        channel,
        amount,
        balance_type: balanceType,
        description,
        reference_id: referenceId
      });

    if (error) {
      console.error('Error recording transaction:', error);
      return false;
    }

    return true;
  }

  // Submit external bot request
  async submitExternalBotRequest(userId: string, licenseKey: string): Promise<boolean> {
    const { error } = await supabase
      .from('external_bot_requests')
      .insert({
        user_id: userId,
        license_key: licenseKey
      });

    if (error) {
      console.error('Error submitting bot request:', error);
      return false;
    }

    return true;
  }

  // Get user transactions
  async getTransactions(userId: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  }
}

export const aiBotService = new AIBotService();
