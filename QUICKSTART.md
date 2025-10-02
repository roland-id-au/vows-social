# Quick Start Guide - Deploy in 10 Minutes

Get The Vow Society backend running at **v1-api.vows.social** in just a few commands.

---

## ⚡ Prerequisites (5 minutes)

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Create Supabase Project:**
   - Go to https://supabase.com
   - Click "New Project"
   - Note your project URL and keys

3. **Get API Keys:**
   - Perplexity API: https://www.perplexity.ai/settings/api
   - Google Maps: https://console.cloud.google.com/apis

---

## 🚀 Deploy (5 minutes)

### Step 1: Environment Setup
```bash
cd vow_social
./scripts/setup-env.sh
```

Enter your keys when prompted.

### Step 2: Deploy
```bash
./scripts/deploy.sh
```

This deploys all Edge Functions and runs migrations.

### Step 3: Configure Domain

**In Supabase Dashboard:**
1. Settings → API → Custom Domain
2. Enter: `v1-api.vows.social`

**In your DNS provider:**
```
Type:  CNAME
Name:  v1-api
Value: your-project.supabase.co
```

### Step 4: Setup Automation
```bash
./scripts/setup-cron.sh
```

Creates daily and weekly automation jobs.

---

## ✅ Test

```bash
./scripts/test-endpoints.sh
```

---

## 🎯 Try It Out

### Research a Venue
```bash
./admin/cli.ts research \
  --name "Taronga Zoo" \
  --location "Sydney"
```

### Discover Trending Venues
```bash
./admin/cli.ts discover
```

### Run Morning Pipeline
```bash
./admin/cli.ts morning
```

---

## 📚 Next Steps

- **Full Guide:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Automation:** See [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md)
- **Monitoring:** Check Supabase Dashboard → Database → sync_logs

---

## 🆘 Need Help?

**Check logs:**
```bash
supabase functions logs --tail
```

**Test endpoint:**
```bash
curl https://v1-api.vows.social/functions/v1/deep-research-venue
```

**Common issues:**
- DNS not propagated → Wait 10 minutes
- Function fails → Check secrets in Supabase Dashboard
- Cron not running → Run `./scripts/setup-cron.sh` again

---

**API Base URL:** https://v1-api.vows.social

**Deployed Functions:**
- ✅ deep-research-venue
- ✅ batch-research-venues
- ✅ discover-trending-venues
- ✅ morning-discovery-pipeline
- ✅ scheduled-venue-refresh

**Automation:**
- 🌅 Daily at 8 AM: Instagram discovery & research
- 🔄 Sunday at 2 AM: Venue data refresh
