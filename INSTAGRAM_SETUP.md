# Instagram Integration Setup Guide

This project uses [instagrapi](https://github.com/subzeroid/instagrapi) for:
- **Monitoring listings**: Automatically grab new photos from vendor Instagram accounts
- **Trend discovery**: Find trending wedding content and discover new vendors via hashtags

## Architecture

### Event-Driven Pipeline
```
┌─────────────────────────────────────────────────────────────┐
│  Instagram Integration                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. MONITORING                                               │
│     • Tracks existing listings' Instagram accounts          │
│     • Automatically downloads new photos every 24 hours     │
│     • Stores images in Supabase Storage                     │
│     • Updates listing_media table                           │
│                                                              │
│  2. TREND DISCOVERY                                          │
│     • Searches wedding hashtags (#sydneywedding, etc.)      │
│     • Discovers new vendors from trending posts             │
│     • Creates enrichment tasks for new vendors              │
│     • Runs weekly for each configured hashtag               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Instagram Account

Create a dedicated Instagram account for scraping:
- **Recommended**: Use a separate account (not your personal account)
- Enable 2FA for security
- Follow some wedding-related accounts to look legitimate

### 2. Set Instagram Credentials

```bash
# Set Instagram credentials as Supabase secrets
supabase secrets set INSTAGRAM_USERNAME=your_instagram_username
supabase secrets set INSTAGRAM_PASSWORD=your_instagram_password
```

### 3. Deploy Python Function

```bash
# Deploy the instagrapi scraper (Python Edge Function)
supabase functions deploy instagrapi-scraper
```

### 4. Apply Migrations

```bash
# Apply Instagram monitoring tables and cron jobs
supabase db push --include-all
```

### 5. Seed Instagram Trend Queue

```bash
# Populate trend discovery queue from config
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/seed-instagram-trends" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## How It Works

### Monitoring Existing Listings

When a listing is created/updated with an Instagram handle:
1. **Trigger**: Database trigger automatically creates monitoring task
2. **Scheduled**: Runs every 30 minutes via cron job
3. **Process**:
   - Fetches last 12 posts from Instagram account
   - Filters for new posts since last check
   - Downloads images to Supabase Storage
   - Links images to listing in `listing_media` table
4. **Repeat**: Automatically re-queues for next 24-hour check

### Trend Discovery

Three discovery methods available:

#### **Hybrid Location + Hashtag Discovery** ⭐ RECOMMENDED
Most targeted approach - combines location AND hashtag filtering:
1. **Config**: Location + hashtag combos in `instagram_trend_config` table
2. **Scheduled**: Runs every 6 hours via cron job
3. **Process**:
   - Searches Instagram location tags (e.g., "Sydney, Australia")
   - **Filters for posts containing #wedding or #venue**
   - Fetches top 50 matching posts
   - Filters for business accounts only
   - Discovers new vendors with GPS coordinates
4. **Repeat**: Automatically re-queues for next 7-day check

**Example Queries**:
- `Sydney, Australia + #wedding` - Wedding posts in Sydney
- `Hunter Valley, Australia + #venue` - Venue posts in Hunter Valley
- `Byron Bay, Australia + #photographer` - Photographers in Byron Bay

**Benefits**:
- **Most accurate**: Combines geographic + content filtering
- **High relevance**: Only wedding-related content at exact location
- **Eliminates noise**: No tourist/generic posts
- **GPS coordinates**: Exact venue location captured
- **Business focus**: Filters for business accounts

#### **Location-Only Discovery**
Geographic discovery without hashtag filter:
1. **Process**: Same as hybrid, but no hashtag filtering
2. **Use case**: Discover all business activity at a location

#### **Hashtag-Only Discovery**
Trend-based discovery:
1. **Config**: Pure hashtags like #australianwedding
2. **Use case**: National trending content, not location-specific

## Database Tables

### `instagram_monitor_queue`
Tracks monitoring tasks for existing listings
- `listing_id` - Listing to monitor
- `instagram_handle` - Instagram username
- `monitor_interval_hours` - How often to check (default: 24)
- `next_monitor_at` - Next scheduled check

### `instagram_trend_queue`
Tracks discovery tasks (location, hashtag, or hybrid)
- `discovery_type` - 'location', 'hashtag', or hybrid
- `location_query` - Location to search (e.g., "Sydney, Australia")
- `hashtag` - Hashtag for hashtag-only discovery
- `hashtag_filter` - Optional hashtag filter for hybrid location+hashtag queries
- `country` + `city` - Geographic focus
- `service_type` - Type of vendor to discover
- `discovery_interval_hours` - How often to search (default: 168)

### `instagram_trend_config`
Configuration for discovery targets (supports hybrid queries)
- `discovery_type` - 'hashtag' or 'location'
- `hashtag` - Used for pure hashtag discovery
- `location_query` - Used for location-based discovery (e.g., "Sydney, Australia")
- `hashtag_filter` - Optional hashtag filter for hybrid queries (e.g., "wedding", "venue")
- **Hybrid Example**: `discovery_type='location'`, `location_query='Sydney, Australia'`, `hashtag_filter='wedding'`
- Pre-seeded with hybrid location+hashtag combinations for major Australian cities
- Add new targets via database insert

### `instagram_posts`
Stores discovered Instagram posts
- `source` - Where post came from (monitor/trend_discovery/enrichment)
- `engagement_score` - Likes + comments
- `is_trending` - Flag for posts with >1000 likes

## Cron Jobs

### instagram-monitor-processor
- **Frequency**: Every 30 minutes
- **Purpose**: Process monitoring queue, update listings with new photos

### instagram-trend-processor
- **Frequency**: Every 6 hours
- **Purpose**: Process trend discovery queue, find new vendors

## Rate Limiting

instagrapi includes built-in rate limiting:
- Random delays between requests (1-3 seconds)
- Session persistence to avoid re-login
- Automatic handling of Instagram's "Please wait" errors

If rate limited:
- Tasks automatically retry with exponential backoff
- Max 3 retry attempts per task
- Failed tasks can be manually retried via `retry_failed_tasks()` function

## Adding New Discovery Targets

### Add Hybrid Discovery (Location + Hashtag) ⭐ Recommended
```sql
-- Find wedding venues in a specific location
INSERT INTO instagram_trend_config (discovery_type, location_query, hashtag_filter, country, city, service_type, priority)
VALUES ('location', 'Newcastle, Australia', 'wedding', 'Australia', 'Newcastle', 'venue', 2);

-- Find venues tagged with #venue
INSERT INTO instagram_trend_config (discovery_type, location_query, hashtag_filter, country, city, service_type, priority)
VALUES ('location', 'Noosa, Australia', 'venue', 'Australia', 'Noosa', 'venue', 2);

-- Find photographers in specific locations
INSERT INTO instagram_trend_config (discovery_type, location_query, hashtag_filter, country, city, service_type, priority)
VALUES
  ('location', 'Port Douglas, Australia', 'photographer', 'Australia', 'Port Douglas', 'photographer', 2),
  ('location', 'Cairns, Australia', 'weddingphotographer', 'Australia', 'Cairns', 'photographer', 2);
```

### Add Location-Only Discovery
```sql
-- Discover all business activity at a location (no hashtag filter)
INSERT INTO instagram_trend_config (discovery_type, location_query, country, city, service_type, priority)
VALUES ('location', 'Hobart, Australia', NULL, 'Australia', 'Hobart', 'venue', 2);
```

### Add Hashtag-Only Discovery
```sql
-- Monitor trending hashtags nationally
INSERT INTO instagram_trend_config (discovery_type, hashtag, country, service_type, priority)
VALUES ('hashtag', '#perthmicromarriage', 'Australia', 'venue', 3);
```

### Seed the Queue
```sql
-- Seed the queue with all configured discoveries
SELECT net.http_post(
  url:='https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/seed-instagram-trends',
  headers:=jsonb_build_object('Authorization', 'Bearer YOUR_KEY'),
  body:=jsonb_build_object()
);
```

## Monitoring Dashboard Queries

### Check monitoring status
```sql
SELECT
  l.title,
  imq.instagram_handle,
  imq.status,
  imq.last_monitored_at,
  imq.next_monitor_at,
  imq.new_posts_found,
  imq.new_photos_stored
FROM instagram_monitor_queue imq
JOIN listings l ON l.id = imq.listing_id
ORDER BY imq.next_monitor_at DESC;
```

### Check trend discovery status
```sql
-- Use the hybrid discovery view for human-readable queries
SELECT * FROM instagram_hybrid_discovery_view
ORDER BY next_discovery_at DESC;

-- Or query the table directly
SELECT
  discovery_type,
  CASE
    WHEN discovery_type = 'location' AND hashtag_filter IS NOT NULL THEN
      location_query || ' + #' || hashtag_filter
    WHEN discovery_type = 'location' THEN
      location_query
    ELSE
      hashtag
  END as query,
  city,
  service_type,
  status,
  posts_analyzed,
  new_vendors_discovered,
  last_discovered_at,
  next_discovery_at
FROM instagram_trend_queue
ORDER BY next_discovery_at DESC;
```

### View trending posts
```sql
SELECT
  ip.*,
  l.title as listing_name
FROM instagram_posts ip
LEFT JOIN listings l ON l.id = ip.listing_id
WHERE ip.is_trending = true
ORDER BY ip.engagement_score DESC
LIMIT 20;
```

## Benefits

1. **Always Fresh Content**: Listings automatically stay updated with latest Instagram photos
2. **Automated Discovery**: Find trending vendors without manual research
3. **Real Images**: Get actual venue/service photos from Instagram
4. **Engagement Tracking**: Identify popular vendors by engagement metrics
5. **International Ready**: Easy to add new countries/cities/locations
6. **GPS Coordinates**: Location-based discovery captures exact venue coordinates
7. **Dual Discovery**: Combine location + hashtag discovery for comprehensive coverage

## Discovery Method Comparison

| Feature | Hybrid (Location + Hashtag) ⭐ | Location-Only | Hashtag-Only |
|---------|-------------------------------|---------------|--------------|
| **Accuracy** | ⭐⭐⭐⭐⭐ Extremely high | ⭐⭐⭐⭐ Very high | ⭐⭐⭐ Good |
| **Relevance** | ⭐⭐⭐⭐⭐ Only wedding content | ⭐⭐⭐ Mixed content | ⭐⭐⭐⭐ Wedding focused |
| **GPS Data** | ✅ Yes | ✅ Yes | ❌ No |
| **Noise Filtering** | ⭐⭐⭐⭐⭐ Minimal false positives | ⭐⭐⭐ Some tourist posts | ⭐⭐ Higher false positives |
| **Best For** | Venues, wedding services | Broad discovery | National trends |
| **Regional Focus** | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐ City-wide |
| **Example** | "Sydney + #wedding" | "Sydney, Australia" | "#sydneywedding" |

**Recommendation**:
- **Venues**: Hybrid with `location + #wedding` or `location + #venue`
- **Photographers/Services**: Hybrid with `location + #photographer`
- **Trend Analysis**: Hashtag-only with popular hashtags

## Notes

- Python Edge Function uses instagrapi v2.1.2
- Session files stored in `/tmp` (ephemeral, re-login on cold start)
- Images downloaded and stored in `listing-images` bucket
- All Instagram data respects rate limits and TOS
