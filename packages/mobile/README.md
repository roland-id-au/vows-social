# The Vow Society - Wedding Venue Marketplace

A mobile-first marketplace connecting couples with wedding venues, catering services, and experiences across Australia.

## Features

✨ **Core Features:**
- 🔍 **Discovery & Search** - Location-based search with map view and distance filtering
- 🏷️ **Advanced Filtering** - Filter by tags, scenery, experiences, price, capacity
- 📸 **Instagram Integration** - View recent location-tagged posts from venues
- 🗺️ **Map View** - Geographic visualization with distance-based filtering
- ❤️ **Favorites** - Save and organize venues in collections
- ⚖️ **Compare** - Side-by-side comparison of up to 4 venues
- 📱 **Native Feeling UI** - Smooth, responsive, Instagram-meets-Airbnb design

## Tech Stack

### Mobile App (Flutter)
- **Framework**: Flutter 3.x
- **State Management**: Riverpod
- **Navigation**: GoRouter
- **Maps**: Google Maps Flutter
- **HTTP Client**: http package
- **Caching**: Cached Network Image

### Backend (Supabase)
- **Database**: PostgreSQL with PostGIS
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Edge Functions**: Deno/TypeScript
- **Real-time**: Supabase Realtime
- **Automation**: Cron jobs + Perplexity integration

### AI-Powered Data Automation
- **Perplexity Deep Research**: Automated venue/caterer research with 8-12 photos
- **Instagram Discovery**: Find trending venues from social media
- **Morning Pipeline**: Daily discover → research → notify automation
- **Scheduled Updates**: Weekly data refresh for existing venues
- **Structured Output**: JSON schema for consistent, comprehensive data

## Project Structure

```
vow_social/
├── lib/
│   ├── models/               # Data models
│   │   ├── venue.dart
│   │   ├── venue_tag.dart
│   │   ├── location_data.dart
│   │   ├── instagram_post.dart
│   │   └── search_filters.dart
│   ├── screens/              # App screens
│   │   ├── home_screen.dart
│   │   ├── search_results_screen.dart
│   │   ├── venue_detail_screen.dart
│   │   ├── map_view_screen.dart
│   │   ├── filter_screen.dart
│   │   ├── favorites_screen.dart
│   │   └── compare_screen.dart
│   ├── widgets/              # Reusable UI components
│   │   ├── venue_card.dart
│   │   ├── trending_venues_carousel.dart
│   │   └── instagram_grid.dart
│   ├── services/             # API & business logic
│   │   ├── supabase_service.dart
│   │   └── venue_research_service.dart
│   └── main.dart             # App entry point
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── deep-research-venue/         # Deep research with photos
│   │   ├── batch-research-venues/       # Batch processing
│   │   ├── discover-trending-venues/    # Instagram discovery
│   │   ├── morning-discovery-pipeline/  # Daily automation
│   │   └── scheduled-venue-refresh/     # Weekly updates
│   └── migrations/           # Database schemas
│       ├── 001_initial_schema.sql
│       └── 002_automation_tables.sql
├── admin/
│   ├── cli.ts                # Admin CLI tool
│   └── example-venues.json   # Sample batch import
├── pubspec.yaml              # Flutter dependencies
└── README.md
```

## Setup Instructions

### 1. Prerequisites
- Flutter SDK (3.0+)
- Dart SDK
- Supabase account
- Google Maps API key
- Perplexity API key (for backend data enrichment)

### 2. Clone Repository
```bash
git clone <repository-url>
cd vow_social
```

### 3. Install Dependencies
```bash
flutter pub get
```

### 4. Supabase Setup

#### Database Schema
Create the following tables in your Supabase project:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  style TEXT,
  location_data JSONB NOT NULL,
  price_data JSONB NOT NULL,
  min_capacity INTEGER,
  max_capacity INTEGER,
  amenities TEXT[],
  rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  website TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX listings_location_idx ON listings
USING GIST (ST_SetSRID(ST_MakePoint(
  (location_data->>'longitude')::float,
  (location_data->>'latitude')::float
), 4326));

-- Listing media
CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
  name TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  icon TEXT
);

