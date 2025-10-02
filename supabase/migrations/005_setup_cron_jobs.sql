-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Daily morning discovery pipeline (8 AM Sydney time)
-- Discovers trending venues and researches top 3
SELECT cron.schedule(
  'morning-discovery-pipeline',
  '0 8 * * *', -- Every day at 8 AM
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/morning-discovery-pipeline',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Weekly venue refresh (Sunday 2 AM Sydney time)
-- Refreshes 10 oldest venues with updated data
SELECT cron.schedule(
  'weekly-venue-refresh',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/scheduled-venue-refresh',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Bi-weekly deep discovery (Wednesday 10 AM, Saturday 10 AM)
-- Runs full discovery across all cities for maximum coverage
SELECT cron.schedule(
  'deep-discovery-biweekly',
  '0 10 * * 3,6', -- Wednesday and Saturday at 10 AM
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discover-trending-venues',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{"expandedSearch": true}'::jsonb
    ) AS request_id;
  $$
);

-- View cron jobs
-- SELECT * FROM cron.job;

-- Unschedule a job (if needed):
-- SELECT cron.unschedule('morning-discovery-pipeline');

COMMENT ON EXTENSION pg_cron IS 'Automated scheduling for continuous venue discovery and enrichment';
