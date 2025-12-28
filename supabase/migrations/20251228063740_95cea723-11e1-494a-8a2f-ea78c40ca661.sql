-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add more drugs to master_barcode_library with manufacturer and dosage info
INSERT INTO public.master_barcode_library (barcode, product_name, category, manufacturer) VALUES
-- Antibiotics
('8901234567890', 'Amoxicillin 500mg Capsule', 'Capsule', 'Emzor Pharmaceuticals'),
('8901234567891', 'Amoxicillin 250mg Capsule', 'Capsule', 'Emzor Pharmaceuticals'),
('8901234567892', 'Amoxicillin 125mg/5ml Suspension', 'Suspension', 'Emzor Pharmaceuticals'),
('8901234567893', 'Augmentin 625mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234567894', 'Augmentin 375mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234567895', 'Augmentin 228mg/5ml Suspension', 'Suspension', 'GlaxoSmithKline'),
('8901234567896', 'Ciprofloxacin 500mg Tablet', 'Tablet', 'Fidson Healthcare'),
('8901234567897', 'Ciprofloxacin 250mg Tablet', 'Tablet', 'Fidson Healthcare'),
('8901234567898', 'Azithromycin 500mg Tablet', 'Tablet', 'Pfizer'),
('8901234567899', 'Azithromycin 250mg Capsule', 'Capsule', 'Pfizer'),
('8901234567900', 'Metronidazole 400mg Tablet', 'Tablet', 'May & Baker'),
('8901234567901', 'Metronidazole 200mg Tablet', 'Tablet', 'May & Baker'),
('8901234567902', 'Metronidazole 500mg Injection', 'Injection', 'May & Baker'),
('8901234567903', 'Ceftriaxone 1g Injection', 'Injection', 'Roche'),
('8901234567904', 'Cefuroxime 500mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234567905', 'Cloxacillin 500mg Capsule', 'Capsule', 'Emzor Pharmaceuticals'),
('8901234567906', 'Erythromycin 500mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234567907', 'Doxycycline 100mg Capsule', 'Capsule', 'Pfizer'),
('8901234567908', 'Levofloxacin 500mg Tablet', 'Tablet', 'Sanofi'),
('8901234567909', 'Gentamicin 80mg Injection', 'Injection', 'Juhel'),

-- Analgesics/Pain Relief
('8901234568000', 'Paracetamol 500mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568001', 'Paracetamol 1000mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234568002', 'Panadol Extra (Paracetamol + Caffeine)', 'Tablet', 'GlaxoSmithKline'),
('8901234568003', 'Ibuprofen 400mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568004', 'Ibuprofen 200mg Tablet', 'Tablet', 'May & Baker'),
('8901234568005', 'Diclofenac 50mg Tablet', 'Tablet', 'Novartis'),
('8901234568006', 'Diclofenac 75mg Injection', 'Injection', 'Novartis'),
('8901234568007', 'Tramadol 50mg Capsule', 'Capsule', 'Emzor Pharmaceuticals'),
('8901234568008', 'Tramadol 100mg Capsule', 'Capsule', 'Emzor Pharmaceuticals'),
('8901234568009', 'Aspirin 75mg Tablet', 'Tablet', 'Bayer'),
('8901234568010', 'Aspirin 300mg Tablet', 'Tablet', 'Bayer'),
('8901234568011', 'Celecoxib 200mg Capsule', 'Capsule', 'Pfizer'),
('8901234568012', 'Piroxicam 20mg Capsule', 'Capsule', 'Pfizer'),
('8901234568013', 'Meloxicam 15mg Tablet', 'Tablet', 'Boehringer'),
('8901234568014', 'Naproxen 500mg Tablet', 'Tablet', 'Roche'),

