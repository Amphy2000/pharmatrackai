-- Create table to track upsell analytics
CREATE TABLE public.upsell_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.pharmacy_staff(id) ON DELETE SET NULL,
  suggested_medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  cart_medication_ids UUID[] NOT NULL DEFAULT '{}',
  suggestion_reason TEXT,
  confidence_score NUMERIC,
  was_accepted BOOLEAN NOT NULL DEFAULT false,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upsell_analytics ENABLE ROW LEVEL SECURITY;

-- Staff can view pharmacy upsell analytics
CREATE POLICY "Staff can view pharmacy upsell analytics"
ON public.upsell_analytics
FOR SELECT
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Staff can insert upsell analytics
CREATE POLICY "Staff can insert upsell analytics"
ON public.upsell_analytics
FOR INSERT
WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Staff can update upsell analytics (for marking as accepted)
CREATE POLICY "Staff can update upsell analytics"
ON public.upsell_analytics
FOR UPDATE
USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Create index for faster queries
CREATE INDEX idx_upsell_analytics_pharmacy_date ON public.upsell_analytics(pharmacy_id, suggested_at DESC);
CREATE INDEX idx_upsell_analytics_medication ON public.upsell_analytics(suggested_medication_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.upsell_analytics;