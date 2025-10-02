# GitHub & Supabase Continuous Deployment Setup

Complete setup guide for continuous deployment to Supabase from GitHub.

---

## 1. Create GitHub Repository

Since `gh` CLI is not installed, create the repository through GitHub web interface:

1. Go to https://github.com/new
2. Repository name: `vow-social`
3. Description: "The Vow Society - Wedding Venue Marketplace"
4. Private repository (recommended for production)
5. **Do not** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

Then push your local repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/vow-social.git
git branch -M main
git push -u origin main
```

---

## 2. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Project name: `vows-social`
4. Database password: Generate a strong password (save it!)
5. Region: Choose closest to your users (e.g., Australia Southeast)
6. Pricing plan: Select appropriate plan
7. Click "Create new project"

**Save these values:**
- Project URL: `https://[project-ref].supabase.co`
- Project ID (ref): `[project-ref]`
- Anon/Public Key: Found in Settings > API
- Service Role Key: Found in Settings > API (keep secret!)
- Database Password: What you set during creation

---

## 3. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

**Go to:** Repository Settings > Secrets and variables > Actions > New repository secret

Add these secrets:

```
SUPABASE_ACCESS_TOKEN
  - Go to https://supabase.com/dashboard/account/tokens
  - Generate new token
  - Paste the token value

SUPABASE_PROJECT_ID
  - Your project reference ID from Supabase dashboard
  - Format: xyzabcdefghijk

SUPABASE_DB_PASSWORD
  - The database password you set when creating the project

PERPLEXITY_API_KEY
  - Your Perplexity API key from https://www.perplexity.ai/settings/api
```

---

## 4. Update Supabase Config

Update `supabase/config.toml` with your project ID:

```toml
project_id = "your-project-ref"
```

Commit and push:

```bash
git add supabase/config.toml
git commit -m "Configure Supabase project"
git push
```

---

## 5. Initial Deployment

### Option A: Automatic (via GitHub Actions)

Push to main branch triggers automatic deployment:

```bash
git push origin main
```

Check deployment status at: `https://github.com/YOUR_USERNAME/vow-social/actions`

### Option B: Manual (via Supabase CLI)

If you prefer manual deployment first:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy database migrations
supabase db push

# Set Edge Function secrets
supabase secrets set PERPLEXITY_API_KEY=your-key

# Deploy all Edge Functions
supabase functions deploy deep-research-venue
supabase functions deploy batch-research-venues
supabase functions deploy discover-trending-venues
supabase functions deploy morning-discovery-pipeline
supabase functions deploy scheduled-venue-refresh
```

---

## 6. Set Up Database Schema

The migrations will automatically create all tables, but verify:

1. Go to Supabase Dashboard > Table Editor
2. Verify these tables exist:
   - `listings`
   - `listing_media`
   - `tags`
   - `listing_tags`
   - `instagram_posts`
   - `users`
   - `favorites`
   - `inquiries`
   - `sync_logs`
   - `discovered_venues`
   - `packages`
   - `notifications`

---

## 7. Configure Scheduled Jobs (Cron)

Enable automated discovery and refresh:

```sql
-- Run in Supabase SQL Editor

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Morning discovery pipeline (daily at 8 AM)
SELECT cron.schedule(
  'morning-discovery-pipeline',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/morning-discovery-pipeline',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Weekly venue refresh (Sunday at 2 AM)
SELECT cron.schedule(
  'weekly-venue-refresh',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/scheduled-venue-refresh',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"venue_count": 10}'::jsonb
  );
  $$
);
```

**Replace:**
- `your-project-ref` with your actual project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key from Supabase dashboard

---

## 8. Configure Flutter App

Update `lib/main.dart` with your Supabase credentials:

```dart
await SupabaseService.initialize(
  url: 'https://your-project-ref.supabase.co',
  anonKey: 'your-anon-key',
);
```

---

## 9. Test Deployment

### Test Edge Functions

```bash
# Test deep research
curl -X POST https://your-project-ref.supabase.co/functions/v1/deep-research-venue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "venueName": "Gunners Barracks",
    "location": "Mosman, Sydney",
    "city": "Sydney",
    "state": "NSW"
  }'

# Test discovery
curl -X POST https://your-project-ref.supabase.co/functions/v1/discover-trending-venues \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Test Flutter App

```bash
flutter pub get
flutter run
```

---

## 10. Continuous Deployment Flow

Once set up, your deployment flow is:

```
Local Development
  ↓
git commit & push
  ↓
GitHub Actions Triggered
  ↓
Automatic Deployment:
  - Database migrations
  - Edge Functions
  - Secrets updated
  ↓
Production Live ✅
```

---

## Project URLs

After setup, your project will be accessible at:

- **Supabase Dashboard**: `https://supabase.com/dashboard/project/your-project-ref`
- **API Base URL**: `https://your-project-ref.supabase.co`
- **Edge Functions**: `https://your-project-ref.supabase.co/functions/v1/[function-name]`
- **GitHub Actions**: `https://github.com/YOUR_USERNAME/vow-social/actions`

---

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Ensure Supabase CLI has proper permissions

### Edge Functions Not Working

1. Check function logs in Supabase Dashboard
2. Verify `PERPLEXITY_API_KEY` is set
3. Test with Supabase logs: `supabase functions logs [function-name]`

### Database Migration Issues

1. Check migration files in `supabase/migrations/`
2. Run manually: `supabase db push`
3. Check Supabase Dashboard > Database > Migrations

---

## Security Checklist

- ✅ All API keys stored in GitHub Secrets
- ✅ `.env` files in `.gitignore`
- ✅ Service role key never exposed to client
- ✅ RLS (Row Level Security) policies configured
- ✅ CORS configured for production domains

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Configure Supabase project
3. ✅ Set GitHub secrets
4. ✅ Deploy via GitHub Actions
5. ⏭️ Configure custom domain (optional)
6. ⏭️ Set up monitoring and alerts
7. ⏭️ Configure production Firebase for notifications

---

**Status**: Ready for continuous deployment 🚀
