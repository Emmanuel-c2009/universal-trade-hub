-- =====================================================
-- 1. ASSIGN ADMIN ROLE TO SUPER ADMIN USER
-- =====================================================
INSERT INTO public.user_roles (user_id, role)
VALUES ('9a578ca8-3e16-4107-8dde-1415044f7095', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- 2. CRYPTO PAYMENT DETAILS TABLE (Admin-managed)
-- =====================================================
CREATE TABLE public.crypto_payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_name TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  network TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crypto_payment_details ENABLE ROW LEVEL SECURITY;

-- Everyone can read active payment details
CREATE POLICY "Anyone can view active crypto payment details"
ON public.crypto_payment_details FOR SELECT
USING (is_active = true);

-- Only admins can manage payment details
CREATE POLICY "Admins can manage crypto payment details"
ON public.crypto_payment_details FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. INVESTMENT PLANS TABLE
-- =====================================================
CREATE TABLE public.investment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  upgrade_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  capital_min DECIMAL(15,2) NOT NULL DEFAULT 0,
  capital_max DECIMAL(15,2),
  features JSONB DEFAULT '[]'::jsonb,
  limitations JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active investment plans"
ON public.investment_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage investment plans"
ON public.investment_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. USER INVESTMENT SUBSCRIPTIONS
-- =====================================================
CREATE TABLE public.user_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_upgrade', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own investment"
ON public.user_investments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all investments"
ON public.user_investments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. INVESTMENT UPGRADE REQUESTS
-- =====================================================
CREATE TABLE public.investment_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_plan_id UUID REFERENCES public.investment_plans(id),
  target_plan_id UUID NOT NULL REFERENCES public.investment_plans(id),
  payment_proof_url TEXT,
  payment_crypto TEXT,
  payment_amount DECIMAL(15,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.investment_upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and create their own upgrade requests"
ON public.investment_upgrade_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create upgrade requests"
ON public.investment_upgrade_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all upgrade requests"
ON public.investment_upgrade_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. CARD TYPES TABLE
-- =====================================================
CREATE TABLE public.card_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  color_theme TEXT DEFAULT 'blue',
  daily_atm_limit DECIMAL(10,2) DEFAULT 300,
  monthly_limit DECIMAL(10,2) DEFAULT 2000,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.card_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active card types"
ON public.card_types FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage card types"
ON public.card_types FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 7. CARD APPLICATIONS TABLE
-- =====================================================
CREATE TABLE public.card_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_type_id UUID NOT NULL REFERENCES public.card_types(id),
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'assigned')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.card_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card applications"
ON public.card_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create card applications"
ON public.card_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all card applications"
ON public.card_applications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 8. USER CARDS TABLE (Assigned cards)
-- =====================================================
CREATE TABLE public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.card_applications(id),
  card_type_id UUID NOT NULL REFERENCES public.card_types(id),
  card_number TEXT NOT NULL,
  card_holder TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  cvv TEXT NOT NULL,
  card_network TEXT DEFAULT 'visa' CHECK (card_network IN ('visa', 'mastercard')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'expired')),
  daily_limit DECIMAL(10,2),
  monthly_limit DECIMAL(10,2),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
ON public.user_cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all cards"
ON public.user_cards FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 9. CARD TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE public.card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.user_cards(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'atm_withdrawal', 'online_payment', 'refund')),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  merchant TEXT,
  location TEXT,
  status TEXT DEFAULT 'successful' CHECK (status IN ('successful', 'declined', 'pending')),
  admin_created BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card transactions"
ON public.card_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all card transactions"
ON public.card_transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 10. CONVERSATIONS TABLE (Message Center)
-- =====================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_user INTEGER DEFAULT 0,
  unread_admin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own conversation"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can update conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all conversations"
ON public.conversations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 11. MESSAGES TABLE
-- =====================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'pdf', 'file')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_read BOOLEAN DEFAULT false,
  deleted_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 12. SEED DEFAULT DATA
-- =====================================================

-- Default card types
INSERT INTO public.card_types (name, slug, fee, color_theme, daily_atm_limit, monthly_limit, features) VALUES
('Easy Money Card', 'easy-money', 40.99, 'blue', 300, 2000, '["Domestic use only", "$300 daily ATM limit", "$2,000 monthly limit", "1% cashback on streaming"]'::jsonb),
('Gold Plus Card', 'gold-plus', 99.99, 'gold', 1000, 10000, '["International use", "$1,000 daily ATM limit", "$10,000 monthly limit", "2% cashback on all purchases", "Travel insurance included"]'::jsonb),
('Global Plus Card', 'global-plus', 199.99, 'black', 5000, 50000, '["Unlimited international use", "$5,000 daily ATM limit", "$50,000 monthly limit", "3% cashback on all purchases", "Premium travel insurance", "Airport lounge access", "Concierge service"]'::jsonb);

-- Default investment plans
INSERT INTO public.investment_plans (tier, name, upgrade_fee, capital_min, capital_max, features, limitations) VALUES
(1, 'Foundation Investor Plan', 75, 0, 5000, '["MT5 Trading with 30+ forex pairs", "Basic crypto trading (BTC, ETH, 3 majors)", "Standard spreads", "Email support"]'::jsonb, '["Limited to 3 active positions", "No AI bot access", "Standard withdrawal times"]'::jsonb),
(2, 'Growth Investor Plan', 150, 5000, 25000, '["All Foundation features", "Extended crypto access (15+ coins)", "Reduced spreads", "Copy trading access", "Priority support"]'::jsonb, '["Limited to 10 active positions", "Basic AI bot access"]'::jsonb),
(3, 'Premium Investor Plan', 350, 25000, 100000, '["All Growth features", "Full crypto access", "Premium spreads", "Advanced AI bots", "Dedicated account manager"]'::jsonb, '["Limited to 25 active positions"]'::jsonb),
(4, 'Elite Investor Plan', 750, 100000, 500000, '["All Premium features", "Unlimited positions", "VIP spreads", "Custom AI strategies", "24/7 phone support"]'::jsonb, '[]'::jsonb),
(5, 'Institutional Plan', 1500, 500000, NULL, '["All Elite features", "Institutional-grade tools", "API access", "Custom reporting", "White-glove service"]'::jsonb, '[]'::jsonb);

-- Seed default crypto payment details
INSERT INTO public.crypto_payment_details (crypto_name, crypto_symbol, network, wallet_address, is_active, display_order) VALUES
('Tether', 'USDT', 'TRC20', 'TVf97ig5f3FnJ6T4z1i3ynxtjhwLXy4XoA', true, 1),
('Bitcoin', 'BTC', 'Bitcoin', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', true, 2),
('Litecoin', 'LTC', 'Litecoin', 'ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', true, 3);

-- Add triggers for updated_at
CREATE TRIGGER update_crypto_payment_details_updated_at
BEFORE UPDATE ON public.crypto_payment_details
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_investment_plans_updated_at
BEFORE UPDATE ON public.investment_plans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_investments_updated_at
BEFORE UPDATE ON public.user_investments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_investment_upgrade_requests_updated_at
BEFORE UPDATE ON public.investment_upgrade_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_card_types_updated_at
BEFORE UPDATE ON public.card_types
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_card_applications_updated_at
BEFORE UPDATE ON public.card_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_cards_updated_at
BEFORE UPDATE ON public.user_cards
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_applications;