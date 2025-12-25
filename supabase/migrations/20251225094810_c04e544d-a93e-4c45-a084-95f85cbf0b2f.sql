-- Allow platform admins to delete pharmacies
CREATE POLICY "Platform admins can delete pharmacies"
ON public.pharmacies
FOR DELETE
USING (is_platform_admin(auth.uid()));

-- Add is_gift column to subscription_payments to track gift subscriptions
ALTER TABLE public.subscription_payments
ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false;

-- Add is_gifted column to pharmacies to track if current subscription is a gift
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS is_gifted boolean NOT NULL DEFAULT false;