// Discover trending wedding venues and caterers from Instagram
// Uses Perplexity to analyze social media trends and extract venue information

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DiscoveredVenue {
  name: string
  type: 'venue' | 'caterer'
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

    // Parse request body for options
    const body = req.method === 'POST' ? await req.json() : {}
    const expandedSearch = body.expandedSearch || false
    const citiesToSearch = body.cities || null

    console.log('Starting Instagram discovery...')
    console.log(`Expanded search: ${expandedSearch}`)

    // Comprehensive city list for Australia + international expansion
    const allAustralianCities = [
      'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
      'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Byron Bay',
      'Hobart', 'Cairns', 'Noosa', 'Margaret River', 'Hunter Valley'
    ]

    const internationalCities = [
      { city: 'Bali', country: 'Indonesia' },
      { city: 'Queenstown', country: 'New Zealand' },
      { city: 'Fiji', country: 'Fiji' },
      { city: 'Phuket', country: 'Thailand' }
    ]

    // Determine which cities to search
    let citiesToQuery: string[]

    if (citiesToSearch) {
      // Use provided cities
      citiesToQuery = citiesToSearch
    } else if (expandedSearch) {
      // Full discovery across all Australian cities
      citiesToQuery = allAustralianCities
    } else {
      // Daily rotation through 3 cities (changes based on day of week)
      const dayOfWeek = new Date().getDay()
      const startIndex = (dayOfWeek * 3) % allAustralianCities.length
      citiesToQuery = [
        allAustralianCities[startIndex],
        allAustralianCities[(startIndex + 1) % allAustralianCities.length],
        allAustralianCities[(startIndex + 2) % allAustralianCities.length]
      ]
    }

    console.log(`Searching cities: ${citiesToQuery.join(', ')}`)

    const allDiscoveries: DiscoveredVenue[] = []

    for (const city of citiesToQuery) {
      console.log(`Discovering trending venues in ${city}...`)

      const structuredSchema = {
        type: 'object',
        properties: {
          discoveries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Venue or caterer business name'
                },
                type: {
                  type: 'string',
                  enum: ['venue', 'caterer']
                },
                location: {
                  type: 'string',
                  description: 'Specific suburb or area'
                },
                city: {
                  type: 'string'
                },
                state: {
                  type: 'string'
                },
                country: {
                  type: 'string',
                  default: 'Australia'
                },
                instagram_handle: {
                  type: 'string',
                  description: 'Instagram username without @'
                },
                instagram_posts_count: {
                  type: 'integer',
                  description: 'Approximate number of recent wedding-related posts'
                },
                engagement_score: {
                  type: 'number',
                  description: 'Engagement score from 1-10 based on likes, comments, shares'
                },
                recent_hashtags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Popular hashtags associated with this venue'
                },
                why_trending: {
                  type: 'string',
                  description: 'Brief explanation of why this is trending now'
                },
                sample_post_urls: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'URLs to sample Instagram posts featuring this venue'
                }
              },
              required: [
                'name', 'type', 'location', 'city', 'state',
                'instagram_posts_count', 'engagement_score', 'why_trending'
              ]
            },
            minItems: 3,
            maxItems: 10
          }
        },
        required: ['discoveries']
      }

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
              content: `You are a wedding trend analyst. Analyze Instagram to discover trending wedding venues and caterers.

TASK: Find venues/caterers that are:
1. Currently trending on Instagram (MOST RECENT 30 days - prioritize posts from the last week)
2. Getting high engagement on WEDDING-SPECIFIC posts (not just general events)
3. Featured by couples, photographers, planners with REAL WEDDINGS (not styled shoots)
4. Located in Australian cities

For each discovery:
- Identify the business name and Instagram handle
- Specify the city and state
- Count recent WEDDING-RELATED posts/mentions (not corporate events or parties)
- Assess engagement (likes, comments, saves, shares) on WEDDING content
- Explain why it's trending NOW (recent viral post, new venue opening, celebrity wedding, unique style, etc.)
- Provide sample Instagram post URLs from REAL WEDDINGS
- Tag with country (Australia)

CRITICAL: Focus ONLY on wedding venues/caterers:
- Must be suitable for WEDDINGS (not corporate event spaces)
- Prioritize venues with RECENT (last 7-30 days) wedding posts
- New or newly popular wedding venues
- Unique/standout locations for ceremonies and receptions
- Venues with authentic couple content (not just professional staging)
- Caterers with innovative wedding menus or stunning presentation`
            },
            {
              role: 'user',
              content: `Discover the top 5-10 MOST RECENTLY trending wedding venues and caterers on Instagram in ${city}, Australia.

PRIORITIZE venues with posts from the LAST 7-14 DAYS. Focus on REAL WEDDINGS, not styled shoots or corporate events.

Search for:
- Recent wedding venue posts (#${city.toLowerCase()}weddingvenue, #${city.toLowerCase()}wedding, #${city.toLowerCase()}weddings)
- Posts by wedding photographers/planners in ${city} from the LAST 30 DAYS
- Real couple wedding posts with location tags (MOST RECENT first)
- Trending wedding caterers with recent food styling posts
- Hashtags like #realwedding #${city.toLowerCase()}bride

Return ONLY venues/caterers that:
1. Have had WEDDING posts in the last 30 days (prioritize last 7-14 days)
2. Are specifically for WEDDINGS (not general event spaces)
3. Show REAL weddings with couples, not just staged photos`
            }
          ],
          temperature: 0.3,
          max_tokens: 3000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'instagram_discoveries',
              schema: structuredSchema,
              strict: true
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Perplexity API error for ${city}: ${response.status}`)
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      console.log(`Found ${result.discoveries.length} discoveries in ${city}`)
      allDiscoveries.push(...result.discoveries)

      // Rate limiting between cities
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    console.log(`Total discoveries: ${allDiscoveries.length}`)

    // Filter out venues that already exist
    const newDiscoveries: DiscoveredVenue[] = []

    for (const discovery of allDiscoveries) {
      const { data: existing } = await supabase
        .from('listings')
        .select('id')
        .ilike('title', `%${discovery.name}%`)
        .single()

      if (!existing) {
        newDiscoveries.push(discovery)
      } else {
        console.log(`Already exists: ${discovery.name}`)
      }
    }

    console.log(`New discoveries (not in database): ${newDiscoveries.length}`)

    // Save discoveries for processing
    if (newDiscoveries.length > 0) {
      const discoveryRecords = newDiscoveries.map(d => ({
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

      const { error } = await supabase
        .from('discovered_listings')
        .insert(discoveryRecords)

      if (error) {
        console.error('Error saving discoveries:', error)
      } else {
        console.log(`Saved ${discoveryRecords.length} discoveries for research`)
      }
    }

    // Log discovery session
    await supabase.from('sync_logs').insert({
      source: 'instagram_discovery',
      status: 'success',
      records_processed: allDiscoveries.length,
      metadata: {
        total_found: allDiscoveries.length,
        new_discoveries: newDiscoveries.length,
        cities_searched: citiesToQuery,
        expanded_search: expandedSearch
      },
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        total_discovered: allDiscoveries.length,
        new_discoveries: newDiscoveries.length,
        discoveries: newDiscoveries.map(d => ({
          name: d.name,
          type: d.type,
          location: `${d.location}, ${d.city}`,
          engagement_score: d.engagement_score,
          why_trending: d.why_trending
        }))
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Discovery error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
