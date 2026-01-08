-- Add AI scan usage tracking columns to pharmacies table
ALTER TABLE public.pharmacies 
ADD COLUMN IF NOT EXISTS ai_scans_used_this_month integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_scans_reset_at timestamp with time zone DEFAULT now();

-- Create function to reset AI scans monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_scans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pharmacies 
  SET ai_scans_used_this_month = 0,
      ai_scans_reset_at = now()
  WHERE ai_scans_reset_at < date_trunc('month', now());
END;
$$;

-- Create function to increment AI scan usage (called from edge function)
CREATE OR REPLACE FUNCTION public.increment_ai_scan_usage(pharmacy_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
BEGIN
  -- First reset if needed
  UPDATE pharmacies 
  SET ai_scans_used_this_month = 0,
      ai_scans_reset_at = now()
  WHERE id = pharmacy_uuid 
    AND ai_scans_reset_at < date_trunc('month', now());
  
  -- Increment and return new count
  UPDATE pharmacies 
  SET ai_scans_used_this_month = ai_scans_used_this_month + 1
  WHERE id = pharmacy_uuid
  RETURNING ai_scans_used_this_month INTO current_count;
  
  RETURN current_count;
END;
$$;

-- Create function to get current AI scan usage
CREATE OR REPLACE FUNCTION public.get_ai_scan_usage(pharmacy_uuid uuid)
RETURNS TABLE(scans_used integer, scans_limit integer, reset_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pharmacy_plan text;
  pharmacy_scans integer;
  pharmacy_reset timestamp with time zone;
BEGIN
  -- Get pharmacy info
  SELECT subscription_plan::text, ai_scans_used_this_month, ai_scans_reset_at
  INTO pharmacy_plan, pharmacy_scans, pharmacy_reset
  FROM pharmacies
  WHERE id = pharmacy_uuid;
  
  -- Reset if needed
  IF pharmacy_reset < date_trunc('month', now()) THEN
    UPDATE pharmacies 
    SET ai_scans_used_this_month = 0,
        ai_scans_reset_at = now()
    WHERE id = pharmacy_uuid;
    pharmacy_scans := 0;
    pharmacy_reset := now();
  END IF;
  
  -- Return based on plan
  IF pharmacy_plan IN ('pro', 'enterprise') THEN
    RETURN QUERY SELECT pharmacy_scans, 999999, pharmacy_reset;
  ELSE
    RETURN QUERY SELECT pharmacy_scans, 5, pharmacy_reset;
  END IF;
END;
$$;