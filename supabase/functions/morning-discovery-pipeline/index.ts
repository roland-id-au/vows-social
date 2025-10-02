// Morning automated pipeline:
// 1. Discover trending venues from Instagram
// 2. Research discovered venues
// 3. Send push notification to users about new trendy venues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🌅 Starting morning discovery pipeline...')

    // STEP 1: Discover trending venues from Instagram
    console.log('\n📸 Step 1: Discovering trending venues...')

    const discoveryResponse = await fetch(`${supabaseUrl}/functions/v1/discover-trending-venues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      }
    })

    const discoveryResult = await discoveryResponse.json()

    if (!discoveryResult.success) {
      throw new Error(`Discovery failed: ${discoveryResult.error}`)
    }

    console.log(`Found ${discoveryResult.new_discoveries} new trending venues`)

    // STEP 2: Research top 5 discovered venues (increased from 3 for faster growth)
    console.log('\n🔍 Step 2: Researching discovered venues...')

    const { data: pendingDiscoveries } = await supabase
      .from('discovered_venues')
      .select('*')
      .eq('status', 'pending_research')
      .order('engagement_score', { ascending: false })
      .limit(5) // Research top 5 by engagement for continuous database growth

    const researchedVenues = []

    if (pendingDiscoveries && pendingDiscoveries.length > 0) {
      for (const discovery of pendingDiscoveries) {
        console.log(`Researching: ${discovery.name}...`)

        try {
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
            researchedVenues.push({
              id: researchResult.listing.id,
              title: researchResult.listing.title,
              images_count: researchResult.listing.images_count,
              why_trending: discovery.why_trending,
              engagement_score: discovery.engagement_score
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

            console.log(`✓ Researched: ${discovery.name}`)
          } else {
            console.log(`✗ Failed to research: ${discovery.name}`)

            await supabase
              .from('discovered_venues')
              .update({ status: 'research_failed' })
              .eq('id', discovery.id)
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 5000))

        } catch (error) {
          console.error(`Error researching ${discovery.name}:`, error)
        }
      }
    }

    console.log(`Researched ${researchedVenues.length} new venues`)

    // STEP 3: Send push notifications if we have new venues
    if (researchedVenues.length > 0) {
      console.log('\n📱 Step 3: Sending push notifications...')

      // Get users who have notifications enabled
      const { data: users } = await supabase
        .from('users')
        .select('id, push_token, wedding_date, location_data')
        .not('push_token', 'is', null)
        .eq('notifications_enabled', true)

      if (users && users.length > 0) {
        // Prepare notification payload
        const topVenue = researchedVenues[0]
        const notificationTitle = '✨ New Trending Venues Discovered!'
        const notificationBody = researchedVenues.length === 1
          ? `${topVenue.title} is trending! ${topVenue.why_trending}`
          : `${researchedVenues.length} hot new venues just added, including ${topVenue.title}`

        // Send notifications (using FCM or similar)
        const notificationPromises = users.map(async (user) => {
          try {
            // Send via Firebase Cloud Messaging or similar service
            await sendPushNotification({
              token: user.push_token,
              title: notificationTitle,
              body: notificationBody,
              data: {
                type: 'new_venues',
                venue_ids: researchedVenues.map(v => v.id),
                action: 'open_trending'
              }
            })

            // Log notification
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: notificationTitle,
              body: notificationBody,
              type: 'new_venues',
              data: {
                venue_ids: researchedVenues.map(v => v.id)
              },
              sent_at: new Date().toISOString()
            })

          } catch (error) {
            console.error(`Failed to send notification to user ${user.id}:`, error)
          }
        })

        await Promise.allSettled(notificationPromises)

        console.log(`Sent notifications to ${users.length} users`)
      }
    }

    // Log pipeline completion
    await supabase.from('sync_logs').insert({
      source: 'morning_discovery_pipeline',
      status: 'success',
      records_processed: researchedVenues.length,
      metadata: {
        discoveries: discoveryResult.new_discoveries,
        researched: researchedVenues.length,
        notifications_sent: researchedVenues.length > 0
      },
      timestamp: new Date().toISOString()
    })

    console.log('\n✅ Morning discovery pipeline complete!')

    return new Response(
      JSON.stringify({
        success: true,
        discoveries: discoveryResult.new_discoveries,
        researched: researchedVenues.length,
        venues: researchedVenues,
        message: `Pipeline complete: ${researchedVenues.length} new venues added`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Morning pipeline error:', error)

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase.from('sync_logs').insert({
      source: 'morning_discovery_pipeline',
      status: 'error',
      errors: error.message,
      timestamp: new Date().toISOString()
    })

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

// Helper function to send push notifications
async function sendPushNotification(params: {
  token: string
  title: string
  body: string
  data?: any
}) {
  // This would integrate with Firebase Cloud Messaging or similar
  // Example using FCM:
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')

  if (!fcmServerKey) {
    console.warn('FCM_SERVER_KEY not configured')
    return
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: params.token,
      notification: {
        title: params.title,
        body: params.body,
        icon: 'notification_icon',
        sound: 'default'
      },
      data: params.data
    })
  })

  if (!response.ok) {
    throw new Error(`FCM error: ${response.status}`)
  }

  return response.json()
}
