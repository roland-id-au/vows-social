/**
 * Seed Discovery Queue
 * Reads discovery_config table and populates the discovery_queue
 * Call this function to seed or refresh discovery tasks
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Read discovery config from database
    const { data: configs, error: configError } = await supabase
      .from('discovery_config')
      .select('*')
      .eq('enabled', true)

    if (configError) {
      throw new Error(`Error loading config: ${configError.message}`)
    }

    console.log(`Loaded ${configs.length} discovery configurations`)

    let tasksCreated = 0
    let tasksSkipped = 0

    // For each config entry, create discovery tasks for each keyword
    for (const config of configs) {
      const location = `${config.city}, ${config.country}`
      const keywords = config.keywords || [`wedding ${config.service_type}`]

      // Create a discovery task for each keyword
      for (const keyword of keywords) {
        const query = `${keyword} in ${location}`

        // Check if a similar pending task already exists
        const { data: existing } = await supabase
          .from('discovery_queue')
          .select('id')
          .eq('query', query)
          .eq('service_type', config.service_type)
          .eq('city', config.city)
          .eq('country', config.country)
          .in('status', ['pending', 'processing'])
          .maybeSingle()

        if (existing) {
          console.log(`Task exists: ${query}`)
          tasksSkipped++
          continue
        }

        // Create discovery task
        const { error } = await supabase
          .from('discovery_queue')
          .insert({
            query: query,
            location: location,
            city: config.city,
            country: config.country,
            service_type: config.service_type,
            priority: config.priority,
            scheduled_for: new Date().toISOString()
          })

        if (error) {
          console.error(`Error creating task: ${error.message}`)
        } else {
          tasksCreated++
          console.log(`Created: ${query}`)
        }
      }
    }

    console.log(`✅ Seeding complete: ${tasksCreated} tasks created, ${tasksSkipped} skipped`)

    return new Response(
      JSON.stringify({
        success: true,
        tasks_created: tasksCreated,
        tasks_skipped: tasksSkipped,
        total_configs: configs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Seed discovery queue error:', error)

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
