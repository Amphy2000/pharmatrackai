-- Add shelving status to medications for unshelve/reshelve tracking
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS is_shelved boolean NOT NULL DEFAULT true;

-- Add shelving history table for audit trail
CREATE TABLE IF NOT EXISTS public.shelving_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('shelved', 'unshelved')),
  reason text,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on shelving_history
ALTER TABLE public.shelving_history ENABLE ROW LEVEL SECURITY;

-- Staff can view shelving history for their pharmacy
CREATE POLICY "Staff can view pharmacy shelving history" 
ON public.shelving_history 
FOR SELECT 
USING (pharmacy_id IN (
  SELECT pharmacy_staff.pharmacy_id
  FROM pharmacy_staff
  WHERE pharmacy_staff.user_id = auth.uid() 
  AND pharmacy_staff.is_active = true
));

-- Staff can insert shelving history
CREATE POLICY "Staff can insert shelving history" 
ON public.shelving_history 
FOR INSERT 
WITH CHECK (pharmacy_id IN (
  SELECT pharmacy_staff.pharmacy_id
  FROM pharmacy_staff
  WHERE pharmacy_staff.user_id = auth.uid() 
  AND pharmacy_staff.is_active = true
));