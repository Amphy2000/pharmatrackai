-- Add auto_renew column to pharmacies table
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

-- Add cancellation_reason column to track why users cancel
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Add cancelled_at timestamp
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;