/**
 * Instagram Monitor Processor
 * Monitors Instagram accounts of existing listings for new photos and updates
 * Calls Python instagrapi service to fetch content
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { downloadAndStoreImages } from '../_shared/image-storage.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MonitorTask {
  id: string
  listing_id: string
  instagram_handle: string
  attempts: number
  max_attempts: number
  last_monitored_at: string | null
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
    // Get next pending monitoring task
    const { data: task, error: taskError } = await supabase
      .rpc('get_next_instagram_monitor_task')
      .single() as { data: MonitorTask | null, error: any }

    if (taskError || !task) {
      console.log('No pending Instagram monitoring tasks')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending tasks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    taskId = task.id
    console.log(`Processing Instagram monitor task ${task.id}: @${task.instagram_handle}`)

    // Mark as processing
    await supabase
      .from('instagram_monitor_queue')
      .update({
        status: 'processing',
        attempts: task.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Call Python instagrapi service to fetch posts
    const instagrapiResponse = await fetch(`${supabaseUrl}/functions/v1/instagrapi-scraper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'monitor_user',
        username: task.instagram_handle,
        limit: 12, // Fetch last 12 posts
        last_monitored_at: task.last_monitored_at
      })
    })

    if (!instagrapiResponse.ok) {
      throw new Error(`Instagrapi service error: ${instagrapiResponse.status}`)
    }

    const instagrapiData = await instagrapiResponse.json()

    if (!instagrapiData.success) {
      throw new Error(instagrapiData.error || 'Failed to fetch Instagram posts')
    }

    console.log(`Fetched ${instagrapiData.posts?.length || 0} posts from @${task.instagram_handle}`)

    // Get existing post IDs for this listing
    const { data: existingPosts } = await supabase
      .from('instagram_posts')
      .select('post_id')
      .eq('listing_id', task.listing_id)

    const existingPostIds = new Set(existingPosts?.map(p => p.post_id) || [])

    // Filter for new posts only
    const newPosts = instagrapiData.posts?.filter((post: any) => !existingPostIds.has(post.id)) || []

    console.log(`Found ${newPosts.length} new posts`)

    let newPhotosStored = 0

    // Process each new post
    for (const post of newPosts) {
      // Download and store images
      const imageUrls = post.image_urls || []
      let storedImages: any[] = []

      if (imageUrls.length > 0) {
        storedImages = await downloadAndStoreImages(
          supabase,
          imageUrls,
          task.listing_id,
          imageUrls.length
        )

        newPhotosStored += storedImages.length

        // Save media records
        if (storedImages.length > 0) {
          const mediaRecords = storedImages.map((img, index) => ({
            listing_id: task.listing_id,
            media_type: 'image',
            url: img.url,
            source: 'instagram_monitor',
            order_index: index,
            metadata: {
              size: img.size,
              content_type: img.contentType,
              storage_path: img.path,
              instagram_post_id: post.id
            }
          }))

          await supabase.from('listing_media').insert(mediaRecords)
        }
      }

      // Save Instagram post record
      await supabase
        .from('instagram_posts')
        .insert({
          listing_id: task.listing_id,
          post_id: post.id,
          image_url: storedImages[0]?.url || post.image_urls?.[0] || '',
          caption: post.caption || '',
          username: task.instagram_handle,
          posted_at: post.posted_at,
          engagement_score: post.likes + (post.comments || 0),
          source: 'monitor',
          is_trending: post.likes > 1000 // Mark as trending if > 1000 likes
        })
        .select()

      console.log(`Saved post ${post.id}: ${storedImages.length} photos`)
    }

    // Mark task as completed and schedule next monitoring
    const nextMonitorAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await supabase
      .from('instagram_monitor_queue')
      .update({
        status: 'completed',
        new_posts_found: newPosts.length,
        new_photos_stored: newPhotosStored,
        last_monitored_at: new Date().toISOString(),
        next_monitor_at: nextMonitorAt.toISOString(),
        completed_at: new Date().toISOString(),
        // Reset for next run
        scheduled_for: nextMonitorAt.toISOString(),
        attempts: 0,
        error_message: null
      })
      .eq('id', task.id)

    // Reset status to pending for next scheduled run
    await supabase
      .from('instagram_monitor_queue')
      .update({ status: 'pending' })
      .eq('id', task.id)

    if (newPosts.length > 0) {
      await discord.logSuccess(
        `📸 Instagram Monitor: @${task.instagram_handle}`,
        {
          new_posts: newPosts.length,
          new_photos: newPhotosStored,
          next_check: nextMonitorAt.toISOString()
        }
      )
    }

    console.log(`✅ Monitoring complete: ${newPosts.length} new posts, ${newPhotosStored} photos stored`)

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        instagram_handle: task.instagram_handle,
        new_posts: newPosts.length,
        new_photos: newPhotosStored
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Instagram monitor processor error:', error)

    // Mark task as failed with retry
    if (taskId) {
      const { data: task } = await supabase
        .from('instagram_monitor_queue')
        .select('attempts, max_attempts')
        .eq('id', taskId)
        .single()

      if (task && task.attempts < task.max_attempts) {
        // Schedule retry with exponential backoff
        const retryDelayMinutes = Math.pow(2, task.attempts) * 30 // 30, 60, 120 minutes
        const nextRetry = new Date(Date.now() + retryDelayMinutes * 60 * 1000)

        await supabase
          .from('instagram_monitor_queue')
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
          .from('instagram_monitor_queue')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', taskId)
      }
    }

    await discord.logError(
      '❌ Instagram monitor failed',
      error as Error,
      { task_id: taskId }
    )

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
