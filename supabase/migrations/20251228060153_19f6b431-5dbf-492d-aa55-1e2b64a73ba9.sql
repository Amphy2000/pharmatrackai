-- Drop the SECURITY DEFINER view and use RLS with anonymous access instead
DROP VIEW IF EXISTS public.public_medications;

-- Create a function to get public medications (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_public_medications(search_term text DEFAULT NULL, location_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  current_stock integer,
  selling_price numeric,
  dispensing_unit text,
  pharmacy_id uuid,
  pharmacy_name text,
  pharmacy_phone text,
  pharmacy_address text
)
LANGUAGE sql
STABLE
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
    p.phone as pharmacy_phone,
    p.address as pharmacy_address
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_public = true 
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (search_term IS NULL OR m.name ILIKE '%' || search_term || '%' OR m.category ILIKE '%' || search_term || '%')
    AND (location_filter IS NULL OR p.address ILIKE '%' || location_filter || '%')
  ORDER BY m.name;
$$;