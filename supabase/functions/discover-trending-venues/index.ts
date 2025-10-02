// Discover trending wedding venues and caterers from Instagram
// Uses Perplexity to analyze social media trends and extract venue information

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DiscoveredVenue {
  name: string
  type: 'venue' | 'caterer'
  location: string
  locality?: string
  city: string
  state: string
  region?: string
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

    console.log('Starting Instagram discovery...')

    // Define cities to search
    const cities = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']
    const allDiscoveries: DiscoveredVenue[] = []

    for (const city of cities) {
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
                locality: {
                  type: 'string',
                  description: 'Suburb/locality name (e.g., Mosman, Palm Beach)'
                },
                city: {
                  type: 'string'
                },
                state: {
                  type: 'string'
                },
                region: {
                  type: 'string',
                  description: 'Broader region (e.g., Northern Beaches, Yarra Valley)'
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
1. Currently trending on Instagram (past 30 days)
2. Getting high engagement on wedding posts
3. Featured by couples, photographers, planners
4. Located in Australian cities

For each discovery:
- Identify the business name and Instagram handle
- Specify the LOCALITY/SUBURB (e.g., Mosman, Yarra Valley) and broader region
- Count recent wedding-related posts/mentions
- Assess engagement (likes, comments, saves, shares)
- Explain why it's trending (new venue, unique style, celebrity wedding, viral post, etc.)
- Provide sample Instagram post URLs
- Tag with country (Australia)

Focus on:
- New or newly popular venues
- Unique/standout locations
- Venues with authentic couple content (not just professional photos)
- Caterers with innovative menus or stunning presentation`
            },
            {
              role: 'user',
              content: `Discover the top 5-10 trending wedding venues and caterers on Instagram right now in ${city}, Australia.

Search for:
- Wedding venue hashtags (#${city.toLowerCase()}weddingvenue, #${city.toLowerCase()}wedding, etc.)
- Popular wedding photographers/planners in ${city}
- Recent wedding posts with location tags
- Trending caterers and food styling

Return venues/caterers that are generating buzz in the past 30 days.`
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
        locality: d.locality,
        city: d.city,
        state: d.state,
        region: d.region,
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
        .from('discovered_venues')
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
        cities_searched: cities
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
