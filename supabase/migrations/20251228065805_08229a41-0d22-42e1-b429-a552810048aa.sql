-- Add featured_until column for automatic expiration
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS featured_until timestamp with time zone DEFAULT NULL;

-- Create index for featured queries
CREATE INDEX IF NOT EXISTS idx_medications_featured ON public.medications (is_featured, featured_until) 
WHERE is_featured = true;

-- Create function to check featured limit per pharmacy (max 3)
CREATE OR REPLACE FUNCTION public.check_featured_limit()
RETURNS TRIGGER AS $$
DECLARE
  featured_count INTEGER;
BEGIN
  IF NEW.is_featured = true AND (OLD.is_featured IS NULL OR OLD.is_featured = false) THEN
    SELECT COUNT(*) INTO featured_count
    FROM public.medications
    WHERE pharmacy_id = NEW.pharmacy_id 
      AND is_featured = true 
      AND id != NEW.id
      AND (featured_until IS NULL OR featured_until > NOW());
    
    IF featured_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 featured products allowed per pharmacy. Please remove a featured item first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for featured limit
DROP TRIGGER IF EXISTS check_featured_limit_trigger ON public.medications;
CREATE TRIGGER check_featured_limit_trigger
BEFORE INSERT OR UPDATE ON public.medications
FOR EACH ROW
EXECUTE FUNCTION public.check_featured_limit();

-- Create function to auto-expire featured items
CREATE OR REPLACE FUNCTION public.expire_featured_items()
RETURNS void AS $$
BEGIN
  UPDATE public.medications
  SET is_featured = false
  WHERE is_featured = true 
    AND featured_until IS NOT NULL 
    AND featured_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create symptom keywords table for better natural language matching
CREATE TABLE IF NOT EXISTS public.symptom_drug_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_keywords text[] NOT NULL,
  drug_categories text[] NOT NULL,
  drug_names text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.symptom_drug_mapping ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view symptom mappings" ON public.symptom_drug_mapping;
DROP POLICY IF EXISTS "Platform admins can manage symptom mappings" ON public.symptom_drug_mapping;

-- Public read access for symptom mapping
CREATE POLICY "Anyone can view symptom mappings" 
ON public.symptom_drug_mapping 
FOR SELECT 
USING (true);

-- Only platform admins can manage
CREATE POLICY "Platform admins can manage symptom mappings" 
ON public.symptom_drug_mapping 
FOR ALL 
USING (is_platform_admin(auth.uid()));

-- Insert common symptom mappings (using DO block to handle duplicates)
DO $$
BEGIN
  INSERT INTO public.symptom_drug_mapping (symptom_keywords, drug_categories, drug_names) VALUES
  (ARRAY['cough', 'coughing', 'dry cough', 'wet cough'], ARRAY['cough', 'antitussive', 'expectorant', 'cold'], ARRAY['benylin', 'actifed', 'coflin', 'piriton']),
  (ARRAY['headache', 'head pain', 'migraine'], ARRAY['analgesics', 'pain relief', 'nsaids'], ARRAY['paracetamol', 'ibuprofen', 'aspirin', 'acetaminophen']),
  (ARRAY['fever', 'high temperature', 'hot body'], ARRAY['antipyretics', 'analgesics'], ARRAY['paracetamol', 'ibuprofen', 'aspirin']),
  (ARRAY['malaria', 'malaria symptoms'], ARRAY['antimalarials', 'antiparasitic'], ARRAY['artemether', 'lumefantrine', 'coartem', 'lonart', 'artesunate']),
  (ARRAY['stomach ache', 'stomach pain', 'ulcer', 'heartburn', 'acid'], ARRAY['antacids', 'gi medications', 'ppi'], ARRAY['omeprazole', 'antacid', 'gestid', 'gaviscon']),
  (ARRAY['infection', 'wound infection', 'bacteria'], ARRAY['antibiotics', 'antimicrobials'], ARRAY['amoxicillin', 'augmentin', 'ciprofloxacin', 'azithromycin']),
  (ARRAY['diabetes', 'sugar', 'blood sugar'], ARRAY['antidiabetics', 'diabetes care'], ARRAY['metformin', 'glibenclamide', 'insulin']),
  (ARRAY['blood pressure', 'hypertension', 'bp'], ARRAY['antihypertensives', 'cardiovascular'], ARRAY['amlodipine', 'lisinopril', 'atenolol']),
  (ARRAY['allergy', 'allergic', 'itching', 'rash'], ARRAY['antihistamines', 'allergy'], ARRAY['loratadine', 'cetirizine', 'piriton', 'chlorpheniramine']),
  (ARRAY['cold', 'flu', 'running nose', 'blocked nose'], ARRAY['cold', 'decongestants', 'antihistamines'], ARRAY['actifed', 'cold cap', 'vitamin c']),
  (ARRAY['diarrhea', 'running stomach', 'loose stool'], ARRAY['antidiarrheals', 'gi medications'], ARRAY['loperamide', 'ors', 'flagyl']),
  (ARRAY['pain', 'body pain', 'muscle pain', 'joint pain'], ARRAY['analgesics', 'nsaids', 'pain relief'], ARRAY['ibuprofen', 'diclofenac', 'paracetamol', 'tramadol']),
  (ARRAY['vitamin', 'supplement', 'immunity'], ARRAY['vitamins', 'supplements'], ARRAY['vitamin c', 'multivitamin', 'vitamin b complex']),
  (ARRAY['eye', 'eye pain', 'red eye', 'eye infection'], ARRAY['ophthalmics', 'eye care'], ARRAY['chloramphenicol eye drops', 'tetracycline eye']),
  (ARRAY['skin', 'skin infection', 'ringworm', 'eczema'], ARRAY['dermatologicals', 'antifungals', 'topicals'], ARRAY['clotrimazole', 'hydrocortisone', 'funbact'])
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors for duplicate entries
  NULL;
END $$;