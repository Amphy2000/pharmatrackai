-- Add alert settings columns to pharmacies table
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS alert_recipient_phone text,
ADD COLUMN IF NOT EXISTS alert_channel text DEFAULT 'sms';

-- Add comment for clarity
COMMENT ON COLUMN public.pharmacies.alert_recipient_phone IS 'Phone number to receive all alerts (SMS and WhatsApp)';
COMMENT ON COLUMN public.pharmacies.alert_channel IS 'Preferred alert channel: sms or whatsapp';