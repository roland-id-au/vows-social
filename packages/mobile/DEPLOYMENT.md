# Deployment Guide - v1-api.vows.social

Complete step-by-step guide to deploy The Vow Society backend to Supabase with custom domain.

---

## 📋 Prerequisites

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** created at https://supabase.com

3. **API Keys**:
   - Supabase Service Role Key
   - Perplexity API Key
   - Google Maps API Key
   - Firebase Cloud Messaging Server Key (optional)

4. **Domain Access**: Ability to configure DNS for vows.social

---

## 🚀 Deployment Steps

### Step 1: Clone and Setup

```bash
cd vow_social

# Make scripts executable
chmod +x scripts/*.sh

# Run environment setup
./scripts/setup-env.sh
```

This will create `.env` file with your configuration.

### Step 2: Login to Supabase

```bash
supabase login
```

This opens a browser for authentication.

### Step 3: Deploy Backend

```bash
./scripts/deploy.sh
```

This script will:
- Link to your Supabase project
- Deploy all 5 Edge Functions
- Run database migrations
- Set environment secrets

**Functions deployed:**
- ✅ `deep-research-venue`
- ✅ `batch-research-venues`
- ✅ `discover-trending-venues`
- ✅ `morning-discovery-pipeline`
- ✅ `scheduled-venue-refresh`

### Step 4: Configure Custom Domain

#### In Supabase Dashboard:

1. Go to **Settings → API**
2. Scroll to **Custom Domain**
3. Enter: `v1-api.vows.social`
4. Follow the verification steps

#### DNS Configuration:

Add these DNS records in your domain provider (e.g., Cloudflare, Namecheap):

**CNAME Record:**
```
Type:  CNAME
Name:  v1-api
Value: [your-project-ref].supabase.co
TTL:   Auto or 3600
```

**For Cloudflare:**
- Set proxy status to "Proxied" (orange cloud)
- SSL/TLS mode: Full (strict)

**Verification:**
```bash
# Wait 5-10 minutes for DNS propagation
dig v1-api.vows.social

# Test endpoint
curl https://v1-api.vows.social/functions/v1/deep-research-venue
```

### Step 5: Setup Cron Jobs

```bash
./scripts/setup-cron.sh
```

This creates:
- **Daily at 8 AM**: Morning discovery pipeline
- **Sunday at 2 AM**: Weekly venue refresh

### Step 6: Test Deployment

```bash
./scripts/test-endpoints.sh
```

Tests all 5 endpoints to ensure they're working.

### Step 7: Initial Data Import

```bash
# Test with single venue
./admin/cli.ts research \
  --name "Gunners Barracks" \
  --location "Mosman, Sydney" \
  --city "Sydney" \
  --state "NSW"

# Batch import
./admin/cli.ts batch --file admin/example-venues.json
```

---

## 🔧 Configuration Details

### Environment Variables

**In Supabase Dashboard** (Settings → Edge Functions → Secrets):
- `PERPLEXITY_API_KEY` - Your Perplexity API key
- `FCM_SERVER_KEY` - Firebase Cloud Messaging key

**In `.env` file** (local development):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
API_BASE_URL=https://v1-api.vows.social
PERPLEXITY_API_KEY=pplx-...
GOOGLE_MAPS_API_KEY=AIza...
FCM_SERVER_KEY=AAAA...
```

### Database Extensions

Required extensions (auto-enabled by migrations):
- `postgis` - Geospatial queries
- `pg_cron` - Scheduled jobs
- `pg_net` - HTTP requests from cron

### API Endpoints

Base URL: `https://v1-api.vows.social/functions/v1/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/deep-research-venue` | POST | Research single venue |
| `/batch-research-venues` | POST | Batch process venues |
| `/discover-trending-venues` | POST | Find Instagram trends |
| `/morning-discovery-pipeline` | POST | Full automation |
| `/scheduled-venue-refresh` | POST | Update existing data |

---

## 🧪 Testing

### Manual Testing

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Test single venue research
curl -X POST https://v1-api.vows.social/functions/v1/deep-research-venue \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "venueName": "Test Venue",
    "location": "Sydney",
    "city": "Sydney",
    "state": "NSW"
  }'

# Test discovery
curl -X POST https://v1-api.vows.social/functions/v1/discover-trending-venues \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Automated Testing

```bash
./scripts/test-endpoints.sh
```

### View Logs

```bash
# View function logs
supabase functions logs deep-research-venue --tail

# View all logs
supabase functions logs --tail

# View database logs
supabase db logs --tail
```

