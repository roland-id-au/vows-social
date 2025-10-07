# Instagram Authentication Testing

## ✅ Credentials Set in Supabase

Instagram credentials have been configured:
- **Username**: `the_vows_social`
- **Password**: `***************` (stored securely in Supabase secrets)

```bash
# Already executed:
supabase secrets set INSTAGRAM_USERNAME=the_vows_social
supabase secrets set INSTAGRAM_PASSWORD=6ygjUXLrmJ4vqn
```

## Testing Instagram Authentication

### Option 1: Test via Deployed Function (Recommended)

Once the `instagrapi-scraper` function is deployed, test with:

```bash
# Test user monitoring
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagrapi-scraper" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "discover_location",
    "location_name": "Sydney, Australia",
    "hashtag_filter": "wedding",
    "limit": 10
  }'
```

### Option 2: Test Location Search

```bash
# Test hybrid discovery (location + hashtag)
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagrapi-scraper" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "discover_location",
    "location_name": "Byron Bay, Australia",
    "hashtag_filter": "venue",
    "limit": 5
  }' | jq
```

Expected response:
```json
{
  "success": true,
  "location_name": "Byron Bay, Australia",
  "location_id": "12345678",
  "posts": [...],
  "total_posts": 5,
  "discovered_vendors": ["vendor1", "vendor2", ...],
  "hashtag_filter": "venue"
}
```

### Option 3: Test User Monitoring

```bash
# Monitor a specific Instagram user
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagrapi-scraper" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "monitor_user",
    "username": "gunnersbarracks",
    "limit": 3
  }' | jq
```

## Potential Issues & Solutions

### Issue 1: Challenge Required

Instagram may require verification for new accounts or logins from new locations.

**Solution**:
1. Log into Instagram as `the_vows_social` via mobile app or web
2. Complete any verification challenges (2FA, photo verification, etc.)
3. Mark the login as "This was me"
4. Try the API again after a few hours

### Issue 2: Rate Limiting

Instagram limits how many requests can be made.

**Solution**:
- instagrapi has built-in rate limiting (1-3 second delays)
- If rate limited, wait 15-30 minutes before retrying
- The system automatically handles retries with exponential backoff

### Issue 3: Login Required

Account may be flagged or credentials incorrect.

**Solution**:
1. Verify credentials by logging in manually
2. Check if account is locked or requires action
3. Ensure 2FA is set up if required

## Deploying the Function

The instagrapi-scraper function needs to be deployed as a Python Edge Function:

```bash
# Deploy the function
supabase functions deploy instagrapi-scraper

# Note: This function uses Python dependencies defined in requirements.txt:
# - instagrapi==2.1.2
# - python-dotenv==1.0.0
```

## Testing the Full Pipeline

Once authenticated, test the complete pipeline:

### 1. Seed Instagram Trend Queue
```bash
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/seed-instagram-trends" \
  -H "Authorization: Bearer YOUR_KEY" | jq
```

### 2. Run Trend Processor
```bash
curl -X POST "https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-trend-processor" \
  -H "Authorization: Bearer YOUR_KEY" | jq
```

### 3. Check Discoveries
```sql
-- Check discovered vendors from Instagram
SELECT * FROM discovered_listings
WHERE source = 'instagram_trends'
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Monitor Enrichment
```sql
-- Check enrichment progress
SELECT * FROM vendor_pipeline_journey
WHERE discovery_source = 'instagram_trends'
ORDER BY discovered_at DESC;
```

## Session Persistence

The Instagram session is stored in `/tmp/instagram_session.json` on the edge function.

**Note**: `/tmp` is ephemeral in Supabase Edge Functions (cleared on cold starts), so:
- First request after cold start: Fresh login (slower)
- Subsequent requests: Reuse session (faster)
- If login fails repeatedly: May need manual intervention

## Monitoring Authentication Status

Check edge function logs in Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/functions
2. Select `instagrapi-scraper`
3. View logs for authentication attempts
4. Look for:
   - ✅ "Loaded existing Instagram session"
   - ✅ "Created new Instagram session"
   - ⚠️ "Challenge required"
   - ❌ "Login failed"

## Best Practices

1. **Use Dedicated Account**: `the_vows_social` is dedicated for scraping (not personal account)
2. **Enable 2FA**: Adds security but may require app-specific passwords
3. **Verify First Login**: Always complete first login manually via Instagram app
4. **Monitor Rate Limits**: Don't exceed Instagram's limits
5. **Session Management**: Let instagrapi handle session persistence

## Security Notes

- Credentials stored in Supabase Secrets (encrypted at rest)
- Never commit credentials to git
- `.env.instagram` is in `.gitignore`
- Edge function has limited permissions (service role only)

## Next Steps

Once authentication is confirmed:
1. ✅ Test location discovery
2. ✅ Test hashtag filtering
3. ✅ Seed Instagram trend queue
4. ✅ Run trend processor
5. ✅ Verify vendors discovered
6. ✅ Check enrichment pipeline
7. ✅ Confirm listings published
