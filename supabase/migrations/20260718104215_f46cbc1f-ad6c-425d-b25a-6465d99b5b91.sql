CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('fintra-drive-daily-backup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fintra-drive-daily-backup');

SELECT cron.schedule(
  'fintra-drive-daily-backup',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--3cf57f09-f566-43be-84a1-1122e44b9fa1.lovable.app/api/public/hooks/drive-backup',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_-iLtSl5H1MNR5iIndeWpSw_MVq8qDg4'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);