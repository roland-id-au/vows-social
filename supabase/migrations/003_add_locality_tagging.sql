-- Migration: Add country tagging for international expansion

-- Add country field to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- Add country to discovered_venues
ALTER TABLE discovered_venues ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- Create index for country searches
CREATE INDEX IF NOT EXISTS idx_listings_country ON listings(country);
CREATE INDEX IF NOT EXISTS idx_listings_city_country ON listings((location_data->>'city'), country);

CREATE INDEX IF NOT EXISTS idx_discovered_country ON discovered_venues(country);

COMMENT ON COLUMN listings.country IS 'Country (default: Australia, expandable to other countries)';
COMMENT ON COLUMN discovered_venues.country IS 'Country (default: Australia, expandable to other countries)';
