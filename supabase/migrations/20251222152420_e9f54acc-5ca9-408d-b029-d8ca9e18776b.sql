-- Add manufacturing_date field to medications for compliance reporting
ALTER TABLE public.medications
ADD COLUMN manufacturing_date date;

-- Add is_controlled flag for narcotic/controlled drugs register
ALTER TABLE public.medications
ADD COLUMN is_controlled boolean NOT NULL DEFAULT false;

-- Add NAFDAC registration number for compliance
ALTER TABLE public.medications
ADD COLUMN nafdac_reg_number text;

-- Create index for controlled drugs queries
CREATE INDEX idx_medications_is_controlled ON public.medications(is_controlled) WHERE is_controlled = true;