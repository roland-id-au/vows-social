// Batch process multiple venues at once
// Can be triggered manually or via cron job

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VenueBatchRequest {
  venues: Array<{
    venueName: string
    location: string
    city: string
    state: string
  }>
  delayBetweenRequests?: number // milliseconds
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { venues, delayBetweenRequests = 5000 } = await req.json() as VenueBatchRequest

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const results = {
      total: venues.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    }

    console.log(`Starting batch research for ${venues.length} venues`)

    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i]

      try {
        console.log(`\n[${i + 1}/${venues.length}] Processing: ${venue.venueName}`)

        // Call the deep research function
        const response = await fetch(`${supabaseUrl}/functions/v1/deep-research-venue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            venueName: venue.venueName,
            location: venue.location,
            city: venue.city,
            state: venue.state,
            forceRefresh: false
          })
        })

        const result = await response.json()

        if (result.success) {
          results.successful++
          results.details.push({
            venue: venue.venueName,
            status: 'success',
            id: result.listing?.id,
            images: result.listing?.images_count
          })
          console.log(`✓ Success: ${venue.venueName}`)
        } else {
          if (result.message?.includes('already exists')) {
            results.skipped++
            results.details.push({
              venue: venue.venueName,
              status: 'skipped',
              reason: 'already_exists'
            })
            console.log(`⊘ Skipped: ${venue.venueName} (already exists)`)
          } else {
            results.failed++
            results.details.push({
              venue: venue.venueName,
              status: 'failed',
              error: result.error || result.message
            })
            console.log(`✗ Failed: ${venue.venueName}`)
          }
        }

      } catch (error) {
        results.failed++
        results.details.push({
          venue: venue.venueName,
          status: 'failed',
          error: error.message
        })
        console.log(`✗ Error: ${venue.venueName} - ${error.message}`)
      }

      // Delay between requests to respect rate limits
      if (i < venues.length - 1) {
        console.log(`Waiting ${delayBetweenRequests}ms before next request...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
      }
    }

    // Log batch completion
    await supabase.from('sync_logs').insert({
      source: 'batch_research',
      status: 'completed',
      records_processed: results.successful,
      metadata: {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped
      },
      timestamp: new Date().toISOString()
    })

    console.log('\n=== Batch Research Complete ===')
    console.log(`Total: ${results.total}`)
    console.log(`Successful: ${results.successful}`)
    console.log(`Failed: ${results.failed}`)
    console.log(`Skipped: ${results.skipped}`)

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.total,
          successful: results.successful,
          failed: results.failed,
          skipped: results.skipped
        },
        details: results.details
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Batch error:', error)

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
