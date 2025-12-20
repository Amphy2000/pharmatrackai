-- Create medications table for pharmacy inventory
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Tablet', 'Syrup', 'Capsule', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Other')),
  batch_number TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  expiry_date DATE NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for this demo)
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" 
ON public.medications 
FOR SELECT 
USING (true);

-- Create policy for public insert access
CREATE POLICY "Allow public insert access" 
ON public.medications 
FOR INSERT 
WITH CHECK (true);

-- Create policy for public update access
CREATE POLICY "Allow public update access" 
ON public.medications 
FOR UPDATE 
USING (true);

-- Create policy for public delete access
CREATE POLICY "Allow public delete access" 
ON public.medications 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON public.medications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.medications (name, category, batch_number, current_stock, reorder_level, expiry_date, unit_price) VALUES
('Amoxicillin 500mg', 'Capsule', 'AMX-2024-001', 150, 50, '2025-08-15', 12.50),
('Paracetamol 500mg', 'Tablet', 'PCM-2024-002', 25, 100, '2026-03-20', 5.00),
('Ibuprofen 400mg', 'Tablet', 'IBU-2024-003', 200, 75, '2025-12-10', 8.75),
('Cough Syrup', 'Syrup', 'CGH-2024-004', 45, 30, '2024-11-30', 15.00),
('Vitamin D3', 'Tablet', 'VTD-2024-005', 300, 50, '2026-06-15', 18.50),
('Insulin Glargine', 'Injection', 'INS-2024-006', 8, 20, '2025-02-28', 125.00),
('Eye Drops', 'Drops', 'EYE-2024-007', 60, 25, '2025-09-01', 22.00),
('Hydrocortisone Cream', 'Cream', 'HYD-2024-008', 35, 20, '2024-12-15', 28.00),
('Salbutamol Inhaler', 'Inhaler', 'SAL-2024-009', 5, 15, '2025-07-20', 45.00),
('Metformin 850mg', 'Tablet', 'MET-2024-010', 180, 60, '2026-01-10', 9.25);