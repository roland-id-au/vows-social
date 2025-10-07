# Complete Vendor Discovery & Enrichment Pipeline

## End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DISCOVERY SOURCES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PERPLEXITY DISCOVERY                    2. INSTAGRAM TRENDS              │
│     • Searches "wedding venues Sydney"         • Location: "Sydney + #wedding"│
│     • Gets 10-15 vendors                       • Gets business accounts       │
│     • Saves to discovered_listings             • Extracts vendor from posts  │
│                                                • Saves to discovered_listings │
│                                                                              │
└────────────────────────┬───────────────────────────────┬───────────────────┘
                         │                               │
                         └───────────┬───────────────────┘
                                     ▼
                    ┌────────────────────────────────┐
                    │   DISCOVERED_LISTINGS TABLE    │
                    │                                │
                    │  • Vendor Name                 │
                    │  • Location (City, Country)    │
                    │  • Service Type                │
                    │  • Source (perplexity/instagram)│
                    │  • Discovery Method            │
                    │  • Enrichment Status: PENDING  │
                    └────────────────┬───────────────┘
                                     │
                         Auto-creates enrichment task
                                     ▼
                    ┌────────────────────────────────┐
                    │     ENRICHMENT_QUEUE TABLE     │
                    │                                │
                    │  • Discovery ID (link back)    │
                    │  • Vendor Name                 │
                    │  • Location                    │
                    │  • Priority                    │
                    │  • Status: PENDING             │
                    └────────────────┬───────────────┘
                                     │
                    Cron: enrichment-processor (every 5 min)
                                     ▼
                    ┌────────────────────────────────┐
                    │   ENRICHMENT PROCESSOR         │
                    │                                │
                    │  1. Perplexity Deep Research   │
                    │     • Full venue details       │
                    │     • Pricing, capacity        │
                    │     • Contact info             │
                    │     • Instagram handle         │
                    │                                │
                    │  2. Firecrawl Website Scraping │
                    │     • Real venue photos        │
                    │     • Packages/pricing         │
                    │     • Features                 │
                    │                                │
                    │  3. Instagram (if handle found)│
                    │     • Latest photos            │
                    │     • Engagement metrics       │
                    └────────────────┬───────────────┘
                                     │
                         Saves enriched data
                                     ▼
                    ┌────────────────────────────────┐
                    │       LISTINGS TABLE           │
                    │                                │
                    │  • Full vendor profile         │
                    │  • GPS coordinates             │
                    │  • Pricing & capacity          │
                    │  • Website, contact info       │
                    │  • Instagram handle            │
                    │  • SEO-friendly slug           │
                    └────────────────┬───────────────┘
                                     │
                    ┌────────────────┴───────────────┐
                    │                                │
            Downloads images                Auto-creates
                    │                      publishing task
                    ▼                                ▼
        ┌───────────────────────┐      ┌────────────────────────┐
        │ LISTING_MEDIA TABLE   │      │  PUBLISHING_QUEUE      │
        │                       │      │                        │
        │ • Stored in Supabase  │      │ • Listing ID           │
        │   Storage             │      │ • Channels (Discord)   │
        │ • Public URLs         │      │ • Status: PENDING      │
        └───────────────────────┘      └────────┬───────────────┘
                    │                           │
                    │          Cron: publishing-processor (every 5 min)
                    │                           ▼
                    │              ┌────────────────────────┐
                    └──────────────►  PUBLISHING PROCESSOR  │
                                   │                        │
                                   │ • Posts to Discord     │
                                   │ • Includes photos      │
                                   │ • Links to website     │
                                   └────────┬───────────────┘
                                            │
                                            ▼
                                   ┌────────────────────────┐
                                   │   PUBLISHED LISTING    │
                                   │                        │
                                   │ • Live on vows.social  │
                                   │ • Announced on Discord │
                                   │ • Auto-monitored       │
                                   └────────────────────────┘
                                            │
                                    Auto-creates monitoring
                                            ▼
                    ┌────────────────────────────────────────┐
                    │  INSTAGRAM_MONITOR_QUEUE (if handle)   │
                    │                                        │
                    │  • Daily photo updates                 │
                    │  • Keeps listings fresh                │
                    └────────────────────────────────────────┘
