-- Add cron job for Instagram vendor syncing
-- Runs daily at 6:00 AM UTC to sync vendor Instagram accounts

SELECT cron.schedule(
  'sync-instagram-vendors',
  '0 6 * * *', -- Daily at 6 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/sync-instagram-vendors',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
