# The Vow Society - Project Information

## Supabase Project Details

**Project Created:** October 2, 2025
**Project Name:** vows-social
**Project ID:** nidbhgqeyhrudtnizaya
**Region:** Oceania (Sydney) - ap-southeast-2
**Dashboard:** https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya

### API Endpoints

**Base URL:** `https://nidbhgqeyhrudtnizaya.supabase.co`

**Anon Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w
```

**Service Role Key** (Keep secret!):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M
```

### Edge Functions Deployed

All Edge Functions deployed successfully:

1. **deep-research-venue** - AI-powered venue research with 8-12 photos
2. **batch-research-venues** - Batch processing for multiple venues
3. **discover-trending-venues** - Instagram trend discovery
4. **morning-discovery-pipeline** - Daily automated discovery workflow
5. **scheduled-venue-refresh** - Weekly data refresh

**Function URL Format:**
```
https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/[function-name]
```

### Database Schema

Fully deployed with:
- ✅ PostGIS extension for geographic queries
- ✅ Listings table with country + city tagging
- ✅ Tags, media, Instagram posts
- ✅ Users, favorites, inquiries
- ✅ Automation tables (discovered_venues, packages, notifications)
- ✅ Sync logs for tracking

### Secrets Configured

- ✅ `PERPLEXITY_API_KEY` - Set for all Edge Functions

---

## GitHub Repository Setup

### Create Repository

1. Go to https://github.com/new
2. Repository name: `vow-social`
3. Description: "The Vow Society - Wedding Venue Marketplace"
4. **Private** repository
5. Do not initialize with README
6. Click "Create repository"

### Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/vow-social.git
git branch -M main
git push -u origin main
```

### Configure GitHub Secrets

Go to: Repository Settings > Secrets and variables > Actions > New repository secret

Add these secrets:

```
SUPABASE_ACCESS_TOKEN
sbp_8cf16545af7909183871895966700b2a9a4814e1

SUPABASE_PROJECT_ID
nidbhgqeyhrudtnizaya

SUPABASE_DB_PASSWORD
[The password generated during project creation]

PERPLEXITY_API_KEY
[Stored in Supabase Edge Function secrets - do not commit]
```

---

## Continuous Deployment

Once you push to GitHub with secrets configured:

✅ Every push to `main` automatically deploys:
- Database migrations
- All Edge Functions
- Updated secrets

Monitor deployments at:
`https://github.com/YOUR_USERNAME/vow-social/actions`

---

## Test Your Deployment

### Test Deep Research Function

```bash
curl -X POST https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/deep-research-venue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w" \
  -d '{
    "venueName": "Gunners Barracks",
    "location": "Mosman, Sydney",
    "city": "Sydney",
    "state": "NSW"
  }'
```

### Test Discovery Function

```bash
curl -X POST https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/discover-trending-venues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M"
```

---

## Flutter App Setup

### Run the App

```bash
flutter pub get
flutter run
```

The app is already configured with Supabase credentials in `lib/main.dart`.

### For iOS (Optional)

Add Google Maps API key in `ios/Runner/AppDelegate.swift`:
```swift
import GoogleMaps
GMSServices.provideAPIKey("YOUR_GOOGLE_MAPS_API_KEY")
```

### For Android (Optional)

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
```

---

## Next Steps

1. ✅ **Supabase Setup** - Complete
2. ✅ **Database Migrations** - Complete
3. ✅ **Edge Functions** - Complete
4. ⏭️ **Create GitHub Repo** - Follow instructions above
5. ⏭️ **Configure GitHub Secrets** - Follow instructions above
6. ⏭️ **Push to GitHub** - Automatic deployment will begin
7. ⏭️ **Test Edge Functions** - Use curl commands above
8. ⏭️ **Run Flutter App** - Test on simulator/device
9. ⏭️ **Configure Cron Jobs** - Set up scheduled automation
10. ⏭️ **Add Google Maps API** - For map functionality

---

**Status:** 🚀 Backend fully deployed and ready for production!
