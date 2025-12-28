-- Add is_public column to medications table for marketplace visibility
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Create index for efficient public medication queries
CREATE INDEX IF NOT EXISTS idx_medications_public_stock ON public.medications (is_public, current_stock) WHERE is_public = true AND current_stock > 0;

-- Create marketplace_views table for tracking store/product views
CREATE TABLE public.marketplace_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
  viewer_ip text,
  viewed_at timestamp with time zone DEFAULT now(),
  search_query text
);

-- Create whatsapp_leads table for tracking WhatsApp order clicks
CREATE TABLE public.whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  quantity integer DEFAULT 1,
  clicked_at timestamp with time zone DEFAULT now(),
  viewer_ip text
);

-- Create marketplace_searches table for tracking search queries
CREATE TABLE public.marketplace_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query text NOT NULL,
  results_count integer DEFAULT 0,
  location_filter text,
  searched_at timestamp with time zone DEFAULT now(),
  viewer_ip text
);

-- Enable RLS on new tables
ALTER TABLE public.marketplace_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_searches ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketplace_views
-- Public can insert views (anonymous tracking)
CREATE POLICY "Anyone can insert marketplace views"
ON public.marketplace_views
FOR INSERT
WITH CHECK (true);

-- Owners/managers can view their pharmacy's views
CREATE POLICY "Owners can view their pharmacy views"
ON public.marketplace_views
FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- RLS policies for whatsapp_leads
-- Public can insert leads (anonymous tracking)
CREATE POLICY "Anyone can insert whatsapp leads"
ON public.whatsapp_leads
FOR INSERT
WITH CHECK (true);

-- Owners/managers can view their pharmacy's leads
CREATE POLICY "Owners can view their pharmacy leads"
ON public.whatsapp_leads
FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- RLS policies for marketplace_searches
-- Public can insert searches (anonymous tracking)
CREATE POLICY "Anyone can insert marketplace searches"
ON public.marketplace_searches
FOR INSERT
WITH CHECK (true);

-- Platform admins can view all searches for analytics
CREATE POLICY "Platform admins can view all searches"
ON public.marketplace_searches
FOR SELECT
USING (check_is_platform_admin(auth.uid()));

-- Create a view for public medication search (no auth required)
CREATE OR REPLACE VIEW public.public_medications AS
SELECT 
  m.id,
  m.name,
  m.category,
  m.current_stock,
  m.selling_price,
  m.dispensing_unit,
  m.pharmacy_id,
  p.name as pharmacy_name,
  p.phone as pharmacy_phone,
  p.address as pharmacy_address
FROM public.medications m
JOIN public.pharmacies p ON p.id = m.pharmacy_id
WHERE m.is_public = true 
  AND m.current_stock > 0 
  AND m.is_shelved = true
  AND p.subscription_status IN ('active', 'trial');