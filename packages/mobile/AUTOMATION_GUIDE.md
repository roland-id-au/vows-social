# The Vow Society - Automated Data & Notification System

Complete guide for setting up automated venue/caterer discovery, research, and push notifications using Perplexity Deep Research.

---

## 🎯 System Overview

This automation system provides:

1. **Instagram Discovery** - Finds trending venues/caterers from Instagram
2. **Deep Research** - Uses Perplexity AI to research and gather comprehensive venue data + photos
3. **Automated Updates** - Scheduled refresh of existing venue data
4. **Morning Notifications** - Daily discovery → research → push notification pipeline
5. **Batch Processing** - Import multiple venues at once

### Data Flow

```
Instagram → Discover Trending → Deep Research → Database → Push Notifications
    ↓           (Perplexity)      (Perplexity)     ↓              ↓
Hashtags      Find venues        Get details    Save data    Notify users
& Posts       & caterers         & photos       & images     of new venues
```

---

## 📦 Components

### Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `deep-research-venue` | Research single venue with Perplexity | Manual/API |
| `batch-research-venues` | Research multiple venues | Manual/API |
| `discover-trending-venues` | Find trending venues from Instagram | Cron/Manual |
| `morning-discovery-pipeline` | Full pipeline: discover → research → notify | Cron (daily) |
| `scheduled-venue-refresh` | Refresh existing venue data | Cron (weekly) |

### Database Tables

- `listings` - Venue/caterer data
- `listing_media` - Photos and images
- `packages` - Pricing packages
- `discovered_venues` - Instagram discoveries pending research
- `notifications` - Push notifications sent to users
- `sync_logs` - Automation execution logs

---

## 🚀 Setup Instructions

### 1. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Set environment variables
supabase secrets set PERPLEXITY_API_KEY=<your-perplexity-key>
supabase secrets set FCM_SERVER_KEY=<your-firebase-key>

# Deploy all functions
supabase functions deploy deep-research-venue
supabase functions deploy batch-research-venues
supabase functions deploy discover-trending-venues
supabase functions deploy morning-discovery-pipeline
supabase functions deploy scheduled-venue-refresh
```

### 2. Run Database Migrations

```bash
# Apply automation tables migration
supabase db push

