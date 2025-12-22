-- Add pharmacy settings for receipt customization
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS enable_logo_on_print boolean DEFAULT true;
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS pharmacist_in_charge text;