-- Update cron jobs to use event-driven queue processors

-- Remove old cron jobs if they exist
DO $$
BEGIN
  PERFORM cron.unschedule('australia-wide-venue-discovery');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('enrichment-queue-processor');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-stale-processing');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================
-- DISCOVERY PROCESSOR
-- Process discovery tasks every 30 minutes
-- ============================================
SELECT cron.schedule(
  'discovery-processor',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
      url:='https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor',
      headers:=json_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'
      )::jsonb,
      body:=json_build_object()::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- ENRICHMENT PROCESSOR
-- Process enrichment tasks every 5 minutes
-- ============================================
SELECT cron.schedule(
  'enrichment-processor',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/enrichment-processor',
      headers:=json_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'
      )::jsonb,
      body:=json_build_object()::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- PUBLISHING PROCESSOR
-- Process publishing tasks every 5 minutes
-- ============================================
SELECT cron.schedule(
  'publishing-processor',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/publishing-processor',
      headers:=json_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'
      )::jsonb,
      body:=json_build_object()::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- RETRY FAILED TASKS
-- Retry failed tasks with exponential backoff every hour
-- ============================================
SELECT cron.schedule(
  'retry-failed-tasks',
  '0 * * * *', -- Every hour
  $$
  SELECT retry_failed_tasks();
  $$
);
