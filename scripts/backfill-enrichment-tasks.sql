-- Backfill Missing Enrichment Tasks
-- Creates enrichment tasks for discovered listings that don't have them

-- First, let's see what we're going to create
SELECT
  dl.id as discovery_id,
  dl.name as vendor_name,
  dl.city,
  dl.country,
  dl.type as service_type,
  dl.enrichment_status,
  dl.created_at
FROM discovered_listings dl
WHERE dl.enrichment_status = 'pending'
AND NOT EXISTS (
  SELECT 1
  FROM enrichment_queue eq
  WHERE eq.discovery_id = dl.id
)
ORDER BY dl.created_at DESC;

-- Now create the enrichment tasks
INSERT INTO enrichment_queue (
  discovery_id,
  vendor_name,
  location,
  city,
  country,
  service_type,
  priority,
  scheduled_for,
  status
)
SELECT
  dl.id as discovery_id,
  dl.name as vendor_name,
  dl.location,
  dl.city,
  dl.country,
  dl.type as service_type,
  5 as priority,
  NOW() as scheduled_for,
  'pending' as status
FROM discovered_listings dl
WHERE dl.enrichment_status = 'pending'
AND NOT EXISTS (
  SELECT 1
  FROM enrichment_queue eq
  WHERE eq.discovery_id = dl.id
)
RETURNING id, vendor_name, city;

-- Verify the backfill
SELECT
  'Total discovered listings' as metric,
  COUNT(*) as count
FROM discovered_listings
UNION ALL
SELECT
  'Pending enrichment (with tasks)' as metric,
  COUNT(*) as count
FROM discovered_listings dl
WHERE dl.enrichment_status = 'pending'
AND EXISTS (
  SELECT 1 FROM enrichment_queue eq WHERE eq.discovery_id = dl.id
)
UNION ALL
SELECT
  'Pending enrichment (missing tasks)' as metric,
  COUNT(*) as count
FROM discovered_listings dl
WHERE dl.enrichment_status = 'pending'
AND NOT EXISTS (
  SELECT 1 FROM enrichment_queue eq WHERE eq.discovery_id = dl.id
)
UNION ALL
SELECT
  'Total enrichment queue pending' as metric,
  COUNT(*) as count
FROM enrichment_queue
WHERE status = 'pending';
