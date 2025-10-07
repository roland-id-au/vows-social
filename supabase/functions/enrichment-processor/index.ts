/**
 * Enrichment Queue Processor
 * Processes one enrichment task at a time from the enrichment_queue
 * Calls Perplexity + Firecrawl to enrich vendor data, creates publishing task
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { downloadAndStoreImages } from '../_shared/image-storage.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'
import { FirecrawlClient } from '../_shared/firecrawl-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EnrichmentTask {
  id: string
  discovery_id: string
  vendor_name: string
  location: string
  city: string
  country: string
  service_type: string
  website: string | null
  attempts: number
  max_attempts: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  const discord = new DiscordLogger()

  let taskId: string | null = null

  try {
    // Get next pending enrichment task
    const { data: task, error: taskError } = await supabase
      .rpc('get_next_enrichment_task')
      .single() as { data: EnrichmentTask | null, error: any }

    if (taskError || !task) {
      console.log('No pending enrichment tasks')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending tasks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    taskId = task.id
    console.log(`Processing enrichment task ${task.id}: ${task.vendor_name}`)

    const startTime = Date.now()

    // Mark as processing
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'processing',
        attempts: task.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Check if vendor already exists
    const { data: existing } = await supabase
      .from('listings')
      .select('id, title, slug')
      .ilike('title', `%${task.vendor_name}%`)
      .eq('location_data->>city', task.city)
      .single()

    if (existing) {
      console.log(`Vendor already exists: ${existing.title}`)

      // Link discovery to existing listing
      await supabase
        .from('discovered_listings')
        .update({
          enrichment_status: 'enriched',
          listing_id: existing.id
        })
        .eq('id', task.discovery_id)

      // Mark task as skipped
      await supabase
        .from('enrichment_queue')
        .update({
          status: 'skipped',
          listing_id: existing.id,
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id)

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          listing_id: existing.id,
          listing_slug: existing.slug
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Perplexity for deep research
    const perplexityStart = Date.now()
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!

    const structuredSchema = {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Official vendor/business name' },
        description: { type: 'string', description: 'Brief 1-2 sentence description' },
        detailed_description: { type: 'string', description: 'Comprehensive 3-4 paragraph description' },
        style: { type: 'string', description: 'Business style (e.g., Modern, Rustic, Classic, Contemporary)' },
        address: { type: 'string', description: 'Full street address' },
        city: { type: 'string' },
        state: { type: 'string' },
        postcode: { type: 'string' },
        country: { type: 'string', default: 'Australia' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        min_price: { type: 'number', description: 'Minimum package price in AUD' },
        max_price: { type: 'number', description: 'Maximum package price in AUD' },
        min_capacity: { type: 'number' },
        max_capacity: { type: 'number' },
        amenities: { type: 'array', items: { type: 'string' } },
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string', enum: ['style', 'scenery', 'experience', 'amenity', 'feature'] },
              icon: { type: 'string' }
            },
            required: ['name', 'category']
          }
        },
        packages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
              description: { type: 'string' },
              inclusions: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'price']
          }
        },
        image_urls: { type: 'array', items: { type: 'string' } },
        website: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        instagram_handle: { type: 'string' },
        facebook_url: { type: 'string' },
        rating: { type: 'number' },
        review_count: { type: 'number' },
        highlights: { type: 'array', items: { type: 'string' } },
        restrictions: { type: 'array', items: { type: 'string' } },
        parking_details: { type: 'string' },
        accessibility_features: { type: 'array', items: { type: 'string' } },
        slug_suggestions: {
          type: 'array',
          description: '3-5 SEO-friendly URL slug suggestions in order of preference (lowercase, hyphenated, unique identifiers). Examples: "gunners-barracks-mosman-nsw", "gunners-barracks-wedding-venue-mosman", "gunners-barracks-sydney-harbour"',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5
        }
      },
      required: ['title', 'description', 'city', 'state', 'latitude', 'longitude', 'slug_suggestions', 'image_urls']
    }

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        return_images: true,
        return_citations: true,
        messages: [
          {
            role: 'system',
            content: `You are an expert wedding vendor researcher. Conduct comprehensive research including official website, pricing, capacity, features, and contact details.`
          },
          {
            role: 'user',
            content: `Deep research "${task.vendor_name}" - a ${task.service_type} located in ${task.city}, ${task.country}. Find exact address, GPS coordinates, current 2024/2025 pricing, capacity, features, contact details, and website URL.`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'deep_vendor_research',
            schema: structuredSchema,
            strict: true
          }
        }
      })
    })

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`)
    }

    const perplexityData = await perplexityResponse.json()
    const venueData = JSON.parse(perplexityData.choices[0].message.content)
    const perplexityDuration = Date.now() - perplexityStart

    console.log(`Perplexity research complete: ${venueData.title} (${perplexityDuration}ms)`)

    // Firecrawl scraping if website available
    let firecrawlDuration = 0
    if (venueData.website) {
      const firecrawlStart = Date.now()
      console.log(`Scraping website: ${venueData.website}`)

      const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!
      const firecrawl = new FirecrawlClient(firecrawlApiKey)

      const scrapedData = await firecrawl.scrapeVendorWebsite(venueData.website)

      if (scrapedData) {
        const firecrawlImages = firecrawl.extractAllImageUrls(scrapedData)
        const allImages = [...(venueData.image_urls || []), ...firecrawlImages]
        venueData.image_urls = [...new Set(allImages)] // Remove duplicates

        // Merge packages
        if (scrapedData.packages && scrapedData.packages.length > 0) {
          const existingNames = new Set(venueData.packages?.map(p => p.name.toLowerCase()) || [])
          const newPackages = scrapedData.packages
            .filter(pkg => !existingNames.has(pkg.name.toLowerCase()))
            .map(pkg => ({
              name: pkg.name,
              price: pkg.price ? parseFloat(pkg.price.replace(/[^0-9.]/g, '')) : 0,
              description: pkg.description || '',
              inclusions: pkg.inclusions || []
            }))

          venueData.packages = [...(venueData.packages || []), ...newPackages]
        }

        // Update contact info
        if (scrapedData.contact_email && !venueData.email) venueData.email = scrapedData.contact_email
        if (scrapedData.contact_phone && !venueData.phone) venueData.phone = scrapedData.contact_phone

        // Add features
        if (scrapedData.features) {
          const existingFeatures = new Set(venueData.amenities?.map(a => a.toLowerCase()) || [])
          const newFeatures = scrapedData.features.filter(f => !existingFeatures.has(f.toLowerCase()))
          venueData.amenities = [...(venueData.amenities || []), ...newFeatures]
        }

        firecrawlDuration = Date.now() - firecrawlStart
        console.log(`Firecrawl complete: ${venueData.image_urls.length} images (${firecrawlDuration}ms)`)
      }
    }

    // Select unique slug from Perplexity suggestions
    const cleanSlug = (s: string): string => {
      return s
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }

    const generateBaseSlug = (title: string, city: string, state: string): string => {
      return cleanSlug(`${title}-${city}-${state}`)
    }

    // Try Perplexity suggestions first (best for SEO)
    let slug: string | null = null
    let slugSource = 'perplexity'

    if (venueData.slug_suggestions && venueData.slug_suggestions.length > 0) {
      console.log(`Trying ${venueData.slug_suggestions.length} Perplexity slug suggestions...`)

      for (const suggestion of venueData.slug_suggestions) {
        const cleanedSuggestion = cleanSlug(suggestion)

        // Check if this slug is available
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('slug', cleanedSuggestion)
          .maybeSingle()

        if (!existing) {
          slug = cleanedSuggestion
          console.log(`✅ Selected slug: "${slug}" (Perplexity suggestion)`)
          break
        } else {
          console.log(`   ⏭️  Slug "${cleanedSuggestion}" already taken`)
        }
      }
    }

    // Fallback: Generate from title+city+state if all suggestions taken
    if (!slug) {
      slugSource = 'generated'
      let baseSlug = generateBaseSlug(venueData.title, venueData.city, venueData.state)
      let slugSuffix = 1
      let isUnique = false

      slug = baseSlug

      while (!isUnique) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

        if (!existing) {
          isUnique = true
        } else {
          slug = `${baseSlug}-${slugSuffix}`
          slugSuffix++
        }
      }

      console.log(`⚠️  Generated fallback slug: "${slug}" (all Perplexity suggestions were taken)`)
    }

    // Save listing to database
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        source_type: 'enrichment_pipeline',
        title: venueData.title,
        slug: slug,
        description: venueData.detailed_description || venueData.description,
        category: task.service_type,
        service_type: task.service_type,
        style: venueData.style,
        country: 'Australia',
        location_data: {
          address: venueData.address,
          city: venueData.city,
          state: venueData.state,
          postcode: venueData.postcode,
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
        }
      })
      .select()
      .single()

    if (listingError) {
      throw new Error(`Database error: ${listingError.message}`)
    }

    console.log(`Listing saved: ${listing.id}`)

    // Download and store images
    const storageStart = Date.now()
    let storedImages: any[] = []

    if (venueData.image_urls && venueData.image_urls.length > 0) {
      storedImages = await downloadAndStoreImages(
        supabase,
        venueData.image_urls,
        listing.id,
        12, // max 12 images
        slug // SEO-friendly filenames
      )

      if (storedImages.length > 0) {
        const mediaRecords = storedImages.map((img, index) => ({
          listing_id: listing.id,
          media_type: 'image',
          url: img.url,
          source: 'web_scraping',
          order: index,
          width: img.width,
          height: img.height,
          // Title and alt_text will be auto-generated by database trigger
          // based on vendor name, city, and image index
          tags: [
            task.service_type,
            venueData.city,
            venueData.style
          ].filter(Boolean)
        }))

        const { error: mediaError } = await supabase.from('listing_media').insert(mediaRecords)
        if (mediaError) {
          console.error(`Failed to insert images: ${mediaError.message}`)
          throw new Error(`Image storage failed: ${mediaError.message}`)
        }
      }
    }

    const storageDuration = Date.now() - storageStart

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
    }

    // Save tags
    if (venueData.tags && venueData.tags.length > 0) {
      for (const tag of venueData.tags) {
        await supabase.from('tags').upsert({ name: tag.name, category: tag.category, icon: tag.icon }, { onConflict: 'name' })
      }

      const tagLinks = venueData.tags.map(tag => ({ listing_id: listing.id, tag_name: tag.name }))
      await supabase.from('listing_tags').insert(tagLinks)
    }

    // Update discovered_listings
    await supabase
      .from('discovered_listings')
      .update({
        enrichment_status: 'enriched',
        listing_id: listing.id,
        researched_at: new Date().toISOString()
      })
      .eq('id', task.discovery_id)

    // Mark enrichment task as completed
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'completed',
        listing_id: listing.id,
        images_found: storedImages.length,
        packages_found: venueData.packages?.length || 0,
        perplexity_duration_ms: perplexityDuration,
        firecrawl_duration_ms: firecrawlDuration,
        storage_duration_ms: storageDuration,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Create publishing task
    await supabase
      .from('publishing_queue')
      .insert({
        listing_id: listing.id,
        channels: ['discord'],
        priority: 5,
        scheduled_for: new Date().toISOString()
      })

    const totalDuration = Date.now() - startTime

    console.log(`✅ Enrichment complete: ${storedImages.length} images, ${venueData.packages?.length || 0} packages (${totalDuration}ms)`)

    await discord.success(
      `Enrichment complete: ${task.vendor_name}`,
      {
        'City': task.city,
        'Type': task.service_type,
        'Images': storedImages.length.toString(),
        'Packages': (venueData.packages?.length || 0).toString(),
        'Duration': `${Math.round(totalDuration / 1000)}s`
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        listing_id: listing.id,
        listing_slug: slug,
        images_count: storedImages.length,
        packages_count: venueData.packages?.length || 0,
        duration_ms: totalDuration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enrichment processor error:', error)

    // Mark task as failed with retry
    if (taskId) {
      const { data: task } = await supabase
        .from('enrichment_queue')
        .select('attempts, max_attempts')
        .eq('id', taskId)
        .single()

      if (task && task.attempts < task.max_attempts) {
        // Schedule retry with exponential backoff
        const retryDelayMinutes = Math.pow(2, task.attempts) * 5 // 5, 10, 20 minutes
        const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000)

        await supabase
          .from('enrichment_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            next_retry_at: nextRetry.toISOString()
          })
          .eq('id', taskId)
      } else {
        // Max attempts reached
        await supabase
          .from('enrichment_queue')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', taskId)
      }
    }

    await discord.error(
      'Enrichment processor failed',
      error
    )

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
