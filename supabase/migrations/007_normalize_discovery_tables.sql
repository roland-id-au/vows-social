-- Normalize discovery architecture
-- Rename discovered_venues to discovered_listings and expand type constraints

-- Step 1: Drop the old constraint
ALTER TABLE discovered_venues DROP CONSTRAINT IF EXISTS discovered_venues_type_check;

-- Step 2: Add comprehensive type constraint for all wedding services
ALTER TABLE discovered_venues ADD CONSTRAINT discovered_venues_type_check
CHECK (type IN (
  'venue',
  'caterer',
  'florist',
  'photographer',
  'videographer',
  'musician',
  'stylist',
  'planner',
  'decorator',
  'transport',
  'celebrant',
  'cake',
  'makeup',
  'hair',
  'entertainment',
  'rentals',
  'stationery',
  'favors',
  'other_service'
));

-- Step 3: Rename table to better reflect its purpose
ALTER TABLE discovered_venues RENAME TO discovered_listings;

-- Step 4: Rename indexes
ALTER INDEX idx_discovered_venues_status RENAME TO idx_discovered_listings_status;
ALTER INDEX idx_discovered_venues_engagement RENAME TO idx_discovered_listings_engagement;
ALTER INDEX idx_discovered_venues_discovered_at RENAME TO idx_discovered_listings_discovered_at;

-- Step 5: Add country column (should have been there from the start)
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';

-- Step 6: Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_discovered_listings_type ON discovered_listings(type);

-- Step 7: Create index on city for geographic filtering
CREATE INDEX IF NOT EXISTS idx_discovered_listings_city ON discovered_listings(city);

-- Step 8: Update comment
COMMENT ON TABLE discovered_listings IS 'Wedding venues and services discovered from Instagram trends, pending research';

-- Step 9: Create view for easy querying
CREATE OR REPLACE VIEW pending_discoveries AS
SELECT
  id,
  name,
  type,
  location,
  city,
  state,
  country,
  engagement_score,
  why_trending,
  discovered_at,
  CASE type
    WHEN 'venue' THEN 'Venue'
    WHEN 'caterer' THEN 'Catering'
    WHEN 'florist' THEN 'Florals'
    WHEN 'photographer' THEN 'Photography'
    WHEN 'videographer' THEN 'Videography'
    WHEN 'musician' THEN 'Music'
    WHEN 'stylist' THEN 'Styling'
    WHEN 'planner' THEN 'Planning'
    WHEN 'cake' THEN 'Cakes'
    WHEN 'makeup' THEN 'Makeup'
    WHEN 'hair' THEN 'Hair'
    ELSE 'Other Services'
  END as category_display
FROM discovered_listings
WHERE status = 'pending_research'
ORDER BY engagement_score DESC, discovered_at DESC;

COMMENT ON VIEW pending_discoveries IS 'All pending discoveries ordered by engagement score';

-- Step 10: Create stats view for monitoring
CREATE OR REPLACE VIEW discovery_stats AS
SELECT
  type,
  COUNT(*) as total_discovered,
  COUNT(*) FILTER (WHERE status = 'pending_research') as pending,
  COUNT(*) FILTER (WHERE status = 'researched') as researched,
  COUNT(*) FILTER (WHERE status = 'research_failed') as failed,
  ROUND(AVG(engagement_score), 2) as avg_engagement,
  MAX(discovered_at) as last_discovery
FROM discovered_listings
GROUP BY type
ORDER BY total_discovered DESC;

COMMENT ON VIEW discovery_stats IS 'Statistics on discoveries by type';
