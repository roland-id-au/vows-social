# Instagram Feed & Discovery System - Summary

## What This Delivers

A **TikTok/Instagram-style algorithmic feed** for wedding planning with:
- 📸 Live vendor Instagram content
- 🔍 Automatic new vendor discovery
- 🎨 Trending theme tracking
- 🔔 Smart push notifications
- 🎯 Personalized recommendations

## Core Features

### 1. **Vendor Instagram Integration**
- Sync vendors' Instagram posts automatically
- Show latest photos, videos, reels from vendors
- Track engagement (likes, comments)
- Update vendor profiles with fresh content

**User Experience:**
```
Open app → See latest real wedding photos from Sydney venues
Tap venue → See their recent Instagram posts inline
Like post → Algorithm learns your style preferences
```

### 2. **Automatic Vendor Discovery**
- Scan trending wedding hashtags by city
- Find new vendors posting real weddings
- Analyze engagement and relevance
- Auto-add to enrichment queue

**Discovery Sources:**
- `#sydneyweddingvenue` → Find trending venues
- `#melbourneweddingphotographer` → Discover photographers
- Location tags → Geographic discovery
- Vendor mentions → Network effect

### 3. **Trending Themes Analysis**
- Detect emerging wedding trends
- Analyze color palettes from photos
- Track hashtag momentum
- Geographic trend clustering

**Examples:**
- "Boho Coastal is trending in Byron Bay"
- "Minimalist Industrial peaks in Melbourne"  
- "Burnt Orange color palette gaining momentum"

### 4. **Personalized Feed Algorithm**

**Ranking Factors:**
```
feed_score = 
  25% Location Match   (in your wedding city?)
  20% Style Match      (matches your saved themes?)
  15% Recency         (posted recently?)
  15% Engagement      (popular content?)
  10% Vendor Quality  (highly rated vendor?)
  10% Trending        (part of a trend?)
  5%  Novelty         (haven't seen it before?)
```

**Feed Composition:**
- 40% Posts from vendors in your area
- 30% Discovery (new vendors you might like)
- 20% Trending content
- 10% Themed collections

### 5. **Smart Push Notifications**

**Triggers:**
1. Vendor you saved posts new photos
2. New trending vendor in your city  
3. Emerging theme matches your style
4. Price drop or new availability

**Smart Batching:**
- Max 2 notifications per day
- Combine similar updates
- Respect quiet hours
- Learn from your engagement

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                   INSTAGRAM GRAPH API                   │
└─────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐       ┌──────────────┐     ┌────────────┐
│  Vendor  │       │   Hashtag    │     │  Location  │
│   Sync   │       │   Discovery  │     │   Search   │
└──────────┘       └──────────────┘     └────────────┘
      │                    │                    │
      └────────────────────┼────────────────────┘
                           ▼
                  ┌────────────────┐
                  │ Instagram Posts│
                  │     Table      │
                  └────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐       ┌──────────────┐     ┌────────────┐
│  Theme   │       │     Feed     │     │   Push     │
│ Analysis │       │  Generation  │     │   Notify   │
└──────────┘       └──────────────┘     └────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
    User Feed Display  →  Engagement  →  Learning Loop
```

## Database Tables

### Core Tables
1. **instagram_accounts** - Linked vendor Instagram accounts
2. **instagram_posts** - All synced/discovered posts
3. **trending_themes** - Detected trending themes
4. **user_feed** - Personalized feed items per user
5. **feed_updates** - Push notification queue
6. **user_feed_preferences** - User customization
7. **instagram_sync_logs** - Operational tracking

## Automation Schedule

| Time | Function | Purpose |
|------|----------|---------|
| **5 AM Sun** | analyze-trending-themes | Weekly theme detection |
| **6 AM Daily** | sync-instagram-vendors | Vendor content updates |
| **7 AM Daily** | discover-instagram-vendors | New vendor discovery |
| **8 AM Daily** | morning-discovery-pipeline | Perplexity discovery |
| **9 AM Daily** | daily-report | Discord digest |
| **Every 6h** | generate-user-feeds | Feed refresh |
| **Hourly** | trigger-feed-notifications | Push alerts |

## User Experience Flow

### Discovery Mode
1. User opens app
2. Loads personalized feed (50 items)
3. Scrolls through:
   - Real wedding from saved venue
   - New trending photographer in Sydney
   - Boho theme collection
   - Venue with new availability
4. Double-tap to like → Algorithm learns preference
5. Save vendor → Get notifications when they post

### Vendor Profile
1. User views venue profile
2. Sees latest Instagram posts inline
3. Can tap through to see full Instagram feed
4. Follow button → Add to feed, enable notifications

### Notifications
```
Morning notification:
"✨ Good morning! 3 new updates:
• Gunners Barracks posted new ceremony photos
• Wild Bloom Florals is trending in Sydney
• Minimalist Ocean theme is gaining momentum"

[Tap to view]
```

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Database schema designed
- [x] Migration created and applied
- [x] Architecture documented

### Phase 2: Instagram API Setup ✅ COMPLETE
- [x] Instagram API setup guide created
- [x] Build OAuth flow edge function
- [x] Deploy OAuth callback handler
- [ ] Create Facebook Developer account
- [ ] Set up Instagram Graph API app
- [ ] Test with 5 vendors

### Phase 3: Basic Sync ✅ COMPLETE
- [x] Create sync-instagram-vendors function
- [x] Deploy sync function
- [x] Add cron job (daily 6 AM UTC)
- [ ] Test vendor content syncing
- [ ] Display in vendor profiles
- [ ] Monitor API usage

### Phase 4: Discovery
- [ ] Hashtag search implementation
- [ ] New vendor detection
- [ ] Integration with enrichment
- [ ] Location-based discovery

### Phase 5: Feed Algorithm
- [ ] User preference tracking
- [ ] Feed scoring implementation
- [ ] Feed generation function
- [ ] Mobile app API endpoints

### Phase 6: Notifications
- [ ] Notification triggers
- [ ] Smart batching
- [ ] User preferences
- [ ] FCM integration

### Phase 7: Themes
- [ ] Theme analysis with Perplexity
- [ ] Trend calculation
- [ ] Theme collections
- [ ] Theme UI

## Next Steps

### Immediate (Ready for Testing)
1. ✅ **Migration applied** - All tables created
2. ✅ **OAuth flow built** - instagram-oauth-callback deployed
3. ✅ **Sync function built** - sync-instagram-vendors deployed
4. ✅ **Cron scheduled** - Daily at 6 AM UTC
5. **TODO: Create Facebook App** for Instagram access
6. **TODO: Configure Instagram API secrets** in Supabase
7. **TODO: Test with 3-5 pilot vendors**

### Short Term (Next 2 Weeks)
1. ✅ Build basic Instagram sync function
2. Test with 5-10 pilot vendors
3. Create vendor profile Instagram tab (frontend)
4. Monitor API quotas and costs
5. Implement secure token storage/refresh

### Medium Term (Next Month)
1. Hashtag discovery implementation
2. Feed algorithm v1
3. Basic push notifications
4. Theme detection

## Technical Considerations

### Instagram API Limits
- **200 calls/hour per user** - Manageable with batching
- **Business accounts only** - Need vendor authorization
- **Public data caching** - 24-48 hour limit

### Scalability
- 100 vendors × 10 posts/day = 1,000 posts/day
- 1,000 users × 50 feed items = 50,000 feed items
- API calls: ~100/hour (well under 200 limit)

### Costs
- **Instagram API**: FREE
- **Perplexity for themes**: ~$1-2/day
- **Storage**: Minimal (images are URLs)
- **Compute**: Edge functions stay in free tier

### Privacy
- Only access **authorized** business accounts
- Public hashtag data is **publicly available**
- **Link back** to original Instagram posts
- Respect **user preferences** for notifications

## Alternative Approach (If Graph API Limited)

**Hybrid System:**
1. **Instagram Graph API**: For authorized vendors (best quality)
2. **Perplexity**: For hashtag/location discovery (current)
3. **Manual Curation**: High-quality featured content
4. **User Submissions**: Vendors can submit their posts

This ensures we have content even if Graph API proves difficult to set up.

## Success Metrics

### Engagement
- Daily active users opening feed
- Time spent in feed
- Content interaction rate (likes, saves)
- Vendor profile views from feed

### Discovery
- New vendors discovered per week
- Trending themes detected
- User theme preference accuracy
- Notification click-through rate

### Vendor Value
- Vendors getting profile views from Instagram
- User engagement with vendor posts
- Bookings attributed to Instagram content

## Files Created

### Documentation
1. **INSTAGRAM_INTEGRATION_ARCHITECTURE.md** - Full technical specs
2. **INSTAGRAM_FEED_SUMMARY.md** - This file (overview)
3. **INSTAGRAM_API_SETUP.md** - Step-by-step Instagram API setup guide

### Database Migrations
4. **20251004121350_drop_instagram_tables_if_exists.sql** - Cleanup migration
5. **20251004121400_create_instagram_integration_tables.sql** - 7 Instagram tables
6. **20251004123000_add_instagram_sync_cron.sql** - Cron job for daily sync

### Edge Functions
7. **supabase/functions/instagram-oauth-callback/index.ts** - OAuth authorization handler
8. **supabase/functions/sync-instagram-vendors/index.ts** - Daily vendor sync function

### Shared Utilities
9. **supabase/functions/_shared/logger.ts** - Structured logging utility
10. **supabase/functions/_shared/discord-logger.ts** - Discord streaming logger

## Questions to Resolve

1. **Instagram Business Account Access**: How many vendors will authorize?
2. **Token Storage**: Implement secure encrypted storage for access tokens
3. **Content Moderation**: Filter inappropriate content?
4. **Attribution**: How to credit original posts?
5. **Token Refresh**: Implement auto-refresh before 60-day expiry

## Current Limitations

1. **Access Token Storage**: Currently using placeholder - need to implement secure vault storage
2. **No Token Refresh**: Need to implement automatic token refresh before expiry
3. **Rate Limiting**: Need to track API calls per hour and implement backoff
4. **Frontend Integration**: Need to build vendor dashboard UI for Instagram connection

---

**Status**: 🟢 Phase 1-3 Complete, Ready for API Configuration & Testing

**Next Action**: Create Facebook Developer App, configure secrets, test with pilot vendors
