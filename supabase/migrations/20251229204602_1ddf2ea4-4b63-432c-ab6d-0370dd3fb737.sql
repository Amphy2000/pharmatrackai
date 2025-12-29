-- Add marketplace contact phone for customer-facing communication
-- This separates the customer contact from the owner alert phone

ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS marketplace_contact_phone TEXT;

-- Update the get_public_medications function to return marketplace_contact_phone
DROP FUNCTION IF EXISTS public.get_public_medications(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_public_medications(
  search_term TEXT DEFAULT NULL,
  location_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  current_stock INTEGER,
  selling_price NUMERIC,
  dispensing_unit TEXT,
  pharmacy_id UUID,
  pharmacy_name TEXT,
  pharmacy_phone TEXT,
  pharmacy_address TEXT,
  is_featured BOOLEAN,
  marketplace_contact_phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    m.selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    -- Use marketplace_contact_phone if set, otherwise fall back to regular phone
    COALESCE(p.marketplace_contact_phone, p.phone) as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    p.marketplace_contact_phone
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_public = true 
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (
      search_term IS NULL 
      OR m.name ILIKE '%' || search_term || '%' 
      OR m.category ILIKE '%' || search_term || '%'
      OR similarity(m.name, search_term) > 0.3
    )
    AND (location_filter IS NULL OR p.address ILIKE '%' || location_filter || '%')
  ORDER BY 
    CASE WHEN m.name ILIKE '%' || COALESCE(search_term, '') || '%' THEN 0 ELSE 1 END,
    m.is_featured DESC,
    similarity(m.name, COALESCE(search_term, '')) DESC,
    m.name;
$$;

-- Update get_featured_medications to also use marketplace_contact_phone
DROP FUNCTION IF EXISTS public.get_featured_medications();

CREATE OR REPLACE FUNCTION public.get_featured_medications()
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  current_stock INTEGER,
  selling_price NUMERIC,
  dispensing_unit TEXT,
  pharmacy_id UUID,
  pharmacy_name TEXT,
  pharmacy_phone TEXT,
  pharmacy_address TEXT,
  is_featured BOOLEAN,
  featured_until TIMESTAMPTZ,
  marketplace_contact_phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    m.selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    COALESCE(p.marketplace_contact_phone, p.phone) as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    m.featured_until,
    p.marketplace_contact_phone
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_public = true 
    AND m.is_featured = true
    AND m.current_stock > 0
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (m.featured_until IS NULL OR m.featured_until > now())
  ORDER BY m.featured_until DESC NULLS LAST, m.name;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_medications TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_featured_medications TO anon, authenticated;