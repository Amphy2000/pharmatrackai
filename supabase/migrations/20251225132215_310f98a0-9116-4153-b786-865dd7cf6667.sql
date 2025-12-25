-- Add branch_id to sales table for branch isolation
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- Create index for faster branch-based queries
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON public.sales(branch_id);

-- Add branch_id to pending_transactions for branch isolation
ALTER TABLE public.pending_transactions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- Create index for pending transactions
CREATE INDEX IF NOT EXISTS idx_pending_transactions_branch_id ON public.pending_transactions(branch_id);

-- Add branch_id to notifications for branch-specific alerts
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON public.notifications(branch_id);