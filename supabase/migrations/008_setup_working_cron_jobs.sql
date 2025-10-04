-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing jobs if they exist
SELECT cron.unschedule('morning-discovery-pipeline') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'morning-discovery-pipeline'
);
SELECT cron.unschedule('weekly-venue-refresh') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-venue-refresh'
);
SELECT cron.unschedule('deep-discovery-biweekly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'deep-discovery-biweekly'
);

-- Daily morning discovery pipeline (8 AM UTC = 6 PM Sydney)
-- Discovers trending venues/services and researches top 5
SELECT cron.schedule(
  'morning-discovery-pipeline',
  '0 8 * * *', -- Every day at 8 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/morning-discovery-pipeline',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Weekly venue refresh (Sunday 2 AM UTC)
-- Refreshes 10 oldest listings with updated data
SELECT cron.schedule(
  'weekly-venue-refresh',
  '0 2 * * 0', -- Every Sunday at 2 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/scheduled-venue-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Bi-weekly deep discovery (Wednesday & Saturday 10 AM UTC)
-- Runs full discovery across all 15 cities for maximum coverage
SELECT cron.schedule(
  'deep-discovery-biweekly',
  '0 10 * * 3,6', -- Wednesday and Saturday at 10 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discover-trending-venues',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M'
      ),
      body := '{"expandedSearch": true}'::jsonb
    );
  $$
);

-- Add services discovery to the daily cycle (10 AM UTC)
SELECT cron.schedule(
  'daily-services-discovery',
  '0 10 * * *', -- Every day at 10 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discover-wedding-services',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- View all scheduled jobs
COMMENT ON EXTENSION pg_cron IS 'Automated scheduling for continuous venue and service discovery with push notifications';

-- Create a view to easily check cron jobs
CREATE OR REPLACE VIEW cron_jobs_status AS
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobname;

COMMENT ON VIEW cron_jobs_status IS 'View all scheduled cron jobs for automation monitoring';
