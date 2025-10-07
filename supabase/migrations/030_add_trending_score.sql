-- Add trending score tracking to listings
ALTER TABLE listings
ADD COLUMN trending_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN trending_score_timestamp TIMESTAMPTZ;

-- Create index for sorting by trending score
CREATE INDEX idx_listings_trending_score ON listings(trending_score DESC);

-- Comments
COMMENT ON COLUMN listings.trending_score IS 'Calculated score for trending status (0-100). Higher = more trending.';
COMMENT ON COLUMN listings.trending_score_timestamp IS 'When the trending score was last calculated';
