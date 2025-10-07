# Fix Plan: Discovery Pipeline Issues

**Date**: 2025-10-07
**Issues Found**: 2 critical issues blocking pipeline

---

## Issue #1: Discovery Returns 0 Vendors

### Root Cause Analysis

**Problem**: Perplexity query doesn't include location context

**Current Code** (line 92):
```typescript
content: `${task.query}. Return 10-15 results with business name, city, country, and website if available.`
```

**Actual Query Sent**:
```
"wedding venue. Return 10-15 results with business name, city, country, and website if available."
```

**Issue**: Missing location! Perplexity doesn't know WHERE to search.

**Expected Query**:
```
"wedding venue in Wollongong, Australia. Return 10-15 results with business name, city, country, and website if available."
```

### Fix #1.1: Add Location to Query

**File**: `supabase/functions/discovery-processor/index.ts`
**Line**: 92

**Change**:
```typescript
// BEFORE
content: `${task.query}. Return 10-15 results with business name, city, country, and website if available.`

// AFTER
content: `${task.query} in ${task.location}. Return 10-15 results with business name, city, country, and website if available.`
```

### Fix #1.2: Add Debug Logging

**File**: `supabase/functions/discovery-processor/index.ts`
**Lines**: After line 75 (before Perplexity API call)

**Add**:
```typescript
} else {
  // Add debug logging
  const queryContent = `${task.query} in ${task.location}. Return 10-15 results with business name, city, country, and website if available.`
  console.log('Calling Perplexity API with query:', queryContent)
  console.log('Cache key:', cacheKey)

  // Call Perplexity API
  const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
```

**Add after line 130** (after getting response):
```typescript
const data = await perplexityResponse.json()
console.log('Perplexity response:', JSON.stringify(data, null, 2))

const result = JSON.parse(data.choices[0].message.content)
console.log('Parsed result:', result)

discoveries = result.vendors || []
console.log(`Extracted ${discoveries.length} vendors from response`)
```

### Fix #1.3: Improve Error Handling

**File**: `supabase/functions/discovery-processor/index.ts`
**Line**: 126-128

**Change**:
```typescript
// BEFORE
if (!perplexityResponse.ok) {
  throw new Error(`Perplexity API error: ${perplexityResponse.status}`)
}

// AFTER
if (!perplexityResponse.ok) {
  const errorText = await perplexityResponse.text()
  console.error('Perplexity API error:', errorText)
  throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`)
}
```

---

## Issue #2: Missing Enrichment Tasks

### Root Cause Analysis

**Problem**: Enrichment task creation has no error handling

**Current Code** (lines 179-191):
```typescript
// Create enrichment task
await supabase
  .from('enrichment_queue')
  .insert({
    discovery_id: discovery.id,
    vendor_name: vendor.name,
    // ...
  })

savedCount++
```

**Issue**:
1. No `.select()` to verify insert succeeded
2. No error checking
3. If insert fails, we never know and still increment `savedCount`

### Fix #2.1: Add Error Handling to Enrichment Task Creation

**File**: `supabase/functions/discovery-processor/index.ts`
**Lines**: 178-194

**Change**:
```typescript
// BEFORE
// Create enrichment task
await supabase
  .from('enrichment_queue')
  .insert({
    discovery_id: discovery.id,
    vendor_name: vendor.name,
    location: `${vendor.city}, ${vendor.country}`,
    city: vendor.city,
    country: vendor.country,
    service_type: task.service_type,
    website: vendor.website,
    priority: 5,
    scheduled_for: new Date().toISOString()
  })

savedCount++

// AFTER
// Create enrichment task
const { data: enrichmentTask, error: enrichmentError } = await supabase
  .from('enrichment_queue')
  .insert({
    discovery_id: discovery.id,
    vendor_name: vendor.name,
    location: `${vendor.city}, ${vendor.country}`,
    city: vendor.city,
    country: vendor.country,
    service_type: task.service_type,
    website: vendor.website,
    priority: 5,
    scheduled_for: new Date().toISOString()
  })
  .select()
  .single()

if (enrichmentError) {
  console.error(`Error creating enrichment task for ${vendor.name}: ${enrichmentError.message}`)
  await discord.error(
    `Failed to create enrichment task for ${vendor.name}`,
    enrichmentError
  )
  // Don't increment savedCount if enrichment task failed
  continue
}

console.log(`✓ Created enrichment task for ${vendor.name}`)
savedCount++
```

### Fix #2.2: Backfill Missing Enrichment Tasks

**Execute SQL**:
```sql
-- Create enrichment tasks for pending discoveries without tasks
INSERT INTO enrichment_queue (
  discovery_id,
  vendor_name,
  location,
  city,
  country,
  service_type,
  priority,
  scheduled_for
)
SELECT
  dl.id as discovery_id,
  dl.name as vendor_name,
  dl.location,
  dl.city,
  dl.country,
  dl.type as service_type,
  5 as priority,
  NOW() as scheduled_for
FROM discovered_listings dl
WHERE dl.enrichment_status = 'pending'
AND NOT EXISTS (
  SELECT 1
  FROM enrichment_queue eq
  WHERE eq.discovery_id = dl.id
);
```

---

## Additional Improvements

### Improvement #1: Better Duplicate Detection

**Issue**: Current duplicate check uses `.single()` which throws error if multiple matches

**File**: `supabase/functions/discovery-processor/index.ts`
**Lines**: 144-150

**Change**:
```typescript
// BEFORE
const { data: existing } = await supabase
  .from('discovered_listings')
  .select('id')
  .eq('name', vendor.name)
  .eq('city', vendor.city)
  .eq('country', vendor.country)
  .single()

