// Scheduled cron job to refresh venue data automatically
// Runs weekly to update pricing, images, and details

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting scheduled venue refresh...')

    // Get venues that need refreshing (older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: venuesToRefresh, error: queryError } = await supabase
      .from('listings')
      .select('id, title, location_data')
      .lt('updated_at', sevenDaysAgo.toISOString())
      .eq('source_type', 'perplexity_deep_research')
      .order('updated_at', { ascending: true })
      .limit(10) // Refresh 10 venues per run

    if (queryError) {
      throw queryError
    }

    if (!venuesToRefresh || venuesToRefresh.length === 0) {
      console.log('No venues need refreshing')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No venues need refreshing',
          refreshed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${venuesToRefresh.length} venues to refresh`)

    const results = {
      total: venuesToRefresh.length,
      successful: 0,
      failed: 0
    }

    // Refresh each venue
    for (const venue of venuesToRefresh) {
      try {
        console.log(`Refreshing: ${venue.title}`)

        const locationData = venue.location_data
        const response = await fetch(`${supabaseUrl}/functions/v1/deep-research-venue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            venueName: venue.title,
            location: `${locationData.city}, ${locationData.state}`,
            city: locationData.city,
            state: locationData.state,
            forceRefresh: true
          })
        })

        const result = await response.json()

        if (result.success) {
          results.successful++

          // Update the existing record's timestamp
          await supabase
            .from('listings')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', venue.id)

          console.log(`✓ Refreshed: ${venue.title}`)
        } else {
          results.failed++
          console.log(`✗ Failed to refresh: ${venue.title}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000))

      } catch (error) {
        results.failed++
        console.error(`Error refreshing ${venue.title}:`, error)
      }
    }

    // Log refresh completion
    await supabase.from('sync_logs').insert({
      source: 'scheduled_refresh',
      status: 'completed',
      records_processed: results.successful,
      metadata: {
        total: results.total,
        successful: results.successful,
        failed: results.failed
      },
      timestamp: new Date().toISOString()
    })

    console.log(`Refresh complete: ${results.successful}/${results.total} successful`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled refresh complete',
        refreshed: results.successful,
        failed: results.failed,
        total: results.total
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduled refresh error:', error)

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
