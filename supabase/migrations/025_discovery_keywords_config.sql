-- Discovery Keywords Configuration
-- Stores search queries built from location + service type + keywords

-- Add keywords column to discovery_config
ALTER TABLE discovery_config
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN discovery_config.keywords IS 'Search keywords for this discovery (e.g., ["wedding venue", "reception venue"])';

-- Clear and reseed with keyword-based configuration
TRUNCATE TABLE discovery_config;

-- =============================================================================
-- VENUES (Priority 1 - Major Cities)
-- =============================================================================
INSERT INTO discovery_config (country, city, service_type, keywords, priority, interval_hours, google_maps_url) VALUES
  -- Major Cities
  ('Australia', 'Sydney', 'venue', ARRAY['wedding venue', 'wedding venues', 'reception venue'], 1, 24, 'https://maps.google.com/?q=Sydney+Australia'),
  ('Australia', 'Melbourne', 'venue', ARRAY['wedding venue', 'wedding venues', 'reception venue'], 1, 24, 'https://maps.google.com/?q=Melbourne+Australia'),
  ('Australia', 'Brisbane', 'venue', ARRAY['wedding venue', 'wedding venues', 'reception venue'], 1, 24, 'https://maps.google.com/?q=Brisbane+Australia'),
  ('Australia', 'Gold Coast', 'venue', ARRAY['wedding venue', 'wedding venues'], 1, 24, 'https://maps.google.com/?q=Gold+Coast+Australia'),
  ('Australia', 'Perth', 'venue', ARRAY['wedding venue', 'wedding venues'], 1, 24, 'https://maps.google.com/?q=Perth+Australia'),
  ('Australia', 'Adelaide', 'venue', ARRAY['wedding venue', 'wedding venues'], 1, 24, 'https://maps.google.com/?q=Adelaide+Australia'),

  -- Regional Destinations (Priority 2)
  ('Australia', 'Byron Bay', 'venue', ARRAY['wedding venue', 'wedding venues'], 2, 48, 'https://maps.google.com/?q=Byron+Bay+Australia'),
  ('Australia', 'Hunter Valley', 'venue', ARRAY['wedding venue', 'winery wedding'], 2, 48, 'https://maps.google.com/?q=Hunter+Valley+Australia'),
  ('Australia', 'Yarra Valley', 'venue', ARRAY['wedding venue', 'winery wedding'], 2, 48, 'https://maps.google.com/?q=Yarra+Valley+Australia'),
  ('Australia', 'Margaret River', 'venue', ARRAY['wedding venue', 'winery wedding'], 2, 48, 'https://maps.google.com/?q=Margaret+River+Australia'),
  ('Australia', 'Barossa Valley', 'venue', ARRAY['wedding venue', 'winery wedding'], 2, 48, 'https://maps.google.com/?q=Barossa+Valley+Australia'),
  ('Australia', 'Sunshine Coast', 'venue', ARRAY['wedding venue', 'beach wedding venue'], 2, 48, 'https://maps.google.com/?q=Sunshine+Coast+Australia'),
  ('Australia', 'Cairns', 'venue', ARRAY['wedding venue', 'tropical wedding venue'], 2, 48, 'https://maps.google.com/?q=Cairns+Australia'),
  ('Australia', 'Noosa', 'venue', ARRAY['wedding venue', 'beach wedding venue'], 2, 48, 'https://maps.google.com/?q=Noosa+Australia'),
  ('Australia', 'Port Douglas', 'venue', ARRAY['wedding venue', 'tropical wedding venue'], 2, 48, 'https://maps.google.com/?q=Port+Douglas+Australia'),
  ('Australia', 'Mornington Peninsula', 'venue', ARRAY['wedding venue', 'coastal wedding venue'], 2, 48, 'https://maps.google.com/?q=Mornington+Peninsula+Australia'),

  -- Secondary Cities (Priority 3)
  ('Australia', 'Hobart', 'venue', ARRAY['wedding venue'], 3, 72, 'https://maps.google.com/?q=Hobart+Australia'),
  ('Australia', 'Canberra', 'venue', ARRAY['wedding venue'], 3, 72, 'https://maps.google.com/?q=Canberra+Australia'),
  ('Australia', 'Newcastle', 'venue', ARRAY['wedding venue'], 3, 72, 'https://maps.google.com/?q=Newcastle+Australia'),
  ('Australia', 'Wollongong', 'venue', ARRAY['wedding venue'], 3, 72, 'https://maps.google.com/?q=Wollongong+Australia')

