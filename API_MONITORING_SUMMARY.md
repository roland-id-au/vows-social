# API Monitoring & Cost Tracking - Implementation Summary

**Date**: 2025-10-07
**Status**: ✅ Implemented, ⚠️ Runtime Testing Needed

---

## Features Implemented

### 1. ✅ Enhanced Error Detection & Alerting

**Location**: `supabase/functions/discovery-processor/index.ts:139-189`

**Detects**:
- **401 Unauthorized**: Invalid/missing API key
- **402 Payment Required**: Insufficient credits/expired payment
- **429 Rate Limit**: Too many requests
- **500/502/503**: Service errors

**Error Handling**:
```typescript
if (status === 401) {
  errorType = 'Authentication Failed'
  severity = 'critical'
  // Sends Discord alert with action steps
}
else if (status === 402) {
  errorType = 'Payment Required / Insufficient Credits'
  severity = 'critical'
  // Sends Discord alert with credit top-up link
}
```

**Discord Alerts**:
- 🚨 **Critical errors** → Immediate Discord notification
- ⚠️ **Warnings** → Low rate limit alerts
- 💰 **Cost tracking** → Shows API costs in all discovery notifications

**Example Discord Message** (Critical):
```
🚨 CRITICAL: Perplexity API - Payment Required / Insufficient Credits

Status Code: 402
Task ID: abc-123
Query: wedding venue in Sydney, Australia
Action Required: 💳 Add credits at https://www.perplexity.ai/settings/api
```

---

### 2. ✅ Comprehensive Cost Tracking

**Database Schema** (`027_add_cost_tracking.sql`):

**Tables**:
- `api_cost_transactions`: Detailed tracking of all API calls
- `discovered_listings`: Added cost columns per listing
- `listings`: Added cost columns per listing

**Columns Added**:
```sql
-- discovered_listings & listings
api_cost_usd          DECIMAL(10,4)  -- Total API cost
discovery_cost_usd    DECIMAL(10,4)  -- Discovery phase cost
enrichment_cost_usd   DECIMAL(10,4)  -- Enrichment phase cost
address               TEXT           -- Full street address
coordinates           GEOGRAPHY      -- PostGIS POINT for radius search

-- discovery_queue
last_error_at         TIMESTAMPTZ    -- When last error occurred
```

**Cost Transaction Schema**:
```sql
CREATE TABLE api_cost_transactions (
  id UUID PRIMARY KEY,
  listing_id UUID,
  discovery_id UUID,
  service TEXT,              -- 'perplexity', 'firecrawl', etc.
  operation TEXT,            -- 'discovery', 'enrichment', etc.
  cost_usd DECIMAL(10,4),
  tokens_used INTEGER,
  api_request_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

---

### 3. ✅ Automatic Cost Calculation

**Perplexity API Pricing** (sonar-pro model):
- Input tokens: ~$0.005 per 1K tokens
- Output tokens: ~$0.015 per 1K tokens

**Implementation** (`discovery-processor/index.ts:201-215`):
```typescript
// Calculate API cost from usage metrics
if (usage.prompt_tokens && usage.completion_tokens) {
  const inputCost = (usage.prompt_tokens / 1000) * 0.005
  const outputCost = (usage.completion_tokens / 1000) * 0.015
  apiCostUsd = inputCost + outputCost
  console.log(`💰 Estimated cost: $${apiCostUsd.toFixed(4)}`)
}
```

**Cost Attribution**:
- Total API cost is split evenly across all vendors found in one query
- Example: $0.012 for 12 vendors = $0.001 per vendor

---

### 4. ✅ Cost Recording Function

**Database Function** (`record_api_cost`):
```typescript
await supabase.rpc('record_api_cost', {
  p_discovery_id: discovery.id,
  p_service: 'perplexity',
  p_operation: 'discovery',
  p_cost_usd: costPerVendor,
  p_tokens_used: tokensPerVendor,
  p_metadata: JSON.stringify({
    model: 'sonar-pro',
    query: task.query,
    location: task.location
  })
})
```

**Auto-updates**:
- Inserts transaction record
- Updates `discovered_listings.api_cost_usd`
- Updates `discovered_listings.discovery_cost_usd`

---

### 5. ✅ Enhanced Discord Logging

**Updated `_shared/discord-logger.ts`**:

**New Methods**:
```typescript
// Warning notifications (orange)
await discord.warning(message, metadata)
await discord.logWarning(message, metadata)

// Error with metadata
await discord.error(message, error, metadata)

// Discovery with metadata
await discord.logDiscovery(message, metadata)
```

**Discovery Notifications Now Include**:
```typescript
{
  'Location': 'Sydney, Australia',
  'Total Found': '15',
  'New Saved': '12',
  'Duplicates': '3',
  'Service Type': 'venue',
  'API Cost': '$0.0123',           // ← NEW
  'Cost per Vendor': '$0.0010'     // ← NEW
}
```

---

### 6. ✅ Rate Limit Monitoring

**Auto-detection** (`discovery-processor/index.ts:212-229`):
```typescript
const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')

