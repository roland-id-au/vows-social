# Product Requirements Document: The Vow Society

## 1. Executive Summary

### 1.1 Product Vision
The Vow Society is a mobile-first marketplace connecting couples with wedding venues, catering services, and experiences across Australia. The platform aggregates listings from multiple sources (Airbnb, vendor databases, social media) to provide comprehensive, up-to-date wedding service options.

### 1.2 Target Market
- **Primary**: Engaged couples in Australia planning weddings
- **Secondary**: Wedding planners, coordinators, and event organizers
- **Initial Launch**: Major Australian cities (Sydney, Melbourne, Brisbane, Perth)

### 1.3 Key Differentiators
- Automated data aggregation from multiple sources
- Real-time availability and pricing
- Instagram integration for location discovery and social proof
- Wedding-specific search filters and recommendations
- Unified booking experience across multiple vendors

---

## 2. Product Overview

### 2.1 Core Value Proposition
Simplify wedding planning by providing a single platform to discover, compare, and book venues, catering, and experiences with real-time data aggregation and social validation.

### 2.2 Success Metrics
- **Acquisition**: 10,000+ downloads in first 6 months
- **Engagement**: 65% of users save 3+ listings
- **Conversion**: 15% booking inquiry rate
- **Retention**: 40% return rate for additional services
- **Data Quality**: 90% listing accuracy, <24hr data refresh

---

## 3. User Personas

### 3.1 Primary Persona: Sarah & James
- **Demographics**: 28-32 years old, urban professionals
- **Planning Stage**: 6-12 months before wedding
- **Pain Points**: Overwhelmed by options, inconsistent pricing, outdated information
- **Goals**: Find unique venues, compare packages, read authentic reviews
- **Tech Savvy**: High, prefers mobile-first experiences

### 3.2 Secondary Persona: Professional Wedding Planner
- **Demographics**: 30-45 years old, event industry professional
- **Use Case**: Sourcing options for multiple clients
- **Pain Points**: Manual vendor research, availability checking
- **Goals**: Efficient vendor discovery, relationship management
- **Needs**: Bulk inquiry capabilities, saved preferences

---

## 4. Functional Requirements

### 4.1 Mobile Application (iOS & Android)

#### 4.1.1 Discovery & Search
- **Location-based search**: Map view with radius filtering
- **Category filters**:
  - Venues (indoor/outdoor, capacity, style)
  - Catering (cuisine type, service style, dietary options)
  - Experiences (photography, entertainment, transport)
- **Date-based availability**: Calendar integration
- **Price range filters**: Budget brackets (AU$)
- **Guest count filtering**: Capacity matching
- **Style/theme tags**: Modern, rustic, beachfront, garden, etc.
- **Instagram integration**: View recent location-tagged posts
- **Trending/Popular**: Algorithm-based recommendations

#### 4.1.2 Listing Details
- **Rich media gallery**: Photos, videos, 360° tours
- **Instagram feed**: Recent posts from location
- **Pricing transparency**: Base rates, package options, add-ons
- **Availability calendar**: Real-time booking status
- **Detailed specifications**:
  - Venue: capacity, amenities, restrictions, parking
  - Catering: menus, serving options, min/max guests
  - Experiences: duration, inclusions, customization
- **Reviews & ratings**: User-generated and aggregated from sources
- **Vendor profile**: Bio, portfolio, credentials
- **Similar listings**: AI-powered recommendations

#### 4.1.3 User Engagement
- **Save/Favorites**: Create collections and boards
- **Comparison tool**: Side-by-side comparison (up to 4 listings)
- **Inquiry/Contact**: In-app messaging with vendors
- **Booking requests**: Date holds and reservation requests
- **Shareable links**: Collaborate with partner/family
- **Notes & tags**: Personal annotations on listings
- **Budget tracker**: Running total of selected services

#### 4.1.4 User Profile & Settings
- **Wedding details**: Date, location, guest count, budget
- **Preferences**: Style preferences, must-haves, deal-breakers
- **Saved searches**: Persistent search filters
- **Notification preferences**: New listings, price drops, messages
- **Account management**: Login (email, Google, Apple Sign-In)

#### 4.1.5 Additional Features
- **Push notifications**: New matches, vendor responses, reminders
- **Offline mode**: View saved listings without connection
- **Sharing**: Export PDFs, share via messaging apps
- **Checklist integration**: Wedding planning timeline

### 4.2 API Backend

#### 4.2.1 Data Aggregation Engine
**Sources**:
1. **Airbnb API Integration**
   - Pull venue listings suitable for events
   - Extract: photos, pricing, availability, reviews, location
   - Filter: Properties with event/wedding permissions

2. **Instagram Graph API**
   - Scan location-tagged posts
   - Extract: Recent photos, hashtags, engagement metrics
   - Identify trending wedding locations
   - Pull venue social proof metrics

