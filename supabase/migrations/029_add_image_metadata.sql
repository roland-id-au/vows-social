-- Migration: Add image metadata storage
-- Adds title, description, tags, and dimensions to listing_media

-- Add metadata columns to listing_media
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE listing_media ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- Add indexes for searchability
CREATE INDEX IF NOT EXISTS idx_listing_media_tags ON listing_media USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_listing_media_title ON listing_media(title) WHERE title IS NOT NULL;

-- Function to generate alt text from image metadata
CREATE OR REPLACE FUNCTION generate_image_alt_text(
  p_vendor_name TEXT,
  p_city TEXT,
  p_service_type TEXT,
  p_image_index INTEGER
)
RETURNS TEXT AS $$
BEGIN
  -- Generate SEO-friendly alt text
  -- Example: "Gunners Barracks wedding venue in Mosman - Photo 1"
  RETURN p_vendor_name || ' ' || p_service_type || ' in ' || p_city || ' - Photo ' || p_image_index;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-generate image metadata from listing data
CREATE OR REPLACE FUNCTION update_image_metadata_from_listing()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
  v_image_num INTEGER;
BEGIN
  -- Get listing details
  SELECT
    title,
    location_data->>'city' as city,
    service_type,
    style
  INTO v_listing
  FROM listings
  WHERE id = NEW.listing_id;

  -- Calculate image number (order + 1)
  v_image_num := COALESCE(NEW."order", 0) + 1;

  -- Auto-generate metadata if not provided
  IF NEW.title IS NULL THEN
    NEW.title := v_listing.title || ' - Photo ' || v_image_num;
  END IF;

  IF NEW.alt_text IS NULL THEN
    NEW.alt_text := generate_image_alt_text(
      v_listing.title,
      v_listing.city,
      v_listing.service_type,
      v_image_num
    );
  END IF;

  IF NEW.description IS NULL AND v_listing.style IS NOT NULL THEN
    NEW.description := 'Professional photo of ' || v_listing.title || ', a ' || v_listing.style || ' ' || v_listing.service_type;
  END IF;

  -- Auto-generate tags from listing data
  IF NEW.tags IS NULL OR array_length(NEW.tags, 1) IS NULL THEN
    NEW.tags := ARRAY[
      v_listing.service_type,
      v_listing.city,
      v_listing.style
    ]::TEXT[];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate metadata
DROP TRIGGER IF EXISTS trigger_update_image_metadata ON listing_media;
CREATE TRIGGER trigger_update_image_metadata
  BEFORE INSERT OR UPDATE ON listing_media
  FOR EACH ROW
  EXECUTE FUNCTION update_image_metadata_from_listing();

-- Backfill metadata for existing images
-- This generates metadata for images that don't have it yet
DO $$
DECLARE
  v_media RECORD;
  v_listing RECORD;
  v_image_num INTEGER;
BEGIN
  FOR v_media IN
    SELECT
      lm.id,
      lm.listing_id,
      lm."order",
      lm.title,
      lm.alt_text,
      lm.description,
      lm.tags
    FROM listing_media lm
    WHERE lm.title IS NULL OR lm.alt_text IS NULL
  LOOP
    -- Get listing details
    SELECT
      l.title,
      l.location_data->>'city' as city,
      l.service_type,
      l.style
    INTO v_listing
    FROM listings l
    WHERE l.id = v_media.listing_id;

    IF FOUND THEN
      v_image_num := COALESCE(v_media."order", 0) + 1;

      -- Update metadata
      UPDATE listing_media
      SET
        title = COALESCE(v_media.title, v_listing.title || ' - Photo ' || v_image_num),
        alt_text = COALESCE(v_media.alt_text, generate_image_alt_text(
          v_listing.title,
          v_listing.city,
          v_listing.service_type,
          v_image_num
        )),
        description = COALESCE(v_media.description,
          CASE
            WHEN v_listing.style IS NOT NULL
            THEN 'Professional photo of ' || v_listing.title || ', a ' || v_listing.style || ' ' || v_listing.service_type
            ELSE NULL
          END
        ),
        tags = COALESCE(v_media.tags, ARRAY[
          v_listing.service_type,
          v_listing.city,
          v_listing.style
        ]::TEXT[])
      WHERE id = v_media.id;
    END IF;
  END LOOP;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN listing_media.title IS 'SEO-friendly image title';
COMMENT ON COLUMN listing_media.description IS 'Image description for accessibility and SEO';
COMMENT ON COLUMN listing_media.tags IS 'Searchable tags (service type, city, style, etc.)';
COMMENT ON COLUMN listing_media.width IS 'Image width in pixels';
COMMENT ON COLUMN listing_media.height IS 'Image height in pixels';
COMMENT ON COLUMN listing_media.alt_text IS 'Alt text for accessibility';

-- Create view for image search
CREATE OR REPLACE VIEW image_search AS
SELECT
  lm.id,
  lm.listing_id,
  lm.url,
  lm.title,
  lm.description,
  lm.alt_text,
  lm.tags,
  lm.width,
  lm.height,
  lm."order",
  l.title as vendor_name,
  l.service_type,
  l.location_data->>'city' as city,
  l.location_data->>'state' as state,
  l.slug as listing_slug
FROM listing_media lm
JOIN listings l ON l.id = lm.listing_id
WHERE lm.media_type = 'image'
ORDER BY l.title, lm."order";

-- Create function for image search
CREATE OR REPLACE FUNCTION search_images(
  p_query TEXT,
  p_service_type TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  listing_id UUID,
  url TEXT,
  title TEXT,
  description TEXT,
  vendor_name TEXT,
  city TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.listing_id,
    i.url,
    i.title,
    i.description,
    i.vendor_name,
    i.city,
    ts_rank(
      to_tsvector('english',
        COALESCE(i.title, '') || ' ' ||
        COALESCE(i.description, '') || ' ' ||
        COALESCE(i.vendor_name, '') || ' ' ||
        array_to_string(i.tags, ' ')
      ),
      plainto_tsquery('english', p_query)
    ) as relevance
  FROM image_search i
  WHERE
    (p_service_type IS NULL OR i.service_type = p_service_type)
    AND (p_city IS NULL OR i.city = p_city)
    AND (
      to_tsvector('english',
        COALESCE(i.title, '') || ' ' ||
        COALESCE(i.description, '') || ' ' ||
        COALESCE(i.vendor_name, '') || ' ' ||
        array_to_string(i.tags, ' ')
      ) @@ plainto_tsquery('english', p_query)
    )
  ORDER BY relevance DESC, i."order" ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Example queries:
-- SELECT * FROM search_images('waterfront venue Sydney');
-- SELECT * FROM search_images('rustic barn', 'venue', 'Hunter Valley');
-- SELECT * FROM image_search WHERE 'wedding' = ANY(tags) LIMIT 20;
