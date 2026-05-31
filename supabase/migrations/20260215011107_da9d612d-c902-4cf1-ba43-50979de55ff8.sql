
-- Add missing columns to user_verifications
ALTER TABLE public.user_verifications 
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id);

-- Create user_verification_status table
CREATE TABLE IF NOT EXISTS public.user_verification_status (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_verified boolean NOT NULL DEFAULT false,
  verification_badge boolean NOT NULL DEFAULT false,
  rejection_reason text,
  reapplication_allowed boolean NOT NULL DEFAULT true,
  last_application_id uuid REFERENCES public.user_verifications(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_verification_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification status"
  ON public.user_verification_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage verification status"
  ON public.user_verification_status FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing verified users
INSERT INTO public.user_verification_status (user_id, is_verified, verification_badge)
SELECT id, true, true FROM public.profiles WHERE profile_status = 'verified'
ON CONFLICT (user_id) DO NOTHING;

-- Also create verification records for existing verified users that don't have one
INSERT INTO public.user_verifications (user_id, status, reviewed_at)
SELECT id, 'approved', now() FROM public.profiles 
WHERE profile_status = 'verified' 
AND id NOT IN (SELECT user_id FROM public.user_verifications)
ON CONFLICT DO NOTHING;

-- Add admin read policy for verification-documents storage
CREATE POLICY "Admins can view all verification documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-documents' AND has_role(auth.uid(), 'admin'::app_role));
