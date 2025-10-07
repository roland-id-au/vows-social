/**
 * Publishing Queue Processor
 * Processes one publishing task at a time from the publishing_queue
 * Publishes listings to Discord and other channels
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DiscordLogger } from '../_shared/discord-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishingTask {
  id: string
  listing_id: string
  channels: string[]
  message_template: string | null
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
    // Get next pending publishing task
    const { data: task, error: taskError } = await supabase
      .rpc('get_next_publishing_task')
      .single() as { data: PublishingTask | null, error: any }

    if (taskError || !task) {
      console.log('No pending publishing tasks')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending tasks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    taskId = task.id
    console.log(`Processing publishing task ${task.id}: listing ${task.listing_id}`)

    // Mark as processing
    await supabase
      .from('publishing_queue')
      .update({
        status: 'processing',
        attempts: task.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Fetch listing with all related data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        *,
        listing_media(*),
        packages(*),
        listing_tags(tag_name, tags(*))
      `)
      .eq('id', task.listing_id)
      .single()

    if (listingError || !listing) {
      throw new Error(`Listing not found: ${task.listing_id}`)
    }

    console.log(`Publishing: ${listing.title}`)

    const publishedChannels: string[] = []
    let discordMessageId: string | null = null

    // Publish to Discord
    if (task.channels.includes('discord')) {
      const venueUrl = `https://vows.social/venues/${listing.slug || listing.id}`

      // Get first image if available
      const firstImage = listing.listing_media?.[0]?.url

      // Build message
      const locationData = listing.location_data as any
      const priceData = listing.price_data as any

      const message = {
        content: `🎉 **New ${listing.service_type} Added**`,
        embeds: [{
          title: listing.title,
          description: listing.description || 'No description available',
          url: venueUrl,
          color: 0x9333EA, // Purple
          fields: [
            {
              name: '📍 Location',
              value: `${locationData?.city || 'Unknown'}, ${locationData?.state || 'Unknown'}`,
              inline: true
            },
            {
              name: '💰 Price Range',
              value: priceData?.min_price && priceData?.max_price
                ? `$${priceData.min_price.toLocaleString()} - $${priceData.max_price.toLocaleString()} AUD`
                : 'Contact for pricing',
              inline: true
            },
            {
              name: '👥 Capacity',
              value: listing.min_capacity && listing.max_capacity
                ? `${listing.min_capacity} - ${listing.max_capacity} guests`
                : 'Contact for details',
              inline: true
            },
            {
              name: '🔗 View Details',
              value: `[Visit on Vows.Social](${venueUrl})`,
              inline: false
            }
          ],
          image: firstImage ? { url: firstImage } : undefined,
          footer: {
            text: `${listing.listing_media?.length || 0} photos • ${listing.packages?.length || 0} packages available`
          },
          timestamp: new Date().toISOString()
        }]
      }

      // Send to Discord
      const discordWebhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')!
      const discordResponse = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      if (!discordResponse.ok) {
        throw new Error(`Discord API error: ${discordResponse.status}`)
      }

      // Get message ID from response (if available)
      if (discordResponse.ok && discordResponse.status === 200) {
        const discordData = await discordResponse.json()
        discordMessageId = discordData.id
      }

      publishedChannels.push('discord')
      console.log('Published to Discord')
    }

    // Future: Publish to Instagram, Facebook, etc.

    // Mark task as published
    await supabase
      .from('publishing_queue')
      .update({
        status: 'published',
        published_channels: publishedChannels,
        discord_message_id: discordMessageId,
        published_at: new Date().toISOString()
      })
      .eq('id', task.id)

    console.log(`✅ Publishing complete: ${publishedChannels.join(', ')}`)

    await discord.success(
      `Published listing: ${listing.title}`,
      {
        'Channels': publishedChannels.join(', '),
        'Location': `${listing.location_data?.city}`,
        'Type': listing.service_type
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        listing_id: task.listing_id,
        published_channels: publishedChannels
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Publishing processor error:', error)

    // Mark task as failed with retry
    if (taskId) {
      const { data: task } = await supabase
        .from('publishing_queue')
        .select('attempts, max_attempts')
        .eq('id', taskId)
        .single()

      if (task && task.attempts < task.max_attempts) {
        // Schedule retry with exponential backoff
        const retryDelayMinutes = Math.pow(2, task.attempts) * 2 // 2, 4, 8 minutes
        const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000)

        await supabase
          .from('publishing_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            next_retry_at: nextRetry.toISOString()
          })
          .eq('id', taskId)
      } else {
        // Max attempts reached
        await supabase
          .from('publishing_queue')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', taskId)
      }
    }

    await discord.error(
      'Publishing processor failed',
      error
    )

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
