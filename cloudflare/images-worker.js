/**
 * Cloudflare Worker for images.vows.social
 * Proxies Supabase Storage with CDN caching and image optimization
 */

// Configuration
const SUPABASE_PROJECT_ID = 'nidbhgqeyhrudtnizaya'
const SUPABASE_STORAGE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public`
const STORAGE_BUCKET = 'listing-images'

// Cache settings
const CACHE_TTL = 604800 // 7 days in seconds
const BROWSER_CACHE_TTL = 86400 // 1 day in seconds

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // Health check endpoint
  if (path === '/health') {
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // Remove leading slash
  const imagePath = path.replace(/^\//, '')

  // Construct Supabase Storage URL
  const supabaseUrl = `${SUPABASE_STORAGE_URL}/${STORAGE_BUCKET}/${imagePath}`

  console.log(`[Image Request] ${imagePath}`)

  try {
    // Check if we should optimize the image
    const acceptHeader = request.headers.get('Accept') || ''
    const supportsWebP = acceptHeader.includes('image/webp')
    const supportsAVIF = acceptHeader.includes('image/avif')

    // Parse query parameters for image transformations
    const width = url.searchParams.get('w') || url.searchParams.get('width')
    const quality = url.searchParams.get('q') || url.searchParams.get('quality') || '85'
    const format = url.searchParams.get('format')

    // Fetch from Supabase Storage with Cloudflare optimizations
    const fetchOptions = {
      cf: {
        // Cache everything for 7 days
        cacheTtl: CACHE_TTL,
        cacheEverything: true,

        // Image optimization (Cloudflare Polish)
        image: {
          // Convert to optimal format
          format: format || (supportsAVIF ? 'avif' : supportsWebP ? 'webp' : 'auto'),
          // Set quality
          quality: parseInt(quality, 10),
          // Set width if specified
          ...(width && { width: parseInt(width, 10) }),
          // Enable metadata stripping
          metadata: 'none',
          // Enable compression
          compression: 'fast'
        },

        // Additional performance settings
        polish: 'lossy',
        minify: {
          javascript: false,
          css: false,
          html: false
        }
      }
    }

    const response = await fetch(supabaseUrl, fetchOptions)

    // If not found, return 404
    if (!response.ok) {
      console.log(`[Not Found] ${imagePath}`)
      return new Response('Image not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=60'
        }
      })
    }

    // Clone response to modify headers
    const modifiedResponse = new Response(response.body, response)

    // Add custom headers
    modifiedResponse.headers.set('Cache-Control', `public, max-age=${BROWSER_CACHE_TTL}, immutable`)
    modifiedResponse.headers.set('X-Content-Type-Options', 'nosniff')
    modifiedResponse.headers.set('X-Image-Source', 'Supabase Storage')
    modifiedResponse.headers.set('X-CDN', 'Cloudflare')

    // Add CORS headers
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    modifiedResponse.headers.set('Access-Control-Max-Age', '86400')

    // Add timing header for debugging
    modifiedResponse.headers.set('X-Cache', response.headers.get('cf-cache-status') || 'MISS')

    console.log(`[Success] ${imagePath} - Cache: ${response.headers.get('cf-cache-status')}`)

    return modifiedResponse

  } catch (error) {
    console.error(`[Error] ${imagePath}: ${error.message}`)

    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache'
      }
    })
  }
}

// Handle OPTIONS requests for CORS
addEventListener('fetch', event => {
  if (event.request.method === 'OPTIONS') {
    event.respondWith(handleOptions(event.request))
  }
})

function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}
