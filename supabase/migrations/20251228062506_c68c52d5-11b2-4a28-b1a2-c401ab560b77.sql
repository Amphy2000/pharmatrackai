-- Add is_featured column to medications for promoted items
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add explore page visits tracking to marketplace_views
ALTER TABLE public.marketplace_views ADD COLUMN IF NOT EXISTS visit_type text DEFAULT 'search';

-- Create index for faster featured medication queries
CREATE INDEX IF NOT EXISTS idx_medications_featured ON public.medications (is_featured) WHERE is_featured = true;

-- Drop and recreate the get_public_medications function to include is_featured
DROP FUNCTION IF EXISTS public.get_public_medications(text, text);

CREATE FUNCTION public.get_public_medications(search_term text DEFAULT NULL::text, location_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, category text, current_stock integer, selling_price numeric, dispensing_unit text, pharmacy_id uuid, pharmacy_name text, pharmacy_phone text, pharmacy_address text, is_featured boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    m.selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    p.phone as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_public = true 
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (search_term IS NULL OR m.name ILIKE '%' || search_term || '%' OR m.category ILIKE '%' || search_term || '%')
    AND (location_filter IS NULL OR p.address ILIKE '%' || location_filter || '%')
  ORDER BY m.is_featured DESC, m.name;
$function$;

-- Insert common Nigerian drugs into master_barcode_library for auto-fill suggestions
INSERT INTO public.master_barcode_library (barcode, product_name, category, manufacturer) VALUES
('NIG001', 'Paracetamol 500mg', 'Tablet', 'Emzor'),
('NIG002', 'Amoxicillin 500mg', 'Capsule', 'Emzor'),
('NIG003', 'Ibuprofen 400mg', 'Tablet', 'M&B'),
('NIG004', 'Ciprofloxacin 500mg', 'Tablet', 'Fidson'),
('NIG005', 'Metronidazole 400mg', 'Tablet', 'Emzor'),
('NIG006', 'Artemether Lumefantrine', 'Tablet', 'Lonart'),
('NIG007', 'Vitamin C 1000mg', 'Tablet', 'Emzor'),
('NIG008', 'Omeprazole 20mg', 'Capsule', 'M&B'),
('NIG009', 'Flagyl 400mg', 'Tablet', 'Sanofi'),
('NIG010', 'Augmentin 625mg', 'Tablet', 'GSK'),
('NIG011', 'Diclofenac 50mg', 'Tablet', 'Emzor'),
('NIG012', 'Chloroquine 250mg', 'Tablet', 'May & Baker'),
('NIG013', 'Prednisolone 5mg', 'Tablet', 'Emzor'),
('NIG014', 'Tramadol 50mg', 'Capsule', 'Emzor'),
('NIG015', 'Multivitamin', 'Tablet', 'Fidson'),
('NIG016', 'Cough Syrup', 'Syrup', 'Benylin'),
('NIG017', 'Antacid Suspension', 'Suspension', 'Gestid'),
('NIG018', 'Insulin Mixtard', 'Injection', 'Novo Nordisk'),
('NIG019', 'Amlodipine 5mg', 'Tablet', 'Emzor'),
('NIG020', 'Metformin 500mg', 'Tablet', 'Emzor'),
('NIG021', 'Lisinopril 10mg', 'Tablet', 'M&B'),
('NIG022', 'Atorvastatin 20mg', 'Tablet', 'Fidson'),
('NIG023', 'Losartan 50mg', 'Tablet', 'Emzor'),
('NIG024', 'Ceftriaxone 1g', 'Injection', 'Emzor'),
('NIG025', 'Azithromycin 500mg', 'Tablet', 'Emzor'),
('NIG026', 'Ampiclox 500mg', 'Capsule', 'Beecham'),
('NIG027', 'Vitamin B Complex', 'Tablet', 'Emzor'),
('NIG028', 'Folic Acid 5mg', 'Tablet', 'Emzor'),
('NIG029', 'Iron Supplement', 'Tablet', 'Ranferon'),
('NIG030', 'ORS Sachet', 'Powder', 'Emzor'),
('NIG031', 'Loperamide 2mg', 'Capsule', 'Imodium'),
('NIG032', 'Cetirizine 10mg', 'Tablet', 'Emzor'),
('NIG033', 'Loratadine 10mg', 'Tablet', 'Claritin'),
('NIG034', 'Salbutamol Inhaler', 'Inhaler', 'Ventolin'),
('NIG035', 'Dexamethasone 4mg', 'Tablet', 'Emzor'),
('NIG036', 'Gentamicin Eye Drops', 'Eye Drops', 'Emzor'),
('NIG037', 'Tetracycline Eye Ointment', 'Ointment', 'Emzor'),
('NIG038', 'Antimalaria Combo', 'Tablet', 'Coartem'),
('NIG039', 'Panadol Extra', 'Tablet', 'GSK'),
('NIG040', 'Buscopan 10mg', 'Tablet', 'Boehringer'),
('NIG041', 'Hyoscine 10mg', 'Tablet', 'Emzor'),
('NIG042', 'Domperidone 10mg', 'Tablet', 'Emzor'),
('NIG043', 'Ranitidine 150mg', 'Tablet', 'Emzor'),
('NIG044', 'Aspirin 75mg', 'Tablet', 'Emzor'),
('NIG045', 'Warfarin 5mg', 'Tablet', 'Emzor'),
('NIG046', 'Hydrochlorothiazide 25mg', 'Tablet', 'Emzor'),
('NIG047', 'Nifedipine 20mg', 'Tablet', 'Adalat'),
('NIG048', 'Glibenclamide 5mg', 'Tablet', 'Daonil'),
('NIG049', 'Simvastatin 20mg', 'Tablet', 'Emzor'),
('NIG050', 'Erythromycin 500mg', 'Tablet', 'Emzor')
ON CONFLICT (barcode) DO NOTHING;