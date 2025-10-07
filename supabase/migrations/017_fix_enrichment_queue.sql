-- Fix enrichment_queue table by dropping and recreating with all columns

DROP TABLE IF EXISTS enrichment_queue CASCADE;
DROP TABLE IF EXISTS discovery_queue CASCADE;
DROP TABLE IF EXISTS publishing_queue CASCADE;

-- ============================================
-- DISCOVERY QUEUE
-- ============================================
CREATE TABLE discovery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Discovery parameters
  query TEXT NOT NULL,
  location TEXT,
  city TEXT,
  state TEXT,
  service_type TEXT NOT NULL DEFAULT 'venue',

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5,

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Results
  discoveries_found INTEGER DEFAULT 0,
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discovery_queue_status ON discovery_queue(status);
CREATE INDEX idx_discovery_queue_next_retry ON discovery_queue(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_discovery_queue_scheduled ON discovery_queue(scheduled_for) WHERE status = 'pending';

-- ============================================
-- ENRICHMENT QUEUE
-- ============================================
CREATE TABLE enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source discovery
  discovery_id UUID REFERENCES discovered_listings(id) ON DELETE CASCADE,

  -- Enrichment parameters
  vendor_name TEXT NOT NULL,
  location TEXT,
  city TEXT,
  state TEXT,
  service_type TEXT NOT NULL DEFAULT 'venue',
  website TEXT,

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  priority INTEGER DEFAULT 5,

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Results
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  images_found INTEGER DEFAULT 0,
  packages_found INTEGER DEFAULT 0,
  error_message TEXT,

  -- Processing stats
  perplexity_duration_ms INTEGER,
  firecrawl_duration_ms INTEGER,
  storage_duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_enrichment_queue_status ON enrichment_queue(status);
CREATE INDEX idx_enrichment_queue_discovery ON enrichment_queue(discovery_id);
CREATE INDEX idx_enrichment_queue_listing ON enrichment_queue(listing_id);
CREATE INDEX idx_enrichment_queue_next_retry ON enrichment_queue(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_enrichment_queue_scheduled ON enrichment_queue(scheduled_for) WHERE status = 'pending';

-- ============================================
-- PUBLISHING QUEUE
-- ============================================
CREATE TABLE publishing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source listing
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Publishing parameters
  channels TEXT[] DEFAULT ARRAY['discord']::TEXT[],
  message_template TEXT,

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  priority INTEGER DEFAULT 5,

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Results
  published_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  error_message TEXT,
  discord_message_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_publishing_queue_status ON publishing_queue(status);
CREATE INDEX idx_publishing_queue_listing ON publishing_queue(listing_id);
CREATE INDEX idx_publishing_queue_next_retry ON publishing_queue(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_publishing_queue_scheduled ON publishing_queue(scheduled_for) WHERE status = 'pending';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get next pending discovery task
CREATE OR REPLACE FUNCTION get_next_discovery_task()
RETURNS discovery_queue AS $$
  SELECT *
  FROM discovery_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$ LANGUAGE SQL;

-- Function to get next pending enrichment task
CREATE OR REPLACE FUNCTION get_next_enrichment_task()
RETURNS enrichment_queue AS $$
  SELECT *
  FROM enrichment_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$ LANGUAGE SQL;

-- Function to get next pending publishing task
CREATE OR REPLACE FUNCTION get_next_publishing_task()
RETURNS publishing_queue AS $$
  SELECT *
  FROM publishing_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$ LANGUAGE SQL;

-- Function to retry failed tasks
CREATE OR REPLACE FUNCTION retry_failed_tasks()
RETURNS TABLE(queue TEXT, retried INTEGER) AS $$
BEGIN
  -- Retry failed discovery tasks
  UPDATE discovery_queue
  SET status = 'pending',
      next_retry_at = NULL
  WHERE status = 'failed'
    AND attempts < max_attempts
    AND (next_retry_at IS NULL OR next_retry_at <= now());

  -- Retry failed enrichment tasks
  UPDATE enrichment_queue
  SET status = 'pending',
      next_retry_at = NULL
  WHERE status = 'failed'
    AND attempts < max_attempts
    AND (next_retry_at IS NULL OR next_retry_at <= now());

  -- Retry failed publishing tasks
  UPDATE publishing_queue
  SET status = 'pending',
      next_retry_at = NULL
  WHERE status = 'failed'
    AND attempts < max_attempts
    AND (next_retry_at IS NULL OR next_retry_at <= now());

  RETURN QUERY
  SELECT 'discovery'::TEXT, COUNT(*)::INTEGER FROM discovery_queue WHERE status = 'pending'
  UNION ALL
  SELECT 'enrichment'::TEXT, COUNT(*)::INTEGER FROM enrichment_queue WHERE status = 'pending'
  UNION ALL
  SELECT 'publishing'::TEXT, COUNT(*)::INTEGER FROM publishing_queue WHERE status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED INITIAL DISCOVERY TASKS
-- ============================================
-- Discovery tasks are now seeded from config/discovery-locations.yaml
-- Use the seed-discovery-queue function to populate the queue
