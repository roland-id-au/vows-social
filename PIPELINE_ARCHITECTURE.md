# Vows Social - Comprehensive Pipeline Architecture

## App Objective
**Connect engaged couples with trending wedding vendors through a TikTok-style discovery feed**

### Core Value Propositions
1. **Discover trending vendors** before they're fully booked
2. **See real wedding content** from vendor Instagram feeds
3. **Get personalized recommendations** based on location, style, budget
4. **Be the first to know** about hot new vendors in your area

## User Engagement Strategy

### Peak Engagement Times (Sydney/Melbourne/Brisbane)
- **7:00-8:30 AM**: Morning commute, coffee browsing
- **12:00-1:00 PM**: Lunch break planning
- **6:00-8:00 PM**: Evening planning session
- **Saturday 10 AM-2 PM**: Weekend planning with partner

### Notification Strategy
**Goal**: Be helpful, not spammy. Max 2 notifications per day.

#### Morning Inspiration (7:30 AM)
- **Content**: Venues with stunning photos
- **Tone**: "Good morning! ☀️ Check out this trending venue..."
- **Trigger**: New fully-enriched venue with 5+ images
- **Frequency**: Daily if new content available

#### Lunchtime Discovery (12:30 PM)
- **Content**: Wedding services (photographers, florists, planners)
- **Tone**: "New in [City]: trending wedding photographer..."
- **Trigger**: New service providers in user's city
- **Frequency**: 2-3x per week

#### Evening Planning (6:30 PM)
- **Content**: Batch update of multiple new listings
- **Tone**: "✨ 3 new venues added today in Sydney"
- **Trigger**: 3+ new fully-enriched listings
- **Frequency**: Daily if content available

## Pipeline Design

### Phase 1: Discovery (Find New Vendors)
**Goal**: Comprehensive discovery of ALL Australian vendors using AI-powered research

#### Australia-Wide Discovery via Perplexity
```
Sunday 3:00 AM - Venues (ALL trending across Australia)
1st & 15th 3:30 AM - Photographers (ALL trending across Australia)
1st of month 4:00 AM - Florists (ALL trending across Australia)
8th of month 4:00 AM - Planners (ALL trending across Australia)
```

**What it does**:
- Uses Perplexity AI to find ALL currently trending vendors across ALL Australian states
- Focuses on recency: "Recently featured, high Instagram engagement in last 3 months, booking up quickly"
- Automatically classifies each vendor by city and state
- Extracts Instagram handles where available
- **Excludes already discovered vendors** (queries existing discoveries + listings to avoid duplicates)
- Returns dynamic number based on what's actually trending (up to 100)
- Creates discoveries with proper location tagging
- Prioritizes by engagement indicators (Instagram presence, trending status)

**Advantages over city-by-city**:
- ✅ Discovers vendors in smaller cities (Byron Bay, Gold Coast, Hobart, etc.)
- ✅ More comprehensive - doesn't miss regional hotspots
- ✅ Single API call vs. multiple calls = cost-effective
- ✅ Perplexity provides better quality data with context
- ✅ Automatic location classification

**Sample Discovery Output**:
```json
{
  "name": "Gunners Barracks",
  "location": "Mosman, Sydney, NSW",
  "city": "Sydney",
  "state": "NSW",
  "service_type": "venue",
  "why_trending": "Harbourside views, featured in Vogue",
  "instagram_handle": "@gunnersbarracks",
  "engagement_score": 40
}
```

### Phase 2: Enrichment (Research & Enrich)
**Goal**: Fully research every discovery before showing to users

#### Continuous Enrichment Queue
```
Every 5 minutes - Process 1 discovery
```

**Process**:
1. Get top `pending_enrichment` discovery (by engagement_score)
2. Call `enrichment-venue` function
3. Fetch full details, images, packages, reviews
4. Update discovery status:
   - `enriched` - Successfully enriched
   - `enrichment_failed` - Could not enrich
   - `duplicate` - Already exists in database

**Quality Gates**:
- Minimum 3 images
- Valid contact information
- Location confirmed
- At least 1 package or price range

**Status**: Mark as `ready_for_publication` only if passes quality gates

### Phase 3: Publication (Make Live)
**Goal**: Publish fully-enriched listings and prepare notifications

#### Pre-Notification Publication
```
7:00 AM - Publish morning batch (for 7:30 AM notification)
12:00 PM - Publish lunch batch (for 12:30 PM notification)
6:00 PM - Publish evening batch (for 6:30 PM notification)
```

**Process**:
1. Get all `ready_for_publication` discoveries
2. Check quality gates again
3. Mark listings as `published`
4. Create `pending_notifications` for each listing
5. Tag notification with time slot: `morning`, `lunch`, or `evening`

### Phase 4: Notification (Push to Users)
**Goal**: Notify users at peak engagement times with fresh content

#### Smart Notification Triggers
```
7:30 AM - Morning Inspiration
12:30 PM - Lunchtime Discovery
6:30 PM - Evening Planning Update
```

**Process**:
1. Get `pending_notifications` for current time slot
2. Group by user preferences:
   - Match user's city
   - Match user's saved themes
   - Respect notification preferences
3. Batch similar updates:
   - 1 new venue → "New trending venue: [Name]"
   - 3+ new venues → "3 new venues added in [City]"
4. Send via FCM/APNS
5. Mark notifications as `sent`
6. Log engagement metrics

**Smart Batching Rules**:
- Max 2 notifications per user per day
- Combine similar listings into one notification
- Respect quiet hours (10 PM - 7 AM)
- Skip if user opened app in last 2 hours (already browsing)

### Phase 5: Instagram Content Sync
**Goal**: Keep vendor Instagram feeds fresh

```
6:00 AM - Sync all connected Instagram accounts
```

**Process**:
1. Get all Instagram accounts with `has_access_token = true`
2. Fetch last 25 posts from each
3. Extract wedding-related content
4. Update `instagram_posts` table
5. Refresh vendor profile images
6. Don't send notifications (just feed content)

### Phase 6: Feed Generation
**Goal**: Pre-generate personalized feeds for fast load times

```
8:00 AM - Generate morning feeds
1:00 PM - Generate afternoon feeds
7:00 PM - Generate evening feeds
```

**Process**:
1. For each active user:
   - Get user preferences (location, themes, budget)
   - Score all content (listings + Instagram posts)
   - Generate top 50 feed items
   - Store in `feeds` table
2. Expire old feed items (>12 hours)

**Feed Composition**:
- 40% New listings (from discoveries)
- 30% Instagram posts (from followed vendors)
- 20% Trending content (high engagement)
- 10% Personalized recommendations

## Complete Cron Schedule

### Continuous Enrichment
| Time (AEST) | Function | Purpose |
|-------------|----------|---------|
| **Every 5 min** | `enrichment-process-queue` | Process 1 discovery continuously |

### Australia-Wide Discovery
| Time (AEST) | Function | Purpose |
|-------------|----------|---------|
| **Sun 3:00 AM** | `discovery-australia-wide` (venues) | Top 50 venues across ALL states |
| **1st & 15th 3:30 AM** | `discovery-australia-wide` (photographers) | Top 50 photographers across ALL states |
| **1st of month 4:00 AM** | `discovery-australia-wide` (florists) | Top 40 florists across ALL states |
| **8th of month 4:00 AM** | `discovery-australia-wide` (planners) | Top 40 planners across ALL states |
| **Daily 6:00 AM** | `instagram-sync-vendors` | Sync vendor Instagram posts |

### Publication & Notifications
| Time (AEST) | Function | Purpose |
|-------------|----------|---------|
| **7:00 AM** | `publication-prepare-morning` | Prepare morning batch |
| **7:30 AM** | `notifications-morning-send` | Morning inspiration push |
| **12:00 PM** | `publication-prepare-lunch` | Prepare lunch batch |
| **12:30 PM** | `notifications-lunch-send` | Lunchtime discovery push |
| **6:00 PM** | `publication-prepare-evening` | Prepare evening batch |
| **6:30 PM** | `notifications-evening-send` | Evening planning push |