# Or manually run in Supabase SQL Editor:
# Run: supabase/migrations/002_automation_tables.sql
```

### 3. Configure Cron Jobs

Create cron jobs in Supabase Dashboard → Database → Cron Jobs (or use pg_cron):

#### Daily Morning Discovery Pipeline (8 AM)
```sql
-- Runs every day at 8:00 AM
SELECT cron.schedule(
  'morning-discovery',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<your-project>.supabase.co/functions/v1/morning-discovery-pipeline',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

#### Weekly Venue Refresh (Sundays at 2 AM)
```sql
-- Runs every Sunday at 2:00 AM
SELECT cron.schedule(
  'weekly-venue-refresh',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://<your-project>.supabase.co/functions/v1/scheduled-venue-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 4. Setup Push Notifications

#### Firebase Cloud Messaging
1. Create Firebase project at https://console.firebase.google.com
2. Add iOS and Android apps
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Get Server Key from Firebase → Project Settings → Cloud Messaging
5. Set as environment variable: `FCM_SERVER_KEY`

#### Flutter Integration
```dart
// Initialize FCM in Flutter app
import 'package:firebase_messaging/firebase_messaging.dart';

final messaging = FirebaseMessaging.instance;

// Request permission
await messaging.requestPermission();

// Get FCM token
final token = await messaging.getToken();

// Save to Supabase
await supabase
  .from('users')
  .update({'push_token': token})
  .eq('id', userId);
```

---

## 🛠️ Admin CLI Usage

The CLI tool provides easy manual control of all automation functions.

### Setup CLI

```bash
# Make executable
chmod +x admin/cli.ts

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Or create .env file in admin/
```

### Commands

#### Research Single Venue
```bash
./admin/cli.ts research \
  --name "Gunners Barracks" \
  --location "Mosman, Sydney" \
  --city "Sydney" \
  --state "NSW"
```

#### Batch Research from File
```bash
# Create JSON file with venues
# Format: [{"venueName": "Name", "location": "City", "city": "City", "state": "State"}]

./admin/cli.ts batch --file venues.json --delay 5000
```

Example `venues.json`:
```json
[
  {
    "venueName": "Taronga Zoo",
    "location": "Mosman, Sydney",
    "city": "Sydney",
    "state": "NSW"
  },
  {
    "venueName": "Stones of the Yarra Valley",
    "location": "Yarra Valley",
    "city": "Melbourne",
    "state": "VIC"
  }
]
```

#### Discover Trending Venues
```bash
./admin/cli.ts discover
```

#### Run Morning Pipeline
```bash
./admin/cli.ts morning
```

#### Refresh Existing Venues
```bash
./admin/cli.ts refresh
```

---

## 📊 Monitoring & Logs

### View Execution Logs

#### Supabase Dashboard
Go to: Database → sync_logs table

#### SQL Query
```sql
SELECT
  source,
  status,
  records_processed,
  metadata,
  timestamp
FROM sync_logs
ORDER BY timestamp DESC
LIMIT 50;
```

### Monitor Discoveries

```sql
-- View pending discoveries
SELECT
  name,
  type,
  city,
  engagement_score,
  why_trending,
  status
FROM discovered_venues
WHERE status = 'pending_research'
ORDER BY engagement_score DESC;

-- View researched discoveries
SELECT
  d.name,
  d.type,
  d.engagement_score,
  l.title as listing_title,
  l.id as listing_id
FROM discovered_venues d
LEFT JOIN listings l ON d.listing_id = l.id
WHERE d.status = 'researched'
ORDER BY d.discovered_at DESC;
```

### Check Notification Stats

```sql
-- Notification delivery stats
SELECT
  DATE(sent_at) as date,
  type,
  COUNT(*) as sent,
  COUNT(CASE WHEN read THEN 1 END) as read,
  ROUND(COUNT(CASE WHEN read THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as read_rate
FROM notifications
GROUP BY DATE(sent_at), type
ORDER BY date DESC;
```

---

## 🔄 How It Works

### Morning Discovery Pipeline (Daily at 8 AM)

1. **Discover** - Scans Instagram for trending venues/caterers in major cities
   - Searches hashtags: #sydneywedding, #melbournewedding, etc.
   - Analyzes engagement scores
   - Identifies new/trending locations

2. **Filter** - Checks which discoveries are new (not in database)
   - Skips venues already researched
   - Ranks by engagement score

3. **Research** - Deep research on top 3 discoveries
   - Calls Perplexity with structured output
   - Gets comprehensive venue details
   - Collects 8-12 high-quality photos
   - Extracts pricing, capacity, amenities
   - Gathers contact information

4. **Save** - Adds to database
   - Creates listing record
   - Saves all images
   - Links tags and packages
   - Marks discovery as researched

5. **Notify** - Sends push notifications
   - Notifies users about new trendy venues
   - Personalized based on user location
   - Deep links to new venue listings

### Weekly Venue Refresh (Sundays at 2 AM)

1. Finds venues older than 7 days
2. Re-researches top 10 oldest venues
3. Updates pricing, photos, details
4. Logs refresh activity

---

## 🎨 What Data Gets Collected

For each venue/caterer, Perplexity Deep Research collects:

### Core Information
- ✅ Official business name
- ✅ Detailed description (3-4 paragraphs)
- ✅ Exact address with GPS coordinates
- ✅ Venue style (modern, rustic, beachfront, etc.)

### Pricing & Capacity
- ✅ Price range (min-max in AUD)
- ✅ Wedding packages with inclusions
- ✅ Guest capacity (min-max)

### Visual Content
- ✅ 8-12 high-quality images
  - Exterior shots
  - Interior spaces
  - Ceremony setups
  - Reception areas
  - Outdoor spaces
  - Golden hour/sunset photos

### Amenities & Features
- ✅ Complete amenities list
- ✅ Accessibility features
- ✅ Parking details
- ✅ Restrictions and policies

### Social Proof
- ✅ Ratings and review count
- ✅ What couples love (highlights)
- ✅ Instagram handle
- ✅ Website and contact info

### Categorization
- ✅ Tags (style, scenery, experience, amenity, feature)
- ✅ Type (venue vs caterer)

---

## 📈 Performance & Rate Limits

### Perplexity API
- Model: `sonar-pro` (for deep research)
- Rate limits: Check Perplexity documentation
- Delays: 5 seconds between requests (configurable)

### Recommendations
- **Initial import**: Batch 20-50 venues with 5s delays
- **Daily discovery**: 3-5 new venues per day
- **Weekly refresh**: 10 venues per week

### Cost Estimates
- Deep research: ~$0.10-0.20 per venue
- Daily pipeline: ~$0.30-0.60 per day
- Monthly: ~$10-20 for full automation

---

## 🐛 Troubleshooting

### Function Fails

**Check logs:**
```bash
supabase functions logs deep-research-venue
```

**Common issues:**
- Invalid Perplexity API key
- Rate limit exceeded
- Invalid venue name/location
- Network timeout

### No Images Found

**Causes:**
- Venue has no official website
- Instagram is private
- Image URLs are invalid/broken

**Solution:**
- Check `image_validation` in function logs
- Manually add images via Supabase dashboard

### Discoveries Not Being Researched

**Check:**
```sql
SELECT status, COUNT(*)
FROM discovered_venues
GROUP BY status;
```

**Fix:**
- Manually trigger: `./admin/cli.ts morning`
- Check cron job configuration
- Verify `pending_research` status exists

---

## 🔐 Security

### Environment Variables
- Never commit API keys to git
- Use Supabase secrets for Edge Functions
- Rotate keys periodically

### Access Control
- Use service role key only in backend
- Don't expose in Flutter app
- Implement Row Level Security (RLS) on tables

---

## 📝 Best Practices

### Data Quality
1. ✅ Review first 5-10 researched venues manually
2. ✅ Verify image quality and relevance
3. ✅ Check pricing accuracy
4. ✅ Validate coordinates

### Automation
1. ✅ Start with small batches
2. ✅ Monitor logs daily for first week
3. ✅ Adjust discovery cities based on user base
4. ✅ Fine-tune notification timing

### Scaling
1. ✅ Increase discoveries as user base grows
2. ✅ Add more cities to discovery
3. ✅ Implement A/B testing for notifications
4. ✅ Track which discoveries convert to favorites

---

## 🎯 Next Steps

1. **Deploy Functions** - Follow setup instructions above
2. **Initial Data Import** - Use CLI to batch import 50-100 venues
3. **Test Pipeline** - Run `./admin/cli.ts morning` manually
4. **Enable Cron Jobs** - Set up scheduled automation
5. **Monitor** - Check logs and stats daily for first week
6. **Optimize** - Adjust based on data quality and user engagement

---

## 📞 Support

For issues or questions:
- Check `sync_logs` table for error messages
- Review function logs in Supabase dashboard
- Verify Perplexity API status
- Test with CLI tool for debugging

---

**Last Updated:** October 2025
**Version:** 1.0.0
