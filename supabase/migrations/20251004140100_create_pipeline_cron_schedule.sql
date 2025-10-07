-- Pipeline Cron Schedule
-- Implements strategic discovery → enrichment → notification flow

-- Drop old renamed cron jobs first
DO $$
BEGIN
  PERFORM cron.unschedule('daily-discovery-pipeline');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-venues-refresh');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('biweekly-venues-discovery');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-services-discovery');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-instagram-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- ENRICHMENT QUEUE (Every 5 minutes)
-- ============================================================================

SELECT cron.schedule(
  'enrichment-process-queue-continuous',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/enrichment-process-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============================================================================
-- DISCOVERY PHASE (Early morning 4-6 AM)
-- ============================================================================

-- Instagram Venues Discovery - Sydney (4:00 AM AEST = 6:00 PM UTC previous day)
SELECT cron.schedule(
  'discovery-instagram-venues-sydney',
  '0 18 * * *',
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

-- Instagram Venues Discovery - Melbourne (4:30 AM AEST = 6:30 PM UTC previous day)
SELECT cron.schedule(
  'discovery-instagram-venues-melbourne',
  '30 18 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-venues',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'city', 'Melbourne',
        'state', 'VIC'
      )
    ) AS request_id;
  $$
);

-- Instagram Services Discovery - Photographers (5:00 AM AEST = 7:00 PM UTC previous day)
SELECT cron.schedule(
  'discovery-instagram-services-photographers',
  '0 19 * * *',
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

-- ============================================================================
-- INSTAGRAM SYNC (6:00 AM AEST = 8:00 PM UTC previous day)
-- ============================================================================

SELECT cron.schedule(
  'instagram-sync-vendors-daily',
  '0 20 * * *',
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

-- ============================================================================
-- NOTIFICATION SENDING (Strategic times)
-- ============================================================================
-- Note: Notification sender functions to be created

-- Morning Notifications (7:30 AM AEST = 9:30 PM UTC previous day)
-- SELECT cron.schedule(
--   'notifications-morning-send',
--   '30 21 * * *',
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/notifications-send',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--       ),
--       body := jsonb_build_object('time_slot', 'morning')
--     ) AS request_id;
--   $$
-- );

-- Lunch Notifications (12:30 PM AEST = 2:30 AM UTC)
-- SELECT cron.schedule(
--   'notifications-lunch-send',
--   '30 2 * * *',
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/notifications-send',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--       ),
--       body := jsonb_build_object('time_slot', 'lunch')
--     ) AS request_id;
--   $$
-- );

-- Evening Notifications (6:30 PM AEST = 8:30 AM UTC)
-- SELECT cron.schedule(
--   'notifications-evening-send',
--   '30 8 * * *',
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/notifications-send',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--       ),
--       body := jsonb_build_object('time_slot', 'evening')
--     ) AS request_id;
--   $$
-- );

-- ============================================================================
-- WEEKLY MAINTENANCE (Sunday 10 AM AEST = Sunday 12 AM UTC)
-- ============================================================================

SELECT cron.schedule(
  'maintenance-refresh-stale-weekly',
  '0 0 * * 0',
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

-- ============================================================================
-- MONITORING & REPORTING
-- ============================================================================

-- Daily Operations Report (9:00 AM AEST = 11:00 PM UTC previous day)
-- Commented out until reporting-daily-digest is created
-- SELECT cron.schedule(
--   'reporting-daily-digest',
--   '0 23 * * *',
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
