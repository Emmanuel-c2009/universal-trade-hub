
-- =============================================
-- SECTION 1: User Verifications table (replaces current broken table reference)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  id_type TEXT,
  id_document_path TEXT,
  utility_type TEXT,
  utility_bill_path TEXT,
  selfie_path TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications" ON public.user_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verifications" ON public.user_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all verifications" ON public.user_verifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- SECTION 2: User Notifications table (for user-facing notifications)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  icon TEXT,
  reference_id UUID,
  reference_table TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user notifications" ON public.user_notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- SECTION 3: Feature Flags system
-- =============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT,
  visibility_type TEXT NOT NULL DEFAULT 'all' CHECK (visibility_type IN ('all', 'specific_users', 'admins_only', 'coming_soon')),
  coming_soon_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags" ON public.feature_flags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.user_feature_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  has_access BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, feature_id)
);

ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feature access" ON public.user_feature_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage feature access" ON public.user_feature_access
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed feature flags
INSERT INTO public.feature_flags (feature_name, display_name, description, icon, route, visibility_type, coming_soon_message, order_index) VALUES
  ('stock_investment', 'Stock Investment', 'Access stock investment features', 'Building2', '/trading', 'specific_users', 'Stock investment features are coming soon! Stay tuned.', 1),
  ('swap_coin', 'Swap Coin', 'Cryptocurrency swapping', 'RefreshCw', '/swap', 'specific_users', 'Cryptocurrency swapping will be available in the next update.', 2),
  ('challenge_account', 'Challenge Account', 'Trading challenge accounts', 'Target', '/challenge', 'specific_users', 'Challenge accounts are under development. Check back soon!', 3),
  ('demo_trading', 'Demo Trading', 'Demo trading environment', 'Gamepad2', '/trading/demo', 'specific_users', 'Demo trading environment is being prepared for launch.', 4);

-- =============================================
-- SECTION 4: Email Templates
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed email templates
INSERT INTO public.email_templates (template_name, subject, body_html, body_text, variables) VALUES
  ('verification_approved', '✅ Your Account Has Been Verified!', 
   '<p>Dear {{user_name}},</p><p>Great news! Your account verification has been successfully approved.</p><p>Your Universal Stock Trade account is now fully verified. You now have access to all trading features and higher transaction limits.</p><p>The verified badge will appear on your profile.</p><p>Thank you for completing the verification process.</p><p>Happy Trading,<br>Universal Stock Trade Team</p>',
   'Dear {{user_name}}, Your account verification has been approved. You now have full access to all features.',
   '["user_name"]'),
  ('verification_rejected', 'ℹ️ Update on Your Account Verification',
   '<p>Dear {{user_name}},</p><p>Thank you for submitting your account verification application.</p><p>After careful review, we were unable to approve your verification at this time.</p><p><strong>Reason:</strong> {{rejection_reason}}</p><p>Your account remains unverified. You may submit a new verification application with corrected documents.</p><p>If you need assistance, please contact our support team.</p><p>Best regards,<br>Universal Stock Trade Team</p>',
   'Dear {{user_name}}, Your verification was not approved. Reason: {{rejection_reason}}. You may reapply.',
   '["user_name", "rejection_reason"]'),
  ('deposit_approved', '✅ Your Deposit Has Been Approved',
   '<p>Dear {{user_name}},</p><p>Your deposit request of ${{amount}} has been approved and credited to your account.</p><p><strong>Transaction Details:</strong></p><ul><li>Amount: ${{amount}}</li><li>Method: {{method}}</li><li>Date/Time: {{timestamp}}</li></ul><p>You can now use these funds for trading.</p><p>Thank you for choosing Universal Stock Trade!</p>',
   'Dear {{user_name}}, Your deposit of ${{amount}} via {{method}} has been approved.',
   '["user_name", "amount", "method", "timestamp"]'),
  ('deposit_declined', 'ℹ️ Update on Your Deposit Request',
   '<p>Dear {{user_name}},</p><p>Regarding your deposit request of ${{amount}} via {{method}}:</p><p><strong>Status:</strong> Not Approved</p><p><strong>Reason:</strong> {{decline_reason}}</p><p>You may submit a new deposit request or contact support.</p><p>Universal Stock Trade Team</p>',
   'Dear {{user_name}}, Your deposit of ${{amount}} was declined. Reason: {{decline_reason}}.',
   '["user_name", "amount", "method", "decline_reason"]');

-- =============================================
-- SECTION 5: Deposit proofs storage bucket
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('deposit-proofs', 'deposit-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload deposit proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own deposit proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all deposit proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-proofs' AND has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- SECTION 6: Trigger for admin notification on verification submission
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_notifications (notification_type, reference_id, reference_table, user_id, message)
  VALUES (
    'verification_request',
    NEW.id,
    'user_verifications',
    NEW.user_id,
    'New account verification application submitted'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admin_on_verification_insert
  AFTER INSERT ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_verification();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON public.user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_feature_flags_feature_name ON public.feature_flags(feature_name);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_user_id ON public.user_feature_access(user_id);
