// Supabase Edge Function for venue research using Perplexity API
// Deploy this to Supabase Edge Functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VenueResearchRequest {
  venueName: string
  location: string
}

interface PerplexityVenueData {
  title: string
  description: string
  style: string
  address: string
  city: string
  state: string
  postcode?: string
  latitude: number
  longitude: number
  min_price: number
  max_price: number
  min_capacity: number
  max_capacity: number
  amenities: string[]
  tags: Array<{ name: string; category: string }>
  image_urls: string[]
  website?: string
  phone?: string
  rating?: number
  review_count?: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { venueName, location } = await req.json() as VenueResearchRequest

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call Perplexity API
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!

    const structuredOutput = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        style: {
          type: 'string',
          enum: ['modern', 'rustic', 'beachfront', 'garden', 'industrial', 'vineyard', 'ballroom', 'barn', 'estate']
        },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        postcode: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        min_price: { type: 'integer' },
        max_price: { type: 'integer' },
        min_capacity: { type: 'integer' },
        max_capacity: { type: 'integer' },
        amenities: {
          type: 'array',
          items: { type: 'string' }
        },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string' }
            }
          }
        },
        image_urls: {
          type: 'array',
          items: { type: 'string' }
        },
        website: { type: 'string' },
        phone: { type: 'string' },
        rating: { type: 'number' },
        review_count: { type: 'integer' }
      },
      required: [
        'title', 'description', 'style', 'address', 'city', 'state',
        'latitude', 'longitude', 'min_price', 'max_price',
        'min_capacity', 'max_capacity', 'amenities', 'tags'
      ]
    }

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a wedding venue research assistant. Research the given venue and return comprehensive details in the specified JSON format. Include:
- Full venue name and detailed description
- Exact address with coordinates
- Price range in AUD for wedding packages
- Guest capacity range
- Style (modern, rustic, beachfront, garden, industrial, vineyard, ballroom, barn, estate)
- Complete list of amenities and features
- Relevant tags with categories (style, scenery, experience, amenity, feature)
- High-quality image URLs from the venue's official sources (at least 5-10 images)
- Contact information
- Rating and review count if available

Be thorough and accurate. Use real-time web search to get the most current information.`
          },
          {
            role: 'user',
            content: `Research "${venueName}" wedding venue in ${location}, Australia. Provide comprehensive details including pricing, capacity, amenities, high-quality photos, and contact information.`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'venue_research',
            schema: structuredOutput
          }
        }
      })
    })

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`)
    }

    const perplexityData = await perplexityResponse.json()
    const venueData: PerplexityVenueData = JSON.parse(
      perplexityData.choices[0].message.content
    )

    // Save venue to Supabase
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        source_type: 'perplexity',
        title: venueData.title,
        description: venueData.description,
        category: 'venue',
        style: venueData.style,
        location_data: {
          address: venueData.address,
          city: venueData.city,
          state: venueData.state,
          postcode: venueData.postcode || '',
          country: 'Australia',
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
        rating: venueData.rating || 4.5,
        review_count: venueData.review_count || 0,
        website: venueData.website,
        phone: venueData.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (listingError) {
      throw listingError
    }

    // Save images to listing_media table
    if (venueData.image_urls && venueData.image_urls.length > 0) {
      const mediaRecords = venueData.image_urls.map((url, index) => ({
        listing_id: listing.id,
        media_type: 'image',
        url: url,
        source: 'perplexity',
        order: index
      }))

      await supabase.from('listing_media').insert(mediaRecords)
    }

    // Save tags
    if (venueData.tags && venueData.tags.length > 0) {
      // First, ensure tags exist in the tags table
      for (const tag of venueData.tags) {
        await supabase
          .from('tags')
          .upsert({
            name: tag.name,
            category: tag.category
          }, {
            onConflict: 'name'
          })
      }

      // Then link tags to the listing
      const tagLinks = venueData.tags.map(tag => ({
        listing_id: listing.id,
        tag_name: tag.name
      }))

      await supabase.from('listing_tags').insert(tagLinks)
    }

    // Log successful sync
    await supabase.from('sync_logs').insert({
      source: 'perplexity',
      status: 'success',
      records_processed: 1,
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        listing: listing,
        message: `Venue "${venueData.title}" successfully researched and added`
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
      source: 'perplexity',
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
