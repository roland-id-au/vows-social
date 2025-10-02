-- Migration: Add tables for automated discovery and notifications

-- Discovered venues table (for Instagram discovery pipeline)
CREATE TABLE IF NOT EXISTS discovered_venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('venue', 'caterer')),
  location TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  instagram_handle TEXT,
  instagram_posts_count INTEGER,
  engagement_score DECIMAL(3,2),
  recent_hashtags TEXT[],
  why_trending TEXT,
  sample_post_urls TEXT[],
  status TEXT DEFAULT 'pending_research' CHECK (status IN ('pending_research', 'researched', 'research_failed', 'ignored')),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovered_venues_status ON discovered_venues(status);
CREATE INDEX idx_discovered_venues_engagement ON discovered_venues(engagement_score DESC);
CREATE INDEX idx_discovered_venues_discovered_at ON discovered_venues(discovered_at DESC);

-- Packages table (for venue pricing packages)
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  inclusions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packages_listing ON packages(listing_id);

-- Notifications table (for push notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Add columns to users table for notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_data JSONB;

-- Add metadata and contact columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to packages table
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to listings table (if not exists)
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE discovered_venues IS 'Venues discovered from Instagram trends, pending research';
COMMENT ON TABLE packages IS 'Wedding packages and pricing options for venues';
COMMENT ON TABLE notifications IS 'Push notifications sent to users';
