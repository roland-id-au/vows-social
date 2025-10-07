-- Fix engagement_score to support values 0-100
-- Current DECIMAL(3,2) only supports 0-9.99

-- Drop all views that depend on discovered_listings
DROP VIEW IF EXISTS pending_discoveries CASCADE;
DROP VIEW IF EXISTS discovery_stats CASCADE;
DROP VIEW IF EXISTS enrichment_queue_status CASCADE;

-- Alter the column type
ALTER TABLE discovered_listings
  ALTER COLUMN engagement_score TYPE INTEGER USING FLOOR(engagement_score);

-- Recreate pending discoveries view
CREATE OR REPLACE VIEW pending_discoveries AS
SELECT * FROM discovered_listings
WHERE enrichment_status = 'pending'
ORDER BY engagement_score DESC, created_at DESC;

-- Recreate discovery stats view
CREATE OR REPLACE VIEW discovery_stats AS
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE enrichment_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE enrichment_status = 'enriched') as enriched,
  COUNT(*) FILTER (WHERE enrichment_status = 'failed') as failed,
  AVG(engagement_score) as avg_engagement
FROM discovered_listings;

COMMENT ON COLUMN discovered_listings.engagement_score IS 'Engagement score from 0-100 based on Instagram presence, trending status, etc.';
