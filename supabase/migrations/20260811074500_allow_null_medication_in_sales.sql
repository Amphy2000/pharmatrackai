-- Migration: Support Quick Sales / Express POS items without requiring catalog medication_id

ALTER TABLE public.sales ALTER COLUMN medication_id DROP NOT NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS custom_item_name text;
