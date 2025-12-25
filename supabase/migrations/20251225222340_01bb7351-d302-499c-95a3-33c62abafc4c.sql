-- Add policy for managers to view staff in their branch
CREATE POLICY "Managers can view branch staff"
ON public.pharmacy_staff
FOR SELECT
USING (
  -- User is a manager in the same pharmacy
  EXISTS (
    SELECT 1 FROM public.pharmacy_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.role = 'manager'
    AND ps.pharmacy_id = pharmacy_staff.pharmacy_id
    -- Manager can only see staff assigned to their branch
    AND (
      pharmacy_staff.branch_id = ps.branch_id
      OR pharmacy_staff.user_id = auth.uid() -- Can always see themselves
    )
  )
);

-- Add policy for managers to update staff in their branch (only staff role, not managers/owners)
CREATE POLICY "Managers can update branch staff"
ON public.pharmacy_staff
FOR UPDATE
USING (
  -- Target must be 'staff' role (managers can't update other managers or owners)
  role = 'staff'
  AND EXISTS (
    SELECT 1 FROM public.pharmacy_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.role = 'manager'
    AND ps.pharmacy_id = pharmacy_staff.pharmacy_id
    AND pharmacy_staff.branch_id = ps.branch_id
  )
)
WITH CHECK (
  -- Can only update to 'staff' role (prevent privilege escalation)
  role = 'staff'
  AND EXISTS (
    SELECT 1 FROM public.pharmacy_staff ps
    WHERE ps.user_id = auth.uid()
    AND ps.is_active = true
    AND ps.role = 'manager'
    AND ps.pharmacy_id = pharmacy_staff.pharmacy_id
    AND pharmacy_staff.branch_id = ps.branch_id
  )
);