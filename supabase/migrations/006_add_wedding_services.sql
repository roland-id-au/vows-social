-- Expand database to support all wedding services (caterers, florists, photographers, etc.)
-- Not just venues, but complete wedding marketplace

-- Update category enum to include all wedding service types
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'caterer';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'florist';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'photographer';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'videographer';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'musician';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'stylist';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'planner';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'decorator';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'celebrant';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'cake';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'makeup';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'hair';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'entertainment';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'rentals';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'stationery';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'favors';
ALTER TYPE listing_category ADD VALUE IF NOT EXISTS 'other_service';

-- Create service_type column for better categorization
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Add service-specific metadata
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS service_metadata JSONB DEFAULT '{}'::jsonb;

-- Update discovered_venues table to match
ALTER TABLE discovered_venues
ALTER COLUMN type TYPE TEXT;

-- Create index for service type searches
CREATE INDEX IF NOT EXISTS idx_listings_service_type ON listings(service_type);
CREATE INDEX IF NOT EXISTS idx_listings_category_service ON listings(category, service_type);

-- Create view for wedding services (excluding just venues)
CREATE OR REPLACE VIEW wedding_services AS
SELECT
  id,
  title,
  category,
  service_type,
  country,
  location_data->>'city' as city,
  location_data->>'state' as state,
  price_data,
  rating,
  review_count,
  description
FROM listings
WHERE category != 'venue'
ORDER BY rating DESC, review_count DESC;

-- Create view for complete marketplace (venues + services)
CREATE OR REPLACE VIEW wedding_marketplace AS
SELECT
  id,
  title,
  category,
  service_type,
  country,
  location_data->>'city' as city,
  location_data->>'state' as state,
  price_data,
  rating,
  review_count,
  description,
  CASE
    WHEN category = 'venue' THEN 'Venue'
    WHEN category = 'caterer' THEN 'Catering'
    WHEN category = 'florist' THEN 'Florals'
    WHEN category = 'photographer' THEN 'Photography'
    WHEN category = 'videographer' THEN 'Videography'
    WHEN category = 'musician' THEN 'Music'
    WHEN category = 'stylist' THEN 'Styling'
    WHEN category = 'planner' THEN 'Planning'
    ELSE 'Other Services'
  END as category_display
FROM listings
ORDER BY category, rating DESC;

COMMENT ON VIEW wedding_services IS 'All wedding services excluding venues';
COMMENT ON VIEW wedding_marketplace IS 'Complete wedding marketplace: venues + all services';
COMMENT ON COLUMN listings.service_type IS 'Specific service type (e.g., "Fine Dining Caterer", "Wedding Photographer", etc.)';
COMMENT ON COLUMN listings.service_metadata IS 'Service-specific details (e.g., cuisine types, photography styles, music genres, etc.)';
