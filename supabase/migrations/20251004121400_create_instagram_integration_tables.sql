-- Instagram Integration Tables
-- Comprehensive schema for Instagram Graph API integration, feed algorithm, and notifications

-- ============================================================================
-- 1. INSTAGRAM ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Account details
  instagram_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  account_type TEXT, -- 'BUSINESS', 'CREATOR', 'PERSONAL'
  full_name TEXT,
  bio TEXT,
  profile_picture_url TEXT,

  -- Linked to vendor
  listing_id UUID REFERENCES listings(id),

  -- Metrics
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active', -- 'active', 'paused', 'error'
  sync_error TEXT,

  -- Authorization (if we have access token)
  has_access_token BOOLEAN DEFAULT false,
  access_token_expires_at TIMESTAMPTZ,

  CONSTRAINT valid_sync_status CHECK (sync_status IN ('active', 'paused', 'error'))
);

CREATE INDEX idx_instagram_accounts_listing_id ON instagram_accounts(listing_id);
CREATE INDEX idx_instagram_accounts_last_synced ON instagram_accounts(last_synced_at);
CREATE INDEX idx_instagram_accounts_username ON instagram_accounts(username);
CREATE INDEX idx_instagram_accounts_sync_status ON instagram_accounts(sync_status) WHERE sync_status = 'active';

COMMENT ON TABLE instagram_accounts IS 'Instagram business/creator accounts linked to vendors for content syncing';

-- ============================================================================
-- 2. INSTAGRAM POSTS TABLE
-- ============================================================================
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Instagram data
  instagram_media_id TEXT UNIQUE NOT NULL,
  instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,

  -- Post details
  media_type TEXT NOT NULL, -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT NOT NULL,
  caption TEXT,

  -- Metadata
  posted_at TIMESTAMPTZ NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  location_name TEXT,
  location_id TEXT,

  -- Engagement metrics
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL DEFAULT 0,

  -- Wedding relevance
  is_wedding_related BOOLEAN DEFAULT true,
  wedding_type TEXT[], -- 'ceremony', 'reception', 'styled_shoot', 'real_wedding'
  detected_themes TEXT[] DEFAULT '{}', -- 'boho', 'minimalist', 'rustic', 'modern', etc.
  detected_vendors TEXT[] DEFAULT '{}', -- Mentioned vendor names

  -- Locality
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Australia',

  -- Discovery source
  discovered_via TEXT DEFAULT 'vendor_sync', -- 'vendor_sync', 'hashtag_search', 'location_search'

  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  CONSTRAINT valid_media_type CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL'))
);

CREATE INDEX idx_instagram_posts_account ON instagram_posts(instagram_account_id);
CREATE INDEX idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);
CREATE INDEX idx_instagram_posts_location ON instagram_posts(city, state) WHERE city IS NOT NULL;
CREATE INDEX idx_instagram_posts_hashtags ON instagram_posts USING gin(hashtags);
CREATE INDEX idx_instagram_posts_themes ON instagram_posts USING gin(detected_themes);
CREATE INDEX idx_instagram_posts_processed ON instagram_posts(processed) WHERE NOT processed;
CREATE INDEX idx_instagram_posts_wedding_related ON instagram_posts(is_wedding_related) WHERE is_wedding_related;

COMMENT ON TABLE instagram_posts IS 'Instagram posts from vendors and discovered content';

-- ============================================================================
-- 3. TRENDING THEMES TABLE
-- ============================================================================
CREATE TABLE trending_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Theme details
  theme_name TEXT NOT NULL,
  theme_slug TEXT UNIQUE NOT NULL,
  theme_category TEXT, -- 'style', 'color_palette', 'decor', 'season', 'aesthetic'
  description TEXT,

  -- Trending metrics
  post_count INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  trend_score DECIMAL DEFAULT 0,
  rank_position INTEGER,

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Locality
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Australia',

  -- Associated hashtags
  related_hashtags TEXT[] DEFAULT '{}',

  -- Sample posts (for preview)
  sample_post_ids UUID[] DEFAULT '{}', -- Reference to instagram_posts

  -- Visual
  preview_image_url TEXT,
  color_palette TEXT[] -- Hex colors
);

CREATE INDEX idx_trending_themes_period ON trending_themes(period_end DESC);
CREATE INDEX idx_trending_themes_score ON trending_themes(trend_score DESC);
CREATE INDEX idx_trending_themes_location ON trending_themes(city, state);
CREATE INDEX idx_trending_themes_slug ON trending_themes(theme_slug);

COMMENT ON TABLE trending_themes IS 'Trending wedding themes analyzed from Instagram content';

-- ============================================================================
-- 4. USER FEED TABLE
-- ============================================================================
CREATE TABLE user_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- User
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Content
  content_type TEXT NOT NULL, -- 'instagram_post', 'listing', 'theme', 'vendor_update'
  content_id UUID NOT NULL,

  -- Ranking
  feed_score DECIMAL NOT NULL DEFAULT 0,
  rank_position INTEGER,

  -- Personalization factors
  relevance_reasons TEXT[] DEFAULT '{}', -- 'location_match', 'style_match', 'budget_match', 'trending', etc.

  -- Engagement tracking
  viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  liked BOOLEAN DEFAULT false,
  liked_at TIMESTAMPTZ,
  saved BOOLEAN DEFAULT false,
  saved_at TIMESTAMPTZ,
  shared BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,

  -- Feed generation
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When to refresh this item

  CONSTRAINT valid_content_type CHECK (content_type IN ('instagram_post', 'listing', 'theme', 'vendor_update'))
);

CREATE INDEX idx_user_feed_user_score ON user_feed(user_id, feed_score DESC);
CREATE INDEX idx_user_feed_user_created ON user_feed(user_id, created_at DESC);
CREATE INDEX idx_user_feed_generated ON user_feed(generated_at DESC);
CREATE INDEX idx_user_feed_expires ON user_feed(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_user_feed_content ON user_feed(content_type, content_id);

COMMENT ON TABLE user_feed IS 'Personalized algorithmically-ranked feed for each user';

-- ============================================================================
-- 5. FEED UPDATES TABLE (for push notifications)
-- ============================================================================
CREATE TABLE feed_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Update details
  update_type TEXT NOT NULL, -- 'new_vendor', 'vendor_post', 'trending_theme', 'location_update'
  title TEXT NOT NULL,
  description TEXT,

  -- Content reference
  content_type TEXT,
  content_id UUID,
  image_url TEXT,

  -- Targeting
  target_cities TEXT[] DEFAULT '{}',
  target_states TEXT[] DEFAULT '{}',
  target_themes TEXT[] DEFAULT '{}',
  target_user_ids UUID[], -- Specific users (optional)

  -- Notification status
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  users_notified INTEGER DEFAULT 0,

  -- Metrics
  engagement_count INTEGER DEFAULT 0,
  click_through_count INTEGER DEFAULT 0,

  -- Priority (for notification batching)
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)

  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10)
);

CREATE INDEX idx_feed_updates_created ON feed_updates(created_at DESC);
CREATE INDEX idx_feed_updates_notification_sent ON feed_updates(notification_sent) WHERE NOT notification_sent;
CREATE INDEX idx_feed_updates_priority ON feed_updates(priority, created_at DESC);
CREATE INDEX idx_feed_updates_target_cities ON feed_updates USING gin(target_cities);

COMMENT ON TABLE feed_updates IS 'Updates to be pushed to users via notifications';

-- ============================================================================
-- 6. USER PREFERENCES TABLE (for feed personalization)
-- ============================================================================
CREATE TABLE user_feed_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Style preferences
  preferred_themes TEXT[] DEFAULT '{}',
  disliked_themes TEXT[] DEFAULT '{}',

  -- Content preferences
  show_instagram_posts BOOLEAN DEFAULT true,
  show_trending_themes BOOLEAN DEFAULT true,
  show_new_vendors BOOLEAN DEFAULT true,

  -- Notification preferences
  notify_vendor_posts BOOLEAN DEFAULT true,
  notify_trending_themes BOOLEAN DEFAULT true,
  notify_new_vendors BOOLEAN DEFAULT true,
  notification_frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly', 'never'
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Feed algorithm weights (advanced users)
  location_weight DECIMAL DEFAULT 0.25,
  style_weight DECIMAL DEFAULT 0.20,
  recency_weight DECIMAL DEFAULT 0.15,
  engagement_weight DECIMAL DEFAULT 0.15,
  trending_weight DECIMAL DEFAULT 0.10,

  CONSTRAINT valid_notification_frequency CHECK (notification_frequency IN ('realtime', 'daily', 'weekly', 'never'))
);

CREATE INDEX idx_user_feed_preferences_user ON user_feed_preferences(user_id);

COMMENT ON TABLE user_feed_preferences IS 'User preferences for feed algorithm and notifications';

-- ============================================================================
-- 7. INSTAGRAM SYNC LOGS TABLE
-- ============================================================================
CREATE TABLE instagram_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  sync_type TEXT NOT NULL, -- 'vendor_sync', 'hashtag_discovery', 'theme_analysis'

  -- Results
  accounts_synced INTEGER DEFAULT 0,
  posts_discovered INTEGER DEFAULT 0,
  new_posts INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- API usage
  api_calls_made INTEGER DEFAULT 0,
  api_quota_remaining INTEGER,

  -- Duration
  duration_ms INTEGER,

  -- Details
  metadata JSONB DEFAULT '{}'::jsonb,
  errors TEXT[]
);

CREATE INDEX idx_instagram_sync_logs_created ON instagram_sync_logs(created_at DESC);
CREATE INDEX idx_instagram_sync_logs_type ON instagram_sync_logs(sync_type);

COMMENT ON TABLE instagram_sync_logs IS 'Tracking for Instagram sync operations';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes INTEGER,
  p_comments INTEGER,
  p_followers INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF p_followers = 0 THEN
    RETURN 0;
  END IF;

  RETURN ((p_likes + (p_comments * 3.0)) / p_followers * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update instagram account metrics
CREATE OR REPLACE FUNCTION update_instagram_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_account_updated_at();

-- Function to auto-expire old feed items
CREATE OR REPLACE FUNCTION cleanup_expired_feed_items()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_feed
  WHERE expires_at < NOW()
  AND NOT viewed;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON instagram_accounts TO authenticated;
GRANT SELECT ON instagram_posts TO authenticated;
GRANT SELECT ON trending_themes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_feed TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_feed_preferences TO authenticated;
GRANT SELECT ON feed_updates TO authenticated;

GRANT ALL ON instagram_accounts TO service_role;
GRANT ALL ON instagram_posts TO service_role;
GRANT ALL ON trending_themes TO service_role;
GRANT ALL ON user_feed TO service_role;
GRANT ALL ON user_feed_preferences TO service_role;
GRANT ALL ON feed_updates TO service_role;
GRANT ALL ON instagram_sync_logs TO service_role;

COMMENT ON DATABASE postgres IS 'Vows Social - Wedding marketplace with Instagram integration and algorithmic feeds';
