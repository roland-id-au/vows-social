-- Add short_name column for display on cards
ALTER TABLE listings
ADD COLUMN short_name TEXT;

-- Create index for short_name
CREATE INDEX idx_listings_short_name ON listings(short_name) WHERE short_name IS NOT NULL;

-- Comments
COMMENT ON COLUMN listings.short_name IS 'Shortened display name for cards (determined by Perplexity enrichment)';

-- Generate short names for existing records
-- Strategy: Remove common suffix words, keep distinctive parts, limit length
UPDATE listings
SET short_name = CASE
  -- If title is already short (< 25 chars), use as is
  WHEN LENGTH(title) <= 25 THEN title

  -- Remove common wedding-related suffix words
  WHEN title ILIKE '%wedding venue%' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(wedding|venue|venues|and|&|events?|estate|ballroom|function|centre|center)(\s+|$)', ' ', 'gi'))

  WHEN title ILIKE '%weddings%' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(weddings?|and|&|events?|venue|estate|ballroom|function|centre|center)(\s+|$)', ' ', 'gi'))

  WHEN title ILIKE '%events%' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(events?|and|&|venue|ballroom|function|centre|center)(\s+|$)', ' ', 'gi'))

  -- For photographers, videographers, etc - remove business type suffix
  WHEN title ILIKE '%photography' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(photography|photo|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  WHEN title ILIKE '%videography' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(videography|video|films?|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  WHEN title ILIKE '%catering' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(catering|caterers?|wedding|weddings?|events?)(\s+|$)', ' ', 'gi'))

  WHEN title ILIKE '%florist%' OR title ILIKE '%florals%' THEN
    TRIM(REGEXP_REPLACE(title, '\s+(florist|florals?|flowers?|wedding|weddings?)(\s+|$)', ' ', 'gi'))

  -- Default: just remove common filler words
  ELSE TRIM(REGEXP_REPLACE(title, '\s+(the|and|&|at)(\s+|$)', ' ', 'gi'))
END
WHERE short_name IS NULL;

-- Truncate if still too long (keep first 30 chars)
UPDATE listings
SET short_name = LEFT(short_name, 30)
WHERE LENGTH(short_name) > 30;

-- Clean up extra spaces
UPDATE listings
SET short_name = REGEXP_REPLACE(short_name, '\s+', ' ', 'g');

-- Trim whitespace
UPDATE listings
SET short_name = TRIM(short_name);
