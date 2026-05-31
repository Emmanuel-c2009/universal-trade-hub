
-- Copy Trading Configuration table (global settings)
CREATE TABLE public.copy_trading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'default_random' CHECK (mode IN ('default_random', 'manual_override')),
  
  -- Manual Override: Global Profit settings
  manual_profit_enabled BOOLEAN NOT NULL DEFAULT false,
  profit_min NUMERIC(5,2) DEFAULT 0.5,
  profit_max NUMERIC(5,2) DEFAULT 15,
  profit_apply_all_durations BOOLEAN NOT NULL DEFAULT true,
  profit_1h_min NUMERIC(5,2) DEFAULT 0.5,
  profit_1h_max NUMERIC(5,2) DEFAULT 15,
  profit_4h_min NUMERIC(5,2) DEFAULT 1,
  profit_4h_max NUMERIC(5,2) DEFAULT 25,
  profit_12h_min NUMERIC(5,2) DEFAULT 2,
  profit_12h_max NUMERIC(5,2) DEFAULT 45,
  profit_24h_min NUMERIC(5,2) DEFAULT 3,
  profit_24h_max NUMERIC(5,2) DEFAULT 65,
  
  -- Manual Override: Global Loss settings
  manual_loss_enabled BOOLEAN NOT NULL DEFAULT false,
  loss_min NUMERIC(5,2) DEFAULT 0.5,
  loss_max NUMERIC(5,2) DEFAULT 100,
  loss_apply_all_durations BOOLEAN NOT NULL DEFAULT true,
  loss_1h_min NUMERIC(5,2) DEFAULT 0.5,
  loss_1h_max NUMERIC(5,2) DEFAULT 100,
  loss_4h_min NUMERIC(5,2) DEFAULT 1,
  loss_4h_max NUMERIC(5,2) DEFAULT 100,
  loss_12h_min NUMERIC(5,2) DEFAULT 2,
  loss_12h_max NUMERIC(5,2) DEFAULT 100,
  loss_24h_min NUMERIC(5,2) DEFAULT 3,
  loss_24h_max NUMERIC(5,2) DEFAULT 100,
  
  -- Profit Decay
  profit_decay_enabled BOOLEAN NOT NULL DEFAULT true,
  profit_decay_at_trade SMALLINT NOT NULL DEFAULT 6,
  profit_decay_max NUMERIC(5,2) DEFAULT 25,
  profit_decay_min NUMERIC(5,2) DEFAULT 1,
  
  -- Auto-Randomization
  auto_randomization_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_randomization_interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_randomization_at TIMESTAMPTZ,
  
  -- Fixed Outcome Override (Emergency/Testing)
  fixed_outcome_enabled BOOLEAN NOT NULL DEFAULT false,
  fixed_profit_pct NUMERIC(5,2) DEFAULT 10,
  fixed_loss_pct NUMERIC(5,2) DEFAULT 0,
  fixed_outcome_duration_type TEXT DEFAULT 'until_disabled' CHECK (fixed_outcome_duration_type IN ('trade_count', 'time_limit', 'until_disabled')),
  fixed_outcome_trade_count INTEGER DEFAULT 0,
  fixed_outcome_time_minutes INTEGER DEFAULT 0,
  fixed_outcome_started_at TIMESTAMPTZ,
  
  -- Metadata
  last_configured_by UUID REFERENCES public.profiles(id),
  active_since TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trading_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage copy trading config"
ON public.copy_trading_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config row
INSERT INTO public.copy_trading_config (mode) VALUES ('default_random');

