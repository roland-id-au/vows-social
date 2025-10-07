// Enhanced Supabase Edge Function using Perplexity Deep Research
// Automatically researches venues, validates images, and updates database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { downloadAndStoreImages } from '../_shared/image-storage.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'
import { perplexityCache } from '../_shared/perplexity-cache.ts'
import { FirecrawlClient } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VendorEnrichmentRequest {
  discovery_id?: string // NEW: Pass discovery ID to enrich from queue
  venueName?: string     // OLD: Manual enrichment
  location?: string
  city?: string
  state?: string
  serviceType?: string
  forceRefresh?: boolean
}

interface PerplexityDeepVenueData {
  title: string
  description: string
  detailed_description: string
  style: string
  address: string
  city: string
  state: string
  postcode: string
  latitude: number
  longitude: number
  min_price: number
  max_price: number
  min_capacity: number
  max_capacity: number
  amenities: string[]
  tags: Array<{
    name: string
    category: 'style' | 'scenery' | 'experience' | 'amenity' | 'feature'
    icon?: string
  }>
  packages: Array<{
    name: string
    price: number
    description: string
    inclusions: string[]
  }>
  image_urls: string[]
  website?: string
  email?: string
  phone?: string
  instagram_handle?: string
  facebook_url?: string
  rating: number
  review_count: number
  highlights: string[]
  restrictions: string[]
  parking_details?: string
  accessibility_features: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let discoveryId: string | null = null // Declare outside try block so it's accessible in catch

  try {
    const requestBody = await req.json() as VendorEnrichmentRequest

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const discord = new DiscordLogger()

    let venueName: string
    let location: string
    let city: string
    let state: string
    let serviceType: string
    let forceRefresh: boolean

    // NEW APPROACH: If discovery_id provided, fetch from database
    if (requestBody.discovery_id) {
      discoveryId = requestBody.discovery_id

      console.log(`Enriching discovery: ${discoveryId}`)

      const { data: discovery, error } = await supabase
        .from('discovered_listings')
        .select('*')
        .eq('id', discoveryId)
        .single()

      if (error || !discovery) {
        console.error(`Discovery fetch error:`, error)
        throw new Error(`Discovery not found: ${discoveryId}`)
      }

      console.log(`Found discovery: ${discovery.name}`)

      // Update status to processing
      await supabase
        .from('discovered_listings')
        .update({
          enrichment_status: 'processing',
          enrichment_attempts: (discovery.enrichment_attempts || 0) + 1,
          last_enrichment_attempt: new Date().toISOString()
        })
        .eq('id', discoveryId)

      venueName = discovery.name
      location = discovery.location || discovery.city
      city = discovery.city
      state = discovery.state
      serviceType = discovery.type || 'venue'
      forceRefresh = false

      console.log(`Enriching: ${venueName} in ${city}, ${state}`)
    } else {
      // OLD APPROACH: Manual parameters
      venueName = requestBody.venueName!
      location = requestBody.location!
      city = requestBody.city!
      state = requestBody.state!
      serviceType = requestBody.serviceType || 'venue'
      forceRefresh = requestBody.forceRefresh || false
    }

    // Check if vendor already exists (unless force refresh)
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('listings')
        .select('id, title')
        .ilike('title', `%${venueName}%`)
        .single()

      if (existing) {
        // If this is from a discovery queue, link the discovery to the existing listing
        if (discoveryId) {
          // Fetch slug for the existing listing
          const { data: existingWithSlug } = await supabase
            .from('listings')
            .select('slug')
            .eq('id', existing.id)
            .single()

          await supabase
            .from('discovered_listings')
            .update({
              enrichment_status: 'enriched',
              listing_id: existing.id,
              researched_at: new Date().toISOString()
            })
            .eq('id', discoveryId)

          const vendorUrl = `https://vows.social/venues/${existingWithSlug?.slug || existing.id}`

          console.log(`✅ Linked discovery to existing listing: ${existing.title}`)

          return new Response(
            JSON.stringify({
              success: true,
              message: `Linked discovery to existing listing`,
              listingId: existing.id,
              vendorUrl
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Manual enrichment - require forceRefresh
        return new Response(
          JSON.stringify({
            success: false,
            message: `Venue "${existing.title}" already exists. Use forceRefresh=true to update.`,
            existingId: existing.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Call Perplexity Deep Research API
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!

    const structuredSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Official venue name'
        },
        description: {
          type: 'string',
          description: 'Brief 2-3 sentence description for listing cards'
        },
        detailed_description: {
          type: 'string',
          description: 'Comprehensive 3-4 paragraph description covering history, unique features, atmosphere, and what makes it special for weddings'
        },
        style: {
          type: 'string',
          enum: ['modern', 'rustic', 'beachfront', 'garden', 'industrial', 'vineyard', 'ballroom', 'barn', 'estate'],
          description: 'Primary venue style'
        },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        postcode: { type: 'string' },
        country: {
          type: 'string',
          default: 'Australia'
        },
        latitude: {
          type: 'number',
          description: 'Exact latitude coordinate'
        },
        longitude: {
          type: 'number',
          description: 'Exact longitude coordinate'
        },
        min_price: {
          type: 'integer',
          description: 'Minimum wedding package price in AUD'
        },
        max_price: {
          type: 'integer',
          description: 'Maximum wedding package price in AUD'
        },
        min_capacity: {
          type: 'integer',
          description: 'Minimum guest capacity'
        },
        max_capacity: {
          type: 'integer',
          description: 'Maximum guest capacity'
        },
        amenities: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of amenities like "Bridal suite", "Bar service", "Dance floor", etc.'
        },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: {
                type: 'string',
                enum: ['style', 'scenery', 'experience', 'amenity', 'feature']
              },
              icon: { type: 'string' }
            },
            required: ['name', 'category']
          },
          description: 'Categorized tags for filtering'
        },
        packages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'integer' },
              description: { type: 'string' },
              inclusions: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['name', 'price', 'inclusions']
          },
          description: 'Wedding packages offered'
        },
        image_urls: {
          type: 'array',
          items: { type: 'string' },
          minItems: 8,
          description: 'At least 8-12 high-quality image URLs from official sources (venue website, Instagram, Google Business). Must be valid, publicly accessible URLs.'
        },
        website: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        instagram_handle: { type: 'string' },
        facebook_url: { type: 'string' },
        instagram_posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              post_url: { type: 'string' },
              image_url: { type: 'string' },
              caption: { type: 'string' },
              posted_date: { type: 'string' }
            },
            required: ['image_url']
          },
          description: 'Recent Instagram posts featuring this venue (3-5 posts with wedding content)'
        },
        rating: {
          type: 'number',
          minimum: 0,
          maximum: 5,
          description: 'Average rating from reviews'
        },
        review_count: { type: 'integer' },
        highlights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key selling points couples love'
        },
        restrictions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Important restrictions (noise curfews, vendor requirements, etc.)'
        },
        parking_details: { type: 'string' },
        accessibility_features: {
          type: 'array',
          items: { type: 'string' },
          description: 'Wheelchair access, elevators, etc.'
        }
      },
      required: [
        'title', 'description', 'detailed_description', 'style',
        'address', 'city', 'state', 'postcode', 'latitude', 'longitude',
        'min_price', 'max_price', 'min_capacity', 'max_capacity',
        'amenities', 'tags', 'image_urls', 'rating', 'highlights'
      ]
    }

    console.log(`Starting deep research for: ${venueName} (${serviceType}) in ${location}`)

    // Service-specific prompts
    const serviceTypeLabels: Record<string, string> = {
      venue: 'wedding venue',
      caterer: 'wedding caterer',
      florist: 'wedding florist',
      photographer: 'wedding photographer',
      videographer: 'wedding videographer',
      musician: 'wedding musician/band/DJ',
      stylist: 'wedding stylist/event designer',
      planner: 'wedding planner/coordinator',
      decorator: 'wedding decorator',
      transport: 'wedding transport service',
      celebrant: 'wedding celebrant/officiant',
      cake: 'wedding cake designer',
      makeup: 'bridal makeup artist',
      hair: 'bridal hair stylist',
      entertainment: 'wedding entertainment',
      rentals: 'wedding rentals/equipment',
      stationery: 'wedding stationery designer',
      favors: 'wedding favors supplier',
      other_service: 'wedding service provider'
    }

    const serviceLabel = serviceTypeLabels[serviceType] || 'wedding service provider'

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Use pro model for deep research
        return_images: true, // Request image URLs from Perplexity
        return_citations: true,
        messages: [
          {
            role: 'system',
            content: `You are an expert wedding service researcher for Australia. Conduct DEEP, COMPREHENSIVE research on the given ${serviceLabel}.

YOUR TASK:
1. Find the business's official website, social media, and contact details
2. Research current pricing, packages, and service options from their latest information
3. Collect 8-12 HIGH-QUALITY, RECENT images from:
   - Official website gallery (use direct image URLs)
   - Instagram account (@handle if available)
   - Google Business Profile photos
   - Wedding blogs/features showcasing their work
   **IMPORTANT:** Provide direct image URLs (.jpg, .png, .webp) or Instagram CDN URLs
4. Find and include 3-5 recent Instagram posts featuring real weddings using this service
5. Identify exact location coordinates (city, state, country)
6. List all services offered, specialties, and unique selling points
7. Find reviews and ratings from Google, Facebook, WeddingWire, EasyWeddings
8. Note any policies, requirements, or important details couples should know

CRITICAL REQUIREMENTS FOR IMAGES:
- Minimum 8 images, preferably 10-12
- Use direct URLs from websites, Instagram CDN, or image hosts
- Images should showcase their best wedding work
- Verify all contact information is current
- Pricing must be in AUD and current (2024/2025 rates)
- Include recent Instagram posts with real wedding content

Be thorough, accurate, and up-to-date. This data will be used in a production app.`
          },
          {
            role: 'user',
            content: `Deep research "${venueName}" - a ${serviceLabel} located in ${city}, ${state}, Australia.

Find comprehensive details including:
- Exact address and GPS coordinates
- Current 2024/2025 pricing and packages
${serviceType === 'venue' ? '- Full capacity range' : '- Service offerings and options'}
- Complete services/features list
- 8-12 high-quality photos of their work (direct image URLs)
- Contact details (website, phone, email, Instagram)
- Recent ratings and reviews
- What makes this business unique for weddings
- Any requirements, policies, or important details

Location hint: ${location}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'deep_venue_research',
            schema: structuredSchema,
            strict: true
          }
        }
      })
    })

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text()
      throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`)
    }

    const perplexityData = await perplexityResponse.json()
    console.log('Perplexity response received')
    console.log('Response keys:', Object.keys(perplexityData))

    // Log if images field exists anywhere in response
    if (perplexityData.images) {
      console.log('Images found in response root:', perplexityData.images.length)
    }
    if (perplexityData.choices?.[0]?.images) {
      console.log('Images found in choices[0]:', perplexityData.choices[0].images.length)
    }

    // Extract structured venue data
    const venueData: PerplexityDeepVenueData = JSON.parse(
      perplexityData.choices[0].message.content
    )

    // Extract images from Perplexity metadata (return_images parameter)
    const perplexityImages = perplexityData.images || perplexityData.choices?.[0]?.images || []
    console.log(`Perplexity returned ${perplexityImages.length} images via return_images`)

    // Combine image URLs from both sources
    let allImageUrls = venueData.image_urls || []
    if (perplexityImages.length > 0) {
      const imageUrlsFromMetadata = perplexityImages.map((img: any) => img.url || img.imageUrl).filter(Boolean)
      allImageUrls = [...allImageUrls, ...imageUrlsFromMetadata]
      console.log(`Combined total: ${allImageUrls.length} images`)
    }

    // Update venueData with all images
    venueData.image_urls = allImageUrls

    console.log(`Research complete: ${venueData.title}`)
    console.log(`Found ${venueData.image_urls?.length || 0} images from Perplexity`)

    // If venue has a website, use Firecrawl to scrape for more images and packages
    if (venueData.website) {
      console.log(`🔍 Scraping website for additional content: ${venueData.website}`)

      const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!
      const firecrawl = new FirecrawlClient(firecrawlApiKey)

      const scrapedData = await firecrawl.scrapeVenueWebsite(venueData.website)

      if (scrapedData) {
        // Extract all image URLs from scraped data
        const firecrawlImages = firecrawl.extractAllImageUrls(scrapedData)
        console.log(`✅ Firecrawl found ${firecrawlImages.length} images from website`)

        // Merge Firecrawl images with Perplexity images
        const combinedImages = [...allImageUrls, ...firecrawlImages]
        const uniqueImages = [...new Set(combinedImages)] // Remove duplicates
        venueData.image_urls = uniqueImages

        console.log(`📸 Total unique images after Firecrawl: ${uniqueImages.length}`)

        // Merge packages from Firecrawl with Perplexity packages
        if (scrapedData.packages && scrapedData.packages.length > 0) {
          const existingPackageNames = new Set(venueData.packages?.map(p => p.name.toLowerCase()) || [])

          // Convert Firecrawl packages to our format
          const firecrawlPackages = scrapedData.packages
            .filter(pkg => !existingPackageNames.has(pkg.name.toLowerCase())) // Avoid duplicates
            .map(pkg => ({
              name: pkg.name,
              price: pkg.price ? parseFloat(pkg.price.replace(/[^0-9.]/g, '')) : 0,
              description: pkg.description || '',
              inclusions: pkg.inclusions || []
            }))

          if (firecrawlPackages.length > 0) {
            venueData.packages = [...(venueData.packages || []), ...firecrawlPackages]
            console.log(`📦 Added ${firecrawlPackages.length} packages from Firecrawl`)
          }
        }

        // Update contact info if Firecrawl found better data
        if (scrapedData.contact_email && !venueData.email) {
          venueData.email = scrapedData.contact_email
        }
        if (scrapedData.contact_phone && !venueData.phone) {
          venueData.phone = scrapedData.contact_phone
        }

        // Add features from Firecrawl
        if (scrapedData.features && scrapedData.features.length > 0) {
          const existingFeatures = new Set(venueData.amenities?.map(a => a.toLowerCase()) || [])
          const newFeatures = scrapedData.features.filter(f => !existingFeatures.has(f.toLowerCase()))
          if (newFeatures.length > 0) {
            venueData.amenities = [...(venueData.amenities || []), ...newFeatures]
            console.log(`✨ Added ${newFeatures.length} features from Firecrawl`)
          }
        }
      }
    } else {
      console.log('⚠️ No website URL found, skipping Firecrawl scraping')
    }

    console.log(`📊 Final stats: ${venueData.image_urls?.length || 0} images, ${venueData.packages?.length || 0} packages`)

    // Generate SEO-friendly slug: "venue-name-city-state"
    const generateSlug = (title: string, city: string, state: string): string => {
      const slugText = `${title}-${city}-${state}`
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Replace multiple hyphens with single
        .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens

      return slugText
    }

    const slug = generateSlug(venueData.title, venueData.city, venueData.state)
    console.log(`Generated slug: ${slug}`)

    // Save listing to database
    const listingData = {
      source_type: 'perplexity_deep_research',
      title: venueData.title,
      slug: slug,
      description: venueData.detailed_description || venueData.description,
      category: serviceType,
      service_type: serviceLabel,
      style: venueData.style,
      country: venueData.country || 'Australia',
      location_data: {
        address: venueData.address,
        city: venueData.city,
        state: venueData.state,
        postcode: venueData.postcode,
        country: venueData.country || 'Australia',
        latitude: venueData.latitude,
        longitude: venueData.longitude
      },
      price_data: {
        min_price: venueData.min_price,
        max_price: venueData.max_price,
        currency: 'AUD',
        price_unit: 'per event'
      },
      min_capacity: venueData.min_capacity,
      max_capacity: venueData.max_capacity,
      amenities: venueData.amenities,
      rating: venueData.rating,
      review_count: venueData.review_count,
      website: venueData.website,
      phone: venueData.phone,
      email: venueData.email,
      instagram_handle: venueData.instagram_handle,
      facebook_url: venueData.facebook_url,
      metadata: {
        highlights: venueData.highlights,
        restrictions: venueData.restrictions,
        parking_details: venueData.parking_details,
        accessibility_features: venueData.accessibility_features
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingData)
      .select()
      .single()

    if (listingError) {
      throw new Error(`Database error: ${listingError.message}`)
    }

    console.log(`Venue saved with ID: ${listing.id}`)

    // Download and store images in Supabase Storage
    let storedImages: any[] = []
    if (venueData.image_urls && venueData.image_urls.length > 0) {
      storedImages = await downloadAndStoreImages(
        supabase,
        venueData.image_urls,
        listing.id,
        10 // max 10 images
      )

      if (storedImages.length < 3) {
        console.warn(`Warning: Only ${storedImages.length} images successfully stored`)
      }

      // Save image records to database
      if (storedImages.length > 0) {
        const mediaRecords = storedImages.map((img, index) => ({
          listing_id: listing.id,
          media_type: 'image',
          url: img.url,
          source: 'web_scraping', // Combined from Perplexity + Firecrawl
          order_index: index,
          metadata: {
            size: img.size,
            content_type: img.contentType,
            storage_path: img.path
          }
        }))

        const { error: mediaError } = await supabase
          .from('listing_media')
          .insert(mediaRecords)

        if (mediaError) {
          console.error('Error saving image records:', mediaError)
        } else {
          console.log(`Saved ${mediaRecords.length} images to Supabase Storage`)
        }
      }
    }

    // Save packages
    if (venueData.packages && venueData.packages.length > 0) {
      const packageRecords = venueData.packages.map(pkg => ({
        listing_id: listing.id,
        name: pkg.name,
        price: pkg.price,
        description: pkg.description,
        inclusions: pkg.inclusions
      }))

      await supabase.from('packages').insert(packageRecords)
      console.log(`Saved ${packageRecords.length} packages`)
    }

    // Save tags
    if (venueData.tags && venueData.tags.length > 0) {
      // Upsert tags first
      for (const tag of venueData.tags) {
        await supabase
          .from('tags')
          .upsert({
            name: tag.name,
            category: tag.category,
            icon: tag.icon
          }, {
            onConflict: 'name'
          })
      }

      // Link tags to listing
      const tagLinks = venueData.tags.map(tag => ({
        listing_id: listing.id,
        tag_name: tag.name
      }))

      await supabase.from('listing_tags').insert(tagLinks)
      console.log(`Saved ${tagLinks.length} tags`)
    }

    // Save Instagram posts
    if (venueData.instagram_posts && venueData.instagram_posts.length > 0) {
      const instagramRecords = venueData.instagram_posts.map((post, index) => ({
        listing_id: listing.id,
        post_id: `generated_${listing.id}_${index}`, // Generate ID since we may not have actual post IDs
        image_url: post.image_url,
        caption: post.caption || '',
        username: venueData.instagram_handle || 'unknown',
        posted_at: post.posted_date || new Date().toISOString()
      }))

      const { error: instaError } = await supabase
        .from('instagram_posts')
        .insert(instagramRecords)
        .select()

      if (instaError) {
        console.error('Error saving Instagram posts:', instaError)
      } else {
        console.log(`Saved ${instagramRecords.length} Instagram posts`)
      }
    }

    // Log successful research
    await supabase.from('sync_logs').insert({
      source: 'perplexity_deep_research',
      status: 'success',
      records_processed: 1,
      metadata: {
        venue_id: listing.id,
        venue_name: venueData.title,
        images_found: storedImages.length,
        packages_found: venueData.packages?.length || 0
      },
      timestamp: new Date().toISOString()
    })

    // Update discovery status if this was from queue
    if (discoveryId) {
      await supabase
        .from('discovered_listings')
        .update({
          enrichment_status: 'enriched',
          listing_id: listing.id,
          researched_at: new Date().toISOString()
        })
        .eq('id', discoveryId)

      const vendorUrl = `https://vows.social/venues/${slug}`

      await discord.success(`✅ Enriched: ${venueData.title}`, {
        'Images': storedImages.length.toString(),
        'Packages': (venueData.packages?.length || 0).toString(),
        'View': vendorUrl
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        listing: {
          id: listing.id,
          title: venueData.title,
          images_count: storedImages.length,
          packages_count: venueData.packages?.length || 0,
          tags_count: venueData.tags?.length || 0,
          primary_image_url: storedImages[0] || null
        },
        message: `Vendor "${venueData.title}" successfully enriched with ${storedImages.length} images`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Error:', error)

    const errorMessage = error?.message || error?.toString() || 'Unknown error'

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const discord = new DiscordLogger()

    // Update discovery status if this was from queue
    if (discoveryId) {
      try {
        await supabase
          .from('discovered_listings')
          .update({
            enrichment_status: 'failed'
          })
          .eq('id', discoveryId)

        await discord.error(`Enrichment failed: ${errorMessage}`)
      } catch (e) {
        console.error('Failed to update discovery status:', e)
      }
    }

    try {
      await supabase.from('sync_logs').insert({
        source: 'perplexity_deep_research',
        status: 'error',
        errors: errorMessage,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('Failed to insert sync log:', e)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Helper function to validate image URLs
async function validateImages(urls: string[]): Promise<string[]> {
  const validUrls: string[] = []

  for (const url of urls) {
    try {
      // Check if URL is well-formed
      const parsedUrl = new URL(url)

      // Basic validation: must be http/https and look like an image URL
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        const path = parsedUrl.pathname.toLowerCase()
        const hasImageExtension = path.match(/\.(jpg|jpeg|png|gif|webp)/)
        const isImageHost = parsedUrl.hostname.includes('instagram') ||
                           parsedUrl.hostname.includes('facebook') ||
                           parsedUrl.hostname.includes('google') ||
                           parsedUrl.hostname.includes('cloudinary') ||
                           parsedUrl.hostname.includes('imgix')

        // Accept if it has image extension OR is from known image hosting
        if (hasImageExtension || isImageHost) {
          validUrls.push(url)
          console.log(`✓ Valid image: ${url.substring(0, 80)}...`)
        } else {
          console.warn(`✗ No image extension: ${url.substring(0, 80)}`)
        }
      }
    } catch (error) {
      console.warn(`✗ Invalid URL format: ${url}`)
    }
  }

  console.log(`Image validation: ${validUrls.length}/${urls.length} valid`)
  return validUrls
}
