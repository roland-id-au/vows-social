// One-time backfill for all wedding services (caterers, florists, photographers, etc.)
// Comprehensive import of wedding marketplace services

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🌸 Starting comprehensive wedding services backfill...')
    console.log('Discovering: Caterers, Florists, Photographers, Videographers, Musicians, Stylists, Planners, Cake, Makeup, Hair\n')

    const startTime = Date.now()

    // STEP 1: Comprehensive services discovery
    console.log('📸 STEP 1: Discovering ALL wedding services...\n')

    const discoveryResponse = await fetch(`${supabaseUrl}/functions/v1/discover-wedding-services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expandedSearch: true // Search all cities and all service types
      })
    })

    const discoveryResult = await discoveryResponse.json()

    if (!discoveryResult.success) {
      throw new Error(`Services discovery failed: ${discoveryResult.error}`)
    }

    console.log(`✓ Discovery complete: ${discoveryResult.new_discoveries} new services found\n`)

    // STEP 2: Get ALL pending service discoveries
    console.log('🔍 STEP 2: Fetching all pending service discoveries...\n')

    const { data: allPendingServices } = await supabase
      .from('discovered_venues')
      .select('*')
      .eq('status', 'pending_research')
      .neq('type', 'venue') // Only services, not venues
      .order('engagement_score', { ascending: false })

    if (!allPendingServices || allPendingServices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No services to research',
          discovered: discoveryResult.new_discoveries,
          researched: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${allPendingServices.length} services to research\n`)

    // STEP 3: Research ALL services
    console.log('💐 STEP 3: Researching all wedding services...\n')

    const results = {
      total: allPendingServices.length,
      successful: 0,
      failed: 0,
      services: []
    }

    let processedCount = 0

    for (const service of allPendingServices) {
      processedCount++

      try {
        console.log(`[${processedCount}/${results.total}] Researching: ${service.name} (${service.type} - ${service.city})...`)

        const researchResponse = await fetch(`${supabaseUrl}/functions/v1/deep-research-venue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            venueName: service.name,
            location: `${service.location}, ${service.city}`,
            city: service.city,
            state: service.state,
            serviceType: service.type, // Pass service type
            forceRefresh: false
          })
        })

        const researchResult = await researchResponse.json()

        if (researchResult.success) {
          results.successful++
          results.services.push({
            id: researchResult.listing.id,
            title: researchResult.listing.title,
            type: service.type,
            city: service.city,
            images_count: researchResult.listing.images_count,
            packages_count: researchResult.listing.packages_count
          })

          await supabase
            .from('discovered_venues')
            .update({
              status: 'researched',
              listing_id: researchResult.listing.id,
              researched_at: new Date().toISOString()
            })
            .eq('id', service.id)

          console.log(`  ✓ Success: ${researchResult.listing.images_count} photos, ${researchResult.listing.packages_count} packages`)
        } else {
          results.failed++
          console.log(`  ✗ Failed`)

          await supabase
            .from('discovered_venues')
            .update({ status: 'research_failed' })
            .eq('id', service.id)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000))

      } catch (error) {
        results.failed++
        console.error(`  ✗ Error: ${error.message}`)
      }

      if (processedCount % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        const avgTime = elapsed / processedCount
        const remaining = Math.round((results.total - processedCount) * avgTime / 60)
        console.log(`\n📊 Progress: ${processedCount}/${results.total} | Success: ${results.successful} | ETA: ~${remaining} min\n`)
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60)

    console.log('\n✅ SERVICES BACKFILL COMPLETE!\n')
    console.log(`Total services researched: ${results.successful}/${results.total}`)
    console.log(`Total time: ${totalTime} minutes`)

    await supabase.from('sync_logs').insert({
      source: 'backfill_wedding_services',
      status: 'completed',
      records_processed: results.successful,
      metadata: {
        total_discovered: discoveryResult.new_discoveries,
        successful: results.successful,
        failed: results.failed,
        duration_minutes: totalTime
      },
      timestamp: new Date().toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Services backfill complete: ${results.successful} services added`,
        stats: {
          discovered: discoveryResult.new_discoveries,
          researched: results.successful,
          failed: results.failed,
          duration_minutes: totalTime
        },
        services: results.services
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Services backfill error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
