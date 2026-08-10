-- 1. Ensure extensions are active
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove existing cron jobs if present to allow idempotent re-run
SELECT cron.unschedule('pharmatrack-morning-push') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pharmatrack-morning-push'
);

SELECT cron.unschedule('pharmatrack-critical-push') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pharmatrack-critical-push'
);

-- 3. Schedule Morning Briefing Push (Daily at 08:00 WAT / 07:00 UTC)
SELECT cron.schedule(
  'pharmatrack-morning-push',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdejkpweecasdzsixxbd.supabase.co/functions/v1/send-push-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- 4. Schedule Critical Alert Check (Every 2 hours)
SELECT cron.schedule(
  'pharmatrack-critical-push',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdejkpweecasdzsixxbd.supabase.co/functions/v1/send-push-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
