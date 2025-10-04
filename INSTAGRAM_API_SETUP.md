# Instagram Graph API Setup Guide

## Prerequisites

Before you can integrate Instagram's Graph API, you need:

1. **Facebook Developer Account** (free)
2. **Instagram Business or Creator Account**
3. **Facebook Page** connected to the Instagram account
4. **App ID and App Secret** from Facebook

## Step-by-Step Setup

### 1. Create Facebook Developer Account

1. Go to [Facebook for Developers](https://developers.facebook.com)
2. Click **"Get Started"** in the top right
3. Complete registration with your Facebook account
4. Verify your email address

### 2. Create a Facebook App

1. Go to [My Apps](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name**: "Vows Social Instagram Integration"
   - **App Contact Email**: blake@roland.id.au
   - **Business Account**: Create or select one
5. Click **"Create App"**

### 3. Add Instagram Graph API Product

1. In your app dashboard, find **"Add a Product"**
2. Locate **"Instagram Graph API"** and click **"Set Up"**
3. This adds the product to your app

### 4. Configure Instagram Basic Display API (Alternative)

For simpler read-only access:

1. Add **"Instagram Basic Display"** product instead
2. Configure OAuth settings:
   - **Valid OAuth Redirect URIs**:
     - `https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-oauth-callback`
     - `http://localhost:54321/functions/v1/instagram-oauth-callback` (for testing)
   - **Deauthorize Callback URL**: (optional)
   - **Data Deletion Request URL**: (optional)

### 5. Get App Credentials

1. Go to **Settings > Basic**
2. Copy your:
   - **App ID**
   - **App Secret** (click "Show")
3. Store these in Supabase secrets:

```bash
supabase secrets set INSTAGRAM_APP_ID="your_app_id"
supabase secrets set INSTAGRAM_APP_SECRET="your_app_secret"
supabase secrets set INSTAGRAM_REDIRECT_URI="https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-oauth-callback"
```

### 6. Configure Instagram Business Account

**For Vendor Accounts** (that you'll sync):

1. Vendor must have **Instagram Business** or **Creator** account
2. Account must be connected to a **Facebook Page**
3. Vendor grants permission via OAuth flow

**To Convert Personal to Business:**

1. Open Instagram app
2. Go to **Settings > Account**
3. Tap **Switch to Professional Account**
4. Select **Business** or **Creator**
5. Connect to Facebook Page

### 7. Request Permissions

Your app needs these permissions:

**Instagram Graph API:**
- `instagram_basic` - Read profile info and media
- `instagram_manage_comments` - Read comments (optional)
- `instagram_manage_insights` - Access media insights
- `pages_show_list` - List Facebook Pages
- `pages_read_engagement` - Read engagement metrics

**Instagram Basic Display API** (simpler alternative):
- `user_profile` - Read user profile
- `user_media` - Read user media

### 8. App Review (For Production)

**Development Mode:**
- App works for admins, developers, testers only
- Limited to 25 users
- Perfect for initial testing

**Public Mode:**
- Requires Facebook App Review
- Submit permissions for review
- Provide detailed use case and demo video
- Review takes 3-7 days

**For now, stay in Development Mode** for vendor pilot testing.

## OAuth Flow Implementation

### Authorization URL

```typescript
const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${REDIRECT_URI}&scope=user_profile,user_media&response_type=code`
```

### Token Exchange

```typescript
// 1. User authorizes, gets redirected with code
// 2. Exchange code for short-lived token (1 hour)
const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    client_secret: INSTAGRAM_APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code: authorization_code
  })
})

// 3. Exchange short-lived for long-lived token (60 days)
const longLivedResponse = await fetch(
  `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortToken}`
)

// 4. Store long-lived token (expires in 60 days)
// Store in instagram_accounts table with expiry date
```

### Token Refresh

```typescript
// Refresh long-lived token before expiry (refresh extends to 60 days from now)
const refreshResponse = await fetch(
  `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
)
```

## API Endpoints Reference

### Get User Profile

```bash
GET https://graph.instagram.com/{user-id}?fields=id,username,account_type,media_count&access_token={access-token}
```

### Get User Media

```bash
GET https://graph.instagram.com/{user-id}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token={access-token}
```

### Get Media Details

```bash
GET https://graph.instagram.com/{media-id}?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token={access-token}
```

### Hashtag Search (Instagram Graph API only)

```bash
# 1. Search hashtag ID
GET https://graph.instagram.com/ig_hashtag_search?user_id={user-id}&q={hashtag}&access_token={access-token}

# 2. Get recent media for hashtag
GET https://graph.instagram.com/{hashtag-id}/recent_media?user_id={user-id}&fields=id,caption,media_type,media_url,permalink&access_token={access-token}
```

## Rate Limits

- **200 API calls per hour** per user access token
- **429 Too Many Requests** if exceeded
- Use batch requests where possible
- Implement exponential backoff retry logic

## Testing

### Test Users

1. Add test users in **App Roles > Roles**
2. Test users can authorize without App Review
3. Perfect for pilot vendor testing

### Webhook Testing

1. Use [ngrok](https://ngrok.com) for local testing:
   ```bash
   ngrok http 54321
   ```
2. Update redirect URI to ngrok URL
3. Test OAuth flow locally

## Security Best Practices

1. **Never expose App Secret** - Store in Supabase secrets only
2. **Validate redirect URIs** - Whitelist exact URLs
3. **Store tokens securely** - Never log access tokens
4. **Implement token refresh** - Refresh before 60-day expiry
5. **Use HTTPS only** - No HTTP in production
6. **Implement rate limiting** - Track API usage in `instagram_sync_logs`

## Vendor Onboarding Flow

### For Web Application

1. **Vendor clicks "Connect Instagram"** in vendor dashboard
2. **Redirect to Instagram OAuth**:
   ```typescript
   window.location.href = authUrl
   ```
3. **Vendor authorizes app** on Instagram
4. **Callback to edge function** with authorization code
5. **Exchange code for token** and store in database
6. **Show success message** and start syncing

### For Manual Setup (Pilot)

1. Vendor provides Instagram username
2. Admin adds to test users
3. Admin authorizes on vendor's behalf
4. Store credentials manually in `instagram_accounts` table

## Next Steps

1. ✅ Create Facebook Developer account
2. ✅ Create Facebook App
3. ✅ Add Instagram product
4. ✅ Get App credentials
5. ✅ Store in Supabase secrets
6. ⏭️ Build OAuth callback edge function
7. ⏭️ Test with 3-5 pilot vendors
8. ⏭️ Build vendor sync function

## Troubleshooting

### "Invalid OAuth redirect_uri"

- Ensure redirect URI is **exactly** as configured in app settings
- Must include protocol (`https://`)
- No trailing slash unless configured with one

### "User does not have a Business Account"

- Vendor must convert to Business or Creator account
- Must be connected to Facebook Page

### "Permission is not approved"

- App is in Development Mode - permission not needed for test users
- For production, submit for App Review

### "Rate limit exceeded"

- Implement exponential backoff
- Spread syncs over time (not all at once)
- Cache data to reduce API calls

## Resources

- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Instagram Basic Display Docs](https://developers.facebook.com/docs/instagram-basic-display-api)
- [OAuth Flow Guide](https://developers.facebook.com/docs/instagram-basic-display-api/guides/getting-access-tokens-and-permissions)
- [Webhook Setup](https://developers.facebook.com/docs/graph-api/webhooks)
- [Rate Limits](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)

## Support

For issues:
- Facebook Developer Support: https://developers.facebook.com/support
- Instagram API Status: https://developers.facebook.com/status/
- Internal: blake@roland.id.au
