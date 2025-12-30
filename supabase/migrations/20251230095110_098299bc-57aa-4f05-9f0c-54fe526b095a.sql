-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_public_medications(text, text);
DROP FUNCTION IF EXISTS public.get_featured_medications();

-- Recreate get_public_medications with hide_marketplace_prices
CREATE FUNCTION public.get_public_medications(search_term text DEFAULT NULL::text, location_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, category text, current_stock integer, selling_price numeric, dispensing_unit text, pharmacy_id uuid, pharmacy_name text, pharmacy_phone text, pharmacy_address text, is_featured boolean, marketplace_contact_phone text, hide_marketplace_prices boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    -- If pharmacy has hide_marketplace_prices enabled, return NULL for price
    CASE WHEN p.hide_marketplace_prices = true THEN NULL ELSE m.selling_price END as selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    COALESCE(p.marketplace_contact_phone, p.phone) as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    p.marketplace_contact_phone,
    COALESCE(p.hide_marketplace_prices, false) as hide_marketplace_prices
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
$function$;

-- Recreate get_featured_medications with hide_marketplace_prices
CREATE FUNCTION public.get_featured_medications()
 RETURNS TABLE(id uuid, name text, category text, current_stock integer, selling_price numeric, dispensing_unit text, pharmacy_id uuid, pharmacy_name text, pharmacy_phone text, pharmacy_address text, is_featured boolean, featured_until timestamp with time zone, marketplace_contact_phone text, hide_marketplace_prices boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    CASE WHEN p.hide_marketplace_prices = true THEN NULL ELSE m.selling_price END as selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    COALESCE(p.marketplace_contact_phone, p.phone) as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    m.featured_until,
    p.marketplace_contact_phone,
    COALESCE(p.hide_marketplace_prices, false) as hide_marketplace_prices
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_featured = true 
    AND m.is_public = true 
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (m.featured_until IS NULL OR m.featured_until > now())
  ORDER BY m.featured_until DESC NULLS LAST, m.name;
$function$;