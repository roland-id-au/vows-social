# Locality & Country Tagging System

Complete geographic tagging for venues and caterers with country, city, locality, and region support.

---

## 🌍 Overview

Every venue and discovered listing is now tagged with:
- **Country**: Australia (default, expandable to other countries)
- **State**: NSW, VIC, QLD, WA, SA, TAS, NT, ACT
- **City**: Sydney, Melbourne, Brisbane, etc.
- **Locality**: Specific suburb/area (e.g., Mosman, Palm Beach)
- **Region**: Broader area (e.g., Northern Beaches, Yarra Valley)

---

## 📊 Database Schema

### Listings Table
```sql
-- New columns
locality TEXT          -- e.g., "Mosman", "Palm Beach"
region TEXT            -- e.g., "Northern Beaches", "Yarra Valley"
country TEXT           -- Default: "Australia"

-- Indexes for fast filtering
CREATE INDEX idx_listings_locality ON listings(locality);
CREATE INDEX idx_listings_region ON listings(region);
CREATE INDEX idx_listings_country ON listings(country);
```

### Localities Table
Predefined popular wedding localities with venue counts:
```sql
CREATE TABLE localities (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  region TEXT,
  country TEXT DEFAULT 'Australia',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_popular BOOLEAN DEFAULT FALSE,
  venue_count INTEGER DEFAULT 0
);
```

**Pre-populated with 30+ popular Australian localities:**
- Sydney: Mosman, Manly, Palm Beach, The Rocks, etc.
- Melbourne: St Kilda, Brighton, Yarra Valley, etc.
- Brisbane: South Bank, Gold Coast Hinterland, etc.
- Perth: Kings Park, Fremantle, Swan Valley, etc.
- Regions: Hunter Valley, Southern Highlands, Byron Bay, etc.

---

## 🔍 How It Works

### 1. Deep Research Function

Perplexity AI now extracts locality and region:

```typescript
{
  locality: "Mosman",        // Specific suburb
  city: "Sydney",
  state: "NSW",
  region: "North Shore",     // Broader area
  country: "Australia"
}
```

**Prompt enhancement:**
```
2. Identify the SPECIFIC LOCALITY/SUBURB (e.g., Mosman, Palm Beach, Yarra Valley) and broader region
```

### 2. Instagram Discovery

Discoveries are tagged with locality:

```typescript
interface DiscoveredVenue {
  name: string
  locality: string           // NEW
  city: string
  region: string            // NEW
  country: string           // NEW
  // ... other fields
}
```

### 3. Location Data Model

Updated Flutter models:

```dart
class LocationData {
  final String? locality;   // NEW
  final String city;
  final String? region;     // NEW
  final String country;     // NEW (default: Australia)

  String get shortAddress {
    if (locality != null) {
      return '$locality, $city';
    }
    return '$city, $state';
  }

  String get detailedAddress {
    // Returns: "Mosman, Sydney, North Shore, NSW"
  }
}
```

---

## 🎯 Search & Filtering

### Filter Priority

Searches prioritize in this order:
1. **Locality** (most specific) → `locality = 'Mosman'`
2. **Region** (medium) → `region = 'Northern Beaches'`
3. **City** (broad) → `city = 'Sydney'`
4. **Country** (broadest) → `country = 'Australia'`

### Search Filters

```dart
SearchFilters(
  locality: 'Mosman',          // Filter by suburb
  region: 'Northern Beaches',  // Or by region
  country: 'Australia',        // Always specified
)
```

### Supabase Query

```dart
// Priority filtering
if (filters.locality != null) {
  query = query.eq('locality', filters.locality);
} else if (filters.region != null) {
  query = query.eq('region', filters.region);
} else if (filters.location != null) {
  query = query.ilike('location_data->>city', '%${filters.location}%');
}

if (filters.country != null) {
  query = query.eq('country', filters.country);
}
```

---

## 📱 UI Display

### Venue Cards

**Short Address:**
```
Mosman, Sydney
```

**Detailed Address:**
```
Mosman, Sydney, North Shore, NSW
```

### Filter Screen

New locality filters:
- Popular Localities dropdown
- Region selector
- City selector

### Popular Localities

Access predefined popular areas:
```dart
class PopularLocalities {
  static const sydney = [
    'Mosman',
    'Manly',
    'Palm Beach',
    'The Rocks',
  ];

  static const regions = [
    'Hunter Valley',
    'Yarra Valley',
    'Blue Mountains',
    'Byron Bay',
  ];
}
```

---

## 🤖 Automation Impact

### Discovery Pipeline

```
Instagram Search
  ↓
"Find trending venues in Sydney"
  ↓
Results tagged with:
  - locality: "Mosman"
  - region: "North Shore"
  - city: "Sydney"
  - state: "NSW"
  - country: "Australia"
```

### Morning Pipeline

**Enhanced discovery prompt:**
```
Specify the LOCALITY/SUBURB (e.g., Mosman, Yarra Valley)
and broader region for each discovery
```

**Output:**
```json
{
  "name": "Gunners Barracks",
  "locality": "Mosman",
  "city": "Sydney",
  "region": "North Shore",
  "country": "Australia",
  "why_trending": "Featured in 50+ recent weddings..."
}
```

---

## 📈 Popular Localities View

Query popular areas with venue counts:

```sql
SELECT * FROM popular_localities
ORDER BY actual_venue_count DESC;
```

**Returns:**
```
| name         | city      | region           | venue_count |
|--------------|-----------|------------------|-------------|
| Yarra Valley | Melbourne | Yarra Valley     | 42          |
| Mosman       | Sydney    | North Shore      | 38          |
| Palm Beach   | Sydney    | Northern Beaches | 29          |
| Byron Bay    | Byron Bay | North Coast      | 26          |
```

---

## 🌏 Multi-Country Support

### Ready for International Expansion

**Current:**
```sql
country TEXT DEFAULT 'Australia'
```

**Future expansion:**
```dart
SearchFilters(
  country: 'New Zealand',
  city: 'Queenstown',
  locality: 'Arrowtown',
)
```

**Database remains the same**, just change default country when expanding.

---

## 📝 Example Data Flow

### 1. Research Request
```bash
./admin/cli.ts research \
  --name "Gunners Barracks" \
  --location "Mosman, Sydney"
```

### 2. Perplexity Research
```json
{
  "title": "Gunners Barracks",
  "address": "End of Suakin Drive",
  "locality": "Mosman",
  "city": "Sydney",
  "state": "NSW",
  "region": "North Shore",
  "country": "Australia",
  // ... other fields
}
```

### 3. Database Storage
```sql
INSERT INTO listings (
  title,
  locality,
  region,
  country,
  location_data
) VALUES (
  'Gunners Barracks',
  'Mosman',
  'North Shore',
  'Australia',
  '{"city": "Sydney", "state": "NSW", ...}'
);
```

### 4. Search Query
```dart
// User searches for "Mosman venues"
final venues = await supabase
  .searchVenues(
    SearchFilters(locality: 'Mosman')
  );
```

### 5. Display
```
📍 Gunners Barracks
   Mosman, Sydney
   North Shore region
   ⭐ 4.9 (127 reviews)
```

---

## 🔄 Migration

Run the migration to add locality columns:

```bash
supabase db push
```

**Migration file:** `003_add_locality_tagging.sql`

**What it does:**
1. Adds `locality`, `region`, `country` columns to `listings`
2. Adds same columns to `discovered_venues`
3. Creates `localities` table
4. Pre-populates 30+ popular Australian localities
5. Creates indexes for fast filtering
6. Adds helper functions and views

---

## 📊 Benefits

### For Users
- ✅ More precise location filtering
- ✅ Discover venues in specific suburbs
- ✅ Browse by popular regions
- ✅ Better local recommendations

### For Discovery
- ✅ Instagram results tagged by locality
- ✅ Region-specific trending insights
- ✅ Better geographic distribution

### For Search
- ✅ Fast locality-based queries
- ✅ Hierarchical filtering (locality → region → city)
- ✅ Scalable to multiple countries

### For Analytics
- ✅ Track popular localities
- ✅ Venue density by suburb
- ✅ Regional trends

---

## 🎓 Best Practices

### When Researching Venues

**Good:**
```
locality: "Mosman"
region: "North Shore"
```

**Bad:**
```
locality: "Sydney"  // Too broad, use city instead
region: "NSW"       // Too broad, use state instead
```

### When Filtering

**Specific search:**
```dart
SearchFilters(locality: 'Mosman')
// Returns only Mosman venues
```

**Regional search:**
```dart
SearchFilters(region: 'Northern Beaches')
// Returns: Palm Beach, Manly, etc.
```

**Broad search:**
```dart
SearchFilters(location: 'Sydney')
// Returns all Sydney venues
```

---

## 📍 Locality Examples

### Sydney Localities
- **Eastern Suburbs**: Paddington, Double Bay, Bondi
- **North Shore**: Mosman, Neutral Bay, Chatswood
- **Northern Beaches**: Manly, Palm Beach, Avalon
- **Inner West**: Newtown, Leichhardt, Glebe
- **CBD**: The Rocks, Circular Quay, Darling Harbour

### Melbourne Localities
- **Bayside**: St Kilda, Brighton, Elwood
- **Inner City**: South Yarra, Fitzroy, Carlton
- **East**: Hawthorn, Kew, Camberwell

### Regions
- **Wine Regions**: Hunter Valley, Yarra Valley, Barossa Valley
- **Coastal**: Byron Bay, Gold Coast, Sunshine Coast
- **Mountain**: Blue Mountains, Dandenong Ranges
- **Rural**: Southern Highlands, Mornington Peninsula

---

**Status:** ✅ Fully Implemented
**Migration:** 003_add_locality_tagging.sql
**Countries Supported:** Australia (expandable)
**Localities:** 30+ predefined popular areas
