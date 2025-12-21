-- Create platform admin role enum
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'support');

-- Create platform admins table (separate from pharmacy staff)
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role platform_role NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can view other admins
CREATE POLICY "Super admins can view all admins"
ON public.platform_admins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid()
  )
);

-- Only super admins can manage admins
CREATE POLICY "Super admins can manage admins"
ON public.platform_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.role = 'super_admin'
  )
);

-- Create function to check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

-- Create function to check if user is super admin specifically
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Add RLS policy for profiles to allow pharmacy colleagues to view each other
CREATE POLICY "Pharmacy staff can view colleague profiles"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT ps.user_id FROM public.pharmacy_staff ps
    WHERE ps.pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Add RLS policy for platform admins to view all profiles
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_platform_admin(auth.uid())
);

-- Add RLS policy for platform admins to view all pharmacies
CREATE POLICY "Platform admins can view all pharmacies"
ON public.pharmacies
FOR SELECT
USING (
  public.is_platform_admin(auth.uid())
);

-- Add RLS policy for platform admins to update pharmacies (subscription status etc)
CREATE POLICY "Platform admins can update all pharmacies"
ON public.pharmacies
FOR UPDATE
USING (
  public.is_platform_admin(auth.uid())
);

-- Add RLS policy for platform admins to manage custom features
CREATE POLICY "Platform admins can manage all custom features"
ON public.pharmacy_custom_features
FOR ALL
USING (
  public.is_platform_admin(auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_platform_admins_updated_at
BEFORE UPDATE ON public.platform_admins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the dev user as super admin (will be done by checking email)
-- We'll handle this in edge function since we need to lookup user by email