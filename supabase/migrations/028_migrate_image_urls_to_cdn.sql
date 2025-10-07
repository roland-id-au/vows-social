-- Migration: Update image URLs to use images.vows.social CDN
-- This migration replaces Supabase Storage URLs with the new CDN domain
-- Run AFTER deploying Cloudflare Worker and configuring DNS

-- Update listing_media URLs
-- From: https://nidbhgqeyhrudtnizaya.supabase.co/storage/v1/object/public/listing-images/...
-- To:   https://images.vows.social/...

UPDATE listing_media
SET url = REPLACE(
  url,
  'https://nidbhgqeyhrudtnizaya.supabase.co/storage/v1/object/public/listing-images/',
  'https://images.vows.social/'
)
WHERE url LIKE 'https://nidbhgqeyhrudtnizaya.supabase.co/storage/v1/object/public/listing-images/%';

-- Log the number of updated URLs
-- Check before running: SELECT COUNT(*) FROM listing_media WHERE url LIKE 'https://nidbhgqeyhrudtnizaya.supabase.co%';
-- Check after running: SELECT COUNT(*) FROM listing_media WHERE url LIKE 'https://images.vows.social/%';

-- Create helper function to convert URLs (useful for future uploads)
CREATE OR REPLACE FUNCTION get_cdn_image_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert storage path to CDN URL
  -- Input: listings/{id}/image-1.jpg
  -- Output: https://images.vows.social/listings/{id}/image-1.jpg
  RETURN 'https://images.vows.social/' || storage_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON FUNCTION get_cdn_image_url IS 'Converts a storage path to a CDN URL (https://images.vows.social/...)';

-- Example usage:
-- SELECT get_cdn_image_url('listings/abc123/image-1.jpg');
-- Returns: https://images.vows.social/listings/abc123/image-1.jpg
