# Setup images.vows.social CDN

This guide covers deploying the Cloudflare Worker for serving images from images.vows.social with CDN caching and optimization.

## Prerequisites

- Cloudflare account with vows.social domain added
- Wrangler CLI installed (`npm install -g wrangler`)
- DNS access to vows.social

## Step 1: Deploy Cloudflare Worker

### 1.1 Create wrangler.toml

Create `cloudflare/wrangler.toml`:

```toml
name = "images-vows-social"
main = "images-worker.js"
compatibility_date = "2024-01-01"
workers_dev = false

[env.production]
routes = [
  { pattern = "images.vows.social/*", zone_name = "vows.social" }
]
```

### 1.2 Deploy Worker

```bash
cd cloudflare
wrangler login
wrangler deploy
```

## Step 2: Configure DNS

### Option A: Using Cloudflare Dashboard

1. Go to Cloudflare Dashboard → Domains → vows.social → DNS
2. Add CNAME record:
   - **Type**: CNAME
   - **Name**: images
   - **Target**: images-vows-social.workers.dev (or your worker domain)
   - **Proxy status**: Proxied (orange cloud) ✅
   - **TTL**: Auto

### Option B: Using Cloudflare API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "images",
    "content": "images-vows-social.workers.dev",
    "proxied": true,
    "ttl": 1
  }'
```

## Step 3: Test the Worker

### 3.1 Health Check

```bash
curl https://images.vows.social/health
# Expected: OK
```

### 3.2 Test Image Loading

```bash
# Test with an existing image from your Supabase Storage
curl -I https://images.vows.social/{image-path}.jpg

# Expected headers:
# HTTP/2 200
# cache-control: public, max-age=86400, immutable
# x-cache: HIT (or MISS on first request)
# x-cdn: Cloudflare
```

### 3.3 Test Image Optimization

```bash
# Request with WebP support
curl -I https://images.vows.social/{image-path}.jpg \
  -H "Accept: image/webp"

# Request with width parameter
curl -I "https://images.vows.social/{image-path}.jpg?w=800"

# Request with quality parameter
curl -I "https://images.vows.social/{image-path}.jpg?q=75"
```

## Step 4: Verify CDN Caching

1. **First request** - Should see `X-Cache: MISS`
2. **Second request** - Should see `X-Cache: HIT`
3. **After 7 days** - Cache expires, will be MISS again

Check cache status:
```bash
curl -I https://images.vows.social/{image-path}.jpg | grep -i x-cache
```

## URL Structure

### Original Supabase URL
```
https://nidbhgqeyhrudtnizaya.supabase.co/storage/v1/object/public/listing-images/listings/{id}/image-{n}.jpg
```

### New CDN URL
```
https://images.vows.social/listings/{id}/image-{n}.jpg
```

### With Optimization Parameters
```
https://images.vows.social/listings/{id}/image-{n}.jpg?w=800&q=85
```

## Image Optimization Features

### Automatic Format Conversion
- Browsers supporting AVIF → AVIF format (best compression)
- Browsers supporting WebP → WebP format (good compression)
- Others → Original format with optimization

### Supported Parameters
- `w` or `width` - Resize width (preserves aspect ratio)
- `q` or `quality` - JPEG quality (1-100, default 85)
- `format` - Force format (webp, avif, jpeg, png)

### Examples
```bash
# Thumbnail (400px wide)
https://images.vows.social/listings/{id}/image-1.jpg?w=400

# Gallery image (1200px, high quality)
https://images.vows.social/listings/{id}/image-1.jpg?w=1200&q=90

# Force WebP format
https://images.vows.social/listings/{id}/image-1.jpg?format=webp
```

## Performance Benefits

### CDN Caching
- **Edge caching**: 7 days (604,800 seconds)
- **Browser caching**: 1 day (86,400 seconds)
- **Bandwidth savings**: ~80-90% after cache warm-up

### Image Optimization
- **AVIF**: 50% smaller than JPEG
- **WebP**: 30% smaller than JPEG
- **Metadata stripping**: Removes EXIF data
- **Fast compression**: Optimized for speed

### Global Performance
- Served from Cloudflare edge locations worldwide
- <50ms latency for cached images
- Automatic HTTP/2 and HTTP/3

## Monitoring

### Check Worker Logs
```bash
wrangler tail images-vows-social
```

### Check Analytics (Cloudflare Dashboard)
- Workers → Analytics
- Metrics: Requests, Errors, CPU time, Cache hit rate

### Expected Metrics (after warm-up)
- **Cache hit rate**: 85-95%
- **P50 latency**: <20ms
- **P99 latency**: <100ms

## Troubleshooting

### Images not loading
1. Check DNS propagation: `nslookup images.vows.social`
2. Check worker deployment: `wrangler deployments list`
3. Check worker logs: `wrangler tail`

### Cache not working
1. Verify proxy status (orange cloud) in Cloudflare DNS
2. Check `cache-control` header in response
3. Verify `cf-cache-status` header exists

### Image optimization not working
1. Check `Accept` header in request
2. Verify image format in response `content-type` header
3. Check Cloudflare plan supports image optimization

## Next Steps

After DNS and worker are configured:
1. Update database migration to convert URLs
2. Run migration to update existing image URLs
3. Update image storage helper to use new domain
4. Test all images load correctly from images.vows.social
