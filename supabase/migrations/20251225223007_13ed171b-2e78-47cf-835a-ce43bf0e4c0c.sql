-- Add only tables that are not yet in supabase_realtime publication
-- Using IF NOT EXISTS pattern to avoid errors

DO $$
BEGIN
  -- Check and add branch_inventory
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'branch_inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branch_inventory;
  END IF;

  -- Check and add stock_transfers
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock_transfers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transfers;
  END IF;

  -- Check and add notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- Check and add pharmacy_staff
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'pharmacy_staff'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_staff;
  END IF;

  -- Check and add staff_shifts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff_shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shifts;
  END IF;

  -- Check and add branches
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'branches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  END IF;
END $$;