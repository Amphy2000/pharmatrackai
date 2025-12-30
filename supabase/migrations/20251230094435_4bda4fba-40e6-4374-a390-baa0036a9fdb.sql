-- Add bulk price hiding option for marketplace
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS hide_marketplace_prices boolean DEFAULT false;