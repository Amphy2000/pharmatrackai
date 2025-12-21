-- Create table for custom pharmacy features
CREATE TABLE public.pharmacy_custom_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pharmacy_id, feature_key)
);

-- Enable RLS
ALTER TABLE public.pharmacy_custom_features ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for admin panel edge function)
CREATE POLICY "Service role can manage all features" 
ON public.pharmacy_custom_features 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_pharmacy_custom_features_pharmacy_id ON public.pharmacy_custom_features(pharmacy_id);

-- Add trigger for updated_at
CREATE TRIGGER update_pharmacy_custom_features_updated_at
BEFORE UPDATE ON public.pharmacy_custom_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();