-- Antimalarials
('8901234568100', 'Artemether/Lumefantrine 20/120mg (Coartem)', 'Tablet', 'Novartis'),
('8901234568101', 'Artemether/Lumefantrine 80/480mg (Coartem Forte)', 'Tablet', 'Novartis'),
('8901234568102', 'Artesunate 50mg Tablet', 'Tablet', 'Guilin Pharma'),
('8901234568103', 'Artesunate 60mg Injection', 'Injection', 'Guilin Pharma'),
('8901234568104', 'Chloroquine Phosphate 250mg Tablet', 'Tablet', 'May & Baker'),
('8901234568105', 'Quinine 300mg Tablet', 'Tablet', 'Shalina'),
('8901234568106', 'Quinine 600mg Injection', 'Injection', 'Shalina'),
('8901234568107', 'Sulfadoxine/Pyrimethamine (Fansidar)', 'Tablet', 'Roche'),
('8901234568108', 'Amodiaquine 200mg Tablet', 'Tablet', 'Sanofi'),
('8901234568109', 'Proguanil 100mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568110', 'Mefloquine 250mg Tablet', 'Tablet', 'Roche'),
('8901234568111', 'Lonart DS (Artemether/Lumefantrine)', 'Tablet', 'Bliss GVS'),
('8901234568112', 'P-Alaxin (Dihydroartemisinin/Piperaquine)', 'Tablet', 'Bliss GVS'),

-- Cardiovascular
('8901234568200', 'Amlodipine 5mg Tablet', 'Tablet', 'Pfizer'),
('8901234568201', 'Amlodipine 10mg Tablet', 'Tablet', 'Pfizer'),
('8901234568202', 'Lisinopril 10mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568203', 'Lisinopril 20mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568204', 'Losartan 50mg Tablet', 'Tablet', 'Merck'),
('8901234568205', 'Losartan 100mg Tablet', 'Tablet', 'Merck'),
('8901234568206', 'Atenolol 50mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568207', 'Atenolol 100mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568208', 'Propranolol 40mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568209', 'Hydrochlorothiazide 25mg Tablet', 'Tablet', 'Novartis'),
('8901234568210', 'Furosemide 40mg Tablet', 'Tablet', 'Sanofi'),
('8901234568211', 'Furosemide 20mg Injection', 'Injection', 'Sanofi'),
('8901234568212', 'Nifedipine 20mg Tablet', 'Tablet', 'Bayer'),
('8901234568213', 'Methyldopa 250mg Tablet', 'Tablet', 'Merck'),
('8901234568214', 'Atorvastatin 20mg Tablet', 'Tablet', 'Pfizer'),
('8901234568215', 'Atorvastatin 40mg Tablet', 'Tablet', 'Pfizer'),
('8901234568216', 'Simvastatin 20mg Tablet', 'Tablet', 'Merck'),
('8901234568217', 'Clopidogrel 75mg Tablet', 'Tablet', 'Sanofi'),
('8901234568218', 'Warfarin 5mg Tablet', 'Tablet', 'Bristol-Myers Squibb'),
('8901234568219', 'Digoxin 0.25mg Tablet', 'Tablet', 'GlaxoSmithKline'),

-- Diabetes
('8901234568300', 'Metformin 500mg Tablet', 'Tablet', 'Merck'),
('8901234568301', 'Metformin 850mg Tablet', 'Tablet', 'Merck'),
('8901234568302', 'Metformin 1000mg Tablet', 'Tablet', 'Merck'),
('8901234568303', 'Glibenclamide 5mg Tablet', 'Tablet', 'Sanofi'),
('8901234568304', 'Glimepiride 2mg Tablet', 'Tablet', 'Sanofi'),
('8901234568305', 'Glimepiride 4mg Tablet', 'Tablet', 'Sanofi'),
('8901234568306', 'Sitagliptin 100mg Tablet', 'Tablet', 'Merck'),
('8901234568307', 'Empagliflozin 10mg Tablet', 'Tablet', 'Boehringer'),
('8901234568308', 'Insulin Mixtard 30 100IU/ml', 'Injection', 'Novo Nordisk'),
('8901234568309', 'Insulin Lantus 100IU/ml', 'Injection', 'Sanofi'),
('8901234568310', 'Insulin Humalog 100IU/ml', 'Injection', 'Eli Lilly'),
('8901234568311', 'Pioglitazone 30mg Tablet', 'Tablet', 'Takeda'),

