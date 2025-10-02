-- Migration: Initial schema + automation tables

-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Listings table (venues and caterers)
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  style TEXT,
  country TEXT DEFAULT 'Australia',
  location_data JSONB NOT NULL,
  price_data JSONB NOT NULL,
  min_capacity INTEGER,
  max_capacity INTEGER,
  amenities TEXT[],
  rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  website TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for location-based queries
CREATE INDEX listings_location_idx ON listings
USING GIST (ST_SetSRID(ST_MakePoint(
  (location_data->>'longitude')::float,
  (location_data->>'latitude')::float
), 4326));

-- Index for city and country searches
CREATE INDEX idx_listings_city ON listings((location_data->>'city'));
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_style ON listings(style);

-- Listing media (photos and videos)
CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listing_media_listing ON listing_media(listing_id);

-- Tags (for filtering)
CREATE TABLE tags (
  name TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  icon TEXT
);

-- Listing tags (many-to-many)
CREATE TABLE listing_tags (
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  tag_name TEXT REFERENCES tags(name) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, tag_name)
);

CREATE INDEX idx_listing_tags_listing ON listing_tags(listing_id);
CREATE INDEX idx_listing_tags_tag ON listing_tags(tag_name);

-- Instagram posts for venues
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  post_id TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  username TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instagram_posts_listing ON instagram_posts(listing_id);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  wedding_date DATE,
  guest_count INTEGER,
  budget INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_listing ON favorites(listing_id);

-- Inquiries
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inquiries_user ON inquiries(user_id);
CREATE INDEX idx_inquiries_listing ON inquiries(listing_id);

-- Sync logs for tracking data imports
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER,
  errors TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_timestamp ON sync_logs(timestamp DESC);
CREATE INDEX idx_sync_logs_source ON sync_logs(source);

-- Insert common tags
INSERT INTO tags (name, category, icon) VALUES
  -- Styles
  ('Modern', 'style', '🏙️'),
  ('Rustic', 'style', '🌾'),
  ('Beachfront', 'style', '🏖️'),
  ('Garden', 'style', '🌸'),
  ('Industrial', 'style', '🏭'),
  ('Vineyard', 'style', '🍇'),
  ('Ballroom', 'style', '💎'),
  ('Barn', 'style', '🏚️'),
  ('Estate', 'style', '🏰'),

  -- Scenery
  ('Ocean View', 'scenery', '🌊'),
  ('Mountain View', 'scenery', '⛰️'),
  ('City Skyline', 'scenery', '🌃'),
  ('Countryside', 'scenery', '🌄'),
  ('Waterfront', 'scenery', '⚓'),
  ('Forest', 'scenery', '🌲'),

  -- Experiences
  ('Sunset Ceremony', 'experience', '🌅'),
  ('Indoor/Outdoor', 'experience', '🏞️'),
  ('Exclusive Use', 'experience', '🔐'),
  ('On-site Accommodation', 'experience', '🛏️'),

  -- Amenities
  ('Parking', 'amenity', '🅿️'),
  ('Wheelchair Accessible', 'amenity', '♿'),
  ('Catering Included', 'amenity', '🍽️'),
  ('Bar Service', 'amenity', '🍸'),
  ('Dance Floor', 'amenity', '💃'),
  ('AV Equipment', 'amenity', '🎵'),

  -- Features
  ('BYO Alcohol', 'feature', '🍾'),
  ('Pet Friendly', 'feature', '🐕'),
  ('Late Night', 'feature', '🌙'),
  ('Bridal Suite', 'feature', '👰')
ON CONFLICT (name) DO NOTHING;

-- Automation Tables

-- Discovered venues table (for Instagram discovery pipeline)
CREATE TABLE IF NOT EXISTS discovered_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
