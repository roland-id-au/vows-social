-- Refactor location model: country + city instead of state
-- Makes it easy to expand internationally

-- ============================================
-- Update discovery_config for international support
-- ============================================

ALTER TABLE discovery_config DROP CONSTRAINT IF EXISTS discovery_config_state_city_service_type_key;

ALTER TABLE discovery_config
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia',
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Make state nullable for migration (we'll drop it later)
ALTER TABLE discovery_config ALTER COLUMN state DROP NOT NULL;

-- Update unique constraint
ALTER TABLE discovery_config
  ADD CONSTRAINT discovery_config_country_city_service_type_key
  UNIQUE(country, city, service_type);

-- Update indexes
DROP INDEX IF EXISTS idx_discovery_config_state;
CREATE INDEX idx_discovery_config_country_city ON discovery_config(country, city);

-- ============================================
-- Update existing data to include country
-- ============================================

UPDATE discovery_config SET country = 'Australia' WHERE country IS NULL;

-- Clear old data and reseed with country + city model
TRUNCATE TABLE discovery_config;

INSERT INTO discovery_config (country, city, service_type, priority, interval_hours, google_maps_url) VALUES
  -- Australia - Major Cities (Priority 1)
  ('Australia', 'Sydney', 'venue', 1, 24, 'https://maps.google.com/?q=Sydney+Australia'),
  ('Australia', 'Melbourne', 'venue', 1, 24, 'https://maps.google.com/?q=Melbourne+Australia'),
  ('Australia', 'Brisbane', 'venue', 1, 24, 'https://maps.google.com/?q=Brisbane+Australia'),
  ('Australia', 'Gold Coast', 'venue', 1, 24, 'https://maps.google.com/?q=Gold+Coast+Australia'),
  ('Australia', 'Perth', 'venue', 1, 24, 'https://maps.google.com/?q=Perth+Australia'),
  ('Australia', 'Adelaide', 'venue', 1, 24, 'https://maps.google.com/?q=Adelaide+Australia'),

  -- Australia - Regional (Priority 2)
  ('Australia', 'Byron Bay', 'venue', 2, 48, 'https://maps.google.com/?q=Byron+Bay+Australia'),
  ('Australia', 'Hunter Valley', 'venue', 2, 48, 'https://maps.google.com/?q=Hunter+Valley+Australia'),
  ('Australia', 'Yarra Valley', 'venue', 2, 48, 'https://maps.google.com/?q=Yarra+Valley+Australia'),
  ('Australia', 'Margaret River', 'venue', 2, 48, 'https://maps.google.com/?q=Margaret+River+Australia'),
  ('Australia', 'Barossa Valley', 'venue', 2, 48, 'https://maps.google.com/?q=Barossa+Valley+Australia'),
  ('Australia', 'Sunshine Coast', 'venue', 2, 48, 'https://maps.google.com/?q=Sunshine+Coast+Australia'),
  ('Australia', 'Cairns', 'venue', 2, 48, 'https://maps.google.com/?q=Cairns+Australia'),
  ('Australia', 'Hobart', 'venue', 2, 48, 'https://maps.google.com/?q=Hobart+Australia'),
  ('Australia', 'Canberra', 'venue', 2, 48, 'https://maps.google.com/?q=Canberra+Australia')

  -- Example: Ready for international expansion
  -- ('United States', 'New York', 'venue', 1, 24, 'https://maps.google.com/?q=New+York+USA'),
  -- ('United Kingdom', 'London', 'venue', 1, 24, 'https://maps.google.com/?q=London+UK'),
  -- ('New Zealand', 'Auckland', 'venue', 1, 24, 'https://maps.google.com/?q=Auckland+NZ')

ON CONFLICT (country, city, service_type) DO NOTHING;

-- ============================================
-- Update discovery_queue to use country + city
-- ============================================

ALTER TABLE discovery_queue
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- Update existing rows
UPDATE discovery_queue SET country = 'Australia' WHERE country IS NULL;

-- ============================================
-- Update discovered_listings to use country + city
-- ============================================

-- Already has country column, ensure it's populated
UPDATE discovered_listings SET country = 'Australia' WHERE country IS NULL OR country = '';

-- ============================================
-- Update enrichment_queue to use country + city
-- ============================================

ALTER TABLE enrichment_queue
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

UPDATE enrichment_queue SET country = 'Australia' WHERE country IS NULL;

-- ============================================
-- Helper function: Generate Google Maps URL
-- ============================================

CREATE OR REPLACE FUNCTION generate_google_maps_url(city TEXT, country TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://maps.google.com/?q=' ||
         REPLACE(city || '+' || country, ' ', '+');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
