# Automated Backend System - Quick Summary

## 🎯 What Was Built

A fully automated backend system that discovers trending wedding venues/caterers from Instagram, researches them using Perplexity Deep Research, and sends push notifications to users - all running automatically on a daily schedule.

---

## 📦 Components Created

### 1. **Edge Functions** (5 total)

| Function | What It Does |
|----------|-------------|
| `deep-research-venue` | Uses Perplexity to research a single venue and collect 8-12 photos |
| `batch-research-venues` | Process multiple venues at once |
| `discover-trending-venues` | Scans Instagram for trending venues/caterers across Australian cities |
| `morning-discovery-pipeline` | **Full pipeline**: discover → research → add to DB → notify users |
| `scheduled-venue-refresh` | Updates existing venue data weekly |

### 2. **Database Tables**

- `discovered_venues` - Instagram discoveries awaiting research
- `packages` - Venue pricing packages
- `notifications` - Push notification history
- Enhanced `listings` with metadata, Instagram handles, email

### 3. **Admin Tools**

- **CLI Tool** (`admin/cli.ts`) - Command-line control
- **Example Data** (`admin/example-venues.json`) - Sample venues for testing

---

## 🔄 Automated Workflows

### Daily Morning Pipeline (8:00 AM)

```
1. Instagram Discovery
   ↓
2. Find 5-10 trending venues/caterers per city
   ↓
3. Filter out venues already in database
   ↓
4. Deep research top 3 by engagement score
   ↓
5. Save to database with 8-12 photos each
   ↓
6. Send push notifications to users
```

**What users receive:**
> "✨ New Trending Venues Discovered!
> Gunners Barracks is trending! Recently featured in 50+ weddings"

### Weekly Refresh (Sunday 2:00 AM)

```
1. Find venues older than 7 days
   ↓
2. Research 10 oldest venues
   ↓
3. Update pricing, photos, details
   ↓
4. Log refresh activity
```

---

## 📊 What Data Gets Collected

For each venue/caterer, Perplexity collects:

✅ **Basic Info**: Name, description, address, GPS coordinates
✅ **Pricing**: Min/max prices, packages with inclusions
✅ **Capacity**: Guest count ranges
✅ **Photos**: 8-12 high-quality images (exterior, interior, ceremony, reception)
✅ **Amenities**: Complete feature list
✅ **Tags**: Style, scenery, experiences categorized
✅ **Social**: Instagram handle, website, contact info
✅ **Reviews**: Ratings and highlights

---

## 🚀 How to Use

### Deploy Backend

```bash
# 1. Deploy Edge Functions
supabase functions deploy deep-research-venue
supabase functions deploy batch-research-venues
supabase functions deploy discover-trending-venues
supabase functions deploy morning-discovery-pipeline
supabase functions deploy scheduled-venue-refresh

# 2. Set secrets
supabase secrets set PERPLEXITY_API_KEY=<your-key>
supabase secrets set FCM_SERVER_KEY=<firebase-key>

# 3. Run migrations
supabase db push
```

### Setup Cron Jobs

In Supabase Dashboard → Database → Cron Jobs:

```sql
-- Daily at 8 AM
SELECT cron.schedule('morning-discovery', '0 8 * * *',
  $$ ... morning-discovery-pipeline ... $$);

-- Weekly on Sunday at 2 AM
SELECT cron.schedule('weekly-refresh', '0 2 * * 0',
  $$ ... scheduled-venue-refresh ... $$);
```

### Use Admin CLI

```bash
# Research single venue
./admin/cli.ts research --name "Venue Name" --location "Sydney"

# Batch import
./admin/cli.ts batch --file venues.json

# Discover trending
./admin/cli.ts discover

# Manual pipeline run
./admin/cli.ts morning
```

---

## 💰 Cost Estimate

**Perplexity API:**
- ~$0.15 per venue (deep research with photos)
- Daily: 3 venues × $0.15 = $0.45/day
- Monthly: ~$13.50

**Firebase FCM:**
- Free for most use cases
- Paid only at massive scale

**Total: ~$15-20/month** for full automation

---

## 🎨 Example Morning Pipeline Output

```
🌅 Starting morning discovery pipeline...

📸 Step 1: Discovering trending venues...
Found 8 new trending venues

🔍 Step 2: Researching discovered venues...
Researching: Gunners Barracks...
✓ Researched: Gunners Barracks
  - Images: 10
  - Packages: 3

Researching: Taronga Zoo...
✓ Researched: Taronga Zoo
  - Images: 12
  - Packages: 2

Researching: Boomerang Farm...
✓ Researched: Boomerang Farm
  - Images: 9
  - Packages: 4

📱 Step 3: Sending push notifications...
Sent notifications to 1,247 users

✅ Morning discovery pipeline complete!
```

---

## 📈 Monitoring

### Check Logs

```sql
SELECT * FROM sync_logs
ORDER BY timestamp DESC
LIMIT 10;
```

### View Discoveries

```sql
SELECT name, type, engagement_score, status
FROM discovered_venues
WHERE status = 'pending_research'
ORDER BY engagement_score DESC;
```

### Notification Stats

```sql
SELECT
  DATE(sent_at),
  COUNT(*) as sent,
  COUNT(CASE WHEN read THEN 1 END) as read
FROM notifications
GROUP BY DATE(sent_at)
ORDER BY DATE(sent_at) DESC;
```

---

## 🎯 Key Benefits

1. **Automated Discovery** - No manual venue hunting
2. **Comprehensive Data** - 8-12 photos + full details per venue
3. **User Engagement** - Daily notifications about hot new venues
4. **Fresh Content** - Always up-to-date with trends
5. **Scalable** - Handles venues + caterers + future categories

---

## 📚 Full Documentation

See **[AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md)** for:
- Complete setup instructions
- Cron job configuration
- Troubleshooting guide
- Best practices
- Detailed examples

---

**Status:** ✅ Ready to Deploy
**Last Updated:** October 2025
