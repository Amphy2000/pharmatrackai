-- Fix: Restrict audit log viewing to owners and managers only
-- This prevents regular staff from seeing audit logs which could aid attack planning

-- First, drop the existing policy
DROP POLICY IF EXISTS "Staff can view pharmacy logs" ON audit_logs;

-- Create new restrictive policy for viewing - only owners and managers
CREATE POLICY "Only managers can view audit logs"
ON audit_logs FOR SELECT
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_staff
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'manager')
  )
);

-- Also ensure audit logs are append-only by explicitly denying UPDATE and DELETE
-- Note: Currently audit_logs already blocks INSERT, UPDATE, DELETE for users
-- But let's explicitly add a deny policy for DELETE to make it clear
CREATE POLICY "Audit logs cannot be deleted"
ON audit_logs FOR DELETE
USING (false);

CREATE POLICY "Audit logs cannot be updated"  
ON audit_logs FOR UPDATE
USING (false);