---

## 📊 Monitoring

### Check Sync Logs

```sql
SELECT
  source,
  status,
  records_processed,
  metadata,
  timestamp
FROM sync_logs
ORDER BY timestamp DESC
LIMIT 20;
```

### View Cron Jobs

```sql
SELECT * FROM cron.job;
```

### Check Job History

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### Monitor Discoveries

```sql
SELECT
  name,
  type,
  engagement_score,
  status,
  discovered_at
FROM discovered_venues
WHERE status = 'pending_research'
ORDER BY engagement_score DESC;
```

---

## 🔄 Updates and Maintenance

### Update Functions

```bash
# Deploy specific function
supabase functions deploy deep-research-venue

# Deploy all functions
./scripts/deploy.sh
```

### Update Secrets

```bash
supabase secrets set PERPLEXITY_API_KEY="new-key"
```

### Run Migrations

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Restart Cron Jobs

```bash
./scripts/setup-cron.sh
```

---

## 🐛 Troubleshooting

### Functions Not Working

**Check deployment:**
```bash
supabase functions list
```

**View logs:**
```bash
supabase functions logs function-name --tail
```

**Common issues:**
- Invalid API keys in secrets
- CORS errors (use `--no-verify-jwt` flag)
- Timeout errors (increase timeout in function)

### Custom Domain Not Working

**Check DNS:**
```bash
dig v1-api.vows.social
nslookup v1-api.vows.social
```

**Verify SSL:**
```bash
curl -vI https://v1-api.vows.social
```

**Common issues:**
- DNS not propagated (wait 10-30 minutes)
- Wrong CNAME value
- SSL certificate not issued yet

### Cron Jobs Not Running

**Check if enabled:**
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'morning%' OR jobname LIKE 'weekly%';
```

**Check execution history:**
```sql
SELECT * FROM cron.job_run_details
WHERE job_id IN (SELECT jobid FROM cron.job)
ORDER BY start_time DESC
LIMIT 10;
```

**Common issues:**
- pg_cron extension not enabled
- Invalid service role key
- Network connectivity issues
- Function timeout

### Admin CLI Not Working

**Check environment:**
```bash
cat admin/.env
```

**Test connection:**
```bash
curl https://v1-api.vows.social
```

**Common issues:**
- Missing .env file
- Wrong API_BASE_URL
- Invalid service role key

---

## 📱 Flutter App Configuration

Update your Flutter app to use the custom domain:

```dart
// lib/main.dart
await SupabaseService.initialize(
  url: 'https://v1-api.vows.social',
  anonKey: 'YOUR_ANON_KEY',
);
```

---

## 🔐 Security Best Practices

1. **Never commit secrets**
   - Add `.env` to `.gitignore`
   - Use Supabase secrets for Edge Functions

2. **Rotate keys regularly**
   ```bash
   supabase secrets set PERPLEXITY_API_KEY="new-key"
   ```

3. **Use Row Level Security (RLS)**
   - Enable RLS on all user-facing tables
   - Service role bypasses RLS (admin only)

4. **Monitor API usage**
   - Check Perplexity API usage
   - Monitor Supabase quotas

5. **Rate limiting**
   - Implement in Edge Functions
   - Use Supabase built-in rate limits

---

## 💰 Cost Estimates

**Supabase:**
- Free tier: 500MB database, 2GB bandwidth, 500K Edge Function invocations
- Pro tier: $25/month (recommended for production)

**Perplexity API:**
- ~$0.15 per venue research
- Daily automation: ~$0.45/day (~$13.50/month)

**Total: ~$40-50/month** for production deployment

---

## 📞 Support

**Issues:**
- Check logs: `supabase functions logs --tail`
- View database: Supabase Dashboard → Table Editor
- Test endpoints: `./scripts/test-endpoints.sh`

**Documentation:**
- Supabase: https://supabase.com/docs
- Perplexity: https://docs.perplexity.ai
- This project: `AUTOMATION_GUIDE.md`

---

## ✅ Deployment Checklist

- [ ] Supabase CLI installed
- [ ] Logged in to Supabase
- [ ] Environment variables set
- [ ] Functions deployed
- [ ] Database migrations run
- [ ] Secrets configured
- [ ] Custom domain added
- [ ] DNS records configured
- [ ] Cron jobs set up
- [ ] Endpoints tested
- [ ] Initial data imported
- [ ] Flutter app updated
- [ ] Monitoring configured

---

**Last Updated:** October 2025
**Version:** 1.0.0
**Custom Domain:** v1-api.vows.social
