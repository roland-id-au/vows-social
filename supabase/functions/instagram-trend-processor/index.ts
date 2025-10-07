/**
 * Instagram Trend Discovery Processor
 * Discovers trending wedding content and new vendors via hashtag search
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DiscordLogger } from '../_shared/discord-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrendTask {
  id: string
  discovery_type: 'hashtag' | 'location'
  hashtag: string | null
  location_query: string | null
  hashtag_filter: string | null
  country: string
  city: string | null
  service_type: string
  attempts: number
  max_attempts: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  const discord = new DiscordLogger()

  let taskId: string | null = null

  try {
    // Get next pending trend discovery task
    const { data: task, error: taskError } = await supabase
      .rpc('get_next_instagram_trend_task')
      .single() as { data: TrendTask | null, error: any }

    if (taskError || !task) {
      console.log('No pending Instagram trend discovery tasks')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending tasks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    taskId = task.id

    // Build task description for logging
    let taskDescription = ''
    if (task.discovery_type === 'location') {
      taskDescription = task.hashtag_filter
        ? `${task.location_query} + #${task.hashtag_filter}`
        : task.location_query || 'Unknown location'
    } else {
      taskDescription = task.hashtag || 'Unknown hashtag'
    }

    console.log(`Processing Instagram ${task.discovery_type} discovery: ${taskDescription}`)

    // Mark as processing
    await supabase
      .from('instagram_trend_queue')
      .update({
        status: 'processing',
        attempts: task.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Call Python instagrapi service to discover trending content
    const requestBody = task.discovery_type === 'location'
      ? {
          action: 'discover_location',
          location_name: task.location_query,
          hashtag_filter: task.hashtag_filter, // Hybrid: filter by hashtag within location
          limit: 50
        }
      : {
          action: 'discover_hashtag',
          hashtag: task.hashtag,
          limit: 50
        }

    const instagrapiResponse = await fetch(`${supabaseUrl}/functions/v1/instagrapi-scraper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!instagrapiResponse.ok) {
      throw new Error(`Instagrapi service error: ${instagrapiResponse.status}`)
    }

    const instagrapiData = await instagrapiResponse.json()

    if (!instagrapiData.success) {
      throw new Error(instagrapiData.error || 'Failed to fetch trending posts')
    }

    console.log(`Found ${instagrapiData.posts?.length || 0} trending posts for ${taskDescription}`)

    const posts = instagrapiData.posts || []
    let newVendorsDiscovered = 0

    // Process each trending post
    for (const post of posts) {
      // Skip if not a business account (focus on vendors)
      if (!post.is_business) {
        continue
      }

      // Check if we already have this vendor
      const { data: existingListing } = await supabase
        .from('listings')
        .select('id')
        .eq('instagram_handle', post.username)
        .single()

      if (existingListing) {
        console.log(`Vendor already exists: @${post.username}`)
        continue
      }

      // Check if already in discovered_listings
      const { data: existingDiscovery } = await supabase
        .from('discovered_listings')
        .select('id')
        .ilike('name', `%${post.full_name}%`)
        .single()

      if (existingDiscovery) {
        console.log(`Vendor already discovered: ${post.full_name}`)
        continue
      }

      // New vendor discovered! Save to discovered_listings
      const vendorName = post.full_name || post.username
      const location = post.location || post.location_name || task.city || 'Unknown'

      const { data: discovery, error: saveError } = await supabase
        .from('discovered_listings')
        .insert({
          name: vendorName,
          location: location,
          city: task.city,
          country: task.country,
          type: task.service_type,
          instagram_handle: post.username,
          engagement_score: post.engagement_score || 0,
          enrichment_status: 'pending',
          why_trending: `Discovered via Instagram ${task.discovery_type === 'hashtag' ? '#' + task.hashtag : task.location_query}`
        })
        .select()
        .single()

      if (saveError) {
        console.error(`Error saving discovery: ${saveError.message}`)
        continue
      }

      // Create enrichment task
      await supabase
        .from('enrichment_queue')
        .insert({
          discovery_id: discovery.id,
          vendor_name: vendorName,
          location: location,
          city: task.city,
          country: task.country,
          service_type: task.service_type,
          priority: 6, // Lower priority for trend discoveries
          scheduled_for: new Date().toISOString()
        })

      newVendorsDiscovered++
      console.log(`✨ New vendor discovered: ${vendorName} (@${post.username})`)
    }

    // Mark task as completed and schedule next discovery
    const nextDiscoveryAt = new Date(Date.now() + 168 * 60 * 60 * 1000) // 7 days

    await supabase
      .from('instagram_trend_queue')
      .update({
        status: 'completed',
        posts_analyzed: posts.length,
        new_vendors_discovered: newVendorsDiscovered,
        last_discovered_at: new Date().toISOString(),
        next_discovery_at: nextDiscoveryAt.toISOString(),
        completed_at: new Date().toISOString(),
        // Reset for next run
        scheduled_for: nextDiscoveryAt.toISOString(),
        attempts: 0,
        error_message: null
      })
      .eq('id', task.id)

    // Reset status to pending for next scheduled run
    await supabase
      .from('instagram_trend_queue')
      .update({ status: 'pending' })
      .eq('id', task.id)

    if (newVendorsDiscovered > 0) {
      const discoveryLabel = task.discovery_type === 'location'
        ? `📍 Location Discovery: ${task.location_query}`
        : `🔥 Hashtag Discovery: ${task.hashtag}`

      await discord.logDiscovery(
        discoveryLabel,
        {
          discovery_type: task.discovery_type,
          posts_analyzed: posts.length,
          new_vendors: newVendorsDiscovered,
          city: task.city || 'All locations',
          next_check: nextDiscoveryAt.toISOString()
        }
      )
    }

    console.log(`✅ ${task.discovery_type} discovery complete: ${newVendorsDiscovered} new vendors from ${posts.length} posts`)

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        discovery_type: task.discovery_type,
        query: task.discovery_type === 'location' ? task.location_query : task.hashtag,
        posts_analyzed: posts.length,
        new_vendors_discovered: newVendorsDiscovered
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Instagram trend processor error:', error)

    // Mark task as failed with retry
    if (taskId) {
      const { data: task } = await supabase
        .from('instagram_trend_queue')
        .select('attempts, max_attempts')
        .eq('id', taskId)
        .single()

      if (task && task.attempts < task.max_attempts) {
        // Schedule retry with exponential backoff
        const retryDelayHours = Math.pow(2, task.attempts) * 1 // 1, 2, 4 hours
        const nextRetry = new Date(Date.now() + retryDelayHours * 60 * 60 * 1000)

        await supabase
          .from('instagram_trend_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            next_retry_at: nextRetry.toISOString(),
            scheduled_for: nextRetry.toISOString()
          })
          .eq('id', taskId)
      } else {
        // Max attempts reached
        await supabase
          .from('instagram_trend_queue')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', taskId)
      }
    }

    await discord.logError(
      '❌ Instagram trend discovery failed',
      error as Error,
      { task_id: taskId }
    )

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