```

## Discovery Source Details

### 1. Perplexity Discovery
**Trigger**: `discovery-processor` cron (every 30 min)
**Process**:
- Reads from `discovery_queue` table
- Searches Perplexity: "wedding venues in Sydney, Australia"
- Gets 10-15 vendor names with basic info
- Saves each to `discovered_listings`
- Creates `enrichment_queue` task for each

**Data Captured**:
- Vendor name
- City, country
- Service type
- Source: "perplexity_discovery"

### 2. Instagram Trends Discovery
**Trigger**: `instagram-trend-processor` cron (every 6 hours)
**Process**:
- Reads from `instagram_trend_queue` table
- Searches Instagram: "Sydney, Australia + #wedding"
- Gets top 50 posts from business accounts
- **Extracts vendor from each post's author**
- Checks if vendor already exists
- If new: saves to `discovered_listings` + creates `enrichment_queue` task

**Data Captured**:
- Vendor name (Instagram full_name)
- Instagram handle (@username)
- City, country (from location tag)
- GPS coordinates (lat/lng)
- Engagement score (likes + comments)
- Source: "instagram_trends"
- Discovery method: "location" or "hashtag"

## Key Integration Points

### Instagram → Discovery Pipeline
When Instagram discovers a new vendor posting at a location:

```typescript
// instagram-trend-processor/index.ts (already implemented)

// Save to discovered_listings
const { data: discovery } = await supabase
  .from('discovered_listings')
  .insert({
    name: vendorName,                    // From Instagram full_name
    location: location,                   // From location tag
    city: task.city,
    country: task.country,
    type: task.service_type,
    source: 'instagram_trends',          // ← Source tracking
    discovery_method: task.discovery_type,
    enrichment_status: 'pending',
    metadata: {
      instagram_handle: post.username,   // ← Captured for later
      engagement_score: post.engagement_score,
      discovery_post_id: post.id,
      location_coordinates: {
        lat: post.location_lat,          // ← GPS coordinates
        lng: post.location_lng
      }
    }
  })

// Create enrichment task (auto-feeds into pipeline)
await supabase
  .from('enrichment_queue')
  .insert({
    discovery_id: discovery.id,          // ← Links back to discovery
    vendor_name: vendorName,
    location: location,
    city: task.city,
    country: task.country,
    service_type: task.service_type,
    priority: 6,                          // Slightly lower priority
    scheduled_for: new Date().toISOString()
  })
```

### Enrichment → Instagram Monitoring
When enrichment finds an Instagram handle:

```typescript
// enrichment-processor/index.ts (already implemented)

// After saving listing with instagram_handle...
// Database trigger automatically creates monitoring task:

CREATE TRIGGER trigger_queue_instagram_monitoring
  AFTER INSERT OR UPDATE OF instagram_handle ON listings
  FOR EACH ROW
  EXECUTE FUNCTION queue_instagram_monitoring_for_listing();
```

## Processing Priorities

Tasks are processed by priority (1 = highest):

| Source | Priority | Reasoning |
|--------|----------|-----------|
| Manual discovery | 1 | User-requested |
| Perplexity discovery (major cities) | 1 | High-value markets |
| Perplexity discovery (regional) | 2-3 | Secondary markets |
| Instagram trends | 6 | Discovered organically |

Lower priority ensures manually-added or major market vendors are enriched first.

## Success Metrics

Track discovery source effectiveness:

```sql
-- Vendors by discovery source
SELECT
  source,
  discovery_method,
  COUNT(*) as total_discovered,
  COUNT(listing_id) as successfully_enriched,
  ROUND(COUNT(listing_id)::numeric / COUNT(*)::numeric * 100, 1) as enrichment_rate
FROM discovered_listings
GROUP BY source, discovery_method
ORDER BY total_discovered DESC;

-- Example output:
-- source              | discovery_method | total | enriched | rate
-- instagram_trends    | location         | 150   | 142      | 94.7%
-- perplexity_discovery| perplexity       | 120   | 118      | 98.3%
```

## Automated Flow Summary

1. **Discovery runs automatically** (every 30 min - 6 hours)
2. **New vendors auto-queued for enrichment**
3. **Enrichment runs automatically** (every 5 min)
4. **Publishing runs automatically** (every 5 min)
5. **Monitoring starts automatically** (if Instagram handle found)

**Zero manual intervention required** - the entire pipeline is event-driven and self-managing!

## Adding New Discovery Sources

The pipeline is extensible. To add a new source:

1. Create discovery function (e.g., `tiktok-discovery`)
2. Save findings to `discovered_listings` with unique `source` value
3. Create `enrichment_queue` task
4. Pipeline automatically handles the rest

Example:
```sql
-- New vendor from TikTok discovery
INSERT INTO discovered_listings (name, location, city, country, type, source, enrichment_status)
VALUES ('Amazing Venue', 'Sydney, Australia', 'Sydney', 'Australia', 'venue', 'tiktok_discovery', 'pending');

-- Auto-creates enrichment task via application logic
INSERT INTO enrichment_queue (discovery_id, vendor_name, ...)
VALUES (...);

-- Pipeline takes over from here!
```