3. **Vendor APIs/Partnerships**
   - Direct integrations with Australian wedding vendors
   - EasyWeddings, Wedding Wire AU data feeds

4. **Web Scraping (where permitted)**
   - Public wedding venue directories
   - Catering company websites
   - Government venue registries

**Data Processing Pipeline**:
- **Scheduling**: Cron jobs for periodic data refresh
  - Airbnb: Daily sync for availability/pricing
  - Instagram: Every 6 hours for trending locations
  - Vendor APIs: Real-time webhooks where available
- **Deduplication**: ML-based matching to prevent duplicate listings
- **Normalization**: Standardize data schema across sources
- **Enrichment**: Geocoding, categorization, sentiment analysis on reviews
- **Quality checks**: Automated validation (pricing anomalies, broken images)

#### 4.2.2 Core API Endpoints

**Listing Management**:
```
GET /api/v1/listings
  - Query params: location, category, date, price_range, capacity, tags
  - Returns: Paginated listing results with relevance scoring

GET /api/v1/listings/{id}
  - Returns: Full listing details with aggregated data

GET /api/v1/listings/{id}/availability
  - Params: start_date, end_date
  - Returns: Calendar availability status

GET /api/v1/listings/{id}/instagram
  - Returns: Recent Instagram posts for location
```

**Search & Discovery**:
```
GET /api/v1/search
  - Advanced search with multiple filters
  - Returns: Ranked results with ML-based relevance

GET /api/v1/search/suggestions
  - Returns: Autocomplete suggestions

GET /api/v1/trending
  - Returns: Popular venues based on searches, saves, Instagram activity
```

**User Management**:
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/users/profile
PUT /api/v1/users/profile
GET /api/v1/users/favorites
POST /api/v1/users/favorites/{listing_id}
DELETE /api/v1/users/favorites/{listing_id}
```

**Inquiries & Bookings**:
```
POST /api/v1/inquiries
  - Create inquiry to vendor

GET /api/v1/inquiries
  - User's inquiry history

POST /api/v1/bookings/request
  - Request booking hold
```

**Analytics & Tracking**:
```
POST /api/v1/events/track
  - Track user interactions for recommendations

GET /api/v1/analytics/insights
  - Return personalized insights (price trends, booking timeline)
