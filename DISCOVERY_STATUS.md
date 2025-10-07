# Discovery Pipeline Status

**Last Updated**: 2025-10-07

## Overview

The Vows Social platform has **two discovery channels** that feed into the enrichment pipeline:

### 1. ✅ Perplexity AI Discovery (WORKING)
- **Status**: Operational
- **Function**: `discovery-processor`
- **Source**: Perplexity API (sonar-pro model)
- **Method**: AI-powered search queries
- **Queue**: `discovery_queue` (59 pending tasks)
- **Results**: 10-15 vendors per query
- **Cache**: 12 hour TTL

**Recent Success**:
- Discovered 27 wedding venues in Melbourne
- Created 36 enrichment tasks
- Examples: Abbotsford Convent, Melbourne Zoo, Luminare, Prince Deck St Kilda, etc.

### 2. ⏳ Instagram Trend Discovery (READY, NEEDS SCRAPER)
- **Status**: Infrastructure ready, awaiting implementation
- **Function**: `instagram-trend-processor`
- **Source**: Instagram posts via `instagrapi-scraper` (not yet implemented)
- **Method**: Hashtag + location-based trend analysis
- **Queue**: `instagram_trend_queue` (23 pending tasks)
- **Frequency**: Weekly (every 168 hours)

**Configuration**: 23 tasks configured
- Location-based: "Sydney, Australia" + #wedding
- Location-based: "Melbourne, Australia" + #venue
- Hashtag filter combinations for all major cities

**To Make Operational**:
- [ ] Implement `instagrapi-scraper` Edge Function
- [ ] Set up Instagram authentication
- [ ] Deploy and test with real Instagram data

## Database Schema

### Location Model (Standardized)

**Fields**:
- `city` (TEXT, required): e.g., "Sydney"
- `country` (TEXT, required): e.g., "Australia"
- `location` (TEXT, required): Human-readable format "City, Country"
- `address` (TEXT, optional): Full street address
- `coordinates` (GEOGRAPHY, optional): PostGIS POINT for radius searches
- `state` (TEXT, nullable): **DEPRECATED** - Kept for backward compatibility

**Why this model**:
- ✅ Universal (works internationally)
- ✅ Simple (country + city is intuitive)
- ✅ Flexible (address + coordinates for precision)
- ❌ Removed state (not universal, caused NOT NULL constraint issues)

**Spatial Queries**:
```sql
-- Find listings within 50km of coordinates
SELECT * FROM find_listings_near(-33.8688, 151.2093, 50000);
```

## Pipeline Flow

```
┌─────────────────────────────────────┐
│   DISCOVERY CHANNELS                │
├─────────────────────────────────────┤
│                                     │
│  1. Perplexity AI Discovery        │
│     └─> discovery-processor         │
│     └─> 59 pending queries          │
│                                     │
│  2. Instagram Trend Discovery       │
│     └─> instagram-trend-processor   │
│     └─> 23 pending tasks            │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
   ┌───────────────────────┐
   │  discovered_listings  │
   │  (36 pending)         │
   └───────────┬───────────┘
               │
               ▼
   ┌───────────────────────┐
   │  enrichment_queue     │
   │  (36 pending tasks)   │
   └───────────┬───────────┘
               │
               ▼
   ┌───────────────────────┐
   │  enrichment-processor │
   │  (Firecrawl scraping) │
   └───────────┬───────────┘
               │
               ▼
   ┌───────────────────────┐
   │      listings         │
   │  (Published venues)   │
   └───────────────────────┘
```

## Recent Fixes Applied

### ✅ Fix #1: Missing `state` Column
**Problem**: Discovery inserts were failing silently due to NOT NULL constraint on `state` field.

**Solution**:
- Made `state` nullable across all tables
- Removed `state` from insert statements
- Added `address` and `coordinates` for precise location
- Created spatial indexes for radius queries

**Migration**: `026_make_state_nullable.sql`

### ✅ Fix #2: Location Architecture Standardized
**Before**:
- Mixed use of state/city/country
- NOT NULL constraints causing failures
- Australia-specific (state field)

**After**:
- Consistent country + city across all tables
- Location string: "City, Country"
- Optional address + coordinates for precision
- Works internationally

### ✅ Fix #3: Instagram Discovery Schema Compatibility
**Problem**: Instagram trend processor was trying to insert non-existent columns (`source`, `discovery_method`, `metadata`).

**Solution**: Updated to use existing columns:
- `instagram_handle`: Username
- `engagement_score`: Post engagement
- `why_trending`: Discovery context

## Current Issues

### ⚠️ Issue #1: Perplexity API Authentication
**Status**: 401 Authorization Required

**Symptoms**:
```
Perplexity API error: 401 - Authorization Required
```

**Possible Causes**:
1. Missing `PERPLEXITY_API_KEY` environment variable in Supabase secrets
2. Invalid or expired API key
3. API key not properly formatted

**To Fix**:
```bash
# Check if secret exists
supabase secrets list

# Set API key if missing
supabase secrets set PERPLEXITY_API_KEY=pplx-xxx

# Redeploy function
supabase functions deploy discovery-processor
```

### ⏳ Issue #2: Instagram Scraper Not Implemented
**Status**: Infrastructure ready, needs implementation

**Required**:
- Python-based `instagrapi-scraper` Edge Function
- Instagram account credentials
- Rate limiting logic
- Post filtering (business accounts, engagement metrics)

## Testing

### Test Perplexity Discovery
```bash
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected**:
- `discoveries_found: 10-15`
- New entries in `discovered_listings`
- Enrichment tasks created

### Test Instagram Discovery
```bash
# First, seed the queue
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/seed-instagram-trends" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Then process
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-trend-processor" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected** (once scraper is implemented):
- `posts_analyzed: 50`
- `new_vendors_discovered: 5-10`
- Instagram handles populated in `discovered_listings`

## Monitoring

### Queue Status
```sql
-- Discovery queue
SELECT status, COUNT(*)
FROM discovery_queue
GROUP BY status;

-- Instagram trend queue
SELECT status, COUNT(*)
FROM instagram_trend_queue
GROUP BY status;

-- Enrichment queue
SELECT status, COUNT(*)
FROM enrichment_queue
GROUP BY status;
```

### Recent Discoveries
```sql
-- Last 10 discoveries
SELECT name, city, country, enrichment_status, created_at
FROM discovered_listings
ORDER BY created_at DESC
LIMIT 10;

-- Discoveries by source
SELECT
  CASE
    WHEN instagram_handle IS NOT NULL THEN 'Instagram'
    ELSE 'Perplexity'
  END as source,
  COUNT(*)
FROM discovered_listings
GROUP BY source;
```

## Next Steps

1. **Fix Perplexity API Key** (Priority: HIGH)
   - Check Supabase secrets for `PERPLEXITY_API_KEY`
   - Verify key is valid and active
   - Test discovery after fix

2. **Implement Instagram Scraper** (Priority: MEDIUM)
   - Create `instagrapi-scraper` Edge Function
   - Set up Instagram authentication
   - Implement hashtag + location search
   - Filter for business accounts
   - Return engagement metrics

3. **Test Full Pipeline** (Priority: MEDIUM)
   - Run discovery for multiple cities
   - Verify enrichment tasks are created
   - Check enrichment processor works
   - Validate data quality

4. **Scale Up Discovery** (Priority: LOW)
   - Expand to more Australian cities
   - Add international cities (future)
   - Tune discovery frequency
   - Optimize cache strategy
