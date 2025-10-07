# Instagram Trends → Vendor Discovery Pipeline Integration

## ✅ ALREADY IMPLEMENTED AND WORKING

Instagram trend discovery **automatically feeds** into the vendor discovery pipeline. No additional work needed.

---

## How It Works

### Step 1: Instagram Discovers Trending Posts
```typescript
// instagram-trend-processor runs every 6 hours
// Searches: "Sydney, Australia + #wedding"

const posts = await instagrapi.discover_location(
  'Sydney, Australia',
  50,
  'wedding'  // hashtag filter
)
// Returns: 50 top posts from business accounts
```

### Step 2: Extract Vendor from Post Author
```typescript
for (const post of posts) {
  // Skip if not a business account
  if (!post.is_business) continue

  // Get vendor info from post author
  const vendorName = post.full_name      // "Gunners Barracks"
  const instagramHandle = post.username  // "@gunnersbarracks"
  const location = post.location_name    // "Mosman, Sydney"
  const gpsCoords = {
    lat: post.location_lat,              // -33.8463
    lng: post.location_lng               // 151.2419
  }
```

### Step 3: Save to Discovery Pipeline (AUTO)
```typescript
  // Check if vendor already exists
  const existing = await checkIfExists(vendorName, city)
  if (existing) continue  // Skip duplicates

  // ✅ SAVE TO DISCOVERED_LISTINGS
  const discovery = await supabase
    .from('discovered_listings')
    .insert({
      name: vendorName,
      location: location,
      city: 'Sydney',
      country: 'Australia',
      type: 'venue',
      source: 'instagram_trends',           // ← Tracks source
      discovery_method: 'location',         // ← 'location' or 'hashtag'
      enrichment_status: 'pending',
      metadata: {
        instagram_handle: instagramHandle,  // ← Saved for later
        engagement_score: post.likes + post.comments,
        discovery_post_id: post.id,
        location_coordinates: gpsCoords     // ← GPS data
      }
    })

  // ✅ AUTO-CREATE ENRICHMENT TASK
  await supabase
    .from('enrichment_queue')
    .insert({
      discovery_id: discovery.id,           // ← Links back
      vendor_name: vendorName,
      location: location,
      city: 'Sydney',
      country: 'Australia',
      service_type: 'venue',
      priority: 6,                          // Lower priority
      scheduled_for: new Date()
    })
}
```

### Step 4: Enrichment Processor Takes Over (AUTO)
```
Cron runs every 5 minutes → enrichment-processor

1. Picks up task from enrichment_queue
2. Calls Perplexity API for deep research
3. Calls Firecrawl to scrape website
4. Downloads images to Supabase Storage
5. Saves to listings table
6. Creates publishing task
```

### Step 5: Publishing Processor (AUTO)
```
Cron runs every 5 minutes → publishing-processor

1. Picks up task from publishing_queue
2. Posts to Discord with photos
3. Listing goes live on vows.social
```

### Step 6: Instagram Monitoring Starts (AUTO)
```
Database trigger on listings.instagram_handle

When listing is created with Instagram handle:
→ Automatically creates instagram_monitor_queue task
→ Monitors account daily for new photos
→ Updates listing with fresh content
```

---

## Complete Flow Diagram

```
Instagram Trend Discovery
        ↓
Extract Business Account Info
        ↓
discovered_listings (source='instagram_trends')
        ↓
enrichment_queue (auto-created)
        ↓
enrichment-processor (Perplexity + Firecrawl + Photos)
        ↓
listings (full vendor profile)
        ↓
publishing_queue (auto-created)
        ↓
publishing-processor (Discord + Website)
        ↓
Live on vows.social
        ↓
instagram_monitor_queue (auto-created if handle exists)
        ↓
Daily photo updates
```

---

## Key Integration Points

### 1. Instagram → Discovery
**File**: `supabase/functions/instagram-trend-processor/index.ts`
**Lines**: 170-203

Automatically saves Instagram discoveries to `discovered_listings` and creates enrichment tasks.

### 2. Discovery → Enrichment
**Auto-trigger**: When row inserted into `discovered_listings`
**Creates**: Enrichment task in `enrichment_queue`

### 3. Enrichment → Publishing
**File**: `supabase/functions/enrichment-processor/index.ts`
**Auto-trigger**: After successful enrichment
**Creates**: Publishing task in `publishing_queue`

### 4. Publishing → Monitoring
**Auto-trigger**: Database trigger on `listings.instagram_handle`
**Creates**: Monitoring task in `instagram_monitor_queue`

---

## Data Tracked from Instagram

When a vendor is discovered via Instagram, we capture:

| Field | Example | Purpose |
|-------|---------|---------|
| `instagram_handle` | "@gunnersbarracks" | For monitoring & enrichment |
| `location_coordinates` | {lat: -33.8463, lng: 151.2419} | GPS mapping |
| `engagement_score` | 2453 | Popularity metric |
| `discovery_post_id` | "3234..." | Reference to discovery post |
| `discovery_method` | "location" | How we found them |
| `source` | "instagram_trends" | Discovery source |

