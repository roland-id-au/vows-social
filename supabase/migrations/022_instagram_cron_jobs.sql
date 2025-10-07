-- Add cron jobs for Instagram monitoring and trend discovery

-- ============================================
-- INSTAGRAM MONITOR PROCESSOR
-- Process Instagram monitoring tasks every 30 minutes
-- ============================================
SELECT cron.schedule(
  'instagram-monitor-processor',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
      url:='https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-monitor-processor',
      headers:=json_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'
      )::jsonb,
      body:=json_build_object()::jsonb
    ) AS request_id;
  $$
);

-- ============================================
-- INSTAGRAM TREND DISCOVERY PROCESSOR
-- Process trend discovery tasks every 6 hours
-- ============================================
SELECT cron.schedule(
  'instagram-trend-processor',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
      url:='https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-trend-processor',
      headers:=json_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'
      )::jsonb,
      body:=json_build_object()::jsonb
    ) AS request_id;
  $$
);
