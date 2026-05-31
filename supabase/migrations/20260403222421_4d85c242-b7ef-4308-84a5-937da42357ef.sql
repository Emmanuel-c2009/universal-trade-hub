
CREATE TABLE IF NOT EXISTS public.mt5_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair VARCHAR(20) NOT NULL,
  stop_loss DECIMAL(18,5) NOT NULL,
  take_profit DECIMAL(18,5) NOT NULL,
  profit_margin INTEGER DEFAULT 72,
  loss_margin INTEGER DEFAULT 20,
  expiry_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mt5_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active configs"
  ON public.mt5_configurations FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage configs"
  ON public.mt5_configurations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );
