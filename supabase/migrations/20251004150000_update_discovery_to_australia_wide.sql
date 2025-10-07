-- Update Discovery to Australia-Wide Strategy
-- Replace city-by-city discovery with comprehensive Australia-wide discovery

-- Drop old city-specific discovery jobs
DO $$
BEGIN
  PERFORM cron.unschedule('discovery-instagram-venues-sydney');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('discovery-instagram-venues-melbourne');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('discovery-instagram-services-photographers');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- AUSTRALIA-WIDE DISCOVERY (More comprehensive, runs less frequently)
-- ============================================================================

-- Venues: Weekly on Sundays at 3 AM AEST (5 PM UTC Saturday)
SELECT cron.schedule(
  'discovery-australia-venues-weekly',
  '0 17 * * 6', -- Saturday 5 PM UTC = Sunday 3 AM AEST
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-australia-wide',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('service_type', 'venue')
    ) AS request_id;
  $$
);

-- Photographers: Bi-weekly on 1st and 15th at 3:30 AM AEST (5:30 PM UTC previous day)
SELECT cron.schedule(
  'discovery-australia-photographers-biweekly',
  '30 17 1,15 * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-australia-wide',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('service_type', 'photographer')
    ) AS request_id;
  $$
);

-- Florists: Monthly on 1st at 4 AM AEST (6 PM UTC previous day)
SELECT cron.schedule(
  'discovery-australia-florists-monthly',
  '0 18 1 * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-australia-wide',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('service_type', 'florist')
    ) AS request_id;
  $$
);

-- Planners: Monthly on 8th at 4 AM AEST (6 PM UTC previous day)
SELECT cron.schedule(
  'discovery-australia-planners-monthly',
  '0 18 8 * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-australia-wide',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('service_type', 'planner')
    ) AS request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Pipeline: Australia-wide discovery (weekly/biweekly) → Enrichment (every 5min) → Notifications (strategic times)';