-- Gastrointestinal
('8901234568400', 'Omeprazole 20mg Capsule', 'Capsule', 'AstraZeneca'),
('8901234568401', 'Omeprazole 40mg Capsule', 'Capsule', 'AstraZeneca'),
('8901234568402', 'Esomeprazole 40mg Tablet', 'Tablet', 'AstraZeneca'),
('8901234568403', 'Pantoprazole 40mg Tablet', 'Tablet', 'Takeda'),
('8901234568404', 'Ranitidine 150mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234568405', 'Cimetidine 400mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234568406', 'Loperamide 2mg Capsule', 'Capsule', 'Johnson & Johnson'),
('8901234568407', 'Oral Rehydration Salts (ORS)', 'Powder', 'Emzor Pharmaceuticals'),
('8901234568408', 'Zinc Sulphate 20mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568409', 'Mebendazole 100mg Tablet', 'Tablet', 'Johnson & Johnson'),
('8901234568410', 'Albendazole 400mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234568411', 'Bisacodyl 5mg Tablet', 'Tablet', 'Boehringer'),
('8901234568412', 'Lactulose Syrup 10g/15ml', 'Syrup', 'Abbott'),
('8901234568413', 'Antacid Suspension (Magaldrate + Simethicone)', 'Suspension', 'Emzor Pharmaceuticals'),
('8901234568414', 'Metoclopramide 10mg Tablet', 'Tablet', 'Sanofi'),

-- Respiratory
('8901234568500', 'Salbutamol 100mcg Inhaler', 'Inhaler', 'GlaxoSmithKline'),
('8901234568501', 'Salbutamol 4mg Tablet', 'Tablet', 'GlaxoSmithKline'),
('8901234568502', 'Salbutamol Syrup 2mg/5ml', 'Syrup', 'GlaxoSmithKline'),
('8901234568503', 'Beclomethasone 100mcg Inhaler', 'Inhaler', 'GlaxoSmithKline'),
('8901234568504', 'Budesonide 200mcg Inhaler', 'Inhaler', 'AstraZeneca'),
('8901234568505', 'Fluticasone 125mcg Inhaler', 'Inhaler', 'GlaxoSmithKline'),
('8901234568506', 'Theophylline 200mg Tablet', 'Tablet', 'Novartis'),
('8901234568507', 'Montelukast 10mg Tablet', 'Tablet', 'Merck'),
('8901234568508', 'Bromhexine 8mg Tablet', 'Tablet', 'Boehringer'),
('8901234568509', 'Ambroxol 30mg Tablet', 'Tablet', 'Boehringer'),
('8901234568510', 'Guaifenesin Syrup 100mg/5ml', 'Syrup', 'Reckitt'),
('8901234568511', 'Dextromethorphan Syrup 15mg/5ml', 'Syrup', 'Reckitt'),
('8901234568512', 'Cetirizine 10mg Tablet', 'Tablet', 'UCB Pharma'),
('8901234568513', 'Loratadine 10mg Tablet', 'Tablet', 'Schering-Plough'),
('8901234568514', 'Chlorpheniramine 4mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568515', 'Prednisolone 5mg Tablet', 'Tablet', 'Pfizer'),

-- Vitamins & Supplements
('8901234568600', 'Vitamin C 1000mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568601', 'Vitamin B Complex Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568602', 'Vitamin D3 1000IU Tablet', 'Tablet', 'Mega Lifesciences'),
('8901234568603', 'Multivitamin with Iron Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568604', 'Folic Acid 5mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568605', 'Ferrous Sulphate 200mg Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234568606', 'Calcium + Vitamin D Tablet', 'Tablet', 'Pfizer'),
('8901234568607', 'Omega-3 Fish Oil 1000mg Capsule', 'Capsule', 'Nature Made'),
('8901234568608', 'Zinc Supplement 50mg Tablet', 'Tablet', 'Mega Lifesciences'),
('8901234568609', 'Vitamin E 400IU Capsule', 'Capsule', 'Nature Made'),

-- Women Health / Contraceptives
('8901234568700', 'Levonorgestrel 1.5mg (Postinor-2)', 'Tablet', 'Gedeon Richter'),
('8901234568701', 'Ethinylestradiol/Levonorgestrel (Microgynon)', 'Tablet', 'Bayer'),
('8901234568702', 'Medroxyprogesterone 150mg Injection (Depo-Provera)', 'Injection', 'Pfizer'),
('8901234568703', 'Norethisterone 5mg Tablet', 'Tablet', 'Pfizer'),
('8901234568704', 'Misoprostol 200mcg Tablet', 'Tablet', 'Pfizer'),
('8901234568705', 'Conjugated Estrogen 0.625mg Tablet', 'Tablet', 'Wyeth'),
('8901234568706', 'Clomiphene 50mg Tablet', 'Tablet', 'Sanofi'),

