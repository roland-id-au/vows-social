-- Instagram Monitoring and Trend Discovery
-- Uses instagrapi to monitor listings and discover trending content

-- ============================================
-- INSTAGRAM MONITOR QUEUE
-- Track and update Instagram content for existing listings
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_monitor_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target listing to monitor
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  instagram_handle TEXT NOT NULL,

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5,

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Results
  new_posts_found INTEGER DEFAULT 0,
  new_photos_stored INTEGER DEFAULT 0,
  error_message TEXT,

  -- Monitoring interval
  monitor_interval_hours INTEGER DEFAULT 24,
  last_monitored_at TIMESTAMPTZ,
  next_monitor_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now(),

  UNIQUE(listing_id, instagram_handle)
);

CREATE INDEX idx_instagram_monitor_status ON instagram_monitor_queue(status);
CREATE INDEX idx_instagram_monitor_listing ON instagram_monitor_queue(listing_id);
CREATE INDEX idx_instagram_monitor_handle ON instagram_monitor_queue(instagram_handle);
CREATE INDEX idx_instagram_monitor_next ON instagram_monitor_queue(next_monitor_at);
CREATE INDEX idx_instagram_monitor_scheduled ON instagram_monitor_queue(scheduled_for) WHERE status = 'pending';

-- ============================================
-- INSTAGRAM TREND QUEUE
-- Discover trending wedding content and new vendors
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_trend_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Discovery parameters
  hashtag TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Australia',
  city TEXT,
  service_type TEXT DEFAULT 'venue',

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5,

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  -- Results
  posts_analyzed INTEGER DEFAULT 0,
  new_vendors_discovered INTEGER DEFAULT 0,
  error_message TEXT,

  -- Discovery interval
  discovery_interval_hours INTEGER DEFAULT 168, -- Weekly
  last_discovered_at TIMESTAMPTZ,
  next_discovery_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now(),

  UNIQUE(hashtag, country, city, service_type)
);

CREATE INDEX idx_instagram_trend_status ON instagram_trend_queue(status);
CREATE INDEX idx_instagram_trend_hashtag ON instagram_trend_queue(hashtag);
CREATE INDEX idx_instagram_trend_next ON instagram_trend_queue(next_discovery_at);
CREATE INDEX idx_instagram_trend_scheduled ON instagram_trend_queue(scheduled_for) WHERE status = 'pending';

-- ============================================
-- INSTAGRAM MONITORING CONFIG
-- Configure which hashtags to monitor for trends
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_trend_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Australia',
  city TEXT,
  service_type TEXT DEFAULT 'venue',
  priority INTEGER DEFAULT 5,
  discovery_interval_hours INTEGER DEFAULT 168, -- Weekly
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(hashtag, country, city, service_type)
);

CREATE INDEX idx_instagram_trend_config_enabled ON instagram_trend_config(enabled) WHERE enabled = true;

-- Seed with popular Australian wedding hashtags
INSERT INTO instagram_trend_config (hashtag, country, city, service_type, priority, discovery_interval_hours) VALUES
  -- National trending hashtags
  ('#australianwedding', 'Australia', NULL, 'venue', 1, 168),
  ('#auswedding', 'Australia', NULL, 'venue', 1, 168),
  ('#melbournewedding', 'Australia', 'Melbourne', 'venue', 1, 168),
  ('#sydneywedding', 'Australia', 'Sydney', 'venue', 1, 168),
  ('#brisbanewedding', 'Australia', 'Brisbane', 'venue', 1, 168),
  ('#goldcoastwedding', 'Australia', 'Gold Coast', 'venue', 1, 168),
  ('#perthwedding', 'Australia', 'Perth', 'venue', 2, 168),
  ('#adelaidewedding', 'Australia', 'Adelaide', 'venue', 2, 168),

  -- Venue-specific hashtags
  ('#byronbaywedding', 'Australia', 'Byron Bay', 'venue', 1, 168),
  ('#huntervalleywedding', 'Australia', 'Hunter Valley', 'venue', 1, 168),
  ('#yarravalleywedding', 'Australia', 'Yarra Valley', 'venue', 2, 168),

  -- Photographer hashtags
  ('#australianweddingphotographer', 'Australia', NULL, 'photographer', 2, 168),
  ('#melbourneweddingphotographer', 'Australia', 'Melbourne', 'photographer', 2, 168),
  ('#sydneyweddingphotographer', 'Australia', 'Sydney', 'photographer', 2, 168)

ON CONFLICT (hashtag, country, city, service_type) DO NOTHING;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get next Instagram monitoring task
CREATE OR REPLACE FUNCTION get_next_instagram_monitor_task()
RETURNS instagram_monitor_queue AS $$
  SELECT *
  FROM instagram_monitor_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$ LANGUAGE SQL;

-- Get next Instagram trend discovery task
CREATE OR REPLACE FUNCTION get_next_instagram_trend_task()
RETURNS instagram_trend_queue AS $$
  SELECT *
  FROM instagram_trend_queue
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY priority ASC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
$$ LANGUAGE SQL;

-- Function to automatically queue monitoring for listings with Instagram handles
CREATE OR REPLACE FUNCTION queue_instagram_monitoring_for_listing()
RETURNS TRIGGER AS $$
BEGIN
  -- If listing has Instagram handle, create monitoring task
  IF NEW.instagram_handle IS NOT NULL AND NEW.instagram_handle != '' THEN
    INSERT INTO instagram_monitor_queue (
      listing_id,
      instagram_handle,
      priority,
      monitor_interval_hours,
      next_monitor_at,
      scheduled_for
    )
    VALUES (
      NEW.id,
      NEW.instagram_handle,
      5,
      24, -- Monitor daily
      now() + INTERVAL '24 hours',
      now()
    )
    ON CONFLICT (listing_id, instagram_handle) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-queue monitoring when listing is created/updated
DROP TRIGGER IF EXISTS trigger_queue_instagram_monitoring ON listings;
CREATE TRIGGER trigger_queue_instagram_monitoring
  AFTER INSERT OR UPDATE OF instagram_handle ON listings
  FOR EACH ROW
  EXECUTE FUNCTION queue_instagram_monitoring_for_listing();

-- ============================================
-- Update instagram_posts table to track source
-- ============================================

ALTER TABLE instagram_posts
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'monitor', 'trend_discovery', 'enrichment')),
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_instagram_posts_source ON instagram_posts(source);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_trending ON instagram_posts(is_trending) WHERE is_trending = true;
