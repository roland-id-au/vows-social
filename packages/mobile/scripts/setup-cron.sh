#!/bin/bash
# Setup cron jobs for automated discovery and refresh

set -e

echo "⏰ Setting up Cron Jobs"
echo "======================"
echo ""

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    exit 1
fi

echo "This will create SQL cron jobs in your Supabase database."
echo "Make sure you have the pg_cron extension enabled."
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Get project details
PROJECT_REF=$(cat .supabase/config.toml | grep project_id | cut -d'"' -f2)
SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | cut -d':' -f2 | xargs)

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "Please enter your Supabase Service Role Key:"
    read -s SERVICE_ROLE_KEY
fi

# Create SQL file for cron jobs
cat > /tmp/cron_setup.sql << EOF
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing jobs if they exist
SELECT cron.unschedule('morning-discovery-pipeline');
SELECT cron.unschedule('weekly-venue-refresh');

-- Daily Morning Discovery Pipeline (8:00 AM)
SELECT cron.schedule(
  'morning-discovery-pipeline',
  '0 8 * * *', -- Every day at 8:00 AM
  \$\$
  SELECT net.http_post(
    url := 'https://v1-api.vows.social/functions/v1/morning-discovery-pipeline',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ${SERVICE_ROLE_KEY}',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  \$\$
);

-- Weekly Venue Refresh (Sunday 2:00 AM)
SELECT cron.schedule(
  'weekly-venue-refresh',
  '0 2 * * 0', -- Every Sunday at 2:00 AM
  \$\$
  SELECT net.http_post(
    url := 'https://v1-api.vows.social/functions/v1/scheduled-venue-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ${SERVICE_ROLE_KEY}',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  \$\$
);

-- View scheduled jobs
SELECT * FROM cron.job;
EOF

echo "📝 Created cron job SQL script"
echo ""
echo "Executing SQL to set up cron jobs..."

supabase db execute < /tmp/cron_setup.sql

rm /tmp/cron_setup.sql

echo ""
echo "✅ Cron jobs configured!"
echo ""
echo "Scheduled jobs:"
echo "  ☀️  Morning Discovery Pipeline - Daily at 8:00 AM"
echo "  🔄 Weekly Venue Refresh - Sundays at 2:00 AM"
echo ""
echo "To view jobs, run:"
echo "  supabase db execute 'SELECT * FROM cron.job;'"
echo ""
