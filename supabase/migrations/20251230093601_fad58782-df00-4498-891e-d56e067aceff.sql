-- Add marketplace_zone column to pharmacies table for location filtering
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS marketplace_zone text,
ADD COLUMN IF NOT EXISTS marketplace_city text,
ADD COLUMN IF NOT EXISTS marketplace_lat numeric,
ADD COLUMN IF NOT EXISTS marketplace_lon numeric;