-- Make state column nullable across all tables
-- We use country + city for location (more universal, works internationally)
-- Location string format: "City, Country" (e.g., "Sydney, Australia")

-- discovered_listings
ALTER TABLE discovered_listings ALTER COLUMN state DROP NOT NULL;

-- Update existing records with empty state
UPDATE discovered_listings SET state = NULL WHERE state = '';

-- enrichment_queue (if it has state)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrichment_queue' AND column_name = 'state'
  ) THEN
    ALTER TABLE enrichment_queue ALTER COLUMN state DROP NOT NULL;
    UPDATE enrichment_queue SET state = NULL WHERE state = '';
  END IF;
END $$;

-- listings (if it has state)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'state'
  ) THEN
    ALTER TABLE listings ALTER COLUMN state DROP NOT NULL;
    UPDATE listings SET state = NULL WHERE state = '';
  END IF;
END $$;

-- Add full address and geocoded coordinates for radius searches
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS coordinates GEOGRAPHY(POINT);

ALTER TABLE listings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS coordinates GEOGRAPHY(POINT);

-- Create spatial index for efficient radius queries
CREATE INDEX IF NOT EXISTS idx_discovered_listings_coordinates ON discovered_listings USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_listings_coordinates ON listings USING GIST(coordinates);

-- Add comment explaining location strategy
COMMENT ON COLUMN discovered_listings.city IS 'City name (part of country+city location model)';
COMMENT ON COLUMN discovered_listings.country IS 'Country name (part of country+city location model)';
COMMENT ON COLUMN discovered_listings.location IS 'Human-readable location string: "City, Country"';
COMMENT ON COLUMN discovered_listings.address IS 'Full street address for precise location';
COMMENT ON COLUMN discovered_listings.coordinates IS 'Geocoded coordinates (PostGIS POINT) for radius searches';
COMMENT ON COLUMN discovered_listings.state IS 'DEPRECATED: Use city+country instead. Kept for backward compatibility.';

COMMENT ON COLUMN listings.address IS 'Full street address for precise location';
COMMENT ON COLUMN listings.coordinates IS 'Geocoded coordinates (PostGIS POINT) for radius searches';

-- Helper function: Find listings within radius (in meters)
CREATE OR REPLACE FUNCTION find_listings_near(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 50000 -- Default 50km
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  city TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.city,
    ST_Distance(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_meters
  FROM listings l
  WHERE l.coordinates IS NOT NULL
    AND ST_DWithin(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;
