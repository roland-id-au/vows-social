# Image Storage Architecture

## Overview

Vows Social uses Supabase Storage to host all venue and service listing images. Images are automatically downloaded during the discovery/enrichment process and stored in our CDN-backed storage bucket for reliable, fast delivery.

## Why Supabase Storage?

✅ **Reliable**: No broken external links or hotlink protection issues  
✅ **Fast**: CDN-backed delivery with global edge network  
✅ **Optimized**: Control over image optimization and formats  
✅ **Secure**: Fine-grained access control with RLS policies  
✅ **Cost-effective**: Included in Supabase free tier (1GB storage + unlimited bandwidth on paid plans)

## Architecture

### Storage Bucket

**Name**: `listing-images`  
**Type**: Public bucket  
**Max file size**: 10 MB  
**Allowed types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

### Policies

1. **Public Access** - Anyone can view images
2. **Service Role Upload** - Edge functions can upload images
3. **Service Role Delete** - Edge functions can delete images
4. **Service Role Update** - Edge functions can update images

### File Structure

```
listing-images/
├── {listing-id}/
│   ├── {timestamp}-0-{random}.jpg
│   ├── {timestamp}-1-{random}.jpg
│   └── {timestamp}-2-{random}.jpg
```

Each listing has its own folder, with images named by timestamp, index, and random string to ensure uniqueness.

## Image Processing Flow

### 1. Discovery Phase
- Perplexity AI returns external image URLs from discovered venues
- URLs are validated for format and content type

### 2. Enrichment Phase (deep-research-venue)
```typescript
import { downloadAndStoreImages } from '../_shared/image-storage.ts'

// Download and store images
const storedImages = await downloadAndStoreImages(
  supabase,
  venueData.image_urls,  // External URLs
  listing.id,            // Listing ID for folder organization
  10                     // Max 10 images
)

// Save to database
const mediaRecords = storedImages.map((img, index) => ({
  listing_id: listing.id,
  media_type: 'image',
  url: img.url,          // Supabase Storage URL
  source: 'perplexity_research',
  order_index: index,
  metadata: {
    size: img.size,
    content_type: img.contentType,
    storage_path: img.path
  }
}))
```

### 3. Serving Images

**Frontend (Next.js)**:
```typescript
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    }
  ]
}

// Component
<Image 
  src={image.url}  // https://{project}.supabase.co/storage/v1/object/public/listing-images/{listing-id}/{filename}
  alt={venue.title}
  fill
/>
```

## Helper Functions

### `downloadAndStoreImage()`

Downloads a single image and uploads it to Supabase Storage.

**Parameters**:
- `supabase` - Supabase client instance
- `imageUrl` - External URL to download
- `listingId` - Listing ID for folder organization
- `index` - Image index for ordering

**Returns**: `ImageUploadResult | null`

```typescript
interface ImageUploadResult {
  url: string          // Supabase Storage public URL
  path: string         // Storage path (e.g., "listing-id/timestamp-0-random.jpg")
  size: number         // File size in bytes
  contentType: string  // MIME type
}
```

### `downloadAndStoreImages()`

Batch downloads multiple images with rate limiting.

**Parameters**:
- `supabase` - Supabase client instance
- `imageUrls` - Array of external URLs
- `listingId` - Listing ID
- `maxImages` - Maximum images to process (default: 10)

**Returns**: `ImageUploadResult[]`

### `deleteListingImages()`

Deletes all images for a listing.

**Parameters**:
- `supabase` - Supabase client instance
- `listingId` - Listing ID

**Returns**: `boolean` - Success status

## Database Schema

### listing_media Table

```sql
CREATE TABLE listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,  -- 'image' | 'video'
  url TEXT NOT NULL,          -- Supabase Storage URL
  source TEXT,                -- 'perplexity_research' | 'instagram' | 'manual'
  order_index INTEGER,        -- Display order
  metadata JSONB,             -- { size, content_type, storage_path }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Setup Instructions

### 1. Create Storage Bucket

Via Supabase Dashboard:
1. Go to **Storage** > **Buckets**
2. Click **New bucket**
3. Name: `listing-images`
4. Enable **Public bucket**
5. File size limit: `10 MB`
6. Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`
7. Click **Create**

Via Migration (already in codebase):
```bash
supabase db push
# Applies: 20251004122050_setup_image_storage.sql
```

### 2. Verify Policies

Storage policies should be automatically created by the migration:
- ✅ Public Access (SELECT)
- ✅ Service Role Upload (INSERT)
- ✅ Service Role Delete (DELETE)
- ✅ Service Role Update (UPDATE)

### 3. Test Image Storage

Trigger a discovery/enrichment:
```bash
curl -X POST \
  https://{project}.supabase.co/functions/v1/deep-research-venue \
  -H "Authorization: Bearer {service_role_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "venueName": "Test Venue",
    "location": "Sydney",
    "city": "Sydney",
    "state": "NSW"
  }'
```

Check the storage bucket for uploaded images.

## Monitoring

### View Storage Usage

Dashboard: **Storage** > **Usage**
- Total storage size
- Request count
- Bandwidth usage

### Check Logs

Dashboard: **Storage** > **Logs**
- Upload events
- Access events
- Error events

### Database Queries

```sql
-- Image statistics by listing
SELECT 
  l.id,
  l.title,
  COUNT(lm.id) as image_count,
  SUM((lm.metadata->>'size')::integer) as total_size_bytes,
  ARRAY_AGG(lm.url ORDER BY lm.order_index) as image_urls
FROM listings l
LEFT JOIN listing_media lm ON l.id = lm.listing_id
WHERE lm.media_type = 'image'
GROUP BY l.id, l.title;

-- Recent image uploads
SELECT 
  listing_id,
  url,
  metadata->>'size' as size_bytes,
  metadata->>'content_type' as content_type,
  created_at
FROM listing_media
WHERE media_type = 'image'
ORDER BY created_at DESC
LIMIT 20;
```

## Performance Considerations

### Rate Limiting
- 500ms delay between image downloads to avoid overwhelming external servers
- Max 10 images per listing to control storage usage

### Image Optimization
Future improvements:
- Automatic WebP conversion
- Multiple sizes (thumbnail, medium, large)
- Lazy loading optimization
- Progressive image loading

### CDN Caching
Supabase Storage automatically:
- Serves via CDN
- Caches with 1-year max-age
- Handles compression
- Provides automatic HTTPS

## Troubleshooting

### Images not appearing

1. **Check storage bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'listing-images';
   ```

2. **Check policies**:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'listing-images';
   ```

3. **Check image URLs**:
   ```sql
   SELECT url FROM listing_media WHERE listing_id = '{id}' LIMIT 5;
   ```

4. **Test direct access**:
   Open image URL in browser - should load without authentication

### Upload failures

Common causes:
- Image too large (>10MB)
- Invalid content type
- Network timeout
- Storage quota exceeded

Check edge function logs for specific errors.

## Migration from External URLs

If you have existing listings with external URLs:

```typescript
// Backfill script (example)
import { createClient } from '@supabase/supabase-js'
import { downloadAndStoreImages } from './supabase/functions/_shared/image-storage'

const listings = await supabase
  .from('listings')
  .select('id, listing_media(*)')
  .eq('listing_media.source', 'external')

for (const listing of listings) {
  const externalUrls = listing.listing_media.map(m => m.url)
  const stored = await downloadAndStoreImages(supabase, externalUrls, listing.id)
  
  // Update database with new URLs
  // ...
}
```

## Cost Estimation

Supabase Storage pricing:
- **Free tier**: 1GB storage
- **Pro**: 100GB included, $0.021/GB beyond
- **Bandwidth**: Unlimited on all paid plans

Estimated costs for 10,000 listings:
- 10 images per listing × 500KB average = 5GB per listing
- 10,000 listings = 50GB total
- Cost: Free tier (1GB) + 49GB × $0.021 = ~$1/month

## Security

### Access Control
- Images are public (required for web serving)
- No sensitive data should be in image filenames
- Service role key required for upload/delete operations

### Content Validation
- MIME type checking
- File size limits
- URL validation before download
- Content-type verification after download

### Rate Limiting
- Built-in DoS protection
- Per-function rate limiting in edge functions
- Storage API rate limits (1000 requests/second)

## Future Enhancements

- [ ] Automatic image resizing
- [ ] WebP/AVIF format conversion
- [ ] Blurhash generation for placeholders
- [ ] EXIF data stripping for privacy
- [ ] Duplicate image detection
- [ ] Automatic watermarking
- [ ] Image moderation/safety checks
