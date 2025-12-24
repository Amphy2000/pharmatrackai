-- Add Termii Sender ID column to pharmacies table
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS termii_sender_id text DEFAULT NULL;

COMMENT ON COLUMN public.pharmacies.termii_sender_id IS 'Registered Termii Sender ID for SMS/WhatsApp alerts';