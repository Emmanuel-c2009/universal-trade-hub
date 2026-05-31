-- SYNC missing profiles/user_balances for EXISTING auth users

-- Create profiles for any auth user who doesn't have one
INSERT INTO public.profiles (id, email, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create balances for any profile that doesn't have one
INSERT INTO public.user_balances (user_id, is_test_account)
SELECT
  p.id,
  CASE WHEN p.email = 'marcosgilbertothiago@gmail.com' THEN true ELSE false END
FROM public.profiles p
LEFT JOIN public.user_balances b ON b.user_id = p.id
WHERE b.id IS NULL;