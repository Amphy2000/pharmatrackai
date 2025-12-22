-- Add a dispensing unit classification for medications (for receipts and inventory)
ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS dispensing_unit text NOT NULL DEFAULT 'unit';

-- Restrict values to a small supported set (immutable, safe CHECK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'medications_dispensing_unit_check'
  ) THEN
    ALTER TABLE public.medications
    ADD CONSTRAINT medications_dispensing_unit_check
    CHECK (dispensing_unit IN ('unit', 'pack', 'tab', 'bottle'));
  END IF;
END $$;