-- Create referral_partners table for multi-tier referral tracking
CREATE TABLE public.referral_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_code TEXT NOT NULL UNIQUE,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('professional', 'ambassador', 'pharmacy')),
  -- professional = 10% recurring, ambassador = one-time ₦5k, pharmacy = subscription credit
  commission_type TEXT NOT NULL CHECK (commission_type IN ('recurring_percentage', 'one_time_bounty', 'subscription_credit')),
  commission_value NUMERIC NOT NULL DEFAULT 0,
  -- For professional partners (e.g., ACPN chapters)
  organization_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  -- Stats
  total_referrals INTEGER NOT NULL DEFAULT 0,
  successful_signups INTEGER NOT NULL DEFAULT 0,
  total_commission_earned NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_signups table to track individual signups
CREATE TABLE public.referral_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.referral_partners(id) ON DELETE SET NULL,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL,
  signup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'converted', 'cancelled')),
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  commission_amount NUMERIC,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add partner_source column to pharmacies table
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS partner_source TEXT;

-- Enable RLS
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_partners
CREATE POLICY "Platform admins can manage referral partners"
ON public.referral_partners
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Anyone can view active partners"
ON public.referral_partners
FOR SELECT
USING (is_active = true);

-- RLS policies for referral_signups
CREATE POLICY "Platform admins can manage referral signups"
ON public.referral_signups
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Pharmacy owners can view own signup"
ON public.referral_signups
FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Insert some default partner codes for testing
INSERT INTO public.referral_partners (partner_code, partner_name, partner_type, commission_type, commission_value, organization_name)
VALUES 
  ('acpn-kaduna', 'ACPN Kaduna Chapter', 'professional', 'recurring_percentage', 10, 'Association of Community Pharmacists of Nigeria - Kaduna'),
  ('acpn-lagos', 'ACPN Lagos Chapter', 'professional', 'recurring_percentage', 10, 'Association of Community Pharmacists of Nigeria - Lagos'),
  ('acpn-abuja', 'ACPN Abuja Chapter', 'professional', 'recurring_percentage', 10, 'Association of Community Pharmacists of Nigeria - Abuja');

-- Create trigger for updated_at
CREATE TRIGGER update_referral_partners_updated_at
  BEFORE UPDATE ON public.referral_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();