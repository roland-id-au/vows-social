-- Update cron jobs to use renamed function names

-- Drop old cron jobs if they exist
DO $$
BEGIN
  PERFORM cron.unschedule('morning-discovery-pipeline');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-venue-refresh');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('deep-discovery-biweekly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-services-discovery');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-report');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-instagram-vendors');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Recreate with new function names

-- Daily discovery pipeline at 8 AM UTC
SELECT cron.schedule(
  'daily-discovery-pipeline',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-run-pipeline',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Weekly venue refresh on Sundays at 2 AM UTC
SELECT cron.schedule(
  'weekly-venues-refresh',
  '0 2 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/maintenance-venues-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Biweekly deep discovery on 1st and 15th at 6 AM UTC
SELECT cron.schedule(
  'biweekly-venues-discovery',
  '0 6 1,15 * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-venues',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'city', 'Sydney',
        'state', 'NSW'
      )
    ) AS request_id;
  $$
);

-- Daily services discovery at 7 AM UTC
SELECT cron.schedule(
  'daily-services-discovery',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-services',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'service_type', 'photographer',
        'city', 'Sydney',
        'state', 'NSW'
      )
    ) AS request_id;
  $$
);

-- Daily Instagram sync at 6 AM UTC
SELECT cron.schedule(
  'daily-instagram-sync',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-sync-vendors',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Daily reporting digest at 9 AM UTC (to be created)
-- Commented out until reporting-daily-digest function is created
-- SELECT cron.schedule(
--   'daily-reporting-digest',
--   '0 9 * * *',
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/reporting-daily-digest',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--   $$
-- );
