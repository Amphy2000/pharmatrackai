-- Add payment_method column to sales table for tracking how each sale was paid
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS payment_method TEXT;