-- =====================================================
-- 1. CREATE supported_cryptos & user_crypto_wallets tables (row-per-coin model)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.supported_cryptos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  network TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 8,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_deposit BOOLEAN NOT NULL DEFAULT true,
  allow_withdrawal BOOLEAN NOT NULL DEFAULT true,
  allow_trading BOOLEAN NOT NULL DEFAULT true,
  min_deposit NUMERIC NOT NULL DEFAULT 0,
  min_withdrawal NUMERIC NOT NULL DEFAULT 0,
  withdrawal_fee NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supported_cryptos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active cryptos" ON public.supported_cryptos;
CREATE POLICY "Anyone can view active cryptos"
  ON public.supported_cryptos
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage cryptos" ON public.supported_cryptos;
CREATE POLICY "Admins can manage cryptos"
  ON public.supported_cryptos
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User crypto wallets (row-per-coin-per-user)
CREATE TABLE IF NOT EXISTS public.user_crypto_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crypto_id uuid NOT NULL REFERENCES public.supported_cryptos(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  deposit_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, crypto_id)
);

ALTER TABLE public.user_crypto_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.user_crypto_wallets;
CREATE POLICY "Users can view own wallets"
  ON public.user_crypto_wallets
  FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own wallets" ON public.user_crypto_wallets;
CREATE POLICY "Users can insert own wallets"
  ON public.user_crypto_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallets" ON public.user_crypto_wallets;
CREATE POLICY "Users can update own wallets"
  ON public.user_crypto_wallets
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.user_crypto_wallets;
CREATE POLICY "Admins can manage all wallets"
  ON public.user_crypto_wallets
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default cryptos
INSERT INTO public.supported_cryptos (symbol, name, network, decimals, display_order)
VALUES
  ('BTC', 'Bitcoin', 'BTC', 8, 1),
  ('ETH', 'Ethereum', 'ETH', 18, 2),
  ('USDT', 'Tether', 'TRC20', 6, 3),
  ('LTC', 'Litecoin', 'LTC', 8, 4),
  ('BNB', 'BNB Smart Chain', 'BEP20', 18, 5)
ON CONFLICT (symbol) DO NOTHING;

-- =====================================================
-- 2. CREATE admin_notifications table for deposits/withdrawals
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  reference_id uuid,
  reference_table TEXT,
  user_id uuid REFERENCES public.profiles(id),
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Deposit notification trigger
CREATE OR REPLACE FUNCTION public.notify_admin_on_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (notification_type, reference_id, reference_table, user_id, message)
  VALUES (
    'deposit_request',
    NEW.id,
    'deposits',
    NEW.user_id,
    'New ' || NEW.deposit_method || ' deposit request for ' || NEW.currency || ' ' || NEW.amount
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admin_on_deposit ON public.deposits;
CREATE TRIGGER trigger_notify_admin_on_deposit
  AFTER INSERT ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_deposit();

-- Withdrawal notification trigger
CREATE OR REPLACE FUNCTION public.notify_admin_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (notification_type, reference_id, reference_table, user_id, message)
  VALUES (
    'withdrawal_request',
    NEW.id,
    'withdrawals',
    NEW.user_id,
    'New ' || NEW.withdrawal_method || ' withdrawal request for ' || NEW.currency || ' ' || NEW.amount
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admin_on_withdrawal ON public.withdrawals;
CREATE TRIGGER trigger_notify_admin_on_withdrawal
  AFTER INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_withdrawal();

-- User notifications table (for deposit/withdrawal status updates)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  reference_id uuid,
  reference_table TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert user notifications" ON public.user_notifications;
CREATE POLICY "Admins can insert user notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_crypto_wallets_user ON public.user_crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crypto_wallets_crypto ON public.user_crypto_wallets(crypto_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);