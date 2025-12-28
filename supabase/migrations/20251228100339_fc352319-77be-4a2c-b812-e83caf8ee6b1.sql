-- Create a secure function to get featured medications for marketplace
CREATE OR REPLACE FUNCTION public.get_featured_medications()
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  current_stock integer,
  selling_price numeric,
  dispensing_unit text,
  pharmacy_id uuid,
  pharmacy_name text,
  pharmacy_phone text,
  pharmacy_address text,
  is_featured boolean,
  featured_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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
    p.phone as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    m.featured_until
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_public = true 
    AND m.is_featured = true
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (m.featured_until IS NULL OR m.featured_until > now())
  ORDER BY m.featured_until DESC NULLS LAST
  LIMIT 20;
$$;