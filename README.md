# Vows Social

Wedding venue marketplace with mobile app and web platform.

## Project Structure

This is a monorepo containing multiple packages:

```
vows_social/
├── packages/
│   ├── mobile/          # Flutter mobile app
│   └── web/            # Next.js web application
├── supabase/           # Supabase backend (functions, migrations)
└── package.json        # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ (for web)
- Flutter 3.0+ (for mobile)
- Supabase CLI (for backend)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Web app
cp packages/web/.env.local.example packages/web/.env.local
# Edit packages/web/.env.local with your Supabase credentials
```

### Development

#### Web Application
```bash
npm run web:dev
```

#### Mobile Application
```bash
npm run mobile:run
# or
cd packages/mobile && flutter run
```

#### Supabase
```bash
npm run supabase:start
npm run supabase:status
```

## Packages

### Mobile (`packages/mobile`)
Flutter mobile application for iOS and Android.

### Web (`packages/web`)
Next.js web application with:
- TypeScript
- Tailwind CSS
- Supabase integration

### Supabase (`supabase/`)
Backend infrastructure including:
- Database migrations
- Edge functions (discovery, enrichment, cron jobs)
- Authentication
- Storage (images served via CDN)

## Deployment

### Production URLs
- **Web App**: https://vows-social-drksci.vercel.app
- **Custom Domain**: https://vows.social
- **Supabase**: https://nidbhgqeyhrudtnizaya.supabase.co

### Deploy Web App
```bash
# Automatic deployment via GitHub
git push origin main  # Vercel auto-deploys

# Manual deployment
cd packages/web
vercel --prod
```

### Deploy Supabase Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy deep-research-venue
```

### Apply Database Migrations
```bash
supabase db push
```

## Features

### Automated Discovery & Enrichment
- **Cron Jobs**: Automated discovery runs daily via pg_cron
- **Morning Pipeline**: Discovers trending venues from Instagram
- **Deep Research**: Enriches listings with Perplexity AI
- **Image Storage**: Downloads and stores images in Supabase Storage CDN
- **Notifications**: Sends push notifications for new discoveries

See [CRON_AND_LOGGING.md](CRON_AND_LOGGING.md) for details.

### Image Management
- **CDN Delivery**: All images served via Supabase Storage CDN
- **Automatic Download**: Images downloaded during enrichment
- **Format Validation**: JPEG, PNG, WebP, GIF supported
- **Size Limits**: 10MB max per image

See [IMAGE_STORAGE.md](IMAGE_STORAGE.md) for architecture details.

### Continuous Discovery
- **Daily Venue Discovery**: Rotating through Australian cities
- **Service Discovery**: Photographers, florists, caterers, etc.
- **Instagram Integration**: Trends based on social media engagement
- **Automated Enrichment**: Photos, packages, pricing, reviews

See [CONTINUOUS_DISCOVERY.md](packages/mobile/CONTINUOUS_DISCOVERY.md) for workflow.

## Scripts

### Web Development
- `npm run web:dev` - Start web dev server
- `npm run web:build` - Build web for production
- `npm run web:start` - Start production server

### Mobile Development
- `npm run mobile:run` - Run mobile app
- `npm run mobile:build` - Build mobile app

### Supabase
- `npm run supabase:start` - Start local Supabase
- `npm run supabase:stop` - Stop local Supabase
- `npm run supabase:status` - Check Supabase status

### Database
- `npm run db:reset` - Reset local database (re-run all migrations)
- `npm run db:clear` - Clear all data (⚠️ destructive, 5s warning)

## Architecture

```
┌─────────────────┐
│   Web (Next.js) │ ──▶ Vercel (Auto-deploy from GitHub)
└─────────────────┘

┌─────────────────┐
│ Mobile (Flutter)│ ──▶ App Store / Play Store
└─────────────────┘

┌─────────────────────────────────────────────────────┐
│              Supabase Backend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Database   │  │ Edge Functions│  │  Storage  │ │
│  │ (Postgres)   │  │  (Deno)       │  │   (CDN)   │ │
│  │              │  │               │  │           │ │
│  │ - Listings   │  │ - Discovery   │  │ - Images  │ │
│  │ - Media      │  │ - Enrichment  │  │           │ │
│  │ - Users      │  │ - Cron Jobs   │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
           ▲
           │
    ┌──────┴────────┐
    │ Perplexity AI │ (Discovery & Research)
    └───────────────┘
```

## Documentation

- [IMAGE_STORAGE.md](IMAGE_STORAGE.md) - Image storage architecture
- [CRON_AND_LOGGING.md](CRON_AND_LOGGING.md) - Automated jobs and logging
- [CONTINUOUS_DISCOVERY.md](packages/mobile/CONTINUOUS_DISCOVERY.md) - Discovery workflow
- [ARCHITECTURE.md](packages/mobile/ARCHITECTURE.md) - System architecture
- [DEPLOYMENT.md](packages/mobile/DEPLOYMENT.md) - Deployment guide
