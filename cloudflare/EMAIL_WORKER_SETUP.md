# Cloudflare Email Worker Setup

## Purpose
Receives emails at sugar@vows.social and forwards Instagram challenge codes to Supabase webhook for automated processing.

## Deployment Steps

### 1. Deploy the Email Worker

```bash
cd cloudflare
wrangler deploy --config wrangler-email.toml
```

### 2. Set Supabase Secret

```bash
wrangler secret put SUPABASE_ANON_KEY --config wrangler-email.toml
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w
```

### 3. Configure Email Routing in Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com
2. Select domain: **vows.social**
3. Go to: **Email** → **Email Routing**
4. Enable Email Routing if not already enabled
5. Add custom address:
   - **Email address**: sugar@vows.social
   - **Action**: Send to a Worker
   - **Worker**: vows-social-email-worker

### 4. Verify Email Routing

Cloudflare will send a verification email. Click the link to verify ownership.

### 5. Test the Flow

1. **Trigger Instagram challenge:**
   ```bash
   curl -X POST https://nidbhgqeyhrudtnizaya.supabase.co/functions/v1/instagram-api \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action":"monitor_user","username":"gunnersbarracks","limit":1}'
   ```

2. **Instagram sends challenge email to sugar@vows.social**

3. **Cloudflare Email Worker receives it**

4. **Worker forwards to Supabase webhook**

5. **Webhook extracts code and submits to Instagram API**

6. **Instagram login completes automatically**

## Flow Diagram

```
Instagram Challenge
       ↓
sugar@vows.social (Cloudflare Email)
       ↓
Email Worker (Cloudflare Worker)
       ↓
instagram-challenge-email (Supabase Function)
       ↓
Extracts 6-digit code
       ↓
instagram-api (Supabase Function)
       ↓
Submits code to Instagram
       ↓
✅ Logged in successfully
```

## Monitoring

- **Cloudflare Logs**: `wrangler tail --config wrangler-email.toml`
- **Supabase Logs**: Check function logs in Supabase Dashboard
- **Discord**: Challenge notifications sent to Discord webhook
- **Database**: Check `instagram_challenge_emails` table for history

## Troubleshooting

### Email not received
- Check Email Routing is enabled in Cloudflare
- Verify sugar@vows.social is configured as custom address
- Check worker is deployed and active

### Code not extracted
- Check Supabase function logs
- Verify email format matches extraction patterns
- Check `instagram_challenge_emails` table for errors

### Code submission fails
- Verify Instagram session is active
- Check if challenge is still pending
- Look for errors in Discord notifications

## Security

- Supabase anon key is stored as Cloudflare secret (not in code)
- Emails are only forwarded if from Instagram/Facebook
- Challenge codes are stored temporarily in database
- Worker runs in Cloudflare's secure environment
