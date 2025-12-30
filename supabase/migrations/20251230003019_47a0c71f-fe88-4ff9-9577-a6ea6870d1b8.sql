-- Remove the featured limit trigger - no more limit on featured products
DROP TRIGGER IF EXISTS check_featured_limit_trigger ON public.medications;
DROP FUNCTION IF EXISTS public.check_featured_limit();