-- Dermatology
('8901234568800', 'Hydrocortisone 1% Cream', 'Cream', 'GlaxoSmithKline'),
('8901234568801', 'Betamethasone 0.1% Cream', 'Cream', 'GlaxoSmithKline'),
('8901234568802', 'Clotrimazole 1% Cream', 'Cream', 'Bayer'),
('8901234568803', 'Ketoconazole 2% Cream', 'Cream', 'Johnson & Johnson'),
('8901234568804', 'Miconazole 2% Cream', 'Cream', 'Johnson & Johnson'),
('8901234568805', 'Fusidic Acid 2% Cream', 'Cream', 'LEO Pharma'),
('8901234568806', 'Silver Sulfadiazine 1% Cream', 'Cream', 'Pfizer'),
('8901234568807', 'Permethrin 5% Cream', 'Cream', 'Prestige Brands'),
('8901234568808', 'Benzoyl Peroxide 5% Gel', 'Gel', 'Galderma'),
('8901234568809', 'Tretinoin 0.05% Cream', 'Cream', 'Johnson & Johnson'),
('8901234568810', 'Calamine Lotion', 'Lotion', 'Emzor Pharmaceuticals'),

-- Eye/Ear Preparations
('8901234568900', 'Chloramphenicol Eye Drops 0.5%', 'Eye Drop', 'Bausch & Lomb'),
('8901234568901', 'Ciprofloxacin Eye Drops 0.3%', 'Eye Drop', 'Alcon'),
('8901234568902', 'Gentamicin Eye Drops 0.3%', 'Eye Drop', 'Allergan'),
('8901234568903', 'Artificial Tears (Carboxymethylcellulose)', 'Eye Drop', 'Allergan'),
('8901234568904', 'Prednisolone Eye Drops 1%', 'Eye Drop', 'Allergan'),
('8901234568905', 'Timolol Eye Drops 0.5%', 'Eye Drop', 'Merck'),
('8901234568906', 'Ciprofloxacin Ear Drops 0.3%', 'Ear Drop', 'Alcon'),
('8901234568907', 'Ofloxacin Ear Drops 0.3%', 'Ear Drop', 'Daiichi Sankyo'),

-- Psychiatric/CNS
('8901234569000', 'Amitriptyline 25mg Tablet', 'Tablet', 'Sandoz'),
('8901234569001', 'Fluoxetine 20mg Capsule', 'Capsule', 'Eli Lilly'),
('8901234569002', 'Sertraline 50mg Tablet', 'Tablet', 'Pfizer'),
('8901234569003', 'Diazepam 5mg Tablet', 'Tablet', 'Roche'),
('8901234569004', 'Diazepam 10mg Tablet', 'Tablet', 'Roche'),
('8901234569005', 'Carbamazepine 200mg Tablet', 'Tablet', 'Novartis'),
('8901234569006', 'Phenytoin 100mg Tablet', 'Tablet', 'Pfizer'),
('8901234569007', 'Phenobarbital 30mg Tablet', 'Tablet', 'Sanofi'),
('8901234569008', 'Haloperidol 5mg Tablet', 'Tablet', 'Johnson & Johnson'),
('8901234569009', 'Risperidone 2mg Tablet', 'Tablet', 'Johnson & Johnson'),
('8901234569010', 'Olanzapine 10mg Tablet', 'Tablet', 'Eli Lilly'),

-- HIV/Antiretroviral
('8901234569100', 'Tenofovir/Lamivudine/Efavirenz (TLE)', 'Tablet', 'Mylan'),
('8901234569101', 'Tenofovir/Lamivudine/Dolutegravir (TLD)', 'Tablet', 'Mylan'),
('8901234569102', 'Zidovudine/Lamivudine (Combivir)', 'Tablet', 'GlaxoSmithKline'),
('8901234569103', 'Nevirapine 200mg Tablet', 'Tablet', 'Boehringer'),
('8901234569104', 'Lopinavir/Ritonavir (Kaletra)', 'Tablet', 'AbbVie'),
('8901234569105', 'Atazanavir 300mg Capsule', 'Capsule', 'Bristol-Myers Squibb'),