-- Listing tags (many-to-many)
CREATE TABLE listing_tags (
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  tag_name TEXT REFERENCES tags(name) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, tag_name)
);

-- Instagram posts
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  post_id TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  username TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  wedding_date DATE,
  guest_count INTEGER,
  budget INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Inquiries
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync logs
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  records_processed INTEGER,
  errors TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

#### Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Set secrets
supabase secrets set PERPLEXITY_API_KEY=<your-perplexity-api-key>

# Deploy the function
supabase functions deploy research-venue
```

### 5. Configure Environment

Create a `.env` file (not committed to git):
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Update `lib/main.dart` with your Supabase credentials:
```dart
await SupabaseService.initialize(
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
);
```

### 6. Configure Google Maps

#### iOS (ios/Runner/AppDelegate.swift):
```swift
import GoogleMaps

GMSServices.provideAPIKey("YOUR_GOOGLE_MAPS_API_KEY")
```

#### Android (android/app/src/main/AndroidManifest.xml):
```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
```

### 7. Run the App
```bash
flutter run
```

## 🚀 Backend Deployment

Deploy to **v1-api.vows.social** using Supabase CLI.

### Quick Deploy (10 minutes)

```bash
# Setup environment
./scripts/setup-env.sh

# Deploy backend
./scripts/deploy.sh

# Setup automation
./scripts/setup-cron.sh
```

**Full guides:**
- 📖 [QUICKSTART.md](QUICKSTART.md) - Deploy in 10 minutes
- 📖 [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- 📖 [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) - Automation details
- 📖 [LOCALITY_TAGGING.md](LOCALITY_TAGGING.md) - Geographic tagging system

## 🤖 Automated Data & Notifications

The backend includes a fully automated system for discovering, researching, and notifying users about trending venues and caterers.

### Features

1. **Instagram Discovery** - Finds trending wedding venues/caterers
2. **Deep Research** - Uses Perplexity to get comprehensive data + 8-12 photos
3. **Morning Pipeline** - Daily automation: discover → research → notify
4. **Weekly Refresh** - Keeps existing venue data up-to-date
5. **Admin CLI** - Easy manual control

### Admin CLI Examples

```bash
# Research single venue
./admin/cli.ts research --name "Gunners Barracks" --location "Sydney"

# Batch import from file
./admin/cli.ts batch --file venues.json

# Discover trending venues
./admin/cli.ts discover

# Run full morning pipeline
./admin/cli.ts morning
```

### What Gets Automated

**Daily (8 AM):**
- Scan Instagram for trending venues/caterers
- Research top 3 discoveries with Perplexity
- Add to database with 8-12 photos
- Send push notifications to users

**Weekly (Sunday 2 AM):**
- Refresh 10 oldest venue listings
- Update pricing, photos, details

**Manual (Admin CLI):**
- Import specific venues
- Batch process venue lists
- Trigger discovery on demand

## Key Features Implementation

### Tags, Experiences & Scenery
- Predefined tag categories in `models/venue_tag.dart`
- Filter screen allows multi-select for tags
- Tags include: Style, Scenery, Experience, Amenity, Feature

### Geographic Filtering
- **Locality**: Specific suburbs (Mosman, Palm Beach, Yarra Valley)
- **Region**: Broader areas (Northern Beaches, Hunter Valley)
- **City**: Major cities (Sydney, Melbourne, Brisbane)
- **Country**: Australia (expandable to other countries)
- **Distance**: Map view with radius filtering (5-100km)
- Uses PostGIS for efficient geospatial queries

### Map View
- Google Maps integration
- Markers for each venue
- Distance radius visualization
- Tap markers to see venue details
- Quick navigation to full venue page

## Development Roadmap

### MVP (Current)
- [x] Core UI screens
- [x] Navigation & routing
- [x] Data models
- [x] Supabase integration
- [x] Map view with distance filtering
- [x] Advanced filtering (tags, scenery, experiences)
- [x] Perplexity integration for data enrichment

### Next Steps
- [ ] Supabase authentication
- [ ] Real venue data population
- [ ] Instagram Graph API integration
- [ ] Push notifications
- [ ] In-app messaging
- [ ] Booking requests
- [ ] Payment processing

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
