-- Add URL-friendly slugs to listings table
-- Format: "venue-name-city-state" e.g. "deckhouse-woolwich-sydney-nsw"

ALTER TABLE listings
  ADD COLUMN slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_listings_slug ON listings(slug);

-- Generate slugs for existing listings
UPDATE listings
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(title, 'listing') || '-' ||
      COALESCE((location_data::jsonb)->>'city', 'unknown') || '-' ||
      COALESCE((location_data::jsonb)->>'state', 'unknown'),
      '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
    ),
    '\s+', '-', 'g'  -- Replace spaces with hyphens
  )
);

-- Make slug NOT NULL after populating
ALTER TABLE listings
  ALTER COLUMN slug SET NOT NULL;

COMMENT ON COLUMN listings.slug IS 'URL-friendly slug for SEO (format: venue-name-city-state)';
