
-- Add SOL, ADA, XRP to supported_cryptos
INSERT INTO public.supported_cryptos (symbol, name, network, decimals, display_order, is_active, allow_deposit, allow_withdrawal, allow_trading, min_deposit, min_withdrawal, withdrawal_fee)
VALUES
  ('SOL', 'Solana', 'SOL', 9, 6, true, true, true, true, 0.01, 0.01, 0.01),
  ('ADA', 'Cardano', 'Cardano', 6, 7, true, true, true, true, 1, 1, 0.5),
  ('XRP', 'Ripple', 'XRP', 6, 8, true, true, true, true, 1, 1, 0.25)
ON CONFLICT DO NOTHING;

-- Create auto-wallet trigger: when a new crypto is added, create wallets for all existing users
CREATE OR REPLACE FUNCTION public.create_wallets_for_new_crypto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_crypto_wallets (user_id, crypto_id, balance)
  SELECT p.id, NEW.id, 0
  FROM public.profiles p
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_crypto_insert ON public.supported_cryptos;
CREATE TRIGGER after_crypto_insert
  AFTER INSERT ON public.supported_cryptos
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallets_for_new_crypto();

-- Create auto-wallet trigger: when a new user signs up, create wallets for all supported cryptos
CREATE OR REPLACE FUNCTION public.create_wallets_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_crypto_wallets (user_id, crypto_id, balance)
  SELECT NEW.id, sc.id, 0
  FROM public.supported_cryptos sc
  WHERE sc.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_profile_insert_create_wallets ON public.profiles;
CREATE TRIGGER after_profile_insert_create_wallets
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallets_for_new_user();

-- Backfill: create missing wallets for all existing user/crypto combinations
INSERT INTO public.user_crypto_wallets (user_id, crypto_id, balance)
SELECT p.id, sc.id, 0
FROM public.profiles p
CROSS JOIN public.supported_cryptos sc
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_crypto_wallets ucw
  WHERE ucw.user_id = p.id AND ucw.crypto_id = sc.id
)
ON CONFLICT DO NOTHING;
