
-- MT5 admin codes table
CREATE TABLE IF NOT EXISTS mt5_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  stop_loss NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  profit_margin NUMERIC NOT NULL DEFAULT 20,
  loss_margin NUMERIC NOT NULL DEFAULT 20,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MT5 default margin settings
CREATE TABLE IF NOT EXISTS mt5_default_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(20) NOT NULL DEFAULT 'default',
  margin_min NUMERIC NOT NULL DEFAULT 1,
  margin_max NUMERIC NOT NULL DEFAULT 30,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE mt5_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt5_default_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mt5_codes" ON mt5_codes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Admins can manage mt5_default_config" ON mt5_default_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));
