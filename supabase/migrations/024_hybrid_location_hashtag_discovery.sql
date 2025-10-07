-- Hybrid Location + Hashtag Discovery
-- Search for specific hashtags (#wedding, #venue) WITHIN a location

-- ============================================
-- Update instagram_trend_queue to support hashtag filtering on location searches
-- ============================================

ALTER TABLE instagram_trend_queue
  ADD COLUMN IF NOT EXISTS hashtag_filter TEXT; -- e.g., "wedding" or "venue" - used to filter location results

CREATE INDEX IF NOT EXISTS idx_instagram_trend_hashtag_filter ON instagram_trend_queue(hashtag_filter) WHERE hashtag_filter IS NOT NULL;

COMMENT ON COLUMN instagram_trend_queue.hashtag_filter IS 'Optional hashtag to filter location-based searches (e.g., "wedding", "venue")';

-- ============================================
-- Update instagram_trend_config to support hashtag filtering
-- ============================================

ALTER TABLE instagram_trend_config
  ADD COLUMN IF NOT EXISTS hashtag_filter TEXT;

COMMENT ON COLUMN instagram_trend_config.hashtag_filter IS 'Optional hashtag to filter location-based searches';

-- ============================================
-- Clear existing config and reseed with hybrid approach
-- ============================================

TRUNCATE TABLE instagram_trend_config;

-- Hybrid Discovery: Location + Hashtag filtering
-- This finds posts with #wedding or #venue tagged at specific locations

INSERT INTO instagram_trend_config (discovery_type, location_query, hashtag_filter, country, city, service_type, priority, discovery_interval_hours) VALUES
  -- Major Cities - Wedding Venues (Location + #wedding or #venue)
  ('location', 'Sydney, Australia', 'wedding', 'Australia', 'Sydney', 'venue', 1, 168),
  ('location', 'Sydney, Australia', 'venue', 'Australia', 'Sydney', 'venue', 1, 168),

  ('location', 'Melbourne, Australia', 'wedding', 'Australia', 'Melbourne', 'venue', 1, 168),
  ('location', 'Melbourne, Australia', 'venue', 'Australia', 'Melbourne', 'venue', 1, 168),

  ('location', 'Brisbane, Australia', 'wedding', 'Australia', 'Brisbane', 'venue', 1, 168),
  ('location', 'Brisbane, Australia', 'venue', 'Australia', 'Brisbane', 'venue', 1, 168),

  ('location', 'Gold Coast, Australia', 'wedding', 'Australia', 'Gold Coast', 'venue', 1, 168),
  ('location', 'Perth, Australia', 'wedding', 'Australia', 'Perth', 'venue', 1, 168),
  ('location', 'Adelaide, Australia', 'wedding', 'Australia', 'Adelaide', 'venue', 1, 168),

  -- Regional Wedding Destinations
  ('location', 'Byron Bay, Australia', 'wedding', 'Australia', 'Byron Bay', 'venue', 1, 168),
  ('location', 'Hunter Valley, Australia', 'wedding', 'Australia', 'Hunter Valley', 'venue', 1, 168),
  ('location', 'Yarra Valley, Australia', 'wedding', 'Australia', 'Yarra Valley', 'venue', 1, 168),
  ('location', 'Margaret River, Australia', 'wedding', 'Australia', 'Margaret River', 'venue', 2, 168),
  ('location', 'Barossa Valley, Australia', 'wedding', 'Australia', 'Barossa Valley', 'venue', 2, 168),
  ('location', 'Sunshine Coast, Australia', 'wedding', 'Australia', 'Sunshine Coast', 'venue', 2, 168),
  ('location', 'Cairns, Australia', 'wedding', 'Australia', 'Cairns', 'venue', 2, 168),
  ('location', 'Noosa, Australia', 'wedding', 'Australia', 'Noosa', 'venue', 2, 168),
  ('location', 'Port Douglas, Australia', 'wedding', 'Australia', 'Port Douglas', 'venue', 2, 168),

  -- Photographers by city
  ('location', 'Sydney, Australia', 'photographer', 'Australia', 'Sydney', 'photographer', 2, 168),
  ('location', 'Melbourne, Australia', 'photographer', 'Australia', 'Melbourne', 'photographer', 2, 168),
  ('location', 'Brisbane, Australia', 'photographer', 'Australia', 'Brisbane', 'photographer', 2, 168),

  -- Keep some pure hashtag searches for trending content
  ('hashtag', NULL, NULL, 'Australia', NULL, 'venue', 3, 168),
  ('hashtag', NULL, NULL, 'Australia', NULL, 'venue', 3, 168)

ON CONFLICT ON CONSTRAINT instagram_trend_config_unique_key DO NOTHING;

-- Update the hashtag rows with actual hashtags
UPDATE instagram_trend_config
SET hashtag = '#australianwedding'
WHERE ctid = (
  SELECT ctid FROM instagram_trend_config
  WHERE discovery_type = 'hashtag' AND service_type = 'venue'
  LIMIT 1
);

UPDATE instagram_trend_config
SET hashtag = '#auswedding'
WHERE ctid = (
  SELECT ctid FROM instagram_trend_config
  WHERE discovery_type = 'hashtag' AND service_type = 'venue' AND hashtag IS NULL
  LIMIT 1
);

-- ============================================
-- Update unique constraint to include hashtag_filter
-- ============================================

ALTER TABLE instagram_trend_config
  DROP CONSTRAINT IF EXISTS instagram_trend_config_unique_key;

ALTER TABLE instagram_trend_config
  ADD CONSTRAINT instagram_trend_config_unique_key
  UNIQUE(discovery_type, hashtag, location_query, hashtag_filter, country, city, service_type);

-- ============================================
-- Helper: View hybrid discovery tasks
-- ============================================

CREATE OR REPLACE VIEW instagram_hybrid_discovery_view AS
SELECT
  id,
  discovery_type,
  CASE
    WHEN discovery_type = 'location' AND hashtag_filter IS NOT NULL THEN
      location_query || ' + #' || hashtag_filter
    WHEN discovery_type = 'location' THEN
      location_query
    ELSE
      hashtag
  END as discovery_query,
  country,
  city,
  service_type,
  priority,
  status,
  posts_analyzed,
  new_vendors_discovered,
  last_discovered_at,
  next_discovery_at
FROM instagram_trend_queue
ORDER BY priority, next_discovery_at;

COMMENT ON VIEW instagram_hybrid_discovery_view IS 'Human-readable view of Instagram discovery tasks showing hybrid location+hashtag queries';
