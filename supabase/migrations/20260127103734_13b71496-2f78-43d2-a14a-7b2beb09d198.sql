-- Expand user_balances with crypto wallets and trading metrics
ALTER TABLE public.user_balances 
ADD COLUMN IF NOT EXISTS btc_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS eth_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS usdt_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bnb_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS challenges_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_profit numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS win_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_trades integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS today_pnl numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_return numeric NOT NULL DEFAULT 0;

-- Create balance_transfers table for internal transfers
CREATE TABLE IF NOT EXISTS public.balance_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_balance_type text NOT NULL,
  to_balance_type text NOT NULL,
  amount numeric NOT NULL,
  crypto_amount numeric,
  crypto_symbol text,
  exchange_rate numeric,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfers" ON public.balance_transfers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transfers" ON public.balance_transfers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transfers" ON public.balance_transfers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create crypto_swaps table for automated swapping
CREATE TABLE IF NOT EXISTS public.crypto_swaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_crypto text NOT NULL,
  to_crypto text NOT NULL,
  from_amount numeric NOT NULL,
  to_amount numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  fee_percent numeric NOT NULL DEFAULT 0.5,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own swaps" ON public.crypto_swaps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own swaps" ON public.crypto_swaps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all swaps" ON public.crypto_swaps
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create balance_audit_log for complete audit trail
CREATE TABLE IF NOT EXISTS public.balance_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES public.profiles(id),
  balance_type text NOT NULL,
  previous_value numeric NOT NULL,
  new_value numeric NOT NULL,
  change_amount numeric NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs" ON public.balance_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all audit logs" ON public.balance_audit_log
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create crypto_prices table for caching real-time prices
CREATE TABLE IF NOT EXISTS public.crypto_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  price_eur numeric NOT NULL DEFAULT 0,
  price_usd numeric NOT NULL DEFAULT 0,
  change_24h numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crypto_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crypto prices" ON public.crypto_prices
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage crypto prices" ON public.crypto_prices
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial crypto prices
INSERT INTO public.crypto_prices (symbol, name, price_eur, price_usd, change_24h)
VALUES 
  ('BTC', 'Bitcoin', 85000, 92000, 2.5),
  ('ETH', 'Ethereum', 2800, 3050, 1.8),
  ('USDT', 'Tether', 0.92, 1.0, 0.01),
  ('LTC', 'Litecoin', 95, 103, -0.5),
  ('BNB', 'Binance Coin', 550, 600, 3.2)
ON CONFLICT (symbol) DO NOTHING;

-- Add admin policies for user_balances
CREATE POLICY "Admins can view all balances" ON public.user_balances
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all balances" ON public.user_balances
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));