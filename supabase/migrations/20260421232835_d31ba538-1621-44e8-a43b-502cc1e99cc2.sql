
ALTER TABLE public.user_verifications
  ADD COLUMN IF NOT EXISTS id_document_back_path TEXT,
  ADD COLUMN IF NOT EXISTS personal_info JSONB;

INSERT INTO public.email_templates (template_name, subject, body_html, variables)
VALUES (
  'verification_under_review',
  'Verification Under Review - Universal Stock Trade',
  $HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden;"><div style="background-color: #f59e0b; padding: 20px; text-align: center;"><h1 style="color: white; margin: 0;">Universal Stock Trade</h1></div><div style="padding: 30px;"><h2>Hello {{user_name}},</h2><p>Thank you for submitting your verification documents.</p><div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;"><p><strong>Status: Under Review</strong></p><p>Your verification request has been received and is being reviewed by our team. This typically takes 24-48 hours.</p></div><p>You will receive another email once the review is complete.</p><a href="https://universalstocktrade.com/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></div><div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;"><p>© 2024 Universal Stock Trade. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></div></body></html>$HTML$,
  '["user_name"]'::jsonb
)
ON CONFLICT (template_name) DO UPDATE
  SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, variables = EXCLUDED.variables, updated_at = now();

INSERT INTO public.email_templates (template_name, subject, body_html, variables)
VALUES (
  'verification_approved',
  'Verification Approved - Universal Stock Trade',
  $HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden;"><div style="background-color: #10b981; padding: 20px; text-align: center;"><h1 style="color: white; margin: 0;">Universal Stock Trade</h1></div><div style="padding: 30px;"><h2>Congratulations {{user_name}}!</h2><p>We are pleased to inform you that your account verification has been <strong>approved</strong>.</p><div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;"><p><strong>Status: Verified ✓</strong></p><p>Your identity has been successfully verified. You now have full access to all platform features.</p></div><p>You can now deposit, withdraw, and access all trading features.</p><a href="https://universalstocktrade.com/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px;">Start Trading</a></div><div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;"><p>© 2024 Universal Stock Trade. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></div></body></html>$HTML$,
  '["user_name"]'::jsonb
)
ON CONFLICT (template_name) DO UPDATE
  SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, variables = EXCLUDED.variables, updated_at = now();

INSERT INTO public.email_templates (template_name, subject, body_html, variables)
VALUES (
  'verification_rejected',
  'Verification Failed - Universal Stock Trade',
  $HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden;"><div style="background-color: #ef4444; padding: 20px; text-align: center;"><h1 style="color: white; margin: 0;">Universal Stock Trade</h1></div><div style="padding: 30px;"><h2>Dear {{user_name}},</h2><p>We regret to inform you that your account verification could not be completed at this time.</p><div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;"><p><strong>Status: Verification Failed ✗</strong></p><p><strong>Reason:</strong> {{rejection_reason}}</p></div><p>Please ensure your documents are clear and legible, then submit a new request.</p><a href="https://universalstocktrade.com/verification" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px;">Submit New Request</a></div><div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;"><p>© 2024 Universal Stock Trade. All rights reserved.</p><p>This is an automated message, please do not reply.</p></div></div></body></html>$HTML$,
  '["user_name", "rejection_reason"]'::jsonb
)
ON CONFLICT (template_name) DO UPDATE
  SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, variables = EXCLUDED.variables, updated_at = now();
