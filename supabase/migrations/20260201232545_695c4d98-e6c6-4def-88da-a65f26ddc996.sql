-- Fix: Drop existing policy first
DROP POLICY IF EXISTS "Admins can update all balances" ON public.user_balances;

-- Recreate admin update policy for user_balances
CREATE POLICY "Admins can update all balances"
  ON public.user_balances
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));