-- Monitor Complete Vendor Discovery Pipeline
-- Track vendors from discovery → enrichment → publishing

-- ============================================
-- PIPELINE OVERVIEW
-- ============================================

-- Summary of all pipeline stages
SELECT
  'Discovery Queue' as stage,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'processing') as processing,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM discovery_queue

UNION ALL

SELECT
  'Instagram Trends',
  COUNT(*) FILTER (WHERE status = 'pending'),
  COUNT(*) FILTER (WHERE status = 'processing'),
  COUNT(*) FILTER (WHERE status = 'completed'),
  COUNT(*) FILTER (WHERE status = 'failed')
FROM instagram_trend_queue

UNION ALL

SELECT
  'Discovered Vendors',
  COUNT(*) FILTER (WHERE enrichment_status = 'pending'),
  COUNT(*) FILTER (WHERE enrichment_status = 'processing'),
  COUNT(*) FILTER (WHERE enrichment_status = 'enriched'),
  0 as failed
FROM discovered_listings

UNION ALL

SELECT
  'Enrichment Queue',
  COUNT(*) FILTER (WHERE status = 'pending'),
  COUNT(*) FILTER (WHERE status = 'processing'),
  COUNT(*) FILTER (WHERE status = 'completed'),
  COUNT(*) FILTER (WHERE status = 'failed')
FROM enrichment_queue

UNION ALL

SELECT
  'Publishing Queue',
  COUNT(*) FILTER (WHERE status = 'pending'),
  COUNT(*) FILTER (WHERE status = 'processing'),
  COUNT(*) FILTER (WHERE status = 'published'),
  COUNT(*) FILTER (WHERE status = 'failed')
FROM publishing_queue;

-- ============================================
-- INSTAGRAM → DISCOVERY PIPELINE
-- ============================================

-- Vendors discovered via Instagram trends
SELECT
  'Instagram Discoveries' as metric,
  COUNT(*) as total,
  COUNT(listing_id) as enriched,
  COUNT(*) FILTER (WHERE enrichment_status = 'pending') as awaiting_enrichment,
  ROUND(COUNT(listing_id)::numeric / COUNT(*)::numeric * 100, 1) as success_rate
FROM discovered_listings
WHERE source = 'instagram_trends';

-- Recent Instagram trend discoveries with their enrichment status
SELECT
  dl.name,
  dl.city,
  dl.country,
  dl.source,
  dl.discovery_method,
  dl.enrichment_status,
  eq.status as enrichment_queue_status,
  l.id as listing_id,
  l.slug as listing_slug,
  dl.created_at as discovered_at
FROM discovered_listings dl
LEFT JOIN enrichment_queue eq ON eq.discovery_id = dl.id
LEFT JOIN listings l ON l.id = dl.listing_id
WHERE dl.source = 'instagram_trends'
ORDER BY dl.created_at DESC
LIMIT 20;

-- ============================================
-- DISCOVERY SOURCE COMPARISON
-- ============================================

-- Compare effectiveness of different discovery sources
SELECT
  source,
  discovery_method,
  COUNT(*) as total_discovered,
  COUNT(listing_id) as successfully_enriched,
  COUNT(*) FILTER (WHERE enrichment_status = 'pending') as pending_enrichment,
  COUNT(*) FILTER (WHERE enrichment_status = 'failed') as failed_enrichment,
  ROUND(COUNT(listing_id)::numeric / COUNT(*)::numeric * 100, 1) as enrichment_rate,
  MIN(created_at) as first_discovery,
  MAX(created_at) as latest_discovery
FROM discovered_listings
GROUP BY source, discovery_method
ORDER BY total_discovered DESC;

-- ============================================
-- INSTAGRAM ACCOUNT TRACKING
-- ============================================

-- Instagram accounts discovered and their journey through pipeline
SELECT
  dl.metadata->>'instagram_handle' as instagram_handle,
  dl.name,
  dl.city,
  dl.enrichment_status,
  eq.status as enrichment_status_queue,
  l.id IS NOT NULL as listing_created,
  l.instagram_handle as listing_ig_handle,
  imq.id IS NOT NULL as monitoring_active,
  imq.last_monitored_at,
  imq.new_photos_stored
