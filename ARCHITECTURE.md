# The Vow Society - System Architecture

**Last Updated:** October 2, 2025

---

## 📐 Database Schema

### Core Tables

#### `listings`
Primary table for all wedding venues and services
- **Supports:** venues, caterers, florists, photographers, videographers, musicians, stylists, planners, cake designers, makeup artists, hair stylists, and 8+ more service types
- **Key Columns:**
  - `category` (TEXT) - Service category (venue, caterer, florist, etc.)
  - `service_type` (TEXT) - Specific service description (e.g., "Fine Dining Caterer")
  - `service_metadata` (JSONB) - Service-specific details
  - `country` (TEXT) - Country (default: Australia)
  - `location_data` (JSONB) - City, state, coordinates
  - `price_data` (JSONB) - Min/max pricing
  - `rating`, `review_count` - Quality metrics

#### `discovered_listings`
Discovery queue for Instagram-trending venues and services
- **Previously:** `discovered_venues` (renamed for consistency)
- **Purpose:** Stores discoveries before they are researched and added to `listings`
- **Status Flow:** `pending_research` → `researched` or `research_failed`
- **Key Columns:**
  - `type` (TEXT) - Service type (venue, caterer, florist, etc.)
  - `engagement_score` (DECIMAL) - 1-10 based on Instagram engagement
  - `why_trending` (TEXT) - Explanation of trending reason
  - `listing_id` (UUID) - Links to `listings` after research

#### `listing_media`
Photos and videos for each listing
- 8-12 photos per listing on average
- Direct URLs from official sources

#### `instagram_posts`
Instagram posts featuring the listing
- 3-5 posts per listing
- Real wedding content with captions

#### `packages`
Pricing packages for each listing
- 2-3 packages per listing
- Per-person or flat-rate pricing

#### `listing_tags`
Many-to-many relationship for filtering
- 10+ tags per listing
- Categories: style, scenery, experience, amenity, feature

---

## 🔧 Edge Functions

### Discovery Functions

#### `discover-trending-venues`
**Purpose:** Discovers trending wedding venues from Instagram
- **Input:** Optional `expandedSearch` (boolean), `cities` (array)
- **Output:** New venue discoveries saved to `discovered_listings`
- **Intelligence:**
  - City rotation (3 cities/day from 15 cities)
  - Focuses on REAL WEDDINGS (not styled shoots)
  - Recent posts prioritized (7-30 days)
  - High engagement scoring
- **Note:** Despite the name "venues", this is the primary venue discovery function

#### `discover-wedding-services`
**Purpose:** Discovers trending wedding services (caterers, florists, etc.)
- **Input:** Optional `expandedSearch` (boolean)
- **Output:** New service discoveries saved to `discovered_listings`
- **Intelligence:**
  - Service type rotation (2-3 types/day from 10+ types)
  - City rotation (3 cities/day)
  - Wedding-specific work filtering
  - Professional vendor validation

### Research & Enrichment

#### `deep-research-venue`
**Purpose:** Comprehensive research and enrichment for ANY listing type
- **Name Note:** Despite "venue" in the name, this function handles ALL service types
- **Input:**
  - `venueName` (string) - Business name
  - `location` (string) - Location description
  - `city` (string) - City name
  - `state` (string) - State/region
  - `serviceType` (string) - Optional, defaults to 'venue', supports all types
  - `forceRefresh` (boolean) - Force re-research existing listing
- **Output:** Fully enriched listing with:
  - 8-12 validated photos
  - 3-5 Instagram posts
  - 2-3 pricing packages
  - 10+ tags
  - Description, contact info, rating, reviews
- **Process:**
  1. Check if listing exists (unless force refresh)
  2. Call Perplexity API with structured output
  3. Validate image URLs
  4. Insert listing into `listings` table
  5. Insert media, Instagram posts, packages, tags
  6. Return success with counts

### Automation & Pipelines

#### `morning-discovery-pipeline`
**Purpose:** Daily automated workflow for discovery → research → notification
- **Schedule:** Daily 8 AM (via cron job)
- **Process:**
  1. **Discovery Phase:**
     - Calls `discover-trending-venues` (3 cities)
     - Calls `discover-wedding-services` (2-3 service types)
  2. **Research Phase:**
     - Queries `discovered_listings` for top 5 by engagement score
     - Calls `deep-research-venue` for each
     - Updates discovery status to `researched`
  3. **Enrichment Verification:**
     - Filters for fully enriched listings (photos > 0 AND packages > 0)
  4. **Notification Phase:**
     - Sends push notifications ONLY for fully enriched listings
     - Logs notifications to `notifications` table
  5. **Logging:**
     - Records stats to `sync_logs`
- **Output:**
  - 5-15 new discoveries
  - 5 fully researched listings
  - Push notifications to all users (only for enriched listings)

#### `scheduled-venue-refresh`
**Purpose:** Weekly refresh of oldest listings
- **Schedule:** Sunday 2 AM (via cron job)
- **Process:**
  1. Query 10 oldest listings (>7 days)
  2. Call `deep-research-venue` with `forceRefresh=true`
  3. Update existing listing data
- **Output:** 10 refreshed listings with updated data

#### `backfill-all-venues`
**Purpose:** One-time comprehensive venue import
- **Process:**
  1. Call `discover-trending-venues` with `expandedSearch=true`
  2. Research ALL discovered venues
  3. Progress tracking every 10 venues
