-- Add WiFi anchor and clock-in verification fields to pharmacies table
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS shop_wifi_name TEXT,
ADD COLUMN IF NOT EXISTS shop_location_qr TEXT,
ADD COLUMN IF NOT EXISTS require_wifi_clockin BOOLEAN DEFAULT false;

-- Add verification fields to staff_shifts table
ALTER TABLE public.staff_shifts
ADD COLUMN IF NOT EXISTS clock_in_wifi_name TEXT,
ADD COLUMN IF NOT EXISTS clock_in_method TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS is_wifi_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.pharmacies.shop_wifi_name IS 'The WiFi network name (SSID) used for staff clock-in verification';
COMMENT ON COLUMN public.pharmacies.shop_location_qr IS 'Unique QR code for location verification fallback';
COMMENT ON COLUMN public.pharmacies.require_wifi_clockin IS 'Whether to require WiFi/QR verification for clock-in';
COMMENT ON COLUMN public.staff_shifts.clock_in_wifi_name IS 'The WiFi name detected during clock-in';
COMMENT ON COLUMN public.staff_shifts.clock_in_method IS 'How the clock-in was verified: wifi, qr, or standard';
COMMENT ON COLUMN public.staff_shifts.is_wifi_verified IS 'Whether the clock-in location was verified';