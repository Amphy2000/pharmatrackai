-- Create staff_shifts table for tracking shift clock-in/out
CREATE TABLE public.staff_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.pharmacy_staff(id) ON DELETE CASCADE,
  clock_in timestamp with time zone NOT NULL DEFAULT now(),
  clock_out timestamp with time zone,
  total_sales numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- Staff can view their own shifts
CREATE POLICY "Staff can view own shifts"
ON public.staff_shifts
FOR SELECT
USING (
  staff_id IN (
    SELECT id FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Managers can view all pharmacy shifts
CREATE POLICY "Managers can view all shifts"
ON public.staff_shifts
FOR SELECT
USING (
  pharmacy_id IN (
    SELECT pharmacy_id FROM public.pharmacy_staff
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('owner', 'manager')
  )
);

-- Staff can clock in (insert)
CREATE POLICY "Staff can clock in"
ON public.staff_shifts
FOR INSERT
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Staff can clock out (update their own shifts)
CREATE POLICY "Staff can update own shifts"
ON public.staff_shifts
FOR UPDATE
USING (
  staff_id IN (
    SELECT id FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Add shift_id to sales table
ALTER TABLE public.sales ADD COLUMN shift_id uuid REFERENCES public.staff_shifts(id);

-- Create index for performance
CREATE INDEX idx_staff_shifts_staff_id ON public.staff_shifts(staff_id);
CREATE INDEX idx_staff_shifts_pharmacy_id ON public.staff_shifts(pharmacy_id);
CREATE INDEX idx_staff_shifts_clock_in ON public.staff_shifts(clock_in);
CREATE INDEX idx_sales_shift_id ON public.sales(shift_id);

-- Create updated_at trigger for staff_shifts
CREATE TRIGGER update_staff_shifts_updated_at
BEFORE UPDATE ON public.staff_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();