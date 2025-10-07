# Implementation Plan - Remaining Features

**Date**: 2025-10-07
**Status**: Planning Phase
**Priority**: High → Medium → Low

---

## Overview

This document outlines the remaining steps to complete the Vows Social platform after successful pipeline testing.

### Completed ✅
- [x] Discovery pipeline (Perplexity API)
- [x] Enrichment pipeline (Firecrawl API)
- [x] Cost tracking system
- [x] Cache hit tracking
- [x] Error detection and alerting
- [x] Location standardization
- [x] Basic Discord notifications

### Remaining Work
1. **Images on vows.social Domain** (High Priority)
2. **Instagram Feed Enrichment** (High Priority)
3. **Discord Cost Reports & Cache Stats** (Medium Priority)
4. **Production Deployment & Monitoring** (Medium Priority)
5. **Performance Optimization** (Low Priority)

---

## Phase 1: Images on vows.social Domain

**Priority**: 🔴 High
**Estimated Time**: 2-4 hours
**Complexity**: Medium

### Current State
- Images stored in Supabase Storage bucket
- URLs point to: `https://[project].supabase.co/storage/v1/object/public/listing-images/[file]`
- No custom domain configured

### Goal
- Images served from: `https://images.vows.social/[file]`
- Fast CDN delivery
- Automatic image optimization

### Implementation Options

#### Option A: Cloudflare CDN (Recommended) ⭐
**Pros**:
- Free tier available
- Global CDN
- Automatic image optimization
- DDoS protection
- Easy DNS setup

**Steps**:
1. Add `images.vows.social` to Cloudflare DNS
2. Configure Cloudflare Worker to proxy Supabase Storage
3. Enable image optimization (Polish, Mirage)
4. Update image URLs in database
5. Test image loading

**Files to Create**:
- `cloudflare-worker.js` - Proxy worker for image serving
- `scripts/update-image-urls.sql` - Database migration for URL updates

**Code**:
```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // Proxy to Supabase Storage
  const supabaseUrl = `https://nidbhgqeyhrudtnizaya.supabase.co/storage/v1/object/public/listing-images${path}`

  const response = await fetch(supabaseUrl, {
    cf: {
      cacheTtl: 604800, // 7 days
      cacheEverything: true,
      image: {
        width: 1200,
        quality: 85,
        format: 'auto'
      }
    }
  })

  return response
}
```

#### Option B: Vercel Image Optimization
**Pros**:
- Built-in Next.js support
- Automatic WebP conversion
- Responsive images

**Cons**:
- Requires Next.js app deployed
- More expensive at scale

**Steps**:
1. Deploy Next.js app to Vercel
2. Configure `next.config.js` with Supabase as image source
3. Use Next.js `<Image>` component
4. Update API to return Vercel image URLs

#### Option C: Supabase Custom Domain (Simplest)
**Pros**:
- Native Supabase feature
- No additional infrastructure
- Simple setup

**Cons**:
- No image optimization
- No CDN caching

**Steps**:
1. Add `images.vows.social` CNAME to Supabase Storage endpoint
2. Update storage bucket settings
3. Test URLs

### Database Migration
```sql
-- Update image URLs from Supabase to custom domain
UPDATE listings
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{images}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        image,
        '{url}',
        to_jsonb(regexp_replace(image->>'url', 'https://[^/]+/storage/v1/object/public/listing-images/', 'https://images.vows.social/'))
      )
    )
    FROM jsonb_array_elements(metadata->'images') AS image
  )
)
WHERE metadata->'images' IS NOT NULL;
```

### Testing Checklist
- [ ] Images load from images.vows.social
- [ ] CDN caching works (check headers)
- [ ] Image optimization applied (WebP)
- [ ] HTTPS certificate valid
- [ ] No CORS errors
- [ ] Mobile images responsive

---

## Phase 2: Instagram Feed Enrichment

**Priority**: 🔴 High
**Estimated Time**: 4-6 hours
**Complexity**: High

### Current State
- Instagram handles stored in `discovered_listings` table
- No Instagram photos in enriched listings
- Instagram trend discovery infrastructure exists but not integrated

### Goal
- Enrich listings with Instagram photos
- Show recent posts on venue pages
- Update photos periodically
- Track engagement metrics

### Architecture

```
enrichment-processor
    ↓
