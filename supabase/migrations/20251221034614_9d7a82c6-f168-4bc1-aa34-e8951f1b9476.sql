-- Create staff permissions table for granular access control
CREATE TABLE public.staff_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.pharmacy_staff(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(staff_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.staff_has_permission(
  _user_id uuid, 
  _permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner and manager always have all permissions
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND is_active = true
    AND role IN ('owner', 'manager')
  )
  OR
  -- Check explicit permission grant for staff
  EXISTS (
    SELECT 1 
    FROM public.staff_permissions sp
    JOIN public.pharmacy_staff ps ON ps.id = sp.staff_id
    WHERE ps.user_id = _user_id
    AND ps.is_active = true
    AND sp.permission_key = _permission_key
    AND sp.is_granted = true
  )
$$;

-- RLS Policies for staff_permissions
CREATE POLICY "Owners and managers can manage permissions"
ON public.staff_permissions
FOR ALL
USING (
  staff_id IN (
    SELECT ps.id FROM public.pharmacy_staff ps
    WHERE ps.pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'manager')
    )
  )
)
WITH CHECK (
  staff_id IN (
    SELECT ps.id FROM public.pharmacy_staff ps
    WHERE ps.pharmacy_id IN (
      SELECT pharmacy_id FROM public.pharmacy_staff
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'manager')
    )
  )
);

CREATE POLICY "Staff can view own permissions"
ON public.staff_permissions
FOR SELECT
USING (
  staff_id IN (
    SELECT id FROM public.pharmacy_staff
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_staff_permissions_updated_at
BEFORE UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();