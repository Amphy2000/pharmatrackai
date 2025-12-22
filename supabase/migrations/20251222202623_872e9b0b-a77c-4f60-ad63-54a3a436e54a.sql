-- Add pharmacy settings for Price Shield and Auto-Margin
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS default_margin_percent numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS price_lock_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_pin_hash text;

-- Add active_ingredients field to medications for clinical search
ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS active_ingredients text[];

-- Create index for active ingredients search
CREATE INDEX IF NOT EXISTS idx_medications_active_ingredients ON public.medications USING GIN(active_ingredients);

-- Add comments for documentation
COMMENT ON COLUMN public.pharmacies.default_margin_percent IS 'Default profit margin percentage for auto-calculating selling prices';
COMMENT ON COLUMN public.pharmacies.price_lock_enabled IS 'When true, staff cannot change prices without admin PIN';
COMMENT ON COLUMN public.pharmacies.admin_pin_hash IS 'Hashed admin PIN for price overrides';
COMMENT ON COLUMN public.medications.active_ingredients IS 'Array of active ingredient names for clinical search';