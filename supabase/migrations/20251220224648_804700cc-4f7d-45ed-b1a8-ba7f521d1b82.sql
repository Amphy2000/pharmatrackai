-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'pro', 'enterprise');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');

-- Create user role enum for pharmacy staff
CREATE TYPE public.pharmacy_role AS ENUM ('owner', 'manager', 'staff');

-- Create pharmacies table (tenants)
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  license_number TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_plan subscription_plan NOT NULL DEFAULT 'starter',
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  max_users INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create pharmacy staff table (multi-user support)
CREATE TABLE public.pharmacy_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role pharmacy_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(pharmacy_id, user_id)
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Update medications table to be multi-tenant
ALTER TABLE public.medications ADD COLUMN pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.medications ADD COLUMN supplier TEXT;
ALTER TABLE public.medications ADD COLUMN min_stock_alert INTEGER DEFAULT 10;
ALTER TABLE public.medications ADD COLUMN selling_price NUMERIC;
ALTER TABLE public.medications ADD COLUMN location TEXT;

-- Create sales table for tracking sales (for AI predictions)
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  sold_by UUID REFERENCES auth.users(id),
  customer_name TEXT,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create AI predictions table
CREATE TABLE public.ai_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'demand', 'reorder', 'expiry_alert'
  prediction_data JSONB NOT NULL,
  confidence_score NUMERIC,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_actioned BOOLEAN DEFAULT false
);

-- Create subscription payments table
CREATE TABLE public.subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  paystack_reference TEXT,
  paystack_transaction_id TEXT,
  plan subscription_plan NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create audit log for important actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old public policies on medications
DROP POLICY IF EXISTS "Allow public read access" ON public.medications;
DROP POLICY IF EXISTS "Allow public insert access" ON public.medications;
DROP POLICY IF EXISTS "Allow public update access" ON public.medications;
DROP POLICY IF EXISTS "Allow public delete access" ON public.medications;

-- Helper function to get user's pharmacy
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pharmacy_id FROM public.pharmacy_staff 
  WHERE user_id = user_uuid AND is_active = true
  LIMIT 1
$$;

-- Helper function to check if user has role in pharmacy
CREATE OR REPLACE FUNCTION public.has_pharmacy_role(user_uuid UUID, required_role pharmacy_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = user_uuid 
    AND is_active = true
    AND (role = required_role OR role = 'owner')
  )
$$;

-- Pharmacies policies
CREATE POLICY "Users can view their pharmacy" ON public.pharmacies
  FOR SELECT USING (
    id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Owners can update their pharmacy" ON public.pharmacies
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create pharmacy" ON public.pharmacies
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Pharmacy staff policies
CREATE POLICY "Staff can view their pharmacy members" ON public.pharmacy_staff
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Owners can manage staff" ON public.pharmacy_staff
  FOR ALL USING (
    pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
  );

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Medications policies (multi-tenant)
CREATE POLICY "Staff can view pharmacy medications" ON public.medications
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
    OR pharmacy_id IS NULL -- Keep backward compatibility
  );

CREATE POLICY "Staff can insert pharmacy medications" ON public.medications
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can update pharmacy medications" ON public.medications
  FOR UPDATE USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Managers can delete pharmacy medications" ON public.medications
  FOR DELETE USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff 
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager')
    )
  );

-- Sales policies
CREATE POLICY "Staff can view pharmacy sales" ON public.sales
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can create sales" ON public.sales
  FOR INSERT WITH CHECK (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

-- AI predictions policies
CREATE POLICY "Staff can view pharmacy predictions" ON public.ai_predictions
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "System can insert predictions" ON public.ai_predictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update predictions" ON public.ai_predictions
  FOR UPDATE USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

-- Subscription payments policies
CREATE POLICY "Owners can view payments" ON public.subscription_payments
  FOR SELECT USING (
    pharmacy_id IN (SELECT id FROM public.pharmacies WHERE owner_id = auth.uid())
  );

-- Audit logs policies
CREATE POLICY "Staff can view pharmacy logs" ON public.audit_logs
  FOR SELECT USING (
    pharmacy_id IN (SELECT pharmacy_id FROM public.pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)
  );

-- Triggers for updated_at
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_staff_updated_at BEFORE UPDATE ON public.pharmacy_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();