// Enhanced Supabase Edge Function using Perplexity Deep Research
// Automatically researches venues, validates images, and updates database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { downloadAndStoreImages } from '../_shared/image-storage.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VenueResearchRequest {
  venueName: string
  location: string
  city: string
  state: string
  serviceType?: string // 'venue', 'caterer', 'florist', 'photographer', etc.
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

  try {
    const { venueName, location, city, state, serviceType = 'venue', forceRefresh = false } =
      await req.json() as VenueResearchRequest

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if venue already exists (unless force refresh)
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('listings')
        .select('id, title')
        .ilike('title', `%${venueName}%`)
        .single()

      if (existing) {
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

    const venueData: PerplexityDeepVenueData = JSON.parse(
      perplexityData.choices[0].message.content
    )

    console.log(`Research complete: ${venueData.title}`)
    console.log(`Found ${venueData.image_urls?.length || 0} images`)

    // Save listing to database
    const listingData = {
      source_type: 'perplexity_deep_research',
      title: venueData.title,
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
    if (venueData.image_urls && venueData.image_urls.length > 0) {
      const storedImages = await downloadAndStoreImages(
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
          source: 'perplexity_research',
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
        images_found: validatedImages.length,
        packages_found: venueData.packages?.length || 0
      },
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        listing: {
          id: listing.id,
          title: venueData.title,
          images_count: validatedImages.length,
          packages_count: venueData.packages?.length || 0,
          tags_count: venueData.tags?.length || 0
        },
        message: `Venue "${venueData.title}" successfully researched and added with ${validatedImages.length} images`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase.from('sync_logs').insert({
      source: 'perplexity_deep_research',
      status: 'error',
      errors: error.message,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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
