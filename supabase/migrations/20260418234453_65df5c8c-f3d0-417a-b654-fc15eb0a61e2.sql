
-- 1. Add missing columns admin_notifications (badge component expects these)
ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS notification_type TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS reference_table TEXT;

-- Backfill notification_type from old "type" column
UPDATE public.admin_notifications SET notification_type = type WHERE notification_type IS NULL;

-- 2. Card deposit pre-submit anti-fraud timer
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS submission_locked_until TIMESTAMPTZ;

-- 3. Trigger function: when a verification is submitted, notify admin + user
CREATE OR REPLACE FUNCTION public.notify_on_verification_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email, 'User'), email
    INTO v_user_name, v_user_email
  FROM public.profiles WHERE id = NEW.user_id;

  -- Admin notification
  INSERT INTO public.admin_notifications (
    type, notification_type, title, message, link,
    user_id, reference_id, reference_table
  ) VALUES (
    'verification', 'verification_submitted',
    'New Verification Application',
    COALESCE(v_user_name, 'A user') || ' submitted documents for review',
    '/admin/verifications',
    NEW.user_id, NEW.id, 'user_verifications'
  );

  -- User confirmation
  INSERT INTO public.user_notifications (
    user_id, notification_type, title, message, reference_id, reference_table
  ) VALUES (
    NEW.user_id, 'verification_submitted',
    'Verification Submitted',
    'Your documents are under review. We''ll notify you within 24-48 hours.',
    NEW.id, 'user_verifications'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verification_submitted ON public.user_verifications;
CREATE TRIGGER trg_verification_submitted
  AFTER INSERT ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_verification_submitted();

-- 4. Trigger function: when a deposit is submitted, notify admin + user
CREATE OR REPLACE FUNCTION public.notify_on_deposit_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, email, 'User')
    INTO v_user_name
  FROM public.profiles WHERE id = NEW.user_id;

  -- Admin notification
  INSERT INTO public.admin_notifications (
    type, notification_type, title, message, link,
    user_id, reference_id, reference_table
  ) VALUES (
    'deposit', 'deposit_submitted',
    'New ' || INITCAP(NEW.deposit_method) || ' Deposit',
    COALESCE(v_user_name, 'A user') || ' submitted a ' || NEW.deposit_method ||
      ' deposit of ' || NEW.currency || ' ' || NEW.amount::text,
    '/admin/deposits',
    NEW.user_id, NEW.id, 'deposits'
  );

  -- User confirmation
  INSERT INTO public.user_notifications (
    user_id, notification_type, title, message, reference_id, reference_table
  ) VALUES (
    NEW.user_id, 'deposit_submitted',
    'Deposit Request Received',
    'Your ' || NEW.deposit_method || ' deposit of ' || NEW.currency || ' ' ||
      NEW.amount::text || ' is awaiting admin review.',
    NEW.id, 'deposits'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deposit_submitted ON public.deposits;
CREATE TRIGGER trg_deposit_submitted
  AFTER INSERT ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_deposit_submitted();

-- 5. Welcome email template
INSERT INTO public.email_templates (template_name, subject, body_html, variables)
VALUES (
  'welcome',
  'Welcome to Universal Stock Trade, {{user_name}}! 🎉',
  '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a8a 0%,#d4af37 100%);padding:40px 30px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:28px;">Welcome to Universal Stock Trade</h1>
      </div>
      <div style="padding:30px;color:#333333;line-height:1.6;">
        <h2 style="color:#1e3a8a;">Hello {{user_name}},</h2>
        <p>Your account is verified and ready. You now have full access to:</p>
        <ul>
          <li><strong>Trading</strong> — Quick Trade, Metal Trader (MT5), Forex & Crypto markets</li>
          <li><strong>Copy Trading</strong> — Follow expert traders automatically</li>
          <li><strong>AI Bots</strong> — Subscribe to algorithmic trading strategies</li>
          <li><strong>Portfolio</strong> — Track all your assets in one place</li>
        </ul>
        <p style="text-align:center;margin:30px 0;">
          <a href="https://universalstocktrade.com/dashboard" style="background:#d4af37;color:#000;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Go to Dashboard</a>
        </p>
        <p>Need help? Reach our team anytime via the in-app chat.</p>
        <p style="color:#888;font-size:12px;margin-top:30px;">— The Universal Stock Trade Team</p>
      </div>
    </div></body></html>',
  '["user_name"]'::jsonb
)
ON CONFLICT (template_name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html;
