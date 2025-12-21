-- Change trial period from 14 days to 7 days
ALTER TABLE public.pharmacies 
ALTER COLUMN trial_ends_at SET DEFAULT (now() + '7 days'::interval);

-- Update existing pharmacies that are still in trial to have 7-day trial from their creation
UPDATE public.pharmacies 
SET trial_ends_at = created_at + interval '7 days'
WHERE subscription_status = 'trial';