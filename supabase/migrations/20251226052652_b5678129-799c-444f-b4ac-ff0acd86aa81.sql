-- Add active_branches_limit column to pharmacies table
-- Default is 1 (main branch only), Pro plan gets more based on payment
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS active_branches_limit integer NOT NULL DEFAULT 1;

-- Add branch_fee_per_month for tracking the per-branch cost
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS branch_fee_per_month numeric NOT NULL DEFAULT 15000;

-- Create a function to check if a branch is within the paid limit
CREATE OR REPLACE FUNCTION public.is_branch_within_limit(_branch_id uuid, _pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*)::integer 
    FROM public.branches 
    WHERE pharmacy_id = _pharmacy_id 
    AND is_active = true 
    AND created_at <= (
      SELECT created_at FROM public.branches WHERE id = _branch_id
    )
  ) <= (
    SELECT active_branches_limit 
    FROM public.pharmacies 
    WHERE id = _pharmacy_id
  )
$$;