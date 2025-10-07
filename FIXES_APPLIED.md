# Fixes Applied - Discovery Pipeline

**Date**: 2025-10-07
**Status**: ✅ Deployed, 🔍 Testing Required

---

## Changes Made

### ✅ Fix #1: Added Location to Perplexity Query

**File**: `supabase/functions/discovery-processor/index.ts`

**Before**:
```typescript
content: `${task.query}. Return 10-15 results...`
// Query sent: "wedding venue. Return 10-15 results..."
```

**After**:
```typescript
const queryContent = `${task.query} in ${task.location}. Return 10-15 results...`
// Query sent: "wedding venue in Byron Bay, Australia. Return 10-15 results..."
```

**Impact**: Perplexity now knows WHERE to search for vendors.

---

### ✅ Fix #2: Added Comprehensive Debug Logging

**Added logging at key points**:

1. **Before Perplexity API call**:
   ```
   🔍 Calling Perplexity API
      Query: wedding venue in Byron Bay, Australia...
      Cache key: discovery-wedding venue-Byron Bay-Australia-venue
      Location: Byron Bay, Australia
   ```

2. **After Perplexity response**:
   ```
   📦 Perplexity response received: {model, usage, content_length}
   📋 Parsed result: {...}
   ✨ Extracted X vendors from response
      First vendor: {...}
   ```

3. **During vendor processing**:
   ```
   🔄 Processing: Venue Name (City)
      💾 Saving new discovery...
      ✅ Saved discovery: uuid
      📝 Creating enrichment task...
      ✅ Created enrichment task: uuid
   ```

4. **Summary**:
   ```
   📊 Processing complete:
      ✅ Saved: X new vendors
      ⏭️  Duplicates: X
      📋 Total found: X
   ```

---

### ✅ Fix #3: Added Error Handling for Enrichment Tasks

**Before**:
```typescript
await supabase
  .from('enrichment_queue')
  .insert({...})
// No error checking! Increments savedCount even if failed
savedCount++
```

**After**:
```typescript
const { data: enrichmentTask, error: enrichmentError } = await supabase
  .from('enrichment_queue')
  .insert({...})
  .select()
  .single()

if (enrichmentError) {
  console.error(`Error creating enrichment task: ${enrichmentError.message}`)
  await discord.error(`Failed to create enrichment task for ${vendor.name}`, enrichmentError)
  continue  // Don't increment savedCount
}

console.log(`✅ Created enrichment task: ${enrichmentTask.id}`)
savedCount++
```

**Impact**: We now detect and handle enrichment task creation failures properly.

---

### ✅ Fix #4: Fixed Duplicate Detection

**Before**:
```typescript
.single()  // Throws error if multiple matches or no matches
```

**After**:
```typescript
.maybeSingle()  // Returns null if no match, first row if one+ matches
```

**Impact**: More robust duplicate detection that doesn't crash on edge cases.

---

### ✅ Fix #5: Enhanced Discord Notifications

**Before**:
```
Discovery completed: wedding venue
Total: 0, New: 0, City: Byron Bay
```

**After**:
```
Discovery completed: wedding venue in Byron Bay
Location: Byron Bay, Australia
Total Found: 15
New Saved: 12
Duplicates: 3
Service Type: venue
```

**Impact**: Much more detailed notifications for monitoring.

---

## ✅ RESOLVED: Root Cause Found

**Date**: 2025-10-07 08:52 UTC

### The Real Problem: Missing `state` Column

Discovery was returning 0 vendors because **database inserts were failing silently** due to a NOT NULL constraint on the `state` column.

**Database error**:
```
null value in column "state" of relation "discovered_listings" violates not-null constraint
```

**Why this was hard to debug**:
1. The error was returned in `saveError`, but we only logged the message (not the full error)
2. The function returned `success: true, discoveries_found: 0` (technically true - no errors, just no saves)
3. Perplexity WAS finding vendors (10-15 per query), but none were being saved to the database

### The Fix

Added `state` field to the insert statement:

```typescript
// supabase/functions/discovery-processor/index.ts (line 198)
.insert({
  name: vendor.name,
  location: `${vendor.city}, ${vendor.country}`,
  city: vendor.city,
  state: '', // Required field, will be populated during enrichment
  country: vendor.country,
  type: task.service_type,
  enrichment_status: 'pending'
})
```

### Test Results ✅

**Before fix**:
```json
{"success": true, "discoveries_found": 0, "enrichment_tasks_created": 0}
```

**After fix**:
```json
{"success": true, "discoveries_found": 15, "enrichment_tasks_created": 15}
```

**Verified**:
- 15 Melbourne wedding venues discovered and saved
- 15 enrichment tasks created in queue
- Examples: Abbotsford Convent, Melbourne Zoo, Luminare, Prince Deck St Kilda, etc.

---

## Previous Investigation (Now Obsolete)

Despite all fixes, discovery is still returning 0 vendors. Possible causes:

### 1. Cache May Be Returning Empty Results ⚠️

The cache might have old entries from when the query didn't include location.

**Check**: Look for cache logs in Edge Functions:
```
[PerplexityCache] HIT - Key: ...
```

If you see cache hits, the cache is being used.

**Solution**: Either wait 12 hours for cache to expire, or manually clear cache by adding this to discovery processor temporarily:
```typescript
perplexityCache.clear()  // Add before line 71
```

### 2. Perplexity API Not Returning Results 🔴

The API might not be finding venues, or might be rate limited.

**Check logs for**:
- `🔍 Calling Perplexity API` - confirms we're calling it
- `📦 Perplexity response received` - confirms we got a response
- `✨ Extracted X vendors` - shows how many vendors found

### 3. All Results Are Duplicates ℹ️

Maybe Perplexity is finding vendors but they're all already in the database.

**Check logs for**:
- `⏭️  Skipping duplicate: Venue Name` - confirms duplicates
- `📊 Processing complete: Duplicates: X` - shows count

---

## Next Steps to Debug

### Step 1: Check Edge Function Logs 🔍

**URL**: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions

**Filter**: `discovery-processor`

**Look for** (in order):
1. ✅ `Processing discovery task` - Function started
2. ✅ `🔍 Calling Perplexity API` - About to call API
3. ✅ `Query: wedding venue in [City], Australia` - Query includes location
4. ⚠️ `[PerplexityCache] HIT` - Using cache (might be old!)
5. ✅ `📦 Perplexity response received` - Got response
6. ✅ `📋 Parsed result` - Successfully parsed JSON
7. ✅ `✨ Extracted X vendors` - Found vendors in response
8. ⚠️ `⏭️  Skipping duplicate` - All vendors are duplicates

**If you see**:
- No `🔍 Calling Perplexity` → Function not reaching API call (code error)
- `[PerplexityCache] HIT` → Using cached (possibly empty) results
- `✨ Extracted 0 vendors` → Perplexity returning empty response
- Multiple `⏭️  Skipping duplicate` → All results are duplicates

### Step 2: Clear Cache if Needed

If logs show `[PerplexityCache] HIT`, temporarily clear cache:

**Add to** `supabase/functions/discovery-processor/index.ts` after line 70:
```typescript
// Temporary: Clear cache to test
perplexityCache.clear()
console.log('🧹 Cache cleared for testing')
```

Then redeploy:
```bash
supabase functions deploy discovery-processor
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discovery-processor" \
  -H "Authorization: Bearer YOUR_KEY"
```

### Step 3: Test Perplexity API Directly

Create a test file `test-perplexity.ts`:
```typescript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'sonar-pro',
    messages: [
      {
        role: 'user',
        content: 'List 10 wedding venues in Byron Bay, Australia with their website URLs'
      }
    ]
  })
})

const data = await response.json()
console.log(JSON.stringify(data, null, 2))
```

### Step 4: Backfill Missing Enrichment Tasks

Once discovery works, backfill the 9 pending discoveries:

```sql
INSERT INTO enrichment_queue (
  discovery_id, vendor_name, location, city, country,
  service_type, priority, scheduled_for
)
SELECT
  id, name, location, city, country,
  type, 5, NOW()
FROM discovered_listings
WHERE enrichment_status = 'pending'
AND NOT EXISTS (
  SELECT 1 FROM enrichment_queue WHERE discovery_id = discovered_listings.id
);
```

---

## Testing Checklist

- [ ] Check Edge Function logs for debug output
- [ ] Verify query includes location: `"wedding venue in [City], Australia"`
- [ ] Check if cache is being hit
- [ ] Verify Perplexity returns results: `✨ Extracted X vendors`
- [ ] Check for duplicate skips
- [ ] Verify enrichment tasks are created
- [ ] Run full test suite: `./tests/simple-pipeline-test.sh`
- [ ] Check Discord for notifications
- [ ] Verify discoveries_found > 0

---

## Success Criteria

✅ **Fix is successful when**:
1. `discoveries_found` > 0 (expect 5-15 vendors per query)
2. Enrichment tasks created for each new discovery
3. Logs show Perplexity being called with location
4. Discord notifications show successful discoveries
5. No errors in logs

---

## Rollback Plan

If issues persist:

```bash
git log --oneline -5  # Find commit before fixes
git revert HEAD       # Revert last commit
supabase functions deploy discovery-processor
```

---

## Summary

**Changes**: ✅ All critical fixes applied
**Deployment**: ✅ discovery-processor deployed
**Testing**: 🔍 Awaiting log analysis
**Next**: Check Supabase Edge Function logs for detailed execution trace
