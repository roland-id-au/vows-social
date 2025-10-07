# Instagram Implementation - Important Note

## ⚠️ Supabase Edge Functions Limitation

**Issue Discovered**: Supabase Edge Functions run on **Deno**, not Python.

The `instagrapi-scraper` function I created uses Python's `instagrapi` library, but Supabase Edge Functions **only support Deno/TypeScript/JavaScript**.

## Current Status

✅ **Credentials set in Supabase**:
- Username: `the_vows_social`
- Password: `***` (stored in secrets)

❌ **Python function won't work** on Supabase Edge Functions

## Solutions

### Option 1: Use Alternative TypeScript/Deno Library (Recommended)

Use a Deno-compatible Instagram library:

**Libraries to consider**:
- `instagram-private-api` (has Deno port)
- Direct Instagram API calls (limited without app approval)
- Scraping via headless browser (Puppeteer for Deno)

**Pros**:
- Works natively in Supabase Edge Functions
- No external services needed
- Integrated with existing pipeline

**Cons**:
- May be less feature-rich than instagrapi
- Requires rewriting the scraper

### Option 2: External Python Service

Host the Python instagrapi service separately:

**Options**:
- **Railway.app**: Free tier, auto-deploy from Git
- **Render.com**: Free tier for web services
- **Fly.io**: Free tier for small services
- **Heroku**: Paid but reliable

**Setup**:
1. Create separate Python web service with FastAPI
2. Deploy to hosting platform
3. Supabase Edge Functions call this external API
4. External service handles Instagram scraping

**Pros**:
- Use instagrapi as designed
- Full Python ecosystem
- Isolated from Supabase

**Cons**:
- Additional hosting required
- Extra network latency
- Another service to maintain

### Option 3: Instagram Graph API (Limited)

Use official Instagram Graph API:

**Requirements**:
- Facebook App ID
- Business/Creator account
- Limited to own account + approved accounts

**Pros**:
- Official, won't break
- No scraping concerns

**Cons**:
- Can't discover arbitrary accounts
- Requires app review
- Limited to approved use cases

### Option 4: Hybrid Approach (Recommended Short-term)

1. **Manual Instagram discovery** (for now)
2. **Focus on Perplexity + Firecrawl** (already working)
3. **Instagram monitoring** via Graph API (official, for owned accounts)

## Recommendation

### Immediate: Proceed Without Instagram Discovery

The pipeline is **fully functional** without Instagram:

```
Perplexity Discovery
    ↓
Enrichment (Perplexity + Firecrawl + Photos)
    ↓
Publishing (Discord + Website)
    ↓
Live Listings
```

Instagram was an **enhancement**, not a requirement.

### Phase 2: Add Instagram via External Service

If Instagram discovery is critical:

1. **Create Python service** with instagrapi
2. **Deploy to Railway.app** (free tier)
3. **Call from Supabase** Edge Function

I can implement this quickly if needed.

## What Works Now

✅ **Full vendor discovery pipeline**:
- Perplexity discovers vendors
- Firecrawl scrapes websites
- Photos stored in Supabase
- Published to Discord
- Live on vows.social

✅ **Event-driven architecture**:
- discovery_queue → enrichment_queue → publishing_queue
- Automatic retries
- Priority management
- Complete monitoring

✅ **Database ready for Instagram**:
- instagram_trend_queue table exists
- instagram_monitor_queue ready
- All processors built

## Next Steps Options

### Option A: Continue Without Instagram (Fast)
- Deploy existing functions
- Test Perplexity + Firecrawl pipeline
- Go live with vendor discovery
- Add Instagram later

### Option B: Add External Instagram Service (1-2 hours)
- Create FastAPI service with instagrapi
- Deploy to Railway.app
- Connect to Supabase
- Test Instagram discovery

### Option C: Use Alternative Deno Library (3-4 hours)
- Research Deno Instagram libraries
- Rewrite scraper in TypeScript
- Test and deploy
- May have limitations vs instagrapi

## My Recommendation

**Go with Option A** (Continue without Instagram):

1. **Deploy existing pipeline** - Perplexity + Firecrawl is powerful
2. **Test and iterate** on core functionality
3. **Collect real data** on discovery effectiveness
4. **Add Instagram later** if needed (Option B)

The Perplexity + Firecrawl combination is already discovering vendors and getting real photos. Instagram was meant as an additional source, but isn't critical for MVP.

## Files Created for Instagram (Still Useful)

Even though we can't use Python in Supabase:

- ✅ Database tables for Instagram (reusable)
- ✅ Pipeline integration (reusable)
- ✅ Documentation (reusable)
- ✅ Architecture (reusable)

If we add Instagram later via external service, all this infrastructure is ready.

## Decision Needed

Which option do you prefer?

1. **Deploy now, add Instagram later** (recommended)
2. **Wait and build external Instagram service first**
3. **Rewrite in TypeScript/Deno**
