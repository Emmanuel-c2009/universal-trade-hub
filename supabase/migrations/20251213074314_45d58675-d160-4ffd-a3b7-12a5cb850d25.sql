-- Phase 1: Core Infrastructure Setup

-- 1. User Balances Table (Dual Balance Architecture)
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  main_balance NUMERIC NOT NULL DEFAULT 0,
  trading_balance NUMERIC NOT NULL DEFAULT 0,
  litecoin_balance NUMERIC NOT NULL DEFAULT 0,
  bonus_balance NUMERIC NOT NULL DEFAULT 0,
  is_test_account BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Universal Transactions Table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'trade', 'swap', 'subscription', 'transfer', 'bonus', 'adjustment')),
  channel TEXT NOT NULL CHECK (channel IN ('ai_bot', 'quick_trade', 'copy_trading', 'mt5_metals', 'crypto_trading', 'stock_investment', 'system', 'admin')),
  amount NUMERIC NOT NULL,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('main', 'trading', 'litecoin', 'bonus')),
  description TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. AI Bots Table
CREATE TABLE public.ai_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  star_rating NUMERIC NOT NULL DEFAULT 5 CHECK (star_rating >= 0 AND star_rating <= 5),
  profit_range_min NUMERIC NOT NULL DEFAULT 5,
  profit_range_max NUMERIC NOT NULL DEFAULT 60,
  avatar_url TEXT,
  trading_pairs TEXT[] DEFAULT ARRAY['EUR/USD', 'BTC/USD'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. AI Bot Subscriptions Table
CREATE TABLE public.ai_bot_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_bots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. AI Bot Trades Table
CREATE TABLE public.ai_bot_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.ai_bot_subscriptions(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.ai_bots(id) ON DELETE CASCADE,
  trading_pair TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  investment_amount NUMERIC NOT NULL,
  profit_loss NUMERIC DEFAULT 0,
  profit_loss_percentage NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. External Bot Requests Table
CREATE TABLE public.external_bot_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Admin Users Table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
  permissions JSONB DEFAULT '{"users": true, "transactions": true, "bots": true, "settings": true}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_bot_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_bot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_bot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances
CREATE POLICY "Users can view their own balances" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own balances" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert balances" ON public.user_balances FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_bots (public read, admin write)
CREATE POLICY "Anyone can view active bots" ON public.ai_bots FOR SELECT USING (is_active = true);

-- RLS Policies for ai_bot_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.ai_bot_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subscriptions" ON public.ai_bot_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.ai_bot_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ai_bot_trades
CREATE POLICY "Users can view their own bot trades" ON public.ai_bot_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bot trades" ON public.ai_bot_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bot trades" ON public.ai_bot_trades FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for external_bot_requests
CREATE POLICY "Users can view their own requests" ON public.external_bot_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests" ON public.external_bot_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for admin_users
CREATE POLICY "Admins can view admin users" ON public.admin_users FOR SELECT USING (auth.uid() = user_id);

-- Insert default AI bots
INSERT INTO public.ai_bots (name, description, monthly_cost, star_rating, profit_range_min, profit_range_max, trading_pairs) VALUES
('Mia', 'Advanced AI trading bot specializing in forex pairs with consistent returns', 0.05, 4.8, 10, 45, ARRAY['EUR/USD', 'GBP/USD', 'USD/JPY']),
('Quantum Scalar', 'High-frequency trading bot utilizing quantum algorithms for optimal entry points', 0.08, 4.9, 15, 55, ARRAY['BTC/USD', 'ETH/USD', 'XAU/USD']),
('Sentinel Forex', 'Conservative forex trading bot focused on major currency pairs', 0.03, 4.5, 5, 30, ARRAY['EUR/USD', 'USD/CHF', 'AUD/USD']),
('Crypto Nexus', 'Aggressive cryptocurrency trading bot for volatile market conditions', 0.10, 4.7, 20, 60, ARRAY['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD']);

-- Create function to auto-create user balances on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, is_test_account)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = 'marcosgilbertothiago@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating balances
CREATE TRIGGER on_profile_created_create_balances
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_balances();

-- Create function for updating timestamps
CREATE TRIGGER update_user_balances_updated_at
  BEFORE UPDATE ON public.user_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ai_bots_updated_at
  BEFORE UPDATE ON public.ai_bots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ai_bot_subscriptions_updated_at
  BEFORE UPDATE ON public.ai_bot_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();