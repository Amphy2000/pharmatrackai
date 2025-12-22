-- Add logo_url column to pharmacies table
ALTER TABLE public.pharmacies ADD COLUMN logo_url TEXT NULL;

-- Create storage bucket for pharmacy logos
INSERT INTO storage.buckets (id, name, public) VALUES ('pharmacy-logos', 'pharmacy-logos', true);

-- RLS policies for pharmacy-logos bucket
-- Allow pharmacy owners to upload their logo
CREATE POLICY "Pharmacy owners can upload logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pharmacy-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow pharmacy owners to update their logo
CREATE POLICY "Pharmacy owners can update logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'pharmacy-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow pharmacy owners to delete their logo
CREATE POLICY "Pharmacy owners can delete logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pharmacy-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to pharmacy logos
CREATE POLICY "Anyone can view pharmacy logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pharmacy-logos');