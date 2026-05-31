-- Resolve RLS enabled / no policy by allowing admin-only access to trade_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='trade_details' AND policyname='Admins can manage trade details'
  ) THEN
    CREATE POLICY "Admins can manage trade details"
    ON public.trade_details
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