---

## Monitoring the Pipeline

### Check Instagram discoveries feeding into pipeline:
```sql
-- Recent Instagram discoveries and their pipeline status
SELECT
  dl.name,
  dl.city,
  dl.metadata->>'instagram_handle' as ig_handle,
  dl.enrichment_status,
  eq.status as enrichment_queue_status,
  l.slug as live_listing_slug,
  dl.created_at as discovered_at
FROM discovered_listings dl
LEFT JOIN enrichment_queue eq ON eq.discovery_id = dl.id
LEFT JOIN listings l ON l.id = dl.listing_id
WHERE dl.source = 'instagram_trends'
ORDER BY dl.created_at DESC
LIMIT 20;
```

### Track complete vendor journey:
```sql
-- Use the vendor_pipeline_journey view
SELECT * FROM vendor_pipeline_journey
WHERE discovery_source = 'instagram_trends'
ORDER BY discovered_at DESC;
```

### Performance metrics:
```sql
-- Instagram discovery effectiveness
SELECT
  COUNT(*) as total_discovered,
  COUNT(listing_id) as successfully_enriched,
  ROUND(COUNT(listing_id)::numeric / COUNT(*) * 100, 1) as success_rate
FROM discovered_listings
WHERE source = 'instagram_trends';
```

---

## Example: End-to-End Journey

**Day 1, 10:00 AM** - Instagram trend discovery runs
- Searches: "Byron Bay, Australia + #wedding"
- Finds: Post from @thefigtreerestaurant
- Extracts: Business account, location, GPS coordinates
- ✅ Saves to `discovered_listings`
- ✅ Creates `enrichment_queue` task

**Day 1, 10:05 AM** - Enrichment processor runs
- ✅ Picks up enrichment task
- Calls Perplexity: Deep research on "The Fig Tree Restaurant"
- Calls Firecrawl: Scrapes website for photos & packages
- Downloads 8 photos to Supabase Storage
- ✅ Saves to `listings` with slug "the-fig-tree-byron-bay-nsw"
- ✅ Creates `publishing_queue` task

**Day 1, 10:10 AM** - Publishing processor runs
- ✅ Picks up publishing task
- Posts to Discord with photo gallery
- Listing goes live at vows.social/venues/the-fig-tree-byron-bay-nsw

**Day 1, 10:10 AM** - Instagram monitoring starts
- Database trigger detects `instagram_handle = "@thefigtreerestaurant"`
- ✅ Creates `instagram_monitor_queue` task
- Will check daily for new photos

**Day 2, 10:00 AM** - Instagram monitor runs
- Fetches last 12 posts from @thefigtreerestaurant
- Finds 2 new wedding photos
- Downloads and adds to listing
- Listing now has 10 photos total

---

## Source Tracking

All vendors track their discovery source:

```sql
SELECT source, COUNT(*)
FROM discovered_listings
GROUP BY source;

-- Results:
-- instagram_trends      → 150 vendors
-- perplexity_discovery  → 120 vendors
-- manual               → 10 vendors
```

This allows you to:
- Measure Instagram discovery effectiveness
- Compare discovery sources
- Track ROI of different methods
- Optimize discovery strategy

---

## Adding More Instagram Discovery

The system scales automatically. To discover more vendors:

### Add More Locations
```sql
INSERT INTO instagram_trend_config (discovery_type, location_query, hashtag_filter, country, city, service_type, priority)
VALUES
  ('location', 'Port Douglas, Australia', 'wedding', 'Australia', 'Port Douglas', 'venue', 2),
  ('location', 'Sunshine Coast, Australia', 'venue', 'Australia', 'Sunshine Coast', 'venue', 2);
```

### Seed the queue
```bash
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/seed-instagram-trends" \
  -H "Authorization: Bearer YOUR_KEY"
```

The pipeline automatically handles everything from there!

---

## Benefits of Instagram Discovery

1. **Real Businesses**: Only business accounts (verified vendors)
2. **Active Vendors**: Currently posting (not defunct businesses)
3. **GPS Coordinates**: Exact location from Instagram tags
4. **Engagement Data**: Social proof via likes/comments
5. **Fresh Content**: Recent posts = active business
6. **Auto-Monitoring**: Instagram handle captured for daily updates
7. **Zero Manual Work**: Fully automated discovery → enrichment → publishing

---

## Summary

✅ **Instagram trends automatically feed into vendor discovery pipeline**
✅ **Business accounts extracted from trending posts**
✅ **Auto-creates enrichment tasks**
✅ **Full pipeline processes automatically**
✅ **Instagram monitoring starts after publishing**
✅ **Complete end-to-end automation**

**No additional integration needed - it's already working!**
