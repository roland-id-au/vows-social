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
- Edge functions
- Authentication

## Scripts

- `npm run web:dev` - Start web dev server
- `npm run web:build` - Build web for production
- `npm run mobile:run` - Run mobile app
- `npm run supabase:start` - Start local Supabase
- `npm run supabase:stop` - Stop local Supabase
