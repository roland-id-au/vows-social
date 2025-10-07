/**
 * Seed Instagram Trend Queue
 * Populates instagram_trend_queue from instagram_trend_config table
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
    // Read trend config from database
    const { data: configs, error: configError } = await supabase
      .from('instagram_trend_config')
      .select('*')
      .eq('enabled', true)

    if (configError) {
      throw new Error(`Error loading config: ${configError.message}`)
    }

    console.log(`Loaded ${configs.length} Instagram trend configurations`)

    let tasksCreated = 0
    let tasksSkipped = 0

    // For each config entry, create trend discovery task if not already exists
    for (const config of configs) {
      // Build task query description
      let taskQuery = ''
      if (config.discovery_type === 'location') {
        taskQuery = config.hashtag_filter
          ? `${config.location_query} + #${config.hashtag_filter}`
          : config.location_query
      } else {
        taskQuery = config.hashtag
      }

      // Check if a similar pending task already exists
      let query = supabase
        .from('instagram_trend_queue')
        .select('id, scheduled_for')
        .eq('discovery_type', config.discovery_type)
        .eq('country', config.country)
        .eq('city', config.city || '')
        .eq('service_type', config.service_type)
        .in('status', ['pending', 'processing'])

      if (config.discovery_type === 'hashtag') {
        query = query.eq('hashtag', config.hashtag)
      } else {
        query = query.eq('location_query', config.location_query)

        // Also match hashtag_filter for hybrid queries
        if (config.hashtag_filter) {
          query = query.eq('hashtag_filter', config.hashtag_filter)
        }
      }

      const { data: existing } = await query.single()

      if (existing) {
        console.log(`Task already exists: ${taskQuery}`)
        tasksSkipped++
        continue
      }

      // Create trend discovery task
      const taskData: any = {
        discovery_type: config.discovery_type,
        country: config.country,
        city: config.city,
        service_type: config.service_type,
        priority: config.priority,
        discovery_interval_hours: config.discovery_interval_hours,
        scheduled_for: new Date().toISOString()
      }

      if (config.discovery_type === 'hashtag') {
        taskData.hashtag = config.hashtag
      } else {
        taskData.location_query = config.location_query
        if (config.hashtag_filter) {
          taskData.hashtag_filter = config.hashtag_filter
        }
      }

      const { error } = await supabase
        .from('instagram_trend_queue')
        .insert(taskData)

      if (error) {
        console.error(`Error creating task: ${error.message}`)
      } else {
        tasksCreated++
        console.log(`Created ${config.discovery_type}: ${taskQuery}`)
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
    console.error('Seed Instagram trend queue error:', error)

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