// AFTER
const { data: existing } = await supabase
  .from('discovered_listings')
  .select('id')
  .eq('name', vendor.name)
  .eq('city', vendor.city)
  .eq('country', vendor.country)
  .maybeSingle()
```

### Improvement #2: Better Console Logging

Add more detailed logs throughout:

```typescript
// After line 138
console.log(`Found ${discoveries.length} vendors`)
if (discoveries.length > 0) {
  console.log('First vendor:', discoveries[0])
}

// After line 155
if (existing) {
  console.log(`⏭️  Skipping duplicate: ${vendor.name} (${vendor.city})`)
  continue
}
console.log(`💾 Saving new discovery: ${vendor.name} (${vendor.city})`)

// After line 176
if (saveError) {
  console.error(`❌ Error saving discovery: ${saveError.message}`)
  console.error('Vendor data:', vendor)
  continue
}
console.log(`✓ Saved discovery: ${discovery.id}`)
```

### Improvement #3: Discord Notifications Enhancement

**File**: `supabase/functions/discovery-processor/index.ts`
**Lines**: 206-213

**Change**:
```typescript
// AFTER
await discord.discovery(
  `Discovery completed: ${task.query} in ${task.city}`,
  {
    'Query': task.query,
    'Location': task.location,
    'Total Found': discoveries.length.toString(),
    'New Saved': savedCount.toString(),
    'Duplicates': (discoveries.length - savedCount).toString()
  }
)
```

---

## Testing Plan

### Step 1: Deploy Fixes

```bash
# Deploy updated discovery processor
supabase functions deploy discovery-processor

# Verify deployment
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Step 2: Check Logs

Navigate to:
https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions

Filter for `discovery-processor` and verify:
- ✅ "Calling Perplexity API with query: wedding venue in Wollongong, Australia..."
- ✅ "Perplexity response: {..."
- ✅ "Found X vendors"
- ✅ "Saved discovery: ..."
- ✅ "Created enrichment task for..."

### Step 3: Run Tests

```bash
# Run diagnostic
./tests/diagnose-discovery.sh

# Expected output:
# - discoveries_found: > 0
# - Shows vendor names
# - Shows enrichment tasks created

# Run full test suite
./tests/simple-pipeline-test.sh

# Expected results:
# - Discovery: 5-15 vendors found
# - Enrichment queue: > 0 pending tasks
# - All tests pass
```

### Step 4: Verify Data

```bash
# Check discovered listings
curl -s "$SUPABASE_URL/rest/v1/discovered_listings?order=created_at.desc&limit=5" \
  -H "apikey: $ANON_KEY" | jq

# Check enrichment queue
curl -s "$SUPABASE_URL/rest/v1/enrichment_queue?status=eq.pending" \
  -H "apikey: $ANON_KEY" | jq
```

### Step 5: Backfill Missing Tasks

```bash
# Execute backfill SQL via Supabase dashboard
# Or use psql if available
```

---

## Implementation Checklist

### Phase 1: Critical Fixes (30 minutes)
- [ ] Fix #1.1: Add location to Perplexity query
- [ ] Fix #2.1: Add error handling to enrichment task creation
- [ ] Improvement #1: Fix duplicate detection (`.single()` → `.maybeSingle()`)
- [ ] Deploy to Supabase
- [ ] Test with one discovery task

### Phase 2: Enhanced Debugging (15 minutes)
- [ ] Fix #1.2: Add debug logging to Perplexity calls
- [ ] Improvement #2: Add detailed console logs throughout
- [ ] Redeploy
- [ ] Check logs in Supabase dashboard

### Phase 3: Monitoring & Backfill (15 minutes)
- [ ] Fix #2.2: Execute backfill SQL for missing enrichment tasks
- [ ] Improvement #3: Enhance Discord notifications
- [ ] Run full test suite
- [ ] Verify 3-5 discoveries complete successfully

### Phase 4: Validation (10 minutes)
- [ ] Run `./tests/diagnose-discovery.sh`
- [ ] Verify discoveries_found > 0
- [ ] Verify enrichment tasks created
- [ ] Check Discord for notifications
- [ ] View logs for any errors

---

## Expected Outcomes

### Before Fixes
```
Discovery: 0 vendors found
Enrichment Queue: 0 pending tasks
Success Rate: 0%
```

### After Fixes
```
Discovery: 10-15 vendors found per query
Enrichment Queue: > 0 pending tasks
Success Rate: 95%+ (accounting for duplicates)
```

### Pipeline Flow (After Fixes)
```
Discovery Queue (86 pending)
    ↓ discovery-processor
    ↓ Perplexity API with location context
    ↓ 10-15 vendors per city
Discovered Listings + Enrichment Queue
    ↓ enrichment-processor
    ↓ Deep research + Firecrawl
Listings + Photos + Publishing Queue
    ↓ publishing-processor
    ↓ Discord webhook
Published to Discord + vows.social ✅
```

---

## Risk Assessment

**Risk Level**: 🟢 LOW

**Why Safe**:
1. Only query construction and error handling changes
2. No schema changes
3. Can rollback with `git revert` if needed
4. Test suite in place to verify
5. Affects only new discoveries (existing 20 listings unaffected)

**Rollback Plan**:
```bash
# If issues occur, rollback
git revert HEAD
supabase functions deploy discovery-processor
```

---

## Success Metrics

**Fix is successful when**:
1. ✅ Discovery returns > 0 vendors (10-15 expected)
2. ✅ Enrichment tasks created for all new discoveries
3. ✅ No errors in Edge Function logs
4. ✅ Discord notifications show successful discoveries
5. ✅ Test suite passes 100%

**Timeline**: 1-2 hours total
**Next Review**: After 10 successful discovery runs