- **Output:** 100-200 fully researched venues
- **Note:** Run once for initial database population

#### `backfill-wedding-services`
**Purpose:** One-time comprehensive services import
- **Process:**
  1. Call `discover-wedding-services` with `expandedSearch=true`
  2. Research ALL discovered services
  3. Progress tracking every 10 services
- **Output:** 200-400 fully researched services
- **Note:** Run once for initial database population

---

## 📊 Views

### `pending_discoveries`
All discoveries awaiting research, ordered by engagement score
```sql
SELECT * FROM pending_discoveries;
```

### `discovery_stats`
Statistics on discoveries by type
```sql
SELECT * FROM discovery_stats;
```

### `wedding_services`
All wedding services excluding venues
```sql
SELECT * FROM wedding_services WHERE city = 'Sydney';
```

### `wedding_marketplace`
Complete marketplace (venues + all services)
```sql
SELECT * FROM wedding_marketplace WHERE country = 'Australia';
```

---

## 🎯 Naming Conventions

### Database Tables
- Plural nouns: `listings`, `packages`, `notifications`
- Descriptive: `discovered_listings` (not just `discoveries`)
- Consistent: All related tables use `listing_id` as foreign key

### Edge Functions
- Kebab-case: `discover-trending-venues`
- Verb-noun structure: `discover-*`, `research-*`, `backfill-*`
- **Legacy naming:** Some functions retain "venue" in name but support all types
  - `deep-research-venue` - handles ALL service types
  - `backfill-all-venues` - handles venues only (use `backfill-wedding-services` for services)

### Views
- Descriptive nouns: `pending_discoveries`, `wedding_marketplace`
- Snake_case: `discovery_stats`

### Status Values
- Snake_case: `pending_research`, `researched`, `research_failed`

---

## 🔄 Data Flow

### Discovery → Enrichment → Publication Flow

1. **Discovery (Daily 8 AM)**
   ```
   Instagram Trends
        ↓
   Perplexity AI Analysis
        ↓
   discovered_listings (pending_research)
   ```

2. **Research (Immediate)**
   ```
   Top 5 by engagement_score
        ↓
   deep-research-venue (with serviceType)
        ↓
   Perplexity Deep Research
        ↓
   Image Validation
        ↓
   Database Insert (listings + media + posts + packages + tags)
        ↓
   discovered_listings (status = researched)
   ```

3. **Enrichment Verification**
   ```
   Filter researched listings
        ↓
   Check: images_count > 0 AND packages_count > 0
        ↓
   Only fully enriched proceed to notification
   ```

4. **Publication (Push Notifications)**
   ```
   Fully enriched listings
        ↓
   Push notification to users
        ↓
   Listed in "Trending" feed
   ```

### Quality Gates

**Before Notification:**
- ✅ Must have 1+ photos
- ✅ Must have 1+ packages
- ✅ Must be marked as `researched`
- ✅ Must have valid listing_id

**This ensures users only see high-quality, complete listings**

---

## 📱 Flutter App Integration

### Querying All Service Types
```dart
// Get all listings (venues + services)
final allListings = await supabase
  .from('wedding_marketplace')
  .select('*')
  .eq('country', 'Australia');

// Get specific service type
final caterers = await supabase
  .from('listings')
  .select('*, listing_media(*), packages(*)')
  .eq('category', 'caterer')
  .eq('city', 'Sydney');

// Get fully enriched listings
final enriched = await supabase
  .from('listings')
  .select('''
    *,
    listing_media!inner(*),
    packages!inner(*),
    instagram_posts(*),
    listing_tags(tag_name, tags(*))
  ''')
  .gte('listing_media.count', 1)  // Has photos
  .gte('packages.count', 1);      // Has packages
```

---

## 🚀 Growth Metrics

### Daily Automated Growth
- **Discoveries:** 15-20 listings/day (10 venues + 5-10 services)
- **Research:** 5 fully enriched listings/day
- **Monthly:** ~150 new listings
- **Annual:** ~1,800 listings

### Backfill (One-time)
- **Venues:** 100-200 listings
- **Services:** 200-400 listings
- **Total:** 300-600 initial listings

---

## 🔐 Security & Performance

### API Rate Limiting
- 5 second delay between Perplexity calls
- 3 second delay between cities in discovery
- Prevents API throttling

### Database Indexes
- `idx_discovered_listings_status` - Fast pending queries
- `idx_discovered_listings_engagement` - Sorted by score
- `idx_listings_category` - Fast service type filtering
- `idx_listings_city` - Geographic searches
- `listings_location_idx` (GIST) - Spatial queries

### Image Validation
- Pattern-based validation (extensions + known hosts)
- Prevents broken image URLs
- Validates before database insert

---

## 📝 Summary

**The Vow Society** is a complete wedding marketplace with:
- ✅ Automated discovery of trending venues and services
- ✅ Deep research and enrichment via Perplexity AI
- ✅ Quality verification before publication
- ✅ Push notifications for fully enriched listings only
- ✅ Normalized database schema (`discovered_listings` table)
- ✅ Consistent naming conventions (with some legacy naming)
- ✅ Support for 18+ service types
- ✅ Continuous growth (5 listings/day)
- ✅ Backfill capabilities (300-600 initial listings)

**Key Function:**
- `deep-research-venue` - Universal enrichment function for ALL service types (despite "venue" in name)

**All discoveries are automatically transformed into fully enriched listings via the morning discovery pipeline.**