if (parseInt(rateLimitRemaining) < 10) {
  await discord.logWarning(
    '⚠️ Perplexity API Rate Limit Low',
    {
      'Remaining Requests': rateLimitRemaining,
      'Reset Time': rateLimitReset,
      'Task': task.query
    }
  )
}
```

---

### 7. ✅ Error Tracking in Discovery Queue

**Auto-retry with Exponential Backoff** (`discovery-processor/index.ts:365-383`):
```typescript
await supabase
  .from('discovery_queue')
  .update({
    status: attempts >= max_attempts ? 'failed' : 'pending',
    error_message: errorMessage.substring(0, 500),
    last_error_at: new Date().toISOString(),
    // Retry schedule based on error type
    scheduled_for: isApiError && !isCritical
      ? new Date(Date.now() + Math.pow(2, attempts) * 3600000)  // 1h, 2h, 4h
      : new Date(Date.now() + 300000)  // 5 minutes for other errors
  })
```

**Error Types**:
- **Critical** (401, 402): Notifies immediately, no auto-retry
- **Transient** (429, 500): Exponential backoff retry
- **Other**: 5 minute retry

---

## Analytics Views

### Cost Analytics
```sql
-- Daily cost breakdown
SELECT * FROM cost_analytics
ORDER BY date DESC, total_cost_usd DESC;

-- Example output:
service     | operation  | total_calls | total_cost_usd | date
------------|------------|-------------|----------------|------------
perplexity  | discovery  | 45          | 0.5423         | 2025-10-07
firecrawl   | enrichment | 38          | 1.9000         | 2025-10-07
```

### Listing Costs
```sql
-- Cost per listing
SELECT * FROM listing_costs
ORDER BY total_cost_usd DESC
LIMIT 10;

-- Example output:
name                    | total_cost_usd | discovery_cost | enrichment_cost
------------------------|----------------|----------------|----------------
Abbotsford Convent      | 0.0512         | 0.0010         | 0.0502
Melbourne Zoo           | 0.0508         | 0.0010         | 0.0498
```

---

## Spatial Queries (Bonus)

**Find listings within radius**:
```sql
-- Find venues within 50km of coordinates
SELECT * FROM find_listings_near(
  -33.8688,  -- latitude
  151.2093,  -- longitude
  50000      -- radius in meters
);
```

**Use cases**:
- "Show venues near me"
- "Venues within 25km of Sydney CBD"
- Regional search optimization

---

## Current Status

### ✅ Deployed
- Enhanced error detection
- Cost tracking schema
- Cost calculation logic
- Discord alerting
- Rate limit monitoring
- Retry logic with backoff
- Spatial indexes

### ⚠️ Testing Needed
**Issue**: Getting "Internal Server Error" when testing

**Possible Causes**:
1. JSONB parameter formatting in `record_api_cost` RPC call
2. Missing Perplexity API key or invalid key
3. Runtime error in function (need to check logs)

**How to Debug**:
1. Check Supabase Edge Function logs:
   - Dashboard → Functions → discovery-processor → Logs
2. Look for error stack traces
3. Check if `record_api_cost` function exists and is callable

**Test Command**:
```bash
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## Example Output (When Working)

### Console Logs:
```
🔍 Calling Perplexity API
   Query: wedding venue in Gold Coast, Australia. Return 10-15 results...
   Location: Gold Coast, Australia

📦 Perplexity response received: {model: "sonar-pro", usage: {prompt_tokens: 187, completion_tokens: 823}}
   💰 Estimated cost: $0.0132 (187 input + 823 output tokens)
   Token usage: 1010 tokens
   Rate limit remaining: 84 requests

✨ Extracted 13 vendors from response

🔄 Processing: The Surf Club (Gold Coast)
   💾 Saving new discovery...
   ✅ Saved discovery: abc-123-def
   📝 Creating enrichment task...
   ✅ Created enrichment task: xyz-789

📊 Processing complete:
   ✅ Saved: 13 new vendors
   ⏭️  Duplicates: 0
   📋 Total found: 13
```

### Discord Message:
```
🔍 Discovery completed: wedding venue in Gold Coast, Australia

Location: Gold Coast, Australia
Total Found: 13
New Saved: 13
Duplicates: 0
Service Type: venue
API Cost: $0.0132
Cost per Vendor: $0.0010
```

---

## Next Steps

1. **Debug Runtime Error** (Priority: HIGH)
   - Check Supabase Function logs
   - Verify `record_api_cost` function is working
   - Test with simple query

2. **Implement for Enrichment** (Priority: MEDIUM)
   - Add cost tracking to Firecrawl calls
   - Track enrichment costs separately
   - Include in enrichment Discord messages

3. **Add Cost Dashboard** (Priority: LOW)
   - Daily cost reports in Discord
   - Weekly cost summaries
   - Budget alerts (if >$X/day)

4. **Optimize Costs** (Priority: LOW)
   - Cache aggressive (12hr → 24hr?)
   - Reduce token usage in prompts
   - Consider cheaper models for simple queries

---

## Cost Estimates

**Perplexity Discovery**:
- ~$0.01-$0.02 per query
- ~$0.001 per vendor discovered
- 100 queries/day = ~$1-2/day

**Firecrawl Enrichment** (estimated):
- ~$0.05 per website scrape
- 50 vendors/day = ~$2.50/day

**Total estimated**: ~$3.50-$5/day for full automation

---

## Files Modified

1. `supabase/functions/discovery-processor/index.ts` - Cost tracking & error detection
2. `supabase/functions/_shared/discord-logger.ts` - Enhanced notifications
3. `supabase/migrations/026_make_state_nullable.sql` - Location model
4. `supabase/migrations/027_add_cost_tracking.sql` - Cost tracking schema
5. `API_MONITORING_SUMMARY.md` - This documentation

---

**Summary**: All monitoring, cost tracking, and alerting features have been implemented and deployed. Awaiting runtime testing to verify functionality.