```

#### 4.2.3 Database Schema

**Core Tables**:
- **listings**: id, source_id, source_type, title, description, category, subcategory, location_data, price_data, capacity, created_at, updated_at
- **listing_media**: id, listing_id, media_type, url, source, order
- **listing_availability**: id, listing_id, date, status, last_synced
- **vendors**: id, name, bio, contact_info, verification_status
- **users**: id, email, password_hash, wedding_date, guest_count, budget
- **favorites**: id, user_id, listing_id, created_at
- **inquiries**: id, user_id, listing_id, message, status, created_at
- **reviews**: id, listing_id, user_id, rating, text, source
- **instagram_posts**: id, listing_id, post_id, image_url, caption, likes, posted_at
- **sync_logs**: id, source, status, records_processed, errors, timestamp

**Indexing Strategy**:
- Geospatial indexes on location data
- Full-text search on title, description, tags
- Compound indexes on category + location + date

#### 4.2.4 Technical Architecture
- **Backend Platform**: Supabase
  - **Database**: PostgreSQL (built-in with Supabase)
  - **Authentication**: Supabase Auth (email, OAuth providers)
  - **Storage**: Supabase Storage for media files
  - **Real-time**: Supabase Realtime for live updates
  - **Edge Functions**: Supabase Edge Functions for data aggregation logic
- **Additional Services**:
  - **Search**: PostgreSQL full-text search or Algolia integration
  - **Caching**: Supabase built-in caching + Redis if needed
  - **Queue System**: Supabase Edge Functions + pg_cron for scheduled jobs
  - **CDN**: Supabase CDN for media delivery
- **Data Aggregation**: Node.js/TypeScript services deployed as Edge Functions
- **Monitoring**: Supabase Analytics + Sentry for error tracking

#### 4.2.5 Data Aggregation Workflows

**Airbnb Sync Workflow**:
1. Query Airbnb API for event-friendly properties in AU regions
2. Filter results based on wedding criteria (capacity, event permissions)
3. Transform data to internal schema
4. Check for existing listings (dedupe)
5. Update or create listing records
6. Sync availability calendar
7. Log sync results

**Instagram Discovery Workflow**:
1. Query Instagram Graph API for location tags
2. Identify high-engagement wedding-related posts
3. Match locations to existing venue listings
4. Store post data with listing association
5. Calculate social proof metrics
6. Update trending scores

**Data Quality Workflow**:
1. Scheduled validation checks on all listings
2. Flag outdated data (>7 days old for critical fields)
3. Attempt automatic refresh from source
4. Mark problematic listings for manual review
5. Send alerts for sync failures

---

## 5. Non-Functional Requirements

### 5.1 Performance
- App launch: <3 seconds
- Search results: <2 seconds
- Listing detail load: <1.5 seconds
- Image loading: Progressive, lazy-loaded
- API response time: p95 <500ms

### 5.2 Scalability
- Support 100,000+ concurrent users
- Handle 10,000+ listings at launch, scale to 100,000+
- Data sync processing: 50,000+ listings per hour

### 5.3 Security
- HTTPS/TLS encryption for all API calls
- OAuth 2.0 for authentication
- PII data encryption at rest
- GDPR/Australian Privacy Act compliance
- Rate limiting to prevent abuse
- API key rotation for external services

### 5.4 Reliability
- 99.9% uptime SLA
- Automated failover for critical services
- Daily database backups
- Graceful degradation if external APIs fail

### 5.5 Localization
- Australian English (AU)
- Currency: AUD
- Date format: DD/MM/YYYY
- Metric system

---

## 6. User Stories

### 6.1 Discovery
- As a bride, I want to search for outdoor venues within 50km of Sydney that accommodate 100-150 guests, so I can find options near my preferred location
- As a couple, I want to see recent Instagram photos from a venue, so I can see real wedding photos beyond professional marketing shots
- As a user, I want to filter catering by dietary restrictions (vegan, halal, gluten-free), so I can accommodate my guests' needs

### 6.2 Comparison & Decision
- As a groom, I want to save my favorite venues to a board, so I can share them with my partner for discussion
- As a couple, I want to compare pricing packages side-by-side, so I can make an informed budget decision
- As a user, I want to see availability for my wedding date, so I don't waste time on unavailable options

### 6.3 Engagement & Booking
- As a bride, I want to send inquiries to multiple vendors at once, so I can efficiently get quotes
- As a user, I want to track my total estimated budget across selected services, so I can stay within budget
- As a couple, I want to request a site visit directly through the app, so I can expedite the planning process

---

## 7. Technical Considerations

### 7.1 Data Sourcing Challenges
- **Airbnb API limitations**: Rate limits, restricted event property data
- **Instagram API**: Graph API access requires business verification, limited public data
- **Data freshness**: Balance sync frequency with API costs/limits
- **Legal compliance**: Respect robots.txt, terms of service for scraping

### 7.2 Recommendations
- Pursue official partnerships with Airbnb, EasyWeddings, and major vendor platforms
- Implement manual vendor onboarding as primary source initially
- Use Instagram Business API through verified business account
- Build direct vendor submission portal with incentives

### 7.3 Mobile Tech Stack
- **Framework**: Flutter (cross-platform for iOS & Android)
- **State Management**: Riverpod or Bloc
- **Mapping**: Google Maps Flutter plugin
- **Analytics**: Firebase Analytics
- **Crash Reporting**: Sentry or Firebase Crashlytics
- **Push Notifications**: Firebase Cloud Messaging

---

## 8. Launch Strategy

### 8.1 MVP Scope (Months 1-3)
- iOS app only (target Sydney/Melbourne)
- Manual vendor onboarding (50-100 curated listings)
- Basic search and filtering
- Instagram public feed integration (no API required)
- Inquiry submission (email forwarding)
- No direct booking, availability calendar

### 8.2 Phase 2 (Months 4-6)
- Android app launch
- Expand to Brisbane, Perth
- Airbnb integration (if partnership secured)
- Real-time availability syncing
- In-app messaging with vendors
- Advanced filters and recommendations
- 500+ listings

### 8.3 Phase 3 (Months 7-12)
- Full Instagram Graph API integration
- Direct booking capabilities
- Payment processing
- Vendor dashboard/portal
- Wedding planner tools
- National coverage (all AU markets)
- 2,000+ listings

---

## 9. Success Criteria

### 9.1 Launch Metrics (First 6 Months)
- 10,000+ app downloads
- 500+ active listings
- 1,000+ saved favorites
- 200+ vendor inquiries sent
- 4.0+ app store rating

### 9.2 Business Metrics (Year 1)
- 50,000+ total users
- 2,000+ active listings
- 500+ bookings facilitated
- 20% month-over-month user growth
- Partnership agreements with 3+ major data sources

---

## 10. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API access denied (Airbnb, Instagram) | High | Medium | Build manual vendor onboarding, pursue partnerships early |
| Data quality issues | High | High | Implement robust validation, manual curation for MVP |
| Low vendor adoption | High | Medium | Offer free listings initially, demonstrate user traction |
| User acquisition challenges | Medium | Medium | Partner with wedding blogs, influencer marketing |
| Competition from established players | Medium | High | Focus on superior UX, real-time data, Instagram integration |
| Regulatory compliance (booking/payments) | Medium | Low | Legal review, use licensed payment processors |

---

## 11. Future Enhancements

- AI-powered venue recommendations based on style preferences
- AR venue visualization
- Budget optimization tools
- Integrated guest management
- Review system with photo uploads
- Vendor CRM features
- Subscription tiers for premium features
- Expansion to New Zealand market
- Corporate events and private functions