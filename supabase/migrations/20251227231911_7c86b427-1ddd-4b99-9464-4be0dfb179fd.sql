-- Fix infinite recursion in platform_admins RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can manage admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Super admins can view all admins" ON public.platform_admins;

-- Create a helper function that bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_is_platform_admin(_user_id uuid)
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

CREATE OR REPLACE FUNCTION public.check_is_super_admin(_user_id uuid)
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

-- Recreate policies using the security definer functions
CREATE POLICY "Super admins can view all admins"
ON public.platform_admins
FOR SELECT
USING (public.check_is_platform_admin(auth.uid()));

CREATE POLICY "Super admins can manage admins"
ON public.platform_admins
FOR ALL
USING (public.check_is_super_admin(auth.uid()))
WITH CHECK (public.check_is_super_admin(auth.uid()));