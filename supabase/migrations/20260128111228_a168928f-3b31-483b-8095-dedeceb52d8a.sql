-- Trading Sessions Management (tracks user allocations to each platform)
CREATE TABLE IF NOT EXISTS public.trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'metal_trader', 'quick_trade', 'copy_trading', 'ai_bot', 'stocks', 'crypto'
  allocated_amount DECIMAL(20,8) NOT NULL DEFAULT 0, -- Amount reserved from Trading Balance
  starting_balance DECIMAL(20,8) NOT NULL DEFAULT 0, -- Starting amount for this session
  current_balance DECIMAL(20,8) NOT NULL DEFAULT 0, -- Real-time updated amount
  realized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0, -- Total P&L from closed trades
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, platform) -- One active session per platform per user
);

-- Platform Trade Records (every trade across ALL platforms)
CREATE TABLE IF NOT EXISTS public.platform_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.trading_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  asset_symbol VARCHAR(30) NOT NULL, -- 'XAUUSD', 'BTC/USD', 'AAPL', etc.
  asset_name VARCHAR(100),
  trade_type VARCHAR(10) NOT NULL, -- 'buy', 'sell'
  quantity DECIMAL(20,8) NOT NULL,
  entry_price DECIMAL(20,8) NOT NULL,
  current_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  pnl DECIMAL(20,8) DEFAULT 0,
  fees DECIMAL(20,8) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'closed', 'pending', 'cancelled'
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  execution_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy Trading Sessions (links to expert traders)
CREATE TABLE IF NOT EXISTS public.copy_trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.trading_sessions(id) ON DELETE CASCADE,
  expert_id VARCHAR(50) NOT NULL,
  expert_name VARCHAR(100) NOT NULL,
  allocated_amount DECIMAL(20,8) NOT NULL,
  current_profit DECIMAL(20,8) DEFAULT 0,
  duration_hours INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'stopped'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_trading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_sessions
CREATE POLICY "Users can view their own trading sessions"
  ON public.trading_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading sessions"
  ON public.trading_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading sessions"
  ON public.trading_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all trading sessions"
  ON public.trading_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for platform_trades
CREATE POLICY "Users can view their own platform trades"
  ON public.platform_trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own platform trades"
  ON public.platform_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platform trades"
  ON public.platform_trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all platform trades"
  ON public.platform_trades FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for copy_trading_sessions
CREATE POLICY "Users can view their own copy trading sessions"
  ON public.copy_trading_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own copy trading sessions"
  ON public.copy_trading_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own copy trading sessions"
  ON public.copy_trading_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all copy trading sessions"
  ON public.copy_trading_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_trading_sessions_user ON public.trading_sessions(user_id);
CREATE INDEX idx_trading_sessions_platform ON public.trading_sessions(platform);
CREATE INDEX idx_trading_sessions_status ON public.trading_sessions(status);
CREATE INDEX idx_platform_trades_session ON public.platform_trades(session_id);
CREATE INDEX idx_platform_trades_user ON public.platform_trades(user_id);
CREATE INDEX idx_platform_trades_status ON public.platform_trades(status);
CREATE INDEX idx_copy_sessions_user ON public.copy_trading_sessions(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trading_sessions_updated_at
  BEFORE UPDATE ON public.trading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_copy_sessions_updated_at
  BEFORE UPDATE ON public.copy_trading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();