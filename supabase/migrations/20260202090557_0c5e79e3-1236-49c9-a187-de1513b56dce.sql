-- Fix RLS policies so admins can see all users and balances

-- 1. Add admin SELECT policy for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- 2. Add admin SELECT policy for user_balances
DROP POLICY IF EXISTS "Admins can view all balances" ON public.user_balances;
CREATE POLICY "Admins can view all balances" ON public.user_balances
FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all balances" ON public.user_balances;
CREATE POLICY "Admins can update all balances" ON public.user_balances
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- 3. Fix deposits table - allow admins to join profiles
DROP POLICY IF EXISTS "Admins can read all profiles for joins" ON public.profiles;
CREATE POLICY "Admins can read all profiles for joins" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin') OR auth.uid() = id);

-- 4. Add foreign key constraint for deposits if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deposits_user_id_fkey' 
    AND table_name = 'deposits'
  ) THEN
    ALTER TABLE public.deposits
    ADD CONSTRAINT deposits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- 5. Add foreign key constraint for withdrawals if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'withdrawals_user_id_fkey' 
    AND table_name = 'withdrawals'
  ) THEN
    ALTER TABLE public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON public.deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);

-- 7. Add user statistics materialized view placeholder (for performance)
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS TABLE(
  total_trades bigint,
  winning_trades bigint,
  total_profit numeric,
  win_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_trades,
    COUNT(*) FILTER (WHERE pnl > 0)::bigint as winning_trades,
    COALESCE(SUM(pnl), 0)::numeric as total_profit,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE pnl > 0)::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END as win_rate
  FROM platform_trades
  WHERE user_id = p_user_id AND status = 'closed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;