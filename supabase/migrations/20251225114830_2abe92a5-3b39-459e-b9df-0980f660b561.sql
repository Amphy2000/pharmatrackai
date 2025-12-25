-- Add branch_id to pharmacy_staff for staff-branch assignment
-- NULL means staff can access all branches (for owners/managers)
ALTER TABLE public.pharmacy_staff 
ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_pharmacy_staff_branch_id ON public.pharmacy_staff(branch_id);

-- Create helper function to check if user is assigned to a specific branch
CREATE OR REPLACE FUNCTION public.staff_assigned_to_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND is_active = true
    AND (
      branch_id IS NULL  -- Owners/managers with no branch restriction
      OR branch_id = _branch_id  -- Staff assigned to specific branch
      OR role IN ('owner', 'manager')  -- Owners/managers always have access
    )
  )
$$;