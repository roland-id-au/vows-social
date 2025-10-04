-- Cleanup migration: Drop Instagram tables if they exist
-- This handles any partial creation from previous attempts

DROP TABLE IF EXISTS instagram_sync_logs CASCADE;
DROP TABLE IF EXISTS user_feed_preferences CASCADE;
DROP TABLE IF EXISTS feed_updates CASCADE;
DROP TABLE IF EXISTS user_feed CASCADE;
DROP TABLE IF EXISTS trending_themes CASCADE;
DROP TABLE IF EXISTS instagram_posts CASCADE;
DROP TABLE IF EXISTS instagram_accounts CASCADE;

-- Drop any helper functions
DROP FUNCTION IF EXISTS calculate_engagement_rate(INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_instagram_account_updated_at();
DROP FUNCTION IF EXISTS cleanup_expired_feed_items();

SELECT 1;
