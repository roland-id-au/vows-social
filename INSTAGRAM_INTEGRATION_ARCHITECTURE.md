# Instagram Graph API Integration Architecture

## Overview
Comprehensive Instagram integration to create a dynamic, algorithmically-curated feed of wedding content with vendor discovery, theme tracking, and personalized notifications.

## Goals

1. **Vendor Monitoring**: Track existing vendors' Instagram for new posts/updates
2. **Discovery**: Find new trending vendors from wedding posts by locality
3. **Theme Analysis**: Identify trending wedding themes, styles, and aesthetics
4. **Feed Generation**: Build Instagram-style algorithmic feed for users
5. **Push Notifications**: Alert users to new relevant content
6. **Real-time Updates**: Keep content fresh with automated daily syncs

## Instagram Graph API Capabilities

### What We Can Access

**Business/Creator Accounts (with authorization):**
- Media (posts, reels, stories)
- Captions, hashtags, mentions
- Media insights (reach, engagement, impressions)
- Comments and replies
- Account insights

**Hashtag Search:**
- Recent media by hashtag
- Top media by hashtag
- Hashtag search (limited to business accounts)

**Location Search:**
- Media by location ID
- Locations by geographic coordinates

**Limitations:**
- Requires Instagram Business/Creator account authorization
- Rate limits: 200 calls per hour per user
- Hashtag search limited to own business account or authorized accounts
- Cannot access private accounts
- Stories expire after 24 hours

### Alternative: Instagram Basic Display API

For simpler use cases:
- User's own media only
- No hashtag search
- No location search
- Simpler OAuth flow

## Database Schema

### 1. Instagram Accounts Table

```sql
CREATE TABLE instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Account details
  instagram_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  account_type TEXT, -- 'BUSINESS', 'CREATOR', 'PERSONAL'
  
  -- Linked to vendor
  listing_id UUID REFERENCES listings(id),
  
  -- Metrics
  followers_count INTEGER,
  following_count INTEGER,
  media_count INTEGER,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active', -- 'active', 'paused', 'error'
  sync_error TEXT,
  
  -- Authorization (if we have access token)
  has_access_token BOOLEAN DEFAULT false,
  access_token_expires_at TIMESTAMPTZ,
  
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('active', 'paused', 'error'))
);

CREATE INDEX idx_instagram_accounts_listing_id ON instagram_accounts(listing_id);
CREATE INDEX idx_instagram_accounts_last_synced ON instagram_accounts(last_synced_at);
CREATE INDEX idx_instagram_accounts_username ON instagram_accounts(username);
```

### 2. Instagram Posts Table

```sql
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Instagram data
  instagram_media_id TEXT UNIQUE NOT NULL,
  instagram_account_id UUID REFERENCES instagram_accounts(id),
  
  -- Post details
  media_type TEXT NOT NULL, -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  caption TEXT,
  
  -- Metadata
  posted_at TIMESTAMPTZ NOT NULL,
  hashtags TEXT[],
  mentions TEXT[],
  location_name TEXT,
  location_id TEXT,
  
  -- Engagement metrics
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Wedding relevance
  is_wedding_related BOOLEAN DEFAULT true,
  wedding_type TEXT[], -- 'ceremony', 'reception', 'styled_shoot', 'real_wedding'
  detected_themes TEXT[], -- 'boho', 'minimalist', 'rustic', 'modern', etc.
  detected_vendors TEXT[], -- Mentioned vendor names
  
  -- Locality
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Australia',
  
  -- Discovery source
  discovered_via TEXT, -- 'vendor_sync', 'hashtag_search', 'location_search'
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_media_type CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'))
);

CREATE INDEX idx_instagram_posts_account ON instagram_posts(instagram_account_id);
CREATE INDEX idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);
CREATE INDEX idx_instagram_posts_location ON instagram_posts(city, state);
CREATE INDEX idx_instagram_posts_hashtags ON instagram_posts USING gin(hashtags);
CREATE INDEX idx_instagram_posts_themes ON instagram_posts USING gin(detected_themes);
CREATE INDEX idx_instagram_posts_processed ON instagram_posts(processed) WHERE NOT processed;
```

### 3. Trending Themes Table

```sql
CREATE TABLE trending_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Theme details
  theme_name TEXT NOT NULL,
  theme_category TEXT, -- 'style', 'color_palette', 'decor', 'season', 'aesthetic'
  
  -- Trending metrics
  post_count INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  trend_score DECIMAL DEFAULT 0,
  
  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Locality
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Australia',
  
  -- Associated hashtags
  related_hashtags TEXT[],
  
  -- Sample posts
  sample_post_ids UUID[] -- Reference to instagram_posts
);

CREATE INDEX idx_trending_themes_period ON trending_themes(period_end DESC);
CREATE INDEX idx_trending_themes_score ON trending_themes(trend_score DESC);
CREATE INDEX idx_trending_themes_location ON trending_themes(city, state);
```

### 4. User Feed Table

```sql
CREATE TABLE user_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- Content
  content_type TEXT NOT NULL, -- 'instagram_post', 'listing', 'theme', 'vendor_update'
  content_id UUID NOT NULL,
  
  -- Ranking
  feed_score DECIMAL NOT NULL,
  rank_position INTEGER,
  
  -- Personalization factors
  relevance_reasons TEXT[], -- 'location_match', 'style_match', 'budget_match', 'trending', etc.
  
  -- Engagement tracking
  viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  liked BOOLEAN DEFAULT false,
  saved BOOLEAN DEFAULT false,
  shared BOOLEAN DEFAULT false,
  
  -- Feed generation
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When to refresh this item
  
  CONSTRAINT valid_content_type CHECK (content_type IN ('instagram_post', 'listing', 'theme', 'vendor_update'))
);

CREATE INDEX idx_user_feed_user ON user_feed(user_id, feed_score DESC);
CREATE INDEX idx_user_feed_generated ON user_feed(generated_at DESC);
CREATE INDEX idx_user_feed_expires ON user_feed(expires_at) WHERE expires_at IS NOT NULL;
```

### 5. Feed Updates Table (for push notifications)

```sql
CREATE TABLE feed_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Update details
  update_type TEXT NOT NULL, -- 'new_vendor', 'vendor_post', 'trending_theme', 'location_update'
  title TEXT NOT NULL,
  description TEXT,
  
  -- Content reference
  content_type TEXT,
  content_id UUID,
  
  -- Targeting
  target_cities TEXT[],
  target_states TEXT[],
  target_themes TEXT[],
  
  -- Notification status
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  users_notified INTEGER DEFAULT 0,
  
  -- Metrics
  engagement_count INTEGER DEFAULT 0
);

CREATE INDEX idx_feed_updates_created ON feed_updates(created_at DESC);
CREATE INDEX idx_feed_updates_notification_sent ON feed_updates(notification_sent) WHERE NOT notification_sent;
```

## Edge Functions Architecture

### 1. sync-instagram-vendors

**Purpose**: Sync existing vendors' Instagram accounts for new posts

**Process**:
1. Get all `instagram_accounts` with `sync_status = 'active'`
2. For each account:
   - Fetch recent media (last 7 days)
   - Extract wedding-relevant posts
   - Analyze themes, hashtags, locations
   - Store in `instagram_posts`
   - Update vendor listing with latest images
3. Update `last_synced_at`
4. Log metrics to Discord

**Rate Limiting**: 
- Process 20 vendors per run (stay under 200/hour API limit)
- Rotate through all vendors over time

**Cron**: Daily at 6 AM UTC

### 2. discover-instagram-vendors

**Purpose**: Find new vendors from trending wedding posts

**Process**:
1. Search hashtags by locality:
   - `#sydneyweddingvenue`
   - `#melbourneweddingphotographer`
   - `#brisbaneweddingflorist`
2. For each hashtag:
   - Fetch recent top posts (last 7 days)
   - Extract business account mentions
   - Identify new vendors (not in database)
   - Analyze engagement, relevance
3. Create discovery entries
4. Add to enrichment queue

**Hashtag Strategy**:
- City + service type combinations
- Rotate through cities daily
- Track trending hashtags

**Cron**: Daily at 7 AM UTC

### 3. analyze-trending-themes

**Purpose**: Identify trending wedding themes from Instagram

**Process**:
1. Analyze recent wedding posts (last 30 days)
2. Extract:
   - Color palettes (via image analysis)
   - Hashtag patterns
   - Caption keywords
   - Style indicators
3. Calculate trend scores:
   - Post volume increase
   - Engagement rate
   - Geographic concentration
4. Store in `trending_themes`
5. Create feed updates for hot trends

**Analysis Method**:
- Use Perplexity to analyze post batches
- Identify emerging vs. established themes
- Track theme lifecycle

**Cron**: Weekly on Sundays at 5 AM UTC

### 4. generate-user-feeds

**Purpose**: Create personalized Instagram-style feeds for users

**Algorithmic Ranking**:
```typescript
feed_score = 
  (0.25 × location_relevance) +
  (0.20 × style_match) +
  (0.15 × recency) +
  (0.15 × engagement_rate) +
  (0.10 × vendor_quality) +
  (0.10 × trending_score) +
  (0.05 × novelty)
```

**Personalization Factors**:
- User's wedding location → prioritize local content
- User's saved venues/themes → style preferences
- User's budget → filter by price range
- User's wedding date → seasonal relevance
- User's engagement history → learning preferences

**Feed Composition**:
- 40% Vendor posts (from followed/relevant vendors)
- 30% Discovery (new vendors in their area)
- 20% Trending content
- 10% Themed collections

**Refresh Strategy**:
- Generate on user login
- Refresh items older than 12 hours
- Keep 50 items per user feed

**Cron**: Every 6 hours (midnight, 6 AM, noon, 6 PM UTC)

### 5. trigger-feed-notifications

**Purpose**: Send push notifications for new relevant content

**Notification Triggers**:
1. **New Vendor Post** (from saved vendor)
   - "✨ New photos from [Vendor Name]"
2. **New Trending Vendor** (in user's city)
   - "🔥 Trending in [City]: [Vendor Name]"
3. **New Theme Trend**
   - "💐 [Theme Name] weddings are trending in [City]"
4. **Venue Update** (price/availability change)
   - "📅 [Venue Name] has new availability"

**Smart Batching**:
- Group notifications by time
- Max 2 push notifications per day per user
- Combine similar updates
- Respect user notification preferences

**Cron**: Hourly during active hours (8 AM - 8 PM local time)

## Feed Algorithm Details

### Scoring Components

**1. Location Relevance (25%)**
```typescript
location_score = 
  city_match ? 1.0 :
  state_match ? 0.6 :
  country_match ? 0.3 : 0.1
```

**2. Style Match (20%)**
```typescript
// Compare user's saved themes vs post themes
style_score = (matching_themes / total_themes) × user_style_weight
```

**3. Recency (15%)**
```typescript
// Decay function: newer is better
days_old = (now - posted_at) / 86400000
recency_score = Math.exp(-days_old / 7) // Half-life of 7 days
```

**4. Engagement Rate (15%)**
```typescript
engagement_score = (likes + comments × 3) / followers × 1000
```

**5. Vendor Quality (10%)**
```typescript
// Based on vendor metrics
quality_score = 
  (vendor_rating / 5) × 0.4 +
  (vendor_review_count / 100) × 0.3 +
  (vendor_completeness) × 0.3
```

**6. Trending Score (10%)**
```typescript
// Is this part of a trending theme?
trending_score = theme_trend_score × theme_match_confidence
```

**7. Novelty (5%)**
```typescript
// Prefer content user hasn't seen
novelty_score = user_has_seen ? 0 : 1
```

## Instagram Graph API Setup

### Prerequisites

1. **Facebook App**:
   - Create app at developers.facebook.com
   - Add Instagram Graph API product
   - Get App ID and App Secret

2. **Instagram Business Account**:
   - Convert personal to business account
   - Connect to Facebook Page

3. **Permissions Required**:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_show_list`

### OAuth Flow

```typescript
// 1. User authorizes app
const authUrl = `https://api.instagram.com/oauth/authorize?
  client_id=${APP_ID}&
  redirect_uri=${REDIRECT_URI}&
  scope=instagram_basic&
  response_type=code`

// 2. Exchange code for access token
const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
  method: 'POST',
  body: {
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code: authorization_code
  }
})

// 3. Exchange short-lived for long-lived token (60 days)
const longLivedToken = await fetch(
  `https://graph.instagram.com/access_token?
   grant_type=ig_exchange_token&
   client_secret=${APP_SECRET}&
   access_token=${short_lived_token}`
)
```

### API Endpoints

**Get User Media**:
```
GET https://graph.instagram.com/{user-id}/media
  ?fields=id,caption,media_type,media_url,permalink,timestamp
```

**Get Media Insights**:
```
GET https://graph.instagram.com/{media-id}/insights
  ?metric=engagement,impressions,reach
```

**Hashtag Search**:
```
GET https://graph.instagram.com/ig_hashtag_search
  ?user_id={user-id}
  &q={hashtag}
```

**Get Hashtag Recent Media**:
```
GET https://graph.instagram.com/{hashtag-id}/recent_media
  ?user_id={user-id}
  &fields=id,caption,media_type,media_url,permalink
```

## Cron Schedule

| Time (UTC) | Function | Purpose |
|------------|----------|---------|
| 5:00 AM Sun | analyze-trending-themes | Weekly theme analysis |
| 6:00 AM Daily | sync-instagram-vendors | Vendor account updates |
| 7:00 AM Daily | discover-instagram-vendors | New vendor discovery |
| 8:00 AM Daily | morning-discovery-pipeline | Existing discovery (Perplexity) |
| 9:00 AM Daily | daily-report | Discord digest |
| 12:00 PM Daily | generate-user-feeds | Midday feed refresh |
| 6:00 PM Daily | generate-user-feeds | Evening feed refresh |
| Hourly 8AM-8PM | trigger-feed-notifications | Push notifications |

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create database migrations
- [ ] Set up Facebook/Instagram app
- [ ] Build OAuth flow for vendor authorization
- [ ] Create basic Instagram sync function
- [ ] Test with 5-10 vendors

### Phase 2: Discovery (Week 2)
- [ ] Hashtag search implementation
- [ ] Location-based discovery
- [ ] New vendor detection
- [ ] Integration with existing enrichment pipeline

### Phase 3: Feed Algorithm (Week 3)
- [ ] User preference tracking
- [ ] Feed scoring algorithm
- [ ] Feed generation function
- [ ] API endpoints for mobile app

### Phase 4: Notifications (Week 4)
- [ ] Notification triggers
- [ ] Smart batching logic
- [ ] User notification preferences
- [ ] Integration with FCM/APNS

### Phase 5: Theme Analysis (Week 5)
- [ ] Image analysis (color palettes)
- [ ] Perplexity theme extraction
- [ ] Trending calculation
- [ ] Theme discovery UI

## Privacy & Compliance

1. **User Data**: Only access authorized Instagram Business accounts
2. **Public Data**: Hashtag/location searches use publicly available data
3. **Storage**: Respect Instagram's caching guidelines (24-48 hours)
4. **Attribution**: Always link back to original Instagram posts
5. **Rate Limits**: Stay under API quotas
6. **Terms of Service**: Comply with Instagram Platform Policy

## Metrics & Monitoring

**Track via Discord**:
- Instagram API calls per hour
- Vendors synced per run
- New posts discovered
- New vendors found
- Themes detected
- Feed updates generated
- Notifications sent
- Engagement rates

**Database Stats**:
- Total Instagram posts tracked
- Active vendor accounts
- Users with feeds
- Click-through rates
- Theme popularity trends

## Alternative: Hybrid Approach

If Instagram Graph API proves limited, combine with:
1. **Instagram Graph API**: For authorized vendor accounts
2. **Perplexity**: For hashtag/location discovery (current approach)
3. **Web Scraping** (careful): For public profile data
4. **Manual Curation**: High-quality vendor content

## Next Steps

1. Research Instagram Graph API access requirements
2. Create Facebook/Instagram developer account
3. Build database migrations
4. Implement basic vendor sync
5. Test with pilot vendors
6. Iterate on feed algorithm
