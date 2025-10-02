// One-time backfill to import all discoverable venues/caterers
// Discovers across ALL cities and researches ALL discoveries comprehensively
// This builds the initial database from scratch

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🚀 Starting comprehensive venue backfill...')
    console.log('This will discover and research ALL venues across Australia\n')

    const startTime = Date.now()

    // STEP 1: Comprehensive discovery across ALL Australian cities
    console.log('📸 STEP 1: Discovering venues across ALL cities...\n')

    const discoveryResponse = await fetch(`${supabaseUrl}/functions/v1/discover-trending-venues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expandedSearch: true // Search ALL cities
      })
    })

    const discoveryResult = await discoveryResponse.json()

    if (!discoveryResult.success) {
      throw new Error(`Discovery failed: ${discoveryResult.error}`)
    }

    console.log(`✓ Discovery complete: ${discoveryResult.new_discoveries} new venues found\n`)

    // STEP 2: Get ALL pending discoveries
    console.log('🔍 STEP 2: Fetching all pending discoveries...\n')

    const { data: allPendingDiscoveries, error: queryError } = await supabase
      .from('discovered_venues')
      .select('*')
      .eq('status', 'pending_research')
      .order('engagement_score', { ascending: false })

    if (queryError) {
      throw queryError
    }

    if (!allPendingDiscoveries || allPendingDiscoveries.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No venues to research',
          discovered: discoveryResult.new_discoveries,
          researched: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${allPendingDiscoveries.length} venues to research`)
    console.log('This may take 30-60 minutes depending on volume...\n')

    // STEP 3: Research ALL discovered venues in batches
    console.log('🏛️ STEP 3: Researching all venues...\n')

    const results = {
      total: allPendingDiscoveries.length,
      successful: 0,
      failed: 0,
      venues: []
    }

    let processedCount = 0

    for (const discovery of allPendingDiscoveries) {
      processedCount++

      try {
        console.log(`[${processedCount}/${results.total}] Researching: ${discovery.name} (${discovery.city})...`)

        const researchResponse = await fetch(`${supabaseUrl}/functions/v1/deep-research-venue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            venueName: discovery.name,
            location: `${discovery.location}, ${discovery.city}`,
            city: discovery.city,
            state: discovery.state,
            forceRefresh: false
          })
        })

        const researchResult = await researchResponse.json()

        if (researchResult.success) {
          results.successful++
          results.venues.push({
            id: researchResult.listing.id,
            title: researchResult.listing.title,
            city: discovery.city,
            images_count: researchResult.listing.images_count,
            packages_count: researchResult.listing.packages_count,
            tags_count: researchResult.listing.tags_count
          })

          // Update discovery status
          await supabase
            .from('discovered_venues')
            .update({
              status: 'researched',
              listing_id: researchResult.listing.id,
              researched_at: new Date().toISOString()
            })
            .eq('id', discovery.id)

          console.log(`  ✓ Success: ${researchResult.listing.images_count} photos, ${researchResult.listing.packages_count} packages`)
        } else {
          results.failed++
          console.log(`  ✗ Failed: ${researchResult.error || 'Unknown error'}`)

          await supabase
            .from('discovered_venues')
            .update({ status: 'research_failed' })
            .eq('id', discovery.id)
        }

        // Rate limiting (5 seconds between requests to avoid API limits)
        await new Promise(resolve => setTimeout(resolve, 5000))

      } catch (error) {
        results.failed++
        console.error(`  ✗ Error: ${error.message}`)
      }

      // Progress update every 10 venues
      if (processedCount % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        const avgTime = elapsed / processedCount
        const remaining = Math.round((results.total - processedCount) * avgTime / 60)
        console.log(`\n📊 Progress: ${processedCount}/${results.total} | Success: ${results.successful} | Failed: ${results.failed} | ETA: ~${remaining} min\n`)
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60)

    console.log('\n✅ BACKFILL COMPLETE!\n')
    console.log(`Total venues researched: ${results.successful}/${results.total}`)
    console.log(`Failed: ${results.failed}`)
    console.log(`Total time: ${totalTime} minutes`)

    // Log backfill completion
    await supabase.from('sync_logs').insert({
      source: 'backfill_all_venues',
      status: 'completed',
      records_processed: results.successful,
      metadata: {
        total_discovered: discoveryResult.new_discoveries,
        total_attempted: results.total,
        successful: results.successful,
        failed: results.failed,
        duration_minutes: totalTime
      },
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete: ${results.successful} venues added`,
        stats: {
          discovered: discoveryResult.new_discoveries,
          researched: results.successful,
          failed: results.failed,
          total: results.total,
          duration_minutes: totalTime
        },
        venues: results.venues
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Backfill error:', error)

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
