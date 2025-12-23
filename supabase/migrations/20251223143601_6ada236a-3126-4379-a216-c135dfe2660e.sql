-- Create a private storage bucket for prescription images
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

-- Only pharmacy staff can upload prescription images to their own folder
CREATE POLICY "Pharmacy staff can upload prescriptions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prescriptions' 
  AND (storage.foldername(name))[1] IN (
    SELECT pharmacy_id::text 
    FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Only pharmacy staff can view prescriptions from their pharmacy
CREATE POLICY "Pharmacy staff can view prescriptions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'prescriptions' 
  AND (storage.foldername(name))[1] IN (
    SELECT pharmacy_id::text 
    FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Only pharmacy staff can delete prescriptions from their pharmacy
CREATE POLICY "Pharmacy staff can delete prescriptions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'prescriptions' 
  AND (storage.foldername(name))[1] IN (
    SELECT pharmacy_id::text 
    FROM public.pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);