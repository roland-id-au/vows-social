# Vows Social - SEO Permalink Scheme

## Overview

This document defines the URL permalink structure for all vendor types on Vows Social, optimized for SEO, user experience, and internationalization.

## Permalink Format

### General Pattern
```
/[vendor-category]/[country-code]-wedding-[vendor-type]-[location]-[business-name-slug]
```

### Components

1. **Vendor Category** (Route Segment)
   - The base route for the vendor type
   - Examples: `venues`, `photographers`, `caterers`, `florists`

2. **Country Code** (2 letters, lowercase)
   - ISO 3166-1 alpha-2 country codes
   - Examples: `au` (Australia), `us` (USA), `uk` (United Kingdom), `ca` (Canada), `nz` (New Zealand)

3. **Vendor Type** (Descriptive keyword)
   - Singular form, hyphenated if multi-word
   - Always includes "wedding" prefix for SEO
   - Examples: `venue`, `photographer`, `caterer`, `florist`, `makeup-artist`

4. **Location** (City/Region, lowercase, hyphenated)
   - Primary city or region where vendor operates
   - Normalized: lowercase, alphanumeric + hyphens only
   - Examples: `sydney`, `new-york`, `los-angeles`, `london`

5. **Business Name Slug** (Unique identifier, lowercase, hyphenated)
   - Derived from business name or existing slug in database
   - Normalized: lowercase, alphanumeric + hyphens only
   - Must be unique within location+vendor-type combination
   - Examples: `establishment-ballroom`, `joes-pizza-catering`, `blooms-by-sarah`

## Vendor Type Specifications

### 1. Venues
```
/venues/[country-code]-wedding-venue-[location]-[venue-slug]

Examples:
- /venues/au-wedding-venue-sydney-establishment-ballroom
- /venues/us-wedding-venue-new-york-central-park-boathouse
- /venues/uk-wedding-venue-london-kew-gardens
```

**SEO Keywords**: wedding venue [location], [location] wedding venues, event space [location]

---

### 2. Photographers
```
/photographers/[country-code]-wedding-photographer-[location]-[business-slug]

Examples:
- /photographers/au-wedding-photographer-melbourne-captured-moments
- /photographers/us-wedding-photographer-san-francisco-golden-gate-photo
- /photographers/nz-wedding-photographer-auckland-perfect-light-studios
```

**SEO Keywords**: wedding photographer [location], [location] wedding photography, professional wedding photos

---

### 3. Videographers
```
/videographers/[country-code]-wedding-videographer-[location]-[business-slug]

Examples:
- /videographers/au-wedding-videographer-brisbane-cinematic-weddings
- /videographers/us-wedding-videographer-austin-texas-vows-on-film
- /videographers/ca-wedding-videographer-toronto-love-story-films
```

**SEO Keywords**: wedding videographer [location], [location] wedding films, cinematic wedding videos

---

### 4. Caterers
```
/caterers/[country-code]-wedding-caterer-[location]-[business-slug]

Examples:
- /caterers/au-wedding-caterer-perth-gourmet-weddings
- /caterers/us-wedding-caterer-chicago-delicious-affairs
- /caterers/uk-wedding-caterer-edinburgh-scottish-feasts
```

**SEO Keywords**: wedding catering [location], [location] wedding caterer, reception catering

---

### 5. Florists
```
/florists/[country-code]-wedding-florist-[location]-[business-slug]

Examples:
- /florists/au-wedding-florist-adelaide-blooms-and-blossoms
- /florists/us-wedding-florist-portland-petals-and-stems
- /florists/nz-wedding-florist-wellington-wild-flower-co
```

**SEO Keywords**: wedding florist [location], [location] wedding flowers, bridal bouquets

---

### 6. Makeup Artists
```
/makeup-artists/[country-code]-wedding-makeup-artist-[location]-[business-slug]

Examples:
- /makeup-artists/au-wedding-makeup-artist-sydney-bridal-beauty-co
- /makeup-artists/us-wedding-makeup-artist-miami-glamour-brides
- /makeup-artists/uk-wedding-makeup-artist-manchester-perfect-face-studios
```

**SEO Keywords**: wedding makeup artist [location], bridal makeup [location], professional wedding makeup

---

### 7. Hair Stylists
```
/hair-stylists/[country-code]-wedding-hair-stylist-[location]-[business-slug]

Examples:
- /hair-stylists/au-wedding-hair-stylist-gold-coast-elegant-locks
- /hair-stylists/us-wedding-hair-stylist-nashville-southern-charm-hair
- /hair-stylists/ca-wedding-hair-stylist-vancouver-updo-artists
```

**SEO Keywords**: wedding hair stylist [location], bridal hair [location], updo specialist

---

### 8. DJs / Entertainment
```
/djs/[country-code]-wedding-dj-[location]-[business-slug]

Examples:
- /djs/au-wedding-dj-canberra-party-beats
- /djs/us-wedding-dj-las-vegas-spinning-love
- /djs/uk-wedding-dj-birmingham-ultimate-entertainment
```

**SEO Keywords**: wedding DJ [location], [location] wedding entertainment, party DJ

---

### 9. Bands
```
/bands/[country-code]-wedding-band-[location]-[business-slug]

Examples:
- /bands/au-wedding-band-hobart-the-love-notes
- /bands/us-wedding-band-boston-jazz-wedding-collective
- /bands/ie-wedding-band-dublin-celtic-celebrations
```

**SEO Keywords**: wedding band [location], live music wedding [location], wedding musicians

---

### 10. Celebrants / Officiants
```
/celebrants/[country-code]-wedding-celebrant-[location]-[business-slug]

Examples:
- /celebrants/au-wedding-celebrant-newcastle-ceremonies-by-sarah
- /celebrants/us-wedding-officiant-seattle-sacred-vows
- /celebrants/nz-wedding-celebrant-christchurch-kiwi-ceremonies
```

**SEO Keywords**: wedding celebrant [location], marriage celebrant [location], wedding officiant

---

### 11. Cake Designers
```
/cake-designers/[country-code]-wedding-cake-designer-[location]-[business-slug]

Examples:
- /cake-designers/au-wedding-cake-designer-brisbane-sweet-celebrations
- /cake-designers/us-wedding-cake-designer-new-orleans-sugar-and-spice
- /cake-designers/uk-wedding-cake-designer-cambridge-royal-cakes
```

**SEO Keywords**: wedding cake designer [location], custom wedding cakes [location], wedding cake maker

---

### 12. Invitations & Stationery
```
/stationery/[country-code]-wedding-stationery-[location]-[business-slug]

Examples:
- /stationery/au-wedding-stationery-melbourne-paper-and-pen
- /stationery/us-wedding-stationery-brooklyn-artisan-invites
- /stationery/ca-wedding-stationery-montreal-elegant-paperie
```

**SEO Keywords**: wedding invitations [location], custom wedding stationery [location], save the dates

---

### 13. Decorators / Stylists
```
/decorators/[country-code]-wedding-decorator-[location]-[business-slug]

Examples:
- /decorators/au-wedding-decorator-darwin-tropical-weddings
- /decorators/us-wedding-decorator-aspen-mountain-elegance
- /decorators/uk-wedding-decorator-brighton-coastal-styling
```

**SEO Keywords**: wedding decorator [location], wedding stylist [location], event styling

---

### 14. Transport / Cars
```
/transport/[country-code]-wedding-transport-[location]-[business-slug]

Examples:
- /transport/au-wedding-transport-adelaide-classic-car-hire
- /transport/us-wedding-transport-charleston-vintage-rides
- /transport/uk-wedding-transport-oxford-luxury-wedding-cars
```

**SEO Keywords**: wedding car hire [location], wedding transport [location], bridal cars

---

### 15. Planners / Coordinators
```
/planners/[country-code]-wedding-planner-[location]-[business-slug]

Examples:
- /planners/au-wedding-planner-sunshine-coast-dream-day-planners
- /planners/us-wedding-planner-santa-barbara-coastal-wedding-co
- /planners/ca-wedding-planner-calgary-mountain-wedding-planners
```

**SEO Keywords**: wedding planner [location], [location] wedding coordinator, professional wedding planning

## SEO Best Practices

### 1. **Keyword-Rich URLs**
- Every URL contains "wedding" + vendor type + location
- Targets long-tail SEO: "wedding venue sydney", "sydney wedding photographer"
- Natural language patterns improve voice search rankings

### 2. **Geographic Targeting**
- Country codes enable international SEO
- City names target local search intent
- Supports multi-location businesses with unique pages per city

### 3. **Human-Readable**
- URLs are descriptive and self-explanatory
- Easy to read, share, and remember
- No UUID or database IDs visible

### 4. **Future-Proof**
- Consistent pattern across all vendor types
- Easy to extend to new vendor categories
- Supports URL versioning if needed

### 5. **URL Length**
- Typically 60-80 characters (optimal for SEO)
- Under 100 characters in most cases
- Balance between descriptiveness and brevity

## Implementation Notes

### Database Schema

The system uses the existing `listings` table with:
- `slug`: Original business slug (e.g., "establishment-ballroom")
- `category`: Vendor type (e.g., "venue", "photographer")
- `location_data`: JSON containing city, state, country
- `service_type`: Maps to vendor category route

The permalink is **generated dynamically** from these fields rather than stored, ensuring consistency and avoiding data duplication.

### Slug Generation Rules

```typescript
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')       // Remove leading/trailing hyphens
    .substring(0, 100);             // Limit to 100 characters
}
```

### Fallback Strategy

The system supports **three levels of fallback** for backward compatibility:

1. **New permalink format**: `/venues/au-wedding-venue-sydney-establishment-ballroom`
2. **Old slug format**: `/venues/establishment-ballroom`
3. **UUID format** (for very old links): `/venues/ba44aa42-b2c7-4cc9-b0bd-c3ffff9ee70a`

This ensures existing links don't break during migration.

### Redirects (Recommended)

For optimal SEO, implement 301 redirects:
```
/venues/establishment-ballroom
  → 301 →
/venues/au-wedding-venue-sydney-establishment-ballroom
```

This preserves link equity and prevents duplicate content penalties.

## Examples in Context

### Venue Detail Page
```
URL: /venues/au-wedding-venue-sydney-establishment-ballroom

Title: Establishment Ballroom - Wedding Venue in Sydney, Australia
Meta Description: Book Establishment Ballroom for your Sydney wedding. Elegant CBD venue accommodating 144-400 guests. View photos, pricing & availability.
H1: Establishment Ballroom | Sydney Wedding Venue
```

### Photographer Profile
```
URL: /photographers/us-wedding-photographer-brooklyn-artistic-lens

Title: Artistic Lens - Brooklyn Wedding Photographer | New York
Meta Description: Award-winning Brooklyn wedding photographer specializing in candid, artistic wedding photography. View portfolio & book your NYC wedding photos.
H1: Artistic Lens | Brooklyn Wedding Photographer
```

### Caterer Listing
```
URL: /caterers/ca-wedding-caterer-toronto-gourmet-affairs

Title: Gourmet Affairs - Toronto Wedding Catering Services
Meta Description: Premium wedding catering in Toronto. Custom menus, professional service, and unforgettable dining experiences for your special day.
H1: Gourmet Affairs | Toronto Wedding Caterer
```

## Analytics & Tracking

### URL Parameters (Preserve for tracking)
```
/venues/au-wedding-venue-sydney-establishment-ballroom?utm_source=google&utm_campaign=sydney-venues
```

### Canonical URLs
Always use the full, new-format permalink as the canonical URL in meta tags:
```html
<link rel="canonical" href="https://vows.social/venues/au-wedding-venue-sydney-establishment-ballroom" />
```

## Internationalization (i18n)

### Future Support for Multiple Languages
```
/en/venues/au-wedding-venue-sydney-establishment-ballroom
/es/locales/au-salon-de-bodas-sydney-establishment-ballroom
/fr/salles/au-salle-de-mariage-sydney-establishment-ballroom
```

Country code remains consistent across languages for geographic targeting.

## Directory/Category Pages

### City Pages
```
/venues/au-wedding-venues-sydney
/photographers/us-wedding-photographers-new-york
/caterers/uk-wedding-caterers-london
```

### Country Pages
```
/venues/au-wedding-venues
/photographers/us-wedding-photographers
```

### All Vendors
```
/venues/wedding-venues
/photographers/wedding-photographers
```

## Schema.org Markup

Add structured data to venue pages:
```json
{
  "@context": "https://schema.org",
  "@type": "EventVenue",
  "name": "Establishment Ballroom",
  "url": "https://vows.social/venues/au-wedding-venue-sydney-establishment-ballroom",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "252 George Street",
    "addressLocality": "Sydney",
    "addressRegion": "NSW",
    "postalCode": "2000",
    "addressCountry": "AU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "-33.8688",
    "longitude": "151.2093"
  }
}
```

## Validation & Testing

### URL Format Validator
```regex
^/[a-z-]+/[a-z]{2}-wedding-[a-z-]+(-[a-z-]+)*-[a-z-]+(-[a-z0-9-]+)*$
```

### Examples (Valid ✓)
```
✓ /venues/au-wedding-venue-sydney-establishment-ballroom
✓ /photographers/us-wedding-photographer-new-york-joes-photos
✓ /makeup-artists/uk-wedding-makeup-artist-london-glam-squad
```

### Examples (Invalid ✗)
```
✗ /venues/AU-wedding-venue-Sydney-Establishment  (capitals)
✗ /venues/wedding-venue-sydney-establishment      (missing country code)
✗ /venues/au_wedding_venue_sydney_establishment   (underscores)
```

## Migration Checklist

- [ ] Update `generateVenuePermalink()` function in `supabase-service.ts`
- [ ] Update `VenueCard` component to use new permalink
- [ ] Update venue detail page to parse new permalink format
- [ ] Implement fallback logic for old URLs
- [ ] Set up 301 redirects from old to new URLs
- [ ] Update sitemap.xml with new URL format
- [ ] Update social sharing meta tags
- [ ] Test all vendor type permalinks
- [ ] Update analytics tracking
- [ ] Monitor search console for 404 errors

## Maintenance

### Adding New Vendor Types

1. Add vendor type to country code mapper (if needed)
2. Create route: `/app/[vendor-type]/[id]/page.tsx`
3. Update `generatePermalink()` function with vendor-specific logic
4. Add to this documentation
5. Create category page for new vendor type
6. Update sitemap generation

### Monitoring

- Track 404 errors in analytics
- Monitor organic search traffic by vendor type
- Analyze click-through rates from search results
- Review Google Search Console for indexing issues

---

**Last Updated**: 2025-10-08
**Version**: 1.0
**Author**: Vows Social Development Team
