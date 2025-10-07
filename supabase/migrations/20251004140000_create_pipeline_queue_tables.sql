-- Pipeline Queue Tables for Discovery → Enrichment → Publication → Notification flow

-- Update discovered_listings table with enrichment tracking
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS enrichment_attempts INTEGER DEFAULT 0;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS last_enrichment_attempt TIMESTAMPTZ;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS quality_score INTEGER;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE discovered_listings ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_discovered_listings_enrichment_status ON discovered_listings(enrichment_status) WHERE enrichment_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_discovered_listings_published ON discovered_listings(published) WHERE NOT published;

COMMENT ON COLUMN discovered_listings.enrichment_status IS 'pending, processing, enriched, failed, duplicate';
COMMENT ON COLUMN discovered_listings.quality_score IS '0-100 score based on completeness';

-- Enrichment Queue Table
CREATE TABLE IF NOT EXISTS enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id UUID REFERENCES discovered_listings(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5, -- 1 (highest engagement) to 10 (lowest)
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,

  CONSTRAINT valid_enrichment_queue_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10)
);

CREATE INDEX idx_enrichment_queue_pending ON enrichment_queue(status, priority ASC, created_at ASC) WHERE status = 'pending';
CREATE INDEX idx_enrichment_queue_discovery ON enrichment_queue(discovery_id);

COMMENT ON TABLE enrichment_queue IS 'Queue for continuous enrichment processing (every 5 minutes)';

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  time_slot TEXT NOT NULL, -- 'morning', 'lunch', 'evening'
  notification_type TEXT NOT NULL, -- 'new_venue', 'new_service', 'batch_update'
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'skipped'

  -- Targeting
  target_cities TEXT[] DEFAULT '{}',
  target_states TEXT[] DEFAULT '{}',
  target_themes TEXT[] DEFAULT '{}',
  target_user_ids UUID[], -- Specific users (optional)

  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,

  -- Metrics
  sent_at TIMESTAMPTZ,
  users_targeted INTEGER DEFAULT 0,
  users_sent INTEGER DEFAULT 0,
  engagement_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT valid_time_slot CHECK (time_slot IN ('morning', 'lunch', 'evening')),
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('new_venue', 'new_service', 'batch_update', 'instagram_post'))
);

CREATE INDEX idx_notification_queue_pending ON notification_queue(status, time_slot, priority) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_listing ON notification_queue(listing_id);
CREATE INDEX idx_notification_queue_sent ON notification_queue(sent_at DESC) WHERE status = 'sent';

COMMENT ON TABLE notification_queue IS 'Queue for strategic notification delivery (morning, lunch, evening)';

-- Pipeline Metrics Table
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metric_date DATE DEFAULT CURRENT_DATE,

  -- Discovery metrics
  discoveries_total INTEGER DEFAULT 0,
  discoveries_venues INTEGER DEFAULT 0,
  discoveries_services INTEGER DEFAULT 0,

  -- Enrichment metrics
  enrichments_attempted INTEGER DEFAULT 0,
  enrichments_completed INTEGER DEFAULT 0,
  enrichments_failed INTEGER DEFAULT 0,
  avg_enrichment_time_ms INTEGER,

  -- Publication metrics
  publications_total INTEGER DEFAULT 0,
  avg_quality_score DECIMAL,

  -- Notification metrics
  notifications_sent INTEGER DEFAULT 0,
  notifications_opened INTEGER DEFAULT 0,
  notification_open_rate DECIMAL,

  -- Feed metrics
  feeds_generated INTEGER DEFAULT 0,
  avg_feed_engagement DECIMAL
);

CREATE INDEX idx_pipeline_metrics_date ON pipeline_metrics(metric_date DESC);

COMMENT ON TABLE pipeline_metrics IS 'Daily pipeline performance metrics';

-- Helper function: Calculate quality score for a listing
CREATE OR REPLACE FUNCTION calculate_listing_quality_score(
  p_listing_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_listing RECORD;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Images (30 points max)
  IF v_listing.images_count >= 5 THEN
    v_score := v_score + 30;
  ELSIF v_listing.images_count >= 3 THEN
    v_score := v_score + 20;
  ELSIF v_listing.images_count >= 1 THEN
    v_score := v_score + 10;
  END IF;

  -- Description (20 points max)
  IF LENGTH(v_listing.description) > 500 THEN
    v_score := v_score + 20;
  ELSIF LENGTH(v_listing.description) > 200 THEN
    v_score := v_score + 15;
  ELSIF LENGTH(v_listing.description) > 100 THEN
    v_score := v_score + 10;
  END IF;

  -- Contact info (20 points max)
  IF v_listing.contact_email IS NOT NULL THEN v_score := v_score + 10; END IF;
  IF v_listing.contact_phone IS NOT NULL THEN v_score := v_score + 10; END IF;

  -- Location (10 points max)
  IF v_listing.city IS NOT NULL AND v_listing.state IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- Features (10 points max)
  IF v_listing.features IS NOT NULL AND array_length(v_listing.features, 1) >= 3 THEN
    v_score := v_score + 10;
  ELSIF v_listing.features IS NOT NULL AND array_length(v_listing.features, 1) >= 1 THEN
    v_score := v_score + 5;
  END IF;

  -- Pricing (10 points max)
  IF v_listing.starting_price IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON enrichment_queue TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_queue TO service_role;
GRANT SELECT, INSERT, UPDATE ON pipeline_metrics TO service_role;

GRANT SELECT ON enrichment_queue TO authenticated;
GRANT SELECT ON notification_queue TO authenticated;
GRANT SELECT ON pipeline_metrics TO authenticated;