-- Common OTC / First Aid
('8901234569200', 'Hydrogen Peroxide 3% Solution', 'Solution', 'Emzor Pharmaceuticals'),
('8901234569201', 'Povidone-Iodine 10% Solution (Betadine)', 'Solution', 'Purdue Pharma'),
('8901234569202', 'Methylated Spirit', 'Solution', 'Juhel'),
('8901234569203', 'Cotton Wool 50g', 'Medical Supply', 'Generic'),
('8901234569204', 'Gauze Bandage 4 inches', 'Medical Supply', 'Generic'),
('8901234569205', 'Adhesive Bandage (Plaster)', 'Medical Supply', 'Band-Aid'),
('8901234569206', 'Calamine + Diphenhydramine Lotion', 'Lotion', 'Emzor Pharmaceuticals'),

-- Common Nigerian Brand Names (alternate spellings included in product name)
('8901234569300', 'Lonart (Artemether-Lumefantrine)', 'Tablet', 'Bliss GVS'),
('8901234569301', 'Coartem (Artemether-Lumefantrine)', 'Tablet', 'Novartis'),
('8901234569302', 'Flagyl (Metronidazole) 400mg', 'Tablet', 'Sanofi'),
('8901234569303', 'Emzor Paracetamol 500mg', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234569304', 'M&B Paracetamol 500mg', 'Tablet', 'May & Baker'),
('8901234569305', 'Actifed Cold & Allergy Syrup', 'Syrup', 'Johnson & Johnson'),
('8901234569306', 'Benylin Cough Syrup', 'Syrup', 'Johnson & Johnson'),
('8901234569307', 'Feldene (Piroxicam) 20mg', 'Capsule', 'Pfizer'),
('8901234569308', 'Vitamin B-Co Strong Tablet', 'Tablet', 'Emzor Pharmaceuticals'),
('8901234569309', 'Blood Capsule (Ferrous + Folic Acid)', 'Capsule', 'Emzor Pharmaceuticals'),
('8901234569310', 'Gestid Antacid Tablet', 'Tablet', 'Ranbaxy')
ON CONFLICT (barcode) DO NOTHING;

-- Create index for faster fuzzy search
CREATE INDEX IF NOT EXISTS idx_master_barcode_product_name_trgm 
ON public.master_barcode_library USING gin (product_name gin_trgm_ops);

-- Update get_public_medications to support fuzzy search
DROP FUNCTION IF EXISTS public.get_public_medications(text, text);

CREATE OR REPLACE FUNCTION public.get_public_medications(
  search_term text DEFAULT NULL,
  location_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  current_stock integer,
  selling_price numeric,
  dispensing_unit text,
  pharmacy_id uuid,
  pharmacy_name text,
  pharmacy_phone text,
  pharmacy_address text,
  is_featured boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    AND (
      search_term IS NULL 
      OR m.name ILIKE '%' || search_term || '%' 
      OR m.category ILIKE '%' || search_term || '%'
      -- Fuzzy match for misspellings using trigram similarity
      OR similarity(m.name, search_term) > 0.3
    )
    AND (location_filter IS NULL OR p.address ILIKE '%' || location_filter || '%')
  ORDER BY 
    -- Prioritize exact matches, then featured, then fuzzy matches
    CASE WHEN m.name ILIKE '%' || COALESCE(search_term, '') || '%' THEN 0 ELSE 1 END,
    m.is_featured DESC,
    similarity(m.name, COALESCE(search_term, '')) DESC,
    m.name;
$$;

-- Create a fuzzy search function for the drug database
CREATE OR REPLACE FUNCTION public.search_drug_database(search_term text)
RETURNS TABLE(
  id uuid,
  product_name text,
  category text,
  manufacturer text,
  similarity_score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    m.id,
    m.product_name,
    m.category,
    m.manufacturer,
    similarity(m.product_name, search_term) as similarity_score
  FROM public.master_barcode_library m
  WHERE 
    m.product_name ILIKE '%' || search_term || '%'
    OR similarity(m.product_name, search_term) > 0.2
  ORDER BY 
    CASE WHEN m.product_name ILIKE '%' || search_term || '%' THEN 0 ELSE 1 END,
    similarity(m.product_name, search_term) DESC
  LIMIT 20;
$$;