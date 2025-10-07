-- Rename tables for consistent naming convention
-- Pattern: {domain}_{entity} or {entity} for core tables

-- Rename user_feed to feeds
ALTER TABLE user_feed RENAME TO feeds;

-- Rename user_feed_preferences to feed_preferences
ALTER TABLE user_feed_preferences RENAME TO feed_preferences;

-- Update foreign key reference in feeds table
ALTER TABLE feeds RENAME CONSTRAINT user_feed_user_id_fkey TO feeds_user_id_fkey;

-- Update foreign key reference in feed_preferences table
ALTER TABLE feed_preferences RENAME CONSTRAINT user_feed_preferences_user_id_fkey TO feed_preferences_user_id_fkey;

-- Rename trending_themes to themes
ALTER TABLE trending_themes RENAME TO themes;

-- Rename instagram_sync_logs to logs_instagram_sync (domain prefix)
ALTER TABLE instagram_sync_logs RENAME TO logs_instagram_sync;

-- Update indexes to match new names
ALTER INDEX idx_user_feed_user_score RENAME TO idx_feeds_user_score;
ALTER INDEX idx_user_feed_user_created RENAME TO idx_feeds_user_created;
ALTER INDEX idx_user_feed_generated RENAME TO idx_feeds_generated;
ALTER INDEX idx_user_feed_expires RENAME TO idx_feeds_expires;
ALTER INDEX idx_user_feed_content RENAME TO idx_feeds_content;

ALTER INDEX idx_user_feed_preferences_user RENAME TO idx_feed_preferences_user;

ALTER INDEX idx_trending_themes_period RENAME TO idx_themes_period;
ALTER INDEX idx_trending_themes_score RENAME TO idx_themes_score;
ALTER INDEX idx_trending_themes_location RENAME TO idx_themes_location;
ALTER INDEX idx_trending_themes_slug RENAME TO idx_themes_slug;

ALTER INDEX idx_instagram_sync_logs_created RENAME TO idx_logs_instagram_sync_created;
ALTER INDEX idx_instagram_sync_logs_type RENAME TO idx_logs_instagram_sync_type;

-- Update comments
COMMENT ON TABLE feeds IS 'Personalized algorithmically-ranked feed for each user';
COMMENT ON TABLE feed_preferences IS 'User preferences for feed algorithm and notifications';
COMMENT ON TABLE themes IS 'Trending wedding themes analyzed from Instagram content';
COMMENT ON TABLE logs_instagram_sync IS 'Tracking for Instagram sync operations';

-- Grant permissions (matching original)
GRANT SELECT, INSERT, UPDATE, DELETE ON feeds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON feed_preferences TO authenticated;

GRANT ALL ON feeds TO service_role;
GRANT ALL ON feed_preferences TO service_role;
GRANT ALL ON themes TO service_role;
GRANT ALL ON logs_instagram_sync TO service_role;
