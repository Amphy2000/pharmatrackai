-- Add metadata JSONB column to medications table for storing extra import data
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add metadata JSONB column to customers table for storing extra import data
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create doctors table for physician directory
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  hospital_clinic TEXT,
  specialty TEXT,
  license_number TEXT,
  address TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on doctors table
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- RLS policies for doctors
CREATE POLICY "Staff can view pharmacy doctors" ON public.doctors
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
      WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.is_active = true
    )
  );

CREATE POLICY "Staff can insert pharmacy doctors" ON public.doctors
  FOR INSERT WITH CHECK (
    pharmacy_id IN (
      SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
      WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.is_active = true
    )
  );

CREATE POLICY "Staff can update pharmacy doctors" ON public.doctors
  FOR UPDATE USING (
    pharmacy_id IN (
      SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
      WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.is_active = true
    )
  );

CREATE POLICY "Managers can delete pharmacy doctors" ON public.doctors
  FOR DELETE USING (
    pharmacy_id IN (
      SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
      WHERE pharmacy_staff.user_id = auth.uid() 
        AND pharmacy_staff.is_active = true 
        AND pharmacy_staff.role IN ('owner', 'manager')
    )
  );

-- Create feature_requests table for admin alerts
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  field_value TEXT,
  entity_type TEXT NOT NULL, -- 'medication', 'customer', 'doctor'
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'implemented', 'dismissed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on feature_requests
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all feature requests
CREATE POLICY "Platform admins can view all feature requests" ON public.feature_requests
  FOR SELECT USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update feature requests" ON public.feature_requests
  FOR UPDATE USING (is_platform_admin(auth.uid()));

-- Staff can create feature requests
CREATE POLICY "Staff can create feature requests" ON public.feature_requests
  FOR INSERT WITH CHECK (
    pharmacy_id IN (
      SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
      WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.is_active = true
    )
  );

-- Staff can view their pharmacy's feature requests
CREATE POLICY "Staff can view pharmacy feature requests" ON public.feature_requests
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff
      WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.is_active = true
    )
  );

-- Create trigger for updated_at on doctors
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on feature_requests
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for metadata search (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_medications_metadata ON public.medications USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_customers_metadata ON public.customers USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_doctors_metadata ON public.doctors USING GIN (metadata);