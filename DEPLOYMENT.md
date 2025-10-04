# Deployment Guide

## Deploying to Vercel

### Option 1: Deploy via CLI (Recommended)

1. Login to Vercel:
   ```bash
   vercel login
   ```
   Visit the URL shown and authenticate.

2. Navigate to the web package:
   ```bash
   cd packages/web
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

4. Follow the prompts:
   - Link to existing project or create new
   - Set project name (e.g., "vows-social")
   - Confirm settings

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Visit https://vercel.com/new
3. Import your repository
4. Set the root directory to: `packages/web`
5. Framework preset will auto-detect Next.js
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
7. Click Deploy

### Custom Domain Setup (vows.social)

1. After deployment, go to your project settings
2. Navigate to "Domains"
3. Add custom domain: `vows.social`
4. Follow DNS configuration instructions:
   - Add A record pointing to Vercel's IP
   - OR add CNAME record pointing to your Vercel deployment

### Environment Variables

The following environment variables need to be set in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://nidbhgqeyhrudtnizaya.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w
```

These can be added in:
- Vercel Dashboard → Project Settings → Environment Variables
- Or via CLI during deployment

## Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for pull requests
- Run build checks before deployment
