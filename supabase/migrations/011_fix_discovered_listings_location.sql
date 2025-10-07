-- Fix discovered_listings location column to be nullable
-- Some discoveries from Perplexity may not have a detailed location, only city/state

ALTER TABLE discovered_listings
  ALTER COLUMN location DROP NOT NULL;

COMMENT ON COLUMN discovered_listings.location IS 'Detailed location (suburb/area) - nullable, city/state are required';
