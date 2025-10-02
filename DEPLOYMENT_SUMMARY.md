# Deployment Setup Complete ✅

## What Was Created

A complete deployment system for **v1-api.vows.social** using Supabase CLI.

---

## 📁 New Files Created

### Deployment Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `setup-env.sh` | Interactive environment setup |
| `deploy.sh` | Deploy all Edge Functions |
| `setup-cron.sh` | Configure automated cron jobs |
| `test-endpoints.sh` | Test all API endpoints |

All scripts are executable and ready to use.

### Configuration Files

- `.gitignore` - Protects sensitive files
- `.env` (created by setup) - Environment variables
- `admin/.env` (created by setup) - CLI configuration

### Documentation

| Guide | Description |
|-------|-------------|
| `QUICKSTART.md` | Deploy in 10 minutes |
| `DEPLOYMENT.md` | Complete deployment guide |
| `AUTOMATION_GUIDE.md` | Automation system details |
| `AUTOMATION_SUMMARY.md` | Quick automation reference |

### Admin Tools

- `admin/cli.ts` - Updated for v1-api.vows.social
- `admin/example-venues.json` - Sample data (10 venues)

---

## 🚀 Deployment Process

### 1. One-Time Setup (5 minutes)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Setup environment
cd vow_social
./scripts/setup-env.sh
```

### 2. Deploy Backend (3 minutes)

```bash
./scripts/deploy.sh
```

**This deploys:**
- ✅ 5 Edge Functions
- ✅ Database migrations
- ✅ Environment secrets

### 3. Configure Domain (2 minutes)

**Supabase Dashboard:**
- Settings → API → Custom Domain
- Enter: `v1-api.vows.social`

**DNS Provider:**
```
CNAME: v1-api → your-project.supabase.co
```

### 4. Setup Automation (1 minute)

```bash
./scripts/setup-cron.sh
```

**Creates:**
- Daily discovery at 8 AM
- Weekly refresh on Sundays

---

## 🎯 API Endpoints

Base URL: `https://v1-api.vows.social/functions/v1/`

### Available Endpoints

1. **`/deep-research-venue`**
   - Research single venue with Perplexity
   - Returns: 8-12 photos + full details

2. **`/batch-research-venues`**
   - Process multiple venues
   - Configurable delays

3. **`/discover-trending-venues`**
   - Scan Instagram for trends
   - Returns: Trending venues/caterers

4. **`/morning-discovery-pipeline`**
   - Full automation workflow
   - Discover → Research → Notify

5. **`/scheduled-venue-refresh`**
   - Update existing venue data
   - Refreshes 10 oldest venues

---

## 🔧 Admin CLI Usage

The CLI now uses **v1-api.vows.social** automatically.

### Commands

```bash
# Research single venue
./admin/cli.ts research \
  --name "Gunners Barracks" \
  --location "Sydney"

# Batch import
./admin/cli.ts batch --file admin/example-venues.json

# Discover trending
./admin/cli.ts discover

# Run pipeline
./admin/cli.ts morning

# Refresh data
./admin/cli.ts refresh
```

---

## 📊 Automation Schedule

### Daily (8:00 AM)
```
Instagram Discovery
↓
Find 5-10 trending venues/caterers per city
↓
Research top 3 by engagement
↓
Add to database with 8-12 photos
↓
Send push notifications
```

### Weekly (Sunday 2:00 AM)
```
Find 10 oldest venues
↓
Re-research with Perplexity
↓
Update pricing, photos, details
```

---

## ✅ Testing

### Automated Tests
```bash
./scripts/test-endpoints.sh
```

### Manual Tests
```bash
# Test single endpoint
curl -X POST https://v1-api.vows.social/functions/v1/deep-research-venue \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"venueName": "Test", "location": "Sydney", "city": "Sydney", "state": "NSW"}'
```

### View Logs
```bash
supabase functions logs --tail
```

---

## 📁 Project Structure

```
vow_social/
├── scripts/                    # Deployment scripts
│   ├── setup-env.sh           ✅ Environment setup
│   ├── deploy.sh              ✅ Deploy all functions
│   ├── setup-cron.sh          ✅ Configure automation
│   └── test-endpoints.sh      ✅ Test API
├── admin/
│   ├── cli.ts                 ✅ Updated for v1-api
│   └── example-venues.json    ✅ Sample data
├── supabase/
│   ├── functions/             # 5 Edge Functions
│   └── migrations/            # Database schemas
├── .gitignore                 ✅ Protects secrets
├── QUICKSTART.md              ✅ 10-min deploy guide
├── DEPLOYMENT.md              ✅ Full guide
└── AUTOMATION_GUIDE.md        ✅ Automation details
```

---

## 🔐 Security

**Protected files (not committed):**
- `.env` - Environment variables
- `admin/.env` - CLI configuration
- `.supabase/` - Local Supabase config

**Keys stored securely:**
- Supabase Dashboard → Secrets
- Edge Functions access via environment variables

---

## 📖 Documentation

1. **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
   - Deploy in 10 minutes
   - Minimal steps

2. **Full Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)
   - Complete guide
   - Troubleshooting
   - Configuration details

3. **Automation System**: [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md)
   - How automation works
   - Monitoring
   - Best practices

4. **Quick Reference**: [AUTOMATION_SUMMARY.md](AUTOMATION_SUMMARY.md)
   - Commands
   - Examples
   - Cost estimates

---

## 🎓 Next Steps

1. **Deploy**: Run `./scripts/deploy.sh`
2. **Configure Domain**: Add DNS records
3. **Test**: Run `./scripts/test-endpoints.sh`
4. **Import Data**: Use CLI to add initial venues
5. **Monitor**: Check logs and sync_logs table

---

## 💡 Tips

- **Start small**: Import 5-10 venues first
- **Test discovery**: Run `./admin/cli.ts discover` manually
- **Monitor logs**: Use `supabase functions logs --tail`
- **Check costs**: Monitor Perplexity API usage

---

## 🆘 Need Help?

**Quick fixes:**
```bash
# Re-deploy function
supabase functions deploy function-name

# Re-run cron setup
./scripts/setup-cron.sh

# View logs
supabase functions logs --tail

# Test connection
curl https://v1-api.vows.social
```

**Common issues solved in [DEPLOYMENT.md](DEPLOYMENT.md)**

---

**Status:** ✅ Ready to Deploy
**Domain:** v1-api.vows.social
**Total Deploy Time:** ~10 minutes
**Cost:** ~$40-50/month
