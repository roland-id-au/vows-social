// Discover trending wedding services: caterers, florists, photographers, etc.
// Complements venue discovery for complete wedding marketplace

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DiscoveredService {
  name: string
  type: 'caterer' | 'florist' | 'photographer' | 'videographer' | 'musician' | 'stylist' | 'planner' | 'decorator' | 'transport' | 'celebrant' | 'cake' | 'makeup' | 'hair' | 'entertainment' | 'rentals' | 'stationery' | 'favors' | 'other_service'
  service_description: string
  location: string
  city: string
  state: string
  country: string
  instagram_handle?: string
  instagram_posts_count: number
  engagement_score: number
  recent_hashtags: string[]
  why_trending: string
  sample_post_urls: string[]
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!

    const body = req.method === 'POST' ? await req.json() : {}
    const expandedSearch = body.expandedSearch || false

    console.log('Starting wedding services discovery...')

    // Australian cities for service discovery
    const australianCities = [
      'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
      'Gold Coast', 'Canberra', 'Newcastle', 'Byron Bay', 'Hobart'
    ]

    // Wedding service types to discover
    const serviceTypes = [
      { type: 'caterer', keywords: 'wedding caterer, wedding food, wedding catering' },
      { type: 'florist', keywords: 'wedding florist, bridal flowers, wedding florals' },
      { type: 'photographer', keywords: 'wedding photographer, bridal photography' },
      { type: 'videographer', keywords: 'wedding videographer, wedding film' },
      { type: 'musician', keywords: 'wedding musician, wedding band, wedding DJ' },
      { type: 'stylist', keywords: 'wedding stylist, event styling, wedding design' },
      { type: 'planner', keywords: 'wedding planner, wedding coordinator' },
      { type: 'cake', keywords: 'wedding cake, custom wedding cakes' },
      { type: 'makeup', keywords: 'bridal makeup, wedding makeup artist' },
      { type: 'hair', keywords: 'bridal hair, wedding hairstylist' }
    ]

    // Determine cities to search
    let citiesToSearch = expandedSearch
      ? australianCities
      : australianCities.slice(0, 3) // Top 3 cities for daily discovery

    console.log(`Searching cities: ${citiesToSearch.join(', ')}`)

    const allDiscoveries: DiscoveredService[] = []

    // Discover 2-3 service types per run (rotates based on day)
    const dayOfWeek = new Date().getDay()
    const startIdx = (dayOfWeek * 2) % serviceTypes.length
    const servicesToDiscover = expandedSearch
      ? serviceTypes
      : [serviceTypes[startIdx], serviceTypes[(startIdx + 1) % serviceTypes.length]]

    console.log(`Discovering service types: ${servicesToDiscover.map(s => s.type).join(', ')}`)

    for (const service of servicesToDiscover) {
      for (const city of citiesToSearch) {
        console.log(`Discovering ${service.type}s in ${city}...`)

        const structuredSchema = {
          type: 'object',
          properties: {
            discoveries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['caterer', 'florist', 'photographer', 'videographer', 'musician', 'stylist', 'planner', 'decorator', 'cake', 'makeup', 'hair', 'other_service'] },
                  service_description: { type: 'string' },
                  location: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  country: { type: 'string', default: 'Australia' },
                  instagram_handle: { type: 'string' },
                  instagram_posts_count: { type: 'integer' },
                  engagement_score: { type: 'number' },
                  recent_hashtags: { type: 'array', items: { type: 'string' } },
                  why_trending: { type: 'string' },
                  sample_post_urls: { type: 'array', items: { type: 'string' } }
                },
                required: ['name', 'type', 'location', 'city', 'state', 'instagram_posts_count', 'engagement_score', 'why_trending']
              },
              minItems: 2,
              maxItems: 5
            }
          },
          required: ['discoveries']
        }

        try {
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar-pro',
              messages: [
                {
                  role: 'system',
                  content: `You are a wedding industry trend analyst. Find trending wedding ${service.type}s on Instagram.

FOCUS ON:
- REAL WEDDINGS (not styled shoots)
- Recent posts (last 7-30 days)
- High engagement from couples/planners
- Wedding-specific work (not general ${service.type} work)
- Professional wedding vendors only`
                },
                {
                  role: 'user',
                  content: `Find the top 3-5 trending wedding ${service.type}s on Instagram in ${city}, Australia.

Search for: ${service.keywords} in ${city}

CRITERIA:
- Posted about REAL WEDDINGS in last 30 days
- High engagement (likes, saves, shares)
- Active Instagram presence
- Professional wedding vendors
- Located in ${city} or serving ${city} area

Return vendors with RECENT wedding posts (last 7-30 days preferred).`
                }
              ],
              temperature: 0.3,
              max_tokens: 2000,
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'service_discoveries',
                  schema: structuredSchema,
                  strict: true
                }
              }
            })
          })

          if (response.ok) {
            const data = await response.json()
            const result = JSON.parse(data.choices[0].message.content)
            allDiscoveries.push(...result.discoveries)
            console.log(`  Found ${result.discoveries.length} ${service.type}s`)
          }
        } catch (error) {
          console.error(`Error discovering ${service.type}s in ${city}:`, error.message)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    console.log(`Total services discovered: ${allDiscoveries.length}`)

    // Filter out existing services
    const newDiscoveries: DiscoveredService[] = []

    for (const discovery of allDiscoveries) {
      const { data: existing } = await supabase
        .from('listings')
        .select('id')
        .ilike('title', `%${discovery.name}%`)
        .eq('category', discovery.type)
        .single()

      if (!existing) {
        newDiscoveries.push(discovery)
      }
    }

    console.log(`New services (not in database): ${newDiscoveries.length}`)

    // Save discoveries
    if (newDiscoveries.length > 0) {
      const records = newDiscoveries.map(d => ({
        name: d.name,
        type: d.type,
        location: d.location,
        city: d.city,
        state: d.state,
        country: d.country || 'Australia',
        instagram_handle: d.instagram_handle,
        instagram_posts_count: d.instagram_posts_count,
        engagement_score: d.engagement_score,
        recent_hashtags: d.recent_hashtags,
        why_trending: d.why_trending,
        sample_post_urls: d.sample_post_urls,
        status: 'pending_research',
        discovered_at: new Date().toISOString()
      }))

      await supabase.from('discovered_venues').insert(records)
    }

    // Log discovery
    await supabase.from('sync_logs').insert({
      source: 'wedding_services_discovery',
      status: 'success',
      records_processed: allDiscoveries.length,
      metadata: {
        total_found: allDiscoveries.length,
        new_discoveries: newDiscoveries.length,
        service_types: servicesToDiscover.map(s => s.type),
        cities_searched: citiesToSearch
      },
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        total_discovered: allDiscoveries.length,
        new_discoveries: newDiscoveries.length,
        service_types: servicesToDiscover.map(s => s.type),
        discoveries: newDiscoveries.map(d => ({
          name: d.name,
          type: d.type,
          location: `${d.location}, ${d.city}`,
          engagement_score: d.engagement_score,
          why_trending: d.why_trending
        }))
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Services discovery error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
