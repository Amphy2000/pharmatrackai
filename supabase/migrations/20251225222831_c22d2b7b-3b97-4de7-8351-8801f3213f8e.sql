-- First, drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Managers can view branch staff" ON public.pharmacy_staff;
DROP POLICY IF EXISTS "Managers can update branch staff" ON public.pharmacy_staff;

-- Create a SECURITY DEFINER function to check if a user is a manager for a pharmacy
CREATE OR REPLACE FUNCTION public.is_manager_for_pharmacy(_user_id uuid, _pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND pharmacy_id = _pharmacy_id
    AND is_active = true
    AND role = 'manager'
  )
$$;

-- Create a SECURITY DEFINER function to get a manager's branch_id
CREATE OR REPLACE FUNCTION public.get_manager_branch_id(_user_id uuid, _pharmacy_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT branch_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  AND pharmacy_id = _pharmacy_id
  AND is_active = true
  AND role = 'manager'
  LIMIT 1
$$;

-- Now recreate the policies using the SECURITY DEFINER functions
CREATE POLICY "Managers can view branch staff"
ON public.pharmacy_staff
FOR SELECT
USING (
  -- User is a manager in the same pharmacy and staff is in their branch
  public.is_manager_for_pharmacy(auth.uid(), pharmacy_id)
  AND (
    branch_id = public.get_manager_branch_id(auth.uid(), pharmacy_id)
    OR user_id = auth.uid() -- Can always see themselves
  )
);

CREATE POLICY "Managers can update branch staff"
ON public.pharmacy_staff
FOR UPDATE
USING (
  -- Target must be 'staff' role (managers can't update other managers or owners)
  role = 'staff'
  AND public.is_manager_for_pharmacy(auth.uid(), pharmacy_id)
  AND branch_id = public.get_manager_branch_id(auth.uid(), pharmacy_id)
)
WITH CHECK (
  -- Can only update to 'staff' role (prevent privilege escalation)
  role = 'staff'
  AND public.is_manager_for_pharmacy(auth.uid(), pharmacy_id)
  AND branch_id = public.get_manager_branch_id(auth.uid(), pharmacy_id)
);