-- Clear all pipeline data (preserve cache and schema)

-- Truncate all pipeline tables
TRUNCATE TABLE
  notification_queue,
  api_cost_transactions,
  listing_tags,
  listing_media,
  packages,
  enrichment_queue,
  discovered_listings,
  listings,
  discovery_queue
CASCADE;

-- Show results
SELECT
  'discovered_listings' as table_name, COUNT(*) as rows FROM discovered_listings
UNION ALL
SELECT 'enrichment_queue', COUNT(*) FROM enrichment_queue
UNION ALL
SELECT 'listings', COUNT(*) FROM listings
UNION ALL
SELECT 'listing_media', COUNT(*) FROM listing_media
UNION ALL
SELECT 'api_cost_transactions', COUNT(*) FROM api_cost_transactions
UNION ALL
SELECT 'discovery_queue', COUNT(*) FROM discovery_queue
ORDER BY table_name;
