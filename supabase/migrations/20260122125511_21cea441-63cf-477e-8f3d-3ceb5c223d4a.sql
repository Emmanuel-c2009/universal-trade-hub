-- Security linter fixes

-- 1) Ensure RLS enabled on all public tables (trade_details had RLS disabled)
ALTER TABLE public.trade_details ENABLE ROW LEVEL SECURITY;

-- If there are no clear ownership rules yet, keep it locked down by default.
-- (No policies means no access through PostgREST.)

-- 2) Fix mutable search_path warning for handle_updated_at()
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