-- Per-Expert Override table
CREATE TABLE public.copy_trading_expert_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  
  profit_min NUMERIC(5,2) DEFAULT 0.5,
  profit_max NUMERIC(5,2) DEFAULT 15,
  profit_apply_all_durations BOOLEAN NOT NULL DEFAULT true,
  profit_1h_min NUMERIC(5,2) DEFAULT 0.5,
  profit_1h_max NUMERIC(5,2) DEFAULT 15,
  profit_4h_min NUMERIC(5,2) DEFAULT 1,
  profit_4h_max NUMERIC(5,2) DEFAULT 25,
  profit_12h_min NUMERIC(5,2) DEFAULT 2,
  profit_12h_max NUMERIC(5,2) DEFAULT 45,
  profit_24h_min NUMERIC(5,2) DEFAULT 3,
  profit_24h_max NUMERIC(5,2) DEFAULT 65,
  
  loss_min NUMERIC(5,2) DEFAULT 0.5,
  loss_max NUMERIC(5,2) DEFAULT 100,
  loss_apply_all_durations BOOLEAN NOT NULL DEFAULT true,
  loss_1h_min NUMERIC(5,2) DEFAULT 0.5,
  loss_1h_max NUMERIC(5,2) DEFAULT 100,
  loss_4h_min NUMERIC(5,2) DEFAULT 1,
  loss_4h_max NUMERIC(5,2) DEFAULT 100,
  loss_12h_min NUMERIC(5,2) DEFAULT 2,
  loss_12h_max NUMERIC(5,2) DEFAULT 100,
  loss_24h_min NUMERIC(5,2) DEFAULT 3,
  loss_24h_max NUMERIC(5,2) DEFAULT 100,
  
  profit_decay_enabled BOOLEAN NOT NULL DEFAULT true,
  profit_decay_at_trade SMALLINT NOT NULL DEFAULT 6,
  profit_decay_max NUMERIC(5,2) DEFAULT 25,
  profit_decay_min NUMERIC(5,2) DEFAULT 1,
  
  auto_randomization_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_randomization_interval_minutes INTEGER NOT NULL DEFAULT 5,
  
  fixed_outcome_enabled BOOLEAN NOT NULL DEFAULT false,
  fixed_profit_pct NUMERIC(5,2) DEFAULT 10,
  fixed_loss_pct NUMERIC(5,2) DEFAULT 0,
  
  configured_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(expert_id)
);

ALTER TABLE public.copy_trading_expert_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expert overrides"
ON public.copy_trading_expert_overrides FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Preset Configurations table
CREATE TABLE public.copy_trading_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  config JSONB NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trading_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage presets"
ON public.copy_trading_presets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default presets
INSERT INTO public.copy_trading_presets (name, description, tags, config) VALUES
('Conservative', 'Low risk, steady returns', ARRAY['safe', 'default'], '{"profit_min": 1, "profit_max": 25, "loss_min": 1, "loss_max": 50, "interval": 10, "decay_enabled": true}'::jsonb),
('Balanced', 'Moderate risk/reward', ARRAY['balanced', 'default'], '{"profit_min": 3, "profit_max": 50, "loss_min": 3, "loss_max": 75, "interval": 5, "decay_enabled": true}'::jsonb),
('Aggressive', 'High risk, high reward', ARRAY['aggressive'], '{"profit_min": 5, "profit_max": 75, "loss_min": 5, "loss_max": 100, "interval": 2, "decay_enabled": true}'::jsonb),
('Test Mode', 'All trades profit, for testing', ARRAY['testing'], '{"profit_min": 100, "profit_max": 100, "loss_min": 0, "loss_max": 0, "interval": 0, "decay_enabled": false}'::jsonb),
('Loss Streak', 'Simulate losses', ARRAY['testing'], '{"profit_min": 1, "profit_max": 10, "loss_min": 50, "loss_max": 100, "interval": 1, "decay_enabled": false}'::jsonb);

-- Scheduled Configuration Changes table
CREATE TABLE public.copy_trading_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  executed BOOLEAN NOT NULL DEFAULT false,
  executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trading_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage schedules"
ON public.copy_trading_schedules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Configuration Audit Log table
CREATE TABLE public.copy_trading_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  mode_from TEXT,
  mode_to TEXT,
  changes JSONB,
  preset_used TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trading_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.copy_trading_audit_log FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_copy_trading_config_updated_at
  BEFORE UPDATE ON public.copy_trading_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_copy_trading_expert_overrides_updated_at
  BEFORE UPDATE ON public.copy_trading_expert_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_copy_trading_presets_updated_at
  BEFORE UPDATE ON public.copy_trading_presets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