ON CONFLICT (country, city, service_type) DO NOTHING;

-- =============================================================================
-- PHOTOGRAPHERS (Priority 2 - Major Cities)
-- =============================================================================
INSERT INTO discovery_config (country, city, service_type, keywords, priority, interval_hours, google_maps_url) VALUES
  ('Australia', 'Sydney', 'photographer', ARRAY['wedding photographer', 'wedding photographers'], 2, 48, 'https://maps.google.com/?q=Sydney+Australia'),
  ('Australia', 'Melbourne', 'photographer', ARRAY['wedding photographer', 'wedding photographers'], 2, 48, 'https://maps.google.com/?q=Melbourne+Australia'),
  ('Australia', 'Brisbane', 'photographer', ARRAY['wedding photographer', 'wedding photographers'], 2, 48, 'https://maps.google.com/?q=Brisbane+Australia'),
  ('Australia', 'Gold Coast', 'photographer', ARRAY['wedding photographer', 'wedding photographers'], 2, 48, 'https://maps.google.com/?q=Gold+Coast+Australia')

ON CONFLICT (country, city, service_type) DO NOTHING;

-- =============================================================================
-- VIDEOGRAPHERS (Priority 2)
-- =============================================================================
INSERT INTO discovery_config (country, city, service_type, keywords, priority, interval_hours, google_maps_url) VALUES
  ('Australia', 'Sydney', 'videographer', ARRAY['wedding videographer', 'wedding videographers'], 2, 48, 'https://maps.google.com/?q=Sydney+Australia'),
  ('Australia', 'Melbourne', 'videographer', ARRAY['wedding videographer', 'wedding videographers'], 2, 48, 'https://maps.google.com/?q=Melbourne+Australia')

ON CONFLICT (country, city, service_type) DO NOTHING;

-- =============================================================================
-- FLORISTS (Priority 3)
-- =============================================================================
INSERT INTO discovery_config (country, city, service_type, keywords, priority, interval_hours, google_maps_url) VALUES
  ('Australia', 'Sydney', 'florist', ARRAY['wedding florist', 'wedding flowers'], 3, 72, 'https://maps.google.com/?q=Sydney+Australia'),
  ('Australia', 'Melbourne', 'florist', ARRAY['wedding florist', 'wedding flowers'], 3, 72, 'https://maps.google.com/?q=Melbourne+Australia')

ON CONFLICT (country, city, service_type) DO NOTHING;

-- =============================================================================
-- CATERERS (Priority 3)
-- =============================================================================
INSERT INTO discovery_config (country, city, service_type, keywords, priority, interval_hours, google_maps_url) VALUES
  ('Australia', 'Sydney', 'caterer', ARRAY['wedding caterer', 'wedding catering'], 3, 72, 'https://maps.google.com/?q=Sydney+Australia'),
  ('Australia', 'Melbourne', 'caterer', ARRAY['wedding caterer', 'wedding catering'], 3, 72, 'https://maps.google.com/?q=Melbourne+Australia')

ON CONFLICT (country, city, service_type) DO NOTHING;

-- =============================================================================
-- HELPER VIEW: Discovery Queries
-- =============================================================================

CREATE OR REPLACE VIEW discovery_queries_view AS
SELECT
  id,
  service_type,
  city,
  country,
  keywords,
  priority,
  interval_hours,
  enabled,
  -- Generate example query
  keywords[1] || ' in ' || city || ', ' || country as example_query,
  -- Count how many discovery tasks will be created
  array_length(keywords, 1) as queries_per_location
FROM discovery_config
WHERE enabled = true
ORDER BY priority, city;

COMMENT ON VIEW discovery_queries_view IS 'Shows what discovery queries will be generated from config';
