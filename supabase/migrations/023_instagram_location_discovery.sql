-- Add location-based discovery support to Instagram integration

-- ============================================
-- Update instagram_trend_queue to support both hashtag and location discovery
-- ============================================

ALTER TABLE instagram_trend_queue
  ADD COLUMN IF NOT EXISTS discovery_type TEXT DEFAULT 'hashtag' CHECK (discovery_type IN ('hashtag', 'location')),
  ADD COLUMN IF NOT EXISTS location_query TEXT; -- e.g., "Sydney, Australia"

-- Make hashtag nullable (required for hashtag discovery, null for location discovery)
ALTER TABLE instagram_trend_queue ALTER COLUMN hashtag DROP NOT NULL;

-- Update unique constraint to include discovery_type
ALTER TABLE instagram_trend_queue
  DROP CONSTRAINT IF EXISTS instagram_trend_queue_hashtag_country_city_service_type_key;

-- For hashtag discoveries, hashtag is required
-- For location discoveries, location_query is required
-- Both can exist for same city/country/service_type

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_instagram_trend_location ON instagram_trend_queue(location_query) WHERE discovery_type = 'location';

-- ============================================
-- Update instagram_trend_config to support location discovery
-- ============================================

ALTER TABLE instagram_trend_config
  ADD COLUMN IF NOT EXISTS discovery_type TEXT DEFAULT 'hashtag' CHECK (discovery_type IN ('hashtag', 'location')),
  ADD COLUMN IF NOT EXISTS location_query TEXT;

-- Make hashtag nullable (required for hashtag discovery, null for location discovery)
ALTER TABLE instagram_trend_config ALTER COLUMN hashtag DROP NOT NULL;

-- Update unique constraint
ALTER TABLE instagram_trend_config
  DROP CONSTRAINT IF EXISTS instagram_trend_config_hashtag_country_city_service_type_key;

ALTER TABLE instagram_trend_config
  ADD CONSTRAINT instagram_trend_config_unique_key
  UNIQUE(discovery_type, hashtag, location_query, country, city, service_type);

-- ============================================
-- Seed location-based discovery for major cities
-- ============================================

INSERT INTO instagram_trend_config (discovery_type, location_query, country, city, service_type, priority, discovery_interval_hours) VALUES
  -- Australia - Major Cities (Location-based discovery)
  ('location', 'Sydney, Australia', 'Australia', 'Sydney', 'venue', 1, 168),
  ('location', 'Melbourne, Australia', 'Australia', 'Melbourne', 'venue', 1, 168),
  ('location', 'Brisbane, Australia', 'Australia', 'Brisbane', 'venue', 1, 168),
  ('location', 'Gold Coast, Australia', 'Australia', 'Gold Coast', 'venue', 1, 168),
  ('location', 'Perth, Australia', 'Australia', 'Perth', 'venue', 1, 168),
  ('location', 'Adelaide, Australia', 'Australia', 'Adelaide', 'venue', 1, 168),

  -- Regional areas
  ('location', 'Byron Bay, Australia', 'Australia', 'Byron Bay', 'venue', 2, 168),
  ('location', 'Hunter Valley, Australia', 'Australia', 'Hunter Valley', 'venue', 2, 168),
  ('location', 'Yarra Valley, Australia', 'Australia', 'Yarra Valley', 'venue', 2, 168),
  ('location', 'Margaret River, Australia', 'Australia', 'Margaret River', 'venue', 2, 168),
  ('location', 'Barossa Valley, Australia', 'Australia', 'Barossa Valley', 'venue', 2, 168),

  -- Photographers by location
  ('location', 'Sydney, Australia', 'Australia', 'Sydney', 'photographer', 2, 168),
  ('location', 'Melbourne, Australia', 'Australia', 'Melbourne', 'photographer', 2, 168),
  ('location', 'Brisbane, Australia', 'Australia', 'Brisbane', 'photographer', 2, 168)

ON CONFLICT ON CONSTRAINT instagram_trend_config_unique_key DO NOTHING;

-- ============================================
-- Update helper function for location-based discovery
-- ============================================

CREATE OR REPLACE FUNCTION get_next_instagram_trend_task()
RETURNS instagram_trend_queue AS $$
  SELECT *
  FROM instagram_trend_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY
    priority ASC,
    -- Prioritize location-based discovery (more accurate)
    CASE WHEN discovery_type = 'location' THEN 0 ELSE 1 END,
    scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$ LANGUAGE SQL;

-- ============================================
-- Comments for clarity
-- ============================================

COMMENT ON COLUMN instagram_trend_queue.discovery_type IS 'Type of discovery: "hashtag" or "location"';
COMMENT ON COLUMN instagram_trend_queue.location_query IS 'Location search query (e.g., "Sydney, Australia") - used when discovery_type = "location"';
COMMENT ON COLUMN instagram_trend_config.discovery_type IS 'Type of discovery: "hashtag" or "location"';
COMMENT ON COLUMN instagram_trend_config.location_query IS 'Location search query - used when discovery_type = "location"';
