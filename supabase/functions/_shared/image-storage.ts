/**
 * Image Storage Helper for Supabase Edge Functions
 * Downloads external images and uploads them to Supabase Storage
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET_NAME = 'listing-images'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Image quality thresholds for all vendor types (venues, catering, photography, etc.)
const MIN_WIDTH = 600 // Minimum width for professional vendor photos
const MIN_HEIGHT = 400 // Minimum height for professional vendor photos
const MIN_ASPECT_RATIO = 0.5 // Reject images that are too narrow/tall (e.g., banners)
const MAX_ASPECT_RATIO = 3.0 // Reject images that are too wide (e.g., banners, headers)

export interface ImageUploadResult {
  url: string
  path: string
  size: number
  contentType: string
  width?: number
  height?: number
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
  }
}

interface ImageDimensions {
  width: number
  height: number
}

/**
 * Extract image dimensions from image buffer
 * Supports JPEG, PNG, WebP, GIF
 */
function getImageDimensions(buffer: ArrayBuffer, contentType: string): ImageDimensions | null {
  const view = new DataView(buffer)

  try {
    if (contentType === 'image/jpeg') {
      // JPEG: Find SOF0 marker (0xFFC0)
      let offset = 2 // Skip JPEG header
      while (offset < buffer.byteLength) {
        if (view.getUint8(offset) === 0xFF) {
          const marker = view.getUint8(offset + 1)
          if (marker === 0xC0 || marker === 0xC2) {
            // SOF0 or SOF2 found
            const height = view.getUint16(offset + 5, false)
            const width = view.getUint16(offset + 7, false)
            return { width, height }
          }
          // Skip to next marker
          offset += 2 + view.getUint16(offset + 2, false)
        } else {
          offset++
        }
      }
    } else if (contentType === 'image/png') {
      // PNG: IHDR chunk at offset 16
      if (view.getUint32(0, false) === 0x89504E47) {
        const width = view.getUint32(16, false)
        const height = view.getUint32(20, false)
        return { width, height }
      }
    } else if (contentType === 'image/gif') {
      // GIF: dimensions at offset 6-10
      if (view.getUint8(0) === 0x47 && view.getUint8(1) === 0x49 && view.getUint8(2) === 0x46) {
        const width = view.getUint16(6, true)
        const height = view.getUint16(8, true)
        return { width, height }
      }
    } else if (contentType === 'image/webp') {
      // WebP: more complex, check RIFF header
      if (view.getUint32(0, false) === 0x52494646 && view.getUint32(8, false) === 0x57454250) {
        // Simplified: look for VP8 dimensions
        const width = view.getUint16(26, true) & 0x3FFF
        const height = view.getUint16(28, true) & 0x3FFF
        return { width, height }
      }
    }
  } catch (e) {
    console.error('Error extracting dimensions:', e)
  }

  return null
}

/**
 * Check if image meets quality standards for vendor photos
 * Applies to all vendor types: venues, catering, photography, videography, makeup, etc.
 */
function isQualityVendorImage(dimensions: ImageDimensions | null, size: number): { pass: boolean; reason?: string } {
  if (!dimensions) {
    return { pass: false, reason: 'Unable to determine dimensions' }
  }

  const { width, height } = dimensions

  // Check minimum dimensions
  if (width < MIN_WIDTH) {
    return { pass: false, reason: `Width too small (${width}px < ${MIN_WIDTH}px)` }
  }

  if (height < MIN_HEIGHT) {
    return { pass: false, reason: `Height too small (${height}px < ${MIN_HEIGHT}px)` }
  }

  // Check aspect ratio (avoid banners, logos, etc.)
  const aspectRatio = width / height
  if (aspectRatio < MIN_ASPECT_RATIO) {
    return { pass: false, reason: `Aspect ratio too narrow (${aspectRatio.toFixed(2)})` }
  }

  if (aspectRatio > MAX_ASPECT_RATIO) {
    return { pass: false, reason: `Aspect ratio too wide (${aspectRatio.toFixed(2)}) - likely banner/header` }
  }

  // Check file size relative to dimensions (detect low-quality/overly compressed images)
  const pixelCount = width * height
  const bytesPerPixel = size / pixelCount

  if (bytesPerPixel < 0.05) {
    return { pass: false, reason: 'Image quality too low (over-compressed)' }
  }

  // Very small file size for large dimensions often indicates graphics/logos
  if (width > 1000 && height > 1000 && size < 50000) {
    return { pass: false, reason: 'Likely logo or graphic (low file size for dimensions)' }
  }

  return { pass: true }
}

/**
 * Download an image from a URL and upload it to Supabase Storage
 */
export async function downloadAndStoreImage(
  supabase: any,
  imageUrl: string,
  listingId: string,
  index: number,
  vendorNameSlug?: string
): Promise<ImageUploadResult | null> {
  try {
    console.log(`Downloading image ${index + 1}: ${imageUrl.substring(0, 80)}...`)

    // Download the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VowsSocial/1.0; +https://vows.social)'
      }
    })

    if (!response.ok) {
      console.error(`Failed to download image: HTTP ${response.status}`)
      return null
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
      console.error(`Invalid content type: ${contentType}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const size = arrayBuffer.byteLength

    if (size > MAX_IMAGE_SIZE) {
      console.error(`Image too large: ${size} bytes (max ${MAX_IMAGE_SIZE})`)
      return null
    }

    // Check image dimensions and quality
    const dimensions = getImageDimensions(arrayBuffer, contentType)
    const qualityCheck = isQualityVendorImage(dimensions, size)

    if (!qualityCheck.pass) {
      console.log(`⏭️  Skipping image: ${qualityCheck.reason}`)
      if (dimensions) {
        console.log(`   Dimensions: ${dimensions.width}x${dimensions.height}px, Size: ${(size / 1024).toFixed(2)} KB`)
      }
      return null
    }

    console.log(`✅ Quality check passed: ${dimensions!.width}x${dimensions!.height}px`)

    // Generate SEO-friendly filename
    const extension = contentType.split('/')[1]
    const timestamp = Date.now()

    // Use vendor name slug if provided, otherwise fall back to listing ID
    let filename: string
    if (vendorNameSlug) {
      // SEO-friendly: vendor-name-city/image-001.jpg
      filename = `${vendorNameSlug}/${vendorNameSlug}-${String(index + 1).padStart(3, '0')}.${extension}`
    } else {
      // Fallback: listing-id/timestamp-index-random.jpg
      const random = Math.random().toString(36).substring(7)
      filename = `${listingId}/${timestamp}-${index}-${random}.${extension}`
    }

    console.log(`Uploading to storage: ${filename} (${(size / 1024).toFixed(2)} KB)`)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, arrayBuffer, {
        contentType,
        cacheControl: '31536000', // 1 year
        upsert: false
      })

    if (error) {
      console.error(`Storage upload error: ${error.message}`)
      return null
    }

    // Use CDN URL for better performance, caching, and custom domain
    // Images served from https://images.vows.social via Cloudflare Worker
    const cdnUrl = `https://images.vows.social/${filename}`

    console.log(`✅ Uploaded successfully: ${cdnUrl}`)

    return {
      url: cdnUrl,
      path: filename,
      size,
      contentType,
      width: dimensions?.width,
      height: dimensions?.height
    }
  } catch (error) {
    console.error(`Error processing image ${index + 1}:`, error)
    return null
  }
}

/**
 * Download and store multiple images
 */
export async function downloadAndStoreImages(
  supabase: any,
  imageUrls: string[],
  listingId: string,
  maxImages: number = 10,
  vendorNameSlug?: string
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = []
  const urlsToProcess = imageUrls.slice(0, maxImages)

  console.log(`Processing ${urlsToProcess.length} images for ${vendorNameSlug || listingId}`)

  for (let i = 0; i < urlsToProcess.length; i++) {
    const result = await downloadAndStoreImage(supabase, urlsToProcess[i], listingId, i, vendorNameSlug)

    if (result) {
      results.push(result)
    }

    // Rate limiting between downloads
    if (i < urlsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  console.log(`Successfully stored ${results.length}/${urlsToProcess.length} images`)

  return results
}

/**
 * Delete all images for a listing
 */
export async function deleteListingImages(
  supabase: any,
  listingId: string
): Promise<boolean> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(listingId)

    if (listError || !files || files.length === 0) {
      return true
    }

    const filePaths = files.map((file: any) => `${listingId}/${file.name}`)

    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths)

    if (deleteError) {
      console.error(`Error deleting images: ${deleteError.message}`)
      return false
    }

    console.log(`Deleted ${filePaths.length} images for listing ${listingId}`)
    return true
  } catch (error) {
    console.error(`Error deleting listing images:`, error)
    return false
  }
}