Check if listing has Instagram handle
    ↓
Call instagram-scraper function
    ↓
Download 12 recent posts
    ↓
Store photos in Supabase Storage
    ↓
Update listing with Instagram data
```

### Implementation Steps

#### Step 1: Create Instagram Scraper Function
**File**: `supabase/functions/instagram-scraper/index.ts`

```typescript
/**
 * Instagram Scraper
 * Fetches recent posts from an Instagram account
 * Uses instagrapi (Python) or Instagram Basic Display API
 */

interface InstagramPost {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  permalink: string
  caption: string
  timestamp: string
  like_count: number
  comments_count: number
}

async function scrapeInstagram(username: string): Promise<InstagramPost[]> {
  // Option A: Use Instagram Basic Display API (requires auth)
  // Option B: Use third-party scraper service
  // Option C: Use instagrapi (Python-based)

  // For now, use Instagram Basic Display API
  const response = await fetch(
    `https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  )

  return await response.json()
}
```

**Options for Instagram Scraping**:

1. **Instagram Basic Display API** (Recommended)
   - Official API
   - Requires user authentication
   - Limited to user's own content
   - Rate limits: 200 calls/hour

2. **Instagram Graph API** (Business Accounts)
   - Requires Facebook Business account
   - More features (insights, publishing)
   - Higher rate limits
   - Better for automation

3. **Third-party Scraper** (e.g., Apify, Phantombuster)
   - No authentication needed
   - Can scrape any public account
   - Costs money ($0.01-$0.05 per scrape)
   - May violate Instagram TOS

4. **instagrapi Python Library**
   - Open source
   - No official API required
   - Risk of account bans
   - Requires Instagram credentials

**Recommendation**: Use Instagram Graph API for business accounts

#### Step 2: Update Enrichment Processor
**File**: `supabase/functions/enrichment-processor/index.ts`

Add Instagram enrichment step:

```typescript
// After Firecrawl scraping...

// Check if venue has Instagram handle
const instagramHandle = discovery.instagram_handle

if (instagramHandle) {
  console.log(`📸 Fetching Instagram photos for @${instagramHandle}`)

  const instagramPhotos = await fetch(`${supabaseUrl}/functions/v1/instagram-scraper`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: instagramHandle,
      limit: 12
    })
  }).then(r => r.json())

  // Download Instagram photos
  const instagramImages = await downloadAndStoreImages(
    instagramPhotos.map(p => p.media_url),
    `instagram/${slug}`
  )

  // Add to listing metadata
  metadata.instagram_posts = instagramPhotos
  metadata.instagram_images = instagramImages
}
```

#### Step 3: Create Instagram Monitoring Job
**File**: `supabase/functions/instagram-refresh-job/index.ts`

Periodic job to refresh Instagram data:

```typescript
/**
 * Instagram Refresh Job
 * Updates Instagram photos for all listings monthly
 * Runs via cron: 0 0 1 * * (1st of month)
 */

// Get all listings with Instagram handles
const { data: listings } = await supabase
  .from('listings')
  .select('id, slug, instagram_handle')
  .not('instagram_handle', 'is', null)

for (const listing of listings) {
  // Refresh Instagram data
  // Download new photos
  // Update listing
}
```

#### Step 4: Database Schema Updates

```sql
-- Add Instagram columns to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instagram_posts JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instagram_last_updated TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instagram_followers INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instagram_engagement_rate DECIMAL;

-- Create Instagram photos table (optional - for better querying)
CREATE TABLE IF NOT EXISTS instagram_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  post_id TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  permalink TEXT NOT NULL,
  caption TEXT,
  likes INTEGER,
  comments INTEGER,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instagram_photos_listing ON instagram_photos(listing_id);
CREATE INDEX idx_instagram_photos_posted_at ON instagram_photos(posted_at DESC);
```

### Instagram API Setup Guide

**Step-by-step**:
1. Create Facebook Developer App
2. Add Instagram Basic Display product
3. Get Instagram User Access Token
4. Store token in Supabase secrets
5. Implement token refresh logic

**Code**:
```bash
# Add Instagram tokens to Supabase secrets
supabase secrets set INSTAGRAM_CLIENT_ID=your_client_id
supabase secrets set INSTAGRAM_CLIENT_SECRET=your_client_secret
supabase secrets set INSTAGRAM_ACCESS_TOKEN=your_access_token
```

### Testing Checklist
- [ ] Instagram scraper fetches posts correctly
- [ ] Photos download and store in Supabase Storage
- [ ] Listing metadata updated with Instagram data
- [ ] Error handling for private accounts
- [ ] Rate limiting respected
- [ ] Token refresh works
- [ ] No duplicate photos created

---

## Phase 3: Discord Cost Reports & Cache Stats

**Priority**: 🟡 Medium
**Estimated Time**: 2-3 hours
**Complexity**: Low

### Current State
- Individual discovery notifications sent to Discord
- No aggregated cost reports
- No cache statistics tracked in Discord

### Goal
- Daily cost summary at 9 AM
- Real-time budget alerts
- Cache hit rate statistics
- Cost savings calculations

### Implementation Steps

#### Step 1: Create Discord Reporter Service
**File**: `supabase/functions/discord-cost-reporter/index.ts`

```typescript
/**
 * Discord Cost Reporter
 * Sends periodic cost reports to Discord
 * Triggers: Manual, Cron (daily), Budget threshold
 */

interface CostReport {
  period: 'daily' | 'weekly' | 'monthly'
  total_cost: number
  api_calls: number
  cache_hits: number
  cache_hit_rate: number
  cost_saved: number
  top_expensive_queries: Array<{query: string, cost: number}>
}

async function generateDailyCostReport(): Promise<CostReport> {
  // Query cost analytics for last 24 hours
  const { data: costs } = await supabase
    .from('api_cost_transactions')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // Calculate cache hits
  const cacheHits = costs.filter(c =>
    c.metadata && JSON.parse(c.metadata).cache_hit
  ).length

  const apiCalls = costs.length
  const cacheHitRate = (cacheHits / apiCalls) * 100

  // Calculate cost saved
  const avgCostPerCall = costs
    .filter(c => c.cost_usd > 0)
    .reduce((sum, c) => sum + c.cost_usd, 0) / costs.filter(c => c.cost_usd > 0).length

  const costSaved = cacheHits * avgCostPerCall

  return {
    period: 'daily',
    total_cost: costs.reduce((sum, c) => sum + c.cost_usd, 0),
    api_calls: apiCalls,
    cache_hits: cacheHits,
    cache_hit_rate: cacheHitRate,
    cost_saved: costSaved,
    top_expensive_queries: [] // TODO
  }
}

async function sendDailyReport() {
  const report = await generateDailyCostReport()

  await discord.log(
    `📊 **Daily Cost Report** (${new Date().toLocaleDateString()})`,
    {
      color: 0x3498db,
      metadata: {
        '💰 Total Cost': `$${report.total_cost.toFixed(4)}`,
        '📞 API Calls': report.api_calls.toString(),
        '💾 Cache Hits': `${report.cache_hits} (${report.cache_hit_rate.toFixed(1)}%)`,
        '💵 Cost Saved': `$${report.cost_saved.toFixed(4)}`,
        '📈 Efficiency': `${((1 - report.total_cost / (report.total_cost + report.cost_saved)) * 100).toFixed(1)}%`
      }
    }
  )
}
```

#### Step 2: Add Budget Alert Function
**File**: `supabase/functions/discord-cost-reporter/index.ts` (add to above)

```typescript
// Track running cost and alert at thresholds
const BUDGET_THRESHOLDS = [10, 25, 50, 100] // USD

async function checkBudgetThreshold() {
  // Get monthly costs
  const { data: monthlyCosts } = await supabase
    .from('api_cost_transactions')
    .select('cost_usd')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const monthlyTotal = monthlyCosts.reduce((sum, c) => sum + c.cost_usd, 0)

  // Check if any threshold crossed
  for (const threshold of BUDGET_THRESHOLDS) {
    const key = `budget_alert_${threshold}_${new Date().getMonth()}`

    const { data: alerted } = await supabase
      .from('system_flags')
      .select('value')
      .eq('key', key)
      .single()

    if (!alerted && monthlyTotal >= threshold) {
      await discord.warning(
        `🚨 **Budget Alert**: Monthly costs reached $${threshold}`,
        {
          'Monthly Total': `$${monthlyTotal.toFixed(2)}`,
          'Budget Threshold': `$${threshold}`,
          'Percentage': `${((monthlyTotal / threshold) * 100).toFixed(0)}%`,
          'Action': 'Review usage and optimize queries'
        }
      )

      // Mark as alerted
      await supabase
        .from('system_flags')
        .upsert({ key, value: 'true' })
    }
  }
}
```

#### Step 3: Create Cron Job for Daily Reports
**File**: `supabase/migrations/028_add_cost_reporting_cron.sql`

```sql
-- Daily cost report at 9 AM Sydney time
SELECT cron.schedule(
  'daily-cost-report',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discord-cost-reporter',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{"action": "daily_report"}'::jsonb
    ) AS request_id;
  $$
);

-- Budget check every 6 hours
SELECT cron.schedule(
  'budget-threshold-check',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discord-cost-reporter',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := '{"action": "check_budget"}'::jsonb
    ) AS request_id;
  $$
);
```

#### Step 4: Add Cache Statistics View
**File**: `supabase/migrations/028_add_cost_reporting_cron.sql` (add to above)

```sql
-- Cache statistics view
CREATE OR REPLACE VIEW cache_statistics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE (metadata::jsonb->>'cache_hit')::boolean = true) as cache_hits,
  COUNT(*) FILTER (WHERE (metadata::jsonb->>'cache_hit')::boolean = false OR metadata::jsonb->>'cache_hit' IS NULL) as cache_misses,
  COUNT(*) as total_calls,
  ROUND(
    (COUNT(*) FILTER (WHERE (metadata::jsonb->>'cache_hit')::boolean = true)::decimal / COUNT(*)) * 100,
    2
  ) as cache_hit_rate_percent,
  SUM(cost_usd) as total_cost,
  AVG(CASE WHEN cost_usd > 0 THEN cost_usd ELSE NULL END) as avg_cost_per_api_call,
  COUNT(*) FILTER (WHERE (metadata::jsonb->>'cache_hit')::boolean = true) *
    AVG(CASE WHEN cost_usd > 0 THEN cost_usd ELSE NULL END) as estimated_cost_saved
FROM api_cost_transactions
WHERE service = 'perplexity' AND operation = 'discovery'
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW cache_statistics IS 'Daily cache hit rates and cost savings';
```

### Discord Report Format

**Daily Report Example**:
```
📊 **Daily Cost Report** (Oct 7, 2025)

💰 Total Cost: $0.0512
📞 API Calls: 89
💾 Cache Hits: 43 (48.3%)
💵 Cost Saved: $0.0318
📈 Efficiency: 38.3%

Top Queries:
1. Sydney venues: $0.0156 (21 calls)
2. Melbourne venues: $0.0123 (17 calls)
3. Brisbane venues: $0.0089 (12 calls)

Cache Performance: 🟢 Excellent
Budget Status: ✅ On Track ($0.89/$25.00)
```

**Budget Alert Example**:
```
🚨 **Budget Alert**: Monthly costs reached $25

Monthly Total: $25.12
Budget Threshold: $25
Percentage: 100%
Action: Review usage and optimize queries

Next Threshold: $50
Projected Month End: $37.50
```

### Testing Checklist
- [ ] Daily report sent at 9 AM
- [ ] Cache statistics accurate
- [ ] Cost savings calculated correctly
- [ ] Budget alerts trigger at thresholds
- [ ] Report formatting looks good in Discord
- [ ] No duplicate reports sent

---

## Phase 4: Production Deployment & Monitoring

**Priority**: 🟡 Medium
**Estimated Time**: 3-4 hours
**Complexity**: Medium

### Setup Production Environment

#### Step 1: Environment Configuration
**File**: `.env.production`

```bash
# Production environment variables
ENVIRONMENT=production
SUPABASE_URL=https://nidbhgqeyhrudtnizaya.supabase.co
SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# API Keys
PERPLEXITY_API_KEY=***
FIRECRAWL_API_KEY=***
INSTAGRAM_ACCESS_TOKEN=***

# Discord Webhooks
DISCORD_WEBHOOK_URL=***
DISCORD_ALERTS_WEBHOOK=***  # Critical alerts only

# Feature Flags
ENABLE_AUTO_DISCOVERY=true
ENABLE_AUTO_ENRICHMENT=true
ENABLE_INSTAGRAM_ENRICHMENT=true
ENABLE_COST_REPORTS=true

# Rate Limits
MAX_DISCOVERIES_PER_HOUR=50
MAX_ENRICHMENTS_PER_HOUR=30

# Budgets
DAILY_BUDGET_USD=5.00
MONTHLY_BUDGET_USD=100.00
```

#### Step 2: Production Cron Jobs
**File**: `supabase/migrations/029_production_cron_schedule.sql`

```sql
-- Discovery pipeline runs every 2 hours
SELECT cron.schedule(
  'discovery-pipeline-production',
  '0 */2 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);

-- Enrichment pipeline runs every 15 minutes
SELECT cron.schedule(
  'enrichment-pipeline-production',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/enrichment-processor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);

-- Instagram refresh monthly (1st of month at 2 AM)
SELECT cron.schedule(
  'instagram-refresh-monthly',
  '0 2 1 * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-refresh-job',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
    ) AS request_id;
  $$
);
```

#### Step 3: Monitoring & Alerts Setup

**Create monitoring function**:
```typescript
// supabase/functions/health-check/index.ts
async function performHealthCheck() {
  const checks = {
    database: false,
    storage: false,
    perplexity_api: false,
    firecrawl_api: false,
    discovery_queue: false,
    enrichment_queue: false
  }

  // Check database
  try {
    await supabase.from('listings').select('count')
    checks.database = true
  } catch (e) {
    checks.database = false
  }

  // Check Perplexity API
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
      body: JSON.stringify({ model: 'sonar-pro', messages: [{ role: 'user', content: 'test' }] })
    })
    checks.perplexity_api = response.status !== 401
  } catch (e) {
    checks.perplexity_api = false
  }

  // Check queues
  const { data: pendingDiscoveries } = await supabase
    .from('discovery_queue')
    .select('count')
    .eq('status', 'pending')

  checks.discovery_queue = pendingDiscoveries && pendingDiscoveries.length > 0

  // Alert if any checks fail
  const failedChecks = Object.entries(checks)
    .filter(([_, status]) => !status)
    .map(([name]) => name)

  if (failedChecks.length > 0) {
    await discord.error(
      '🚨 Health Check Failed',
      new Error(`Failed checks: ${failedChecks.join(', ')}`),
      { 'Failed Systems': failedChecks.join(', ') }
    )
  }

  return checks
}
```

#### Step 4: Error Tracking
**File**: `supabase/migrations/030_error_tracking.sql`

```sql
-- Error tracking table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_service ON error_logs(service);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_type ON error_logs(error_type);

-- Error summary view
CREATE OR REPLACE VIEW error_summary AS
SELECT
  service,
  error_type,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurred,
  array_agg(DISTINCT error_message) as sample_messages
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service, error_type
ORDER BY error_count DESC;
```

### Testing Checklist
- [ ] All cron jobs scheduled correctly
- [ ] Health checks run every 5 minutes
- [ ] Error tracking captures all errors
- [ ] Rate limits enforced
- [ ] Budget limits enforced
- [ ] Alerts sent to Discord
- [ ] API keys secured
- [ ] No sensitive data in logs

---

## Phase 5: Performance Optimization

**Priority**: 🟢 Low
**Estimated Time**: 2-3 hours
**Complexity**: Medium

### Optimization Tasks

#### 1. Batch Processing for Enrichment
Currently: 1 enrichment at a time (80 seconds each)
Goal: 5 parallel enrichments (16 seconds per batch)

```typescript
// Process 5 enrichments in parallel
const BATCH_SIZE = 5

async function processBatch() {
  const { data: tasks } = await supabase
    .from('enrichment_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .limit(BATCH_SIZE)

  await Promise.all(
    tasks.map(task => enrichVendor(task))
  )
}
```

#### 2. Database Indexing
```sql
-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovered_listings_enrichment_status_pending
  ON discovered_listings(enrichment_status)
  WHERE enrichment_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_enrichment_queue_pending_priority
  ON enrichment_queue(priority, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_listings_slug_gin
  ON listings USING gin(to_tsvector('english', slug));
```

#### 3. Cache Optimization
- Increase TTL to 24 hours (from 12 hours)
- Implement cache warming for popular queries
- Add Redis for distributed caching (future)

#### 4. Image Optimization
- Compress images before upload (80% quality)
- Generate thumbnails (small, medium, large)
- Lazy load images on frontend
- Use WebP format

---

## Implementation Timeline

### Week 1 (Current)
- [x] Complete pipeline testing
- [ ] Phase 1: Images on vows.social domain (2 days)
- [ ] Phase 2: Instagram feed enrichment (3 days)

### Week 2
- [ ] Phase 3: Discord cost reports (1 day)
- [ ] Phase 4: Production deployment (2 days)
- [ ] Phase 5: Performance optimization (2 days)

### Week 3+
- [ ] Monitor production usage
- [ ] Iterate based on metrics
- [ ] Add new features as needed

---

## Resource Requirements

### Infrastructure
- [x] Supabase project (existing)
- [ ] Cloudflare account (free tier)
- [ ] Instagram Developer account (free)
- [ ] Facebook Developer app (free)

### API Quotas
- Perplexity API: ~$5-10/month at current volume
- Firecrawl API: ~$20-30/month at current volume
- Instagram Graph API: Free (within limits)
- Total: ~$25-40/month

### Time Investment
- Development: 15-20 hours
- Testing: 5-8 hours
- Documentation: 2-3 hours
- Total: 22-31 hours

---

## Success Metrics

### Performance Metrics
- Discovery success rate: >95%
- Enrichment success rate: >90%
- Average processing time: <90 seconds per listing
- Cache hit rate: >60%

### Cost Metrics
- Monthly API costs: <$50
- Cost per listing: <$0.50
- Cost savings from cache: >$20/month

### Quality Metrics
- Listings with photos: >80%
- Listings with full address: >90%
- Listings with Instagram: >50%
- Data accuracy: >95%

---

## Risk Mitigation

### High Risk Items
1. **Instagram API rate limits**
   - Mitigation: Implement exponential backoff, respect limits
   - Fallback: Manual Instagram handle collection

2. **Perplexity API costs exceed budget**
   - Mitigation: Daily budget alerts, rate limiting
   - Fallback: Reduce discovery frequency

3. **Firecrawl scraping failures**
   - Mitigation: Retry logic, multiple scraping methods
   - Fallback: Manual data entry for high-priority venues

### Medium Risk Items
1. **CDN configuration issues**
   - Mitigation: Test thoroughly before production
   - Fallback: Keep Supabase URLs as backup

2. **Discord webhook rate limits**
   - Mitigation: Batch notifications, use queues
   - Fallback: Email notifications

---

## Next Steps

### Immediate Actions (Today)
1. ✅ Complete pipeline testing
2. ✅ Document all features
3. Create implementation plan (this document)

### This Week
1. Set up Cloudflare CDN for images
2. Implement Instagram scraper
3. Deploy cost reporting to Discord

### Next Week
1. Deploy to production
2. Monitor for 1 week
3. Optimize based on metrics

---

## Appendix

### Useful Commands

```bash
# Deploy all functions
supabase functions deploy

# Check function logs
supabase functions logs discovery-processor --tail

# Run database migrations
supabase db push

# Check cost analytics
curl -X GET "https://nidbhgqeyhrudtnizaya.supabase.co/rest/v1/cost_analytics" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Trigger manual discovery
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# Check cache statistics
curl -X GET "https://nidbhgqeyhrudtnizaya.supabase.co/rest/v1/cache_statistics" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

### Resources
- [Supabase Docs](https://supabase.com/docs)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Perplexity API Docs](https://docs.perplexity.ai/)

---

**Plan Status**: ✅ Complete and Ready for Implementation
**Total Estimated Time**: 22-31 hours
**Priority Order**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
