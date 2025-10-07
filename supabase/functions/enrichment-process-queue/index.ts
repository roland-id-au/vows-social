// Simplified Enrichment Queue Processor
// Just fetches next discovery and calls enrichment-vendor with the ID

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get next pending discovery (highest engagement score first)
    const { data: discovery, error } = await supabase
      .from('discovered_listings')
      .select('id, name, type')
      .eq('enrichment_status', 'pending')
      .is('listing_id', null)
      .order('engagement_score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !discovery) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'No pending discoveries'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing discovery: ${discovery.name} (${discovery.id})`)

    // Call enrichment-vendor with the discovery ID
    const enrichmentUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/enrichment-vendor`

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout for Perplexity + images

    try {
      const enrichmentResponse = await fetch(enrichmentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          discovery_id: discovery.id
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const responseText = await enrichmentResponse.text()

      console.log(`Enrichment response status: ${enrichmentResponse.status}`)
      console.log(`Enrichment response (first 500 chars): ${responseText.substring(0, 500)}`)

      let enrichmentResult
      try {
        enrichmentResult = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse enrichment response:', responseText.substring(0, 200))
        return new Response(JSON.stringify({
          success: false,
          processed: 0,
          error: 'Enrichment function returned invalid JSON',
          responseText: responseText.substring(0, 500),
          statusCode: enrichmentResponse.status
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        success: enrichmentResult.success,
        processed: enrichmentResult.success ? 1 : 0,
        discovery: {
          id: discovery.id,
          name: discovery.name,
          type: discovery.type
        },
        enrichment: enrichmentResult
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      console.error('Enrichment call failed:', fetchError.message)

      return new Response(JSON.stringify({
        success: false,
        processed: 0,
        error: `Enrichment call failed: ${fetchError.message}`,
        discovery: {
          id: discovery.id,
          name: discovery.name
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error: any) {
    console.error('Queue processing failed:', error.message)

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