FROM discovered_listings dl
LEFT JOIN enrichment_queue eq ON eq.discovery_id = dl.id
LEFT JOIN listings l ON l.id = dl.listing_id
LEFT JOIN instagram_monitor_queue imq ON imq.listing_id = l.id
WHERE dl.source = 'instagram_trends'
  AND dl.metadata->>'instagram_handle' IS NOT NULL
ORDER BY dl.created_at DESC
LIMIT 30;

-- ============================================
-- END-TO-END JOURNEY TRACKING
-- ============================================

-- Track a vendor's complete journey from Instagram discovery to live listing
CREATE OR REPLACE VIEW vendor_pipeline_journey AS
SELECT
  dl.id as discovery_id,
  dl.name as vendor_name,
  dl.city,
  dl.country,
  dl.source as discovery_source,
  dl.metadata->>'instagram_handle' as instagram_handle,
  dl.created_at as discovered_at,

  -- Enrichment stage
  eq.id as enrichment_task_id,
  eq.status as enrichment_status,
  eq.completed_at as enriched_at,
  eq.images_found,
  eq.packages_found,

  -- Listing stage
  l.id as listing_id,
  l.slug as listing_slug,
  l.rating,
  l.review_count,
  l.created_at as published_at,

  -- Publishing stage
  pq.id as publishing_task_id,
  pq.status as publishing_status,
  pq.published_at as announced_at,

  -- Monitoring stage
  imq.id as monitoring_task_id,
  imq.status as monitoring_status,
  imq.last_monitored_at,
  imq.new_photos_stored as photos_added_since,

  -- Calculate journey time
  EXTRACT(EPOCH FROM (l.created_at - dl.created_at))/3600 as hours_to_publish,

  -- Journey stage
  CASE
    WHEN pq.status = 'published' THEN 'Live & Monitored'
    WHEN l.id IS NOT NULL THEN 'Enriched, Awaiting Publish'
    WHEN eq.status = 'processing' THEN 'Being Enriched'
    WHEN eq.status = 'pending' THEN 'Awaiting Enrichment'
    WHEN eq.status = 'failed' THEN 'Enrichment Failed'
    ELSE 'Discovered'
  END as current_stage

FROM discovered_listings dl
LEFT JOIN enrichment_queue eq ON eq.discovery_id = dl.id
LEFT JOIN listings l ON l.id = dl.listing_id
LEFT JOIN publishing_queue pq ON pq.listing_id = l.id
LEFT JOIN instagram_monitor_queue imq ON imq.listing_id = l.id
ORDER BY dl.created_at DESC;

-- View vendor journeys
SELECT * FROM vendor_pipeline_journey LIMIT 20;

-- ============================================
-- INSTAGRAM DISCOVERY PERFORMANCE
-- ============================================

-- Performance metrics for Instagram discovery
SELECT
  DATE_TRUNC('day', itq.completed_at) as discovery_date,
  COUNT(*) as trend_discoveries_run,
  SUM(itq.posts_analyzed) as total_posts_analyzed,
  SUM(itq.new_vendors_discovered) as total_vendors_found,
  ROUND(AVG(itq.new_vendors_discovered), 1) as avg_vendors_per_discovery,
  COUNT(DISTINCT dl.id) as unique_vendors_added,
  COUNT(DISTINCT l.id) as vendors_now_live
FROM instagram_trend_queue itq
LEFT JOIN discovered_listings dl ON dl.source = 'instagram_trends'
  AND dl.created_at >= itq.completed_at
  AND dl.created_at < itq.completed_at + INTERVAL '6 hours'
LEFT JOIN listings l ON l.id = dl.listing_id
WHERE itq.completed_at IS NOT NULL
GROUP BY DATE_TRUNC('day', itq.completed_at)
ORDER BY discovery_date DESC
LIMIT 30;

-- ============================================
-- ALERTS: STUCK VENDORS
-- ============================================

-- Vendors stuck in enrichment for too long
SELECT
  dl.name,
  dl.city,
  dl.source,
  eq.status,
  eq.attempts,
  eq.error_message,
  dl.created_at as discovered_at,
  NOW() - dl.created_at as stuck_for
FROM discovered_listings dl
JOIN enrichment_queue eq ON eq.discovery_id = dl.id
WHERE dl.enrichment_status = 'pending'
  AND dl.created_at < NOW() - INTERVAL '24 hours'
ORDER BY dl.created_at ASC;