### Feed Generation
| Time (AEST) | Function | Purpose |
|-------------|----------|---------|
| **8:00 AM** | `feeds-generate-users` | Generate morning feeds |
| **1:00 PM** | `feeds-generate-users` | Generate afternoon feeds |
| **7:00 PM** | `feeds-generate-users` | Generate evening feeds |

### Monitoring
| Time (AEST) | Function | Purpose |
|-------------|----------|---------|
| **9:00 AM** | `reporting-daily-digest` | Discord ops report |
| **Every hour** | `monitoring-pipeline-health` | Check pipeline status |

### Weekly
| Time (AEST) | Function | Purpose |
|-------------|----------|---------|
| **Sun 10 AM** | `maintenance-refresh-stale-listings` | Update old listings |
| **Sun 2 AM** | `analytics-weekly-trends` | Analyze trending themes |

## Database Schema Updates

### Discovery Status Flow
```
pending_enrichment → enrichment_in_progress → enriched → ready_for_publication → published
                                            → enrichment_failed
                                            → duplicate
```

### New Tables

#### `enrichment_queue`
```sql
CREATE TABLE enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id UUID REFERENCES discoveries(id) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_enrichment_queue_status ON enrichment_queue(status, priority DESC);
```

#### `notification_queue`
```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) NOT NULL,
  time_slot TEXT NOT NULL, -- 'morning', 'lunch', 'evening'
  notification_type TEXT NOT NULL, -- 'new_venue', 'new_service', 'batch_update'
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  target_cities TEXT[] DEFAULT '{}',
  target_users UUID[],
  sent_at TIMESTAMPTZ,
  engagement_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status, time_slot, priority);
```

#### Update `discoveries` table
```sql
ALTER TABLE discoveries ADD COLUMN enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE discoveries ADD COLUMN enrichment_attempts INTEGER DEFAULT 0;
ALTER TABLE discoveries ADD COLUMN last_enrichment_attempt TIMESTAMPTZ;
ALTER TABLE discoveries ADD COLUMN quality_score INTEGER; -- 0-100
ALTER TABLE discoveries ADD COLUMN published_at TIMESTAMPTZ;

CREATE INDEX idx_discoveries_enrichment_status ON discoveries(enrichment_status);
```

## Key Metrics to Track

### Discovery Metrics
- New discoveries per day
- Discovery → Enrichment conversion rate
- Average enrichment time
- Quality score distribution

### Engagement Metrics
- Notification open rate by time slot
- Feed engagement by composition
- User retention (DAU/MAU)
- Listing views from notifications vs feed

### Vendor Metrics
- New vendors added per week
- Instagram-connected vendors
- Average images per listing
- Listing completeness score

## Implementation Priority

### Phase 1: Core Pipeline (Week 1)
- [x] Discovery functions (already exists)
- [ ] Enrichment queue processor (every 5 min)
- [ ] Quality gates and status tracking
- [ ] Publication scheduler

### Phase 2: Notifications (Week 2)
- [ ] Notification queue system
- [ ] FCM/APNS integration
- [ ] User preference matching
- [ ] Smart batching logic

### Phase 3: Feed Algorithm (Week 3)
- [ ] Feed scoring algorithm
- [ ] Feed generation function
- [ ] Feed refresh logic
- [ ] API endpoints for mobile app

### Phase 4: Optimization (Week 4)
- [ ] A/B testing for notification times
- [ ] Quality score refinement
- [ ] Performance optimization
- [ ] Analytics dashboard

## Success Criteria

**Discovery**:
- Discover ALL trending vendors weekly/biweekly (dynamic based on market activity)
- Zero duplicate discoveries (automatic exclusion)
- Comprehensive coverage across all 8 states/territories
- 80%+ enrichment success rate
- <10 minute average enrichment time per discovery

**Engagement**:
- 25%+ notification open rate
- 60%+ DAU (of registered users)
- 5+ feed items viewed per session

**Quality**:
- 90%+ listings with 3+ images
- 95%+ listings with valid contact info
- 4.0+ average listing quality score

---

**Status**: 🔄 Ready for Implementation

**Next Action**: Implement enrichment queue processor with 5-minute interval
