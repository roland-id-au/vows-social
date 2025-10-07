// Australia-Wide Vendor Discovery
// Discovers ALL wedding vendors/venues across Australia at once
// Uses Perplexity to find and classify by location

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Logger } from '../_shared/logger.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'
import { perplexityCache } from '../_shared/perplexity-cache.ts'

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')!

interface DiscoveryResult {
  name: string
  location: string
  city: string
  state: string
  service_type: string
  why_trending?: string
  instagram_handle?: string
  engagement_score: number
}

// Helper: Extract location details from free-form location string
function parseLocation(locationStr: string): { city: string; state: string } {
  // Common Australian states
  const stateMap: Record<string, string> = {
    'NSW': 'NSW',
    'New South Wales': 'NSW',
    'VIC': 'VIC',
    'Victoria': 'VIC',
    'QLD': 'QLD',
    'Queensland': 'QLD',
    'WA': 'WA',
    'Western Australia': 'WA',
    'SA': 'SA',
    'South Australia': 'SA',
    'TAS': 'TAS',
    'Tasmania': 'TAS',
    'NT': 'NT',
    'Northern Territory': 'NT',
    'ACT': 'ACT',
    'Australian Capital Territory': 'ACT'
  }

  let city = ''
  let state = ''

  // Extract state
  for (const [key, value] of Object.entries(stateMap)) {
    if (locationStr.includes(key)) {
      state = value
      break
    }
  }

  // Extract city (before comma or state)
  const parts = locationStr.split(',').map(p => p.trim())
  if (parts.length > 0) {
    city = parts[0].replace(/\s+(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)$/i, '').trim()
  }

  return { city, state }
}

Deno.serve(async (req) => {
  const logger = new Logger('discovery-australia-wide')
  const discord = new DiscordLogger()
  const startTime = Date.now()

  try {
    const { service_type = 'venue' } = await req.json().catch(() => ({}))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    logger.info(`Starting Australia-wide discovery for ${service_type}`)
    await discord.log(`🌏 Australia-Wide Discovery Started`, {
      color: 0x9b59b6,
      metadata: { 'Service Type': service_type }
    })

    // Get already discovered vendors to exclude
    const { data: alreadyDiscovered } = await supabase
      .from('discovered_listings')
      .select('name, city, state, instagram_handle')
      .eq('type', service_type)
      .limit(300) // Limit to avoid token overflow

    // Also get enriched listings
    const { data: enrichedListings } = await supabase
      .from('listings')
      .select('title, website, city, state')
      .eq('type', service_type)
      .limit(200)

    // Combine and format exclusion list
    const discoveredNames = alreadyDiscovered?.map(d =>
      `${d.name}, ${d.city || ''} ${d.state || ''}`.trim()
    ) || []

    const enrichedNames = enrichedListings?.map(l =>
      l.website || `${l.title}, ${l.city || ''} ${l.state || ''}`.trim()
    ) || []

    const allExclusions = [...new Set([...discoveredNames, ...enrichedNames])]

    const exclusionList = allExclusions.length > 0
      ? `\n\nIMPORTANT - EXCLUDE these vendors/venues we already have (${allExclusions.length} total):\n${allExclusions.slice(0, 150).join('\n')}`
      : ''

    logger.info(`Excluding ${allExclusions.length} already discovered/enriched vendors from search`)

    // Build comprehensive Perplexity prompt
    const serviceQueries: Record<string, string> = {
      venue: `You are a wedding industry researcher. Find ALL currently trending wedding venues across Australia (NSW, VIC, QLD, WA, SA, TAS, NT, ACT).

A venue is "TRENDING" if it meets ANY of these criteria:
✓ Featured in Vogue Brides, Modern Wedding, Junebug Weddings, or similar publications (last 6 months)
✓ Has 1000+ recent Instagram posts tagged at the location
✓ Mentioned by wedding influencers or featured on popular wedding Instagram accounts (last 3 months)
✓ Newly opened (last 12 months) with strong social media presence
✓ Fully booked for 2025 or has waitlist
✓ Won recent awards or accolades
✓ Going viral on TikTok or Instagram Reels

For EACH trending venue you find, provide:
1. Exact venue name (as it appears on their website/Instagram)
2. Precise location: [Suburb/Area], [City], [STATE] (e.g., "Mosman, Sydney, NSW")
3. Instagram handle (crucial - check their official account)
4. WHY it's trending (be specific: "Featured in Vogue Feb 2025" or "100k+ Instagram engagement")
5. Venue style: Choose from boho, modern, rustic, industrial, luxury, minimalist, garden, coastal, barn, historic
6. Website URL if available

IMPORTANT COVERAGE:
- Major cities: Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Hobart, Darwin
- Regional hotspots: Byron Bay, Gold Coast, Sunshine Coast, Noosa, Hunter Valley, Margaret River, Yarra Valley, Mornington Peninsula, Blue Mountains
- Hidden gems: Popular local venues with strong community following

OUTPUT: Return comprehensive list. Quality over arbitrary limits - if 80 venues are trending, return all 80. If only 30, return 30.`,

      photographer: `You are a wedding photography industry researcher. Find ALL currently trending wedding photographers across Australia.

A photographer is "TRENDING" if they meet ANY of:
✓ Featured in Vogue Weddings, Junebug Weddings, Polka Dot Bride, Rock My Wedding (last 6 months)
✓ Have 50k+ Instagram followers OR 10%+ engagement rate on wedding content
✓ Wedding work featured by major wedding Instagram accounts (last 3 months)
✓ Booked out 12+ months in advance
✓ Won AIPP awards or similar industry recognition (last 2 years)
✓ Viral wedding photos/reels (100k+ views)
✓ Unique signature style creating industry buzz

For EACH trending photographer, provide:
1. Photographer/business name (official name)
2. Primary location: [City], [STATE]
3. Instagram handle (essential - verify it's their professional account)
4. WHY trending (specific: "Featured in Vogue Oct 2024" or "Viral Byron Bay elopement reel - 500k views")
5. Photography style: Editorial, documentary, fine art, moody, bright & airy, bohemian, cinematic, dark & moody
6. Price tier if known: Budget (<$3k), Mid ($3-6k), Premium ($6-10k), Luxury ($10k+)

COVERAGE: Sydney, Melbourne, Brisbane, Perth, Adelaide, Byron Bay, Gold Coast, regional Australia.
Return all currently trending - quality over quantity.`,

      florist: `You are a wedding floral industry researcher. Find ALL currently trending wedding florists across Australia.

A florist is "TRENDING" if they meet ANY of:
✓ Featured in wedding styled shoots in major publications (last 6 months)
✓ Signature style creating industry buzz (unique color palettes, installations, techniques)
✓ Instagram engagement 5%+ on floral content or 20k+ followers
✓ Fully booked wedding season or selective clientele
✓ Collaboration with top photographers/planners
✓ Viral floral installations or bouquets
✓ Innovative use of sustainable/seasonal flowers

For EACH trending florist, provide:
1. Business name
2. Location: [City], [STATE]
3. Instagram handle (critical for portfolio visibility)
4. WHY trending (specific: "Signature dried grass installations" or "Featured in 20+ styled shoots 2024")
5. Floral style: Romantic garden, wild & organic, structured & architectural, minimalist modern, bohemian, moody & dramatic, dried florals, sustainable
6. Specialty if any: Installations, bridal bouquets, arbors, luxury events

COVERAGE: All Australian states, emphasis on design-forward florists creating Instagram-worthy work.
Return all genuinely trending florists.`,

      planner: `You are a wedding planning industry researcher. Find ALL currently trending wedding planners across Australia.

A planner is "TRENDING" if they meet ANY of:
✓ Featured in wedding publications or real wedding features (last 6 months)
✓ Known for signature planning style or niche (luxury, elopements, destination, DIY-assistance)
✓ Strong Instagram presence with real wedding content (15k+ followers OR high engagement)
✓ Booked 12+ months ahead
✓ Collaborated on high-profile weddings
✓ Innovative planning approach or services
✓ Industry awards or recognition

For EACH trending planner, provide:
1. Business/planner name
2. Location: [City], [STATE]
3. Instagram handle (important for portfolio/reviews)
4. WHY trending (specific: "Luxury micro-wedding specialist" or "Planned 50+ Byron Bay weddings 2024")
5. Planning style: Full service, day-of coordination, elopement specialist, luxury weddings, DIY assistance, destination expert
6. Price tier: Budget, Mid-range, Premium, Luxury

COVERAGE: All Australian states, focus on planners with proven track record and digital presence.
Return all genuinely trending planners.`
    }

    const query = (serviceQueries[service_type] || serviceQueries.venue) + exclusionList

    logger.info('Querying Perplexity for comprehensive Australia-wide data', {
      excludingCount: allExclusions.length
    })

    // Call Perplexity API
    // Check cache first
    const cachedContent = perplexityCache.get(query)
    let content: string

    if (cachedContent) {
      logger.info('Using cached Perplexity response')
      await discord.log(`💾 Using cached discovery data for ${service_type}s`, {
        color: 0x3498db
      })
      content = cachedContent
    } else {
      logger.info('Calling Perplexity API for comprehensive research')
      await discord.log(`🔍 Querying Perplexity AI for trending ${service_type}s...`, {
        color: 0x9b59b6
      })

      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a wedding industry research assistant. Provide accurate, structured data about Australian wedding vendors with their locations. Always include city and state for each vendor.'
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.2,
          max_tokens: 4000
        })
      })

      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text()
        throw new Error(`Perplexity API error: ${perplexityResponse.status} - ${errorText}`)
      }

      const perplexityData = await perplexityResponse.json()
      content = perplexityData.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content from Perplexity API')
      }

      // Cache the response (12h TTL for discovery queries)
      perplexityCache.set(query, content, 'discovery')
      logger.info('Cached Perplexity response (12h TTL)')
    }

    logger.info('Received Perplexity response, parsing vendors')
    await discord.log(`📊 Parsing vendor data from Perplexity response...`, {
      color: 0x9b59b6
    })

    // Parse the response to extract vendors
    // This is a simple parser - you may want to make it more robust
    const discoveries: DiscoveryResult[] = []

    // Use Perplexity again to structure the data
    const structureResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `Extract vendor information into a valid JSON array. Each object must have:
- name (string): vendor name
- location (string): format as "Suburb/Area, City, State" (e.g., "Mosman, Sydney, NSW")
- city (string): city name only
- state (string): 2-letter state code (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)
- country (string): always "Australia"
- instagram_handle (string or null): include @ symbol if present
- why_trending (string or null): brief reason

Return ONLY a valid JSON array with no markdown, no code blocks, no explanatory text.`
          },
          {
            role: 'user',
            content: `Extract all vendors from this text into a JSON array:\n\n${content}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    })

    const structureData = await structureResponse.json()
    const structuredContent = structureData.choices[0]?.message?.content

    logger.info('Parsing structured vendor data')

    // Try to parse JSON
    let vendors = []
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = structuredContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                       structuredContent.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        vendors = JSON.parse(jsonStr)
      } else {
        vendors = JSON.parse(structuredContent)
      }
    } catch (parseError) {
      logger.error('Failed to parse structured data as JSON', { error: parseError.message })
      // Fall back to manual parsing from content
      vendors = []
    }

    logger.info(`Parsed ${vendors.length} vendors from Perplexity`)
    await discord.log(`✅ Found ${vendors.length} trending ${service_type}s`, {
      color: 0x2ecc71,
      metadata: {
        'Total Found': vendors.length.toString()
      }
    })

    // Process each vendor
    for (const vendor of vendors) {
      try {
        // Use standardized data from Perplexity
        const city = vendor.city || ''
        const state = vendor.state || ''
        const country = vendor.country || 'Australia'

        if (!city || !state) {
          logger.warn(`Skipping vendor with incomplete location: ${vendor.name}`, {
            city,
            state,
            location: vendor.location
          })
          await discord.error(`Skipped ${vendor.name} - missing city/state`)
          continue
        }

        // Calculate engagement score (1-100 scale)
        const baseScore = 30
        const hasInstagram = vendor.instagram_handle ? 30 : 0
        const trendingBonus = vendor.why_trending ? 20 : 0
        const engagement_score = Math.min(baseScore + hasInstagram + trendingBonus, 100)

        discoveries.push({
          name: vendor.name,
          location: vendor.location || `${city}, ${state}`,
          city: city,
          state: state,
          service_type: service_type,
          why_trending: vendor.why_trending || '',
          instagram_handle: vendor.instagram_handle || null,
          engagement_score: engagement_score
        })
      } catch (vendorError: any) {
        logger.warn(`Error processing vendor: ${vendor.name}`, { error: vendorError.message })
        await discord.error(`Error processing ${vendor.name}: ${vendorError.message}`)
      }
    }

    logger.info(`Processed ${discoveries.length} valid discoveries`)
    await discord.log(`💾 Storing discoveries in database...`, {
      color: 0x3498db,
      metadata: {
        'To Process': discoveries.length.toString()
      }
    })

    // Store discoveries in database
    let newDiscoveries = 0
    let duplicates = 0

    for (const discovery of discoveries) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('discovered_listings')
        .select('id')
        .eq('name', discovery.name)
        .eq('city', discovery.city)
        .single()

      if (existing) {
        duplicates++
        continue
      }

      // Insert new discovery
      const { error: insertError } = await supabase
        .from('discovered_listings')
        .insert({
          name: discovery.name,
          location: discovery.location,
          city: discovery.city,
          state: discovery.state,
          country: 'Australia',
          type: discovery.service_type,
          why_trending: discovery.why_trending,
          instagram_handle: discovery.instagram_handle,
          engagement_score: Math.floor(discovery.engagement_score || 30),
          status: 'pending_research',
          enrichment_status: 'pending',
          discovered_at: new Date().toISOString()
        })

      if (insertError) {
        logger.error(`Failed to insert discovery: ${discovery.name}`, { error: insertError.message })
        await discord.error(`Insert failed: ${discovery.name} - ${insertError.message}`)
      } else {
        newDiscoveries++

        // Add to Instagram accounts table if handle exists
        if (discovery.instagram_handle) {
          const cleanHandle = discovery.instagram_handle.replace('@', '')

          // Check if Instagram account already tracked
          const { data: existingIgAccount } = await supabase
            .from('instagram_accounts')
            .select('id')
            .eq('username', cleanHandle)
            .single()

          if (!existingIgAccount) {
            // Add to instagram_accounts for future syncing
            await supabase
              .from('instagram_accounts')
              .insert({
                username: cleanHandle,
                instagram_id: cleanHandle, // Will be updated when we get actual ID
                sync_status: 'pending', // Not active until vendor authorizes
                has_access_token: false
              })

            logger.info(`Added Instagram account for future tracking: @${cleanHandle}`)
          }
        }
      }
    }

    const duration = Date.now() - startTime

    // Group by location for summary
    const byLocation = discoveries.reduce((acc, d) => {
      const key = `${d.city}, ${d.state}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const locationSummary = Object.entries(byLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([loc, count]) => `${loc}: ${count}`)
      .join('\n')

    logger.info('Australia-wide discovery completed', {
      total: discoveries.length,
      new: newDiscoveries,
      duplicates,
      duration
    })

    await discord.success(`Australia-Wide Discovery Complete`, {
      'Total Found': discoveries.length.toString(),
      'New Discoveries': newDiscoveries.toString(),
      'Duplicates': duplicates.toString(),
      'Service Type': service_type,
      'Duration': `${(duration / 1000).toFixed(1)}s`,
      'Top Locations': locationSummary.split('\n')[0]
    })

    return new Response(JSON.stringify({
      success: true,
      total_found: discoveries.length,
      new_discoveries: newDiscoveries,
      duplicates: duplicates,
      by_location: byLocation,
      duration_ms: duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    logger.error('Australia-wide discovery failed', { error: error.message })
    await discord.error(`Australia-wide discovery failed: ${error.message}`)

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
