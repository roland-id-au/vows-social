// Morning automated pipeline:
// 1. Discover trending venues from Instagram
// 2. Research discovered venues
// 3. Send push notification to users about new trendy venues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to log to Discord
async function logToDiscord(message: string, level: 'info' | 'error' | 'success' = 'info') {
  const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
  if (!webhookUrl) return

  const colors = { info: 0x3498db, error: 0xe74c3c, success: 0x2ecc71 }
  const emojis = { info: 'ℹ️', error: '❌', success: '✅' }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `${emojis[level]} Morning Discovery Pipeline`,
          description: message,
          color: colors[level],
          timestamp: new Date().toISOString()
        }]
      })
    })
  } catch (error) {
    console.error('Discord logging failed:', error)
  }
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🌅 Starting morning discovery pipeline...')
    await logToDiscord('🌅 Starting morning discovery pipeline...')

    // STEP 1A: Discover trending venues from Instagram
    console.log('\n📸 Step 1A: Discovering trending venues...')

    const venueDiscoveryResponse = await fetch(`${supabaseUrl}/functions/v1/discover-trending-venues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!venueDiscoveryResponse.ok) {
      const errorText = await venueDiscoveryResponse.text()
      const errorMsg = `Venue discovery HTTP error: ${venueDiscoveryResponse.status} - ${errorText}`
      console.error(errorMsg)
      await logToDiscord(errorMsg, 'error')
      throw new Error(errorMsg)
    }

    const venueDiscoveryText = await venueDiscoveryResponse.text()
    let venueDiscoveryResult

    try {
      venueDiscoveryResult = JSON.parse(venueDiscoveryText)
    } catch (parseError) {
      const errorMsg = `Venue discovery JSON parse error. Response: ${venueDiscoveryText.substring(0, 200)}`
      console.error(errorMsg)
      await logToDiscord(errorMsg, 'error')
      throw new Error(errorMsg)
    }

    if (!venueDiscoveryResult.success) {
      const errorMsg = `Venue discovery failed: ${venueDiscoveryResult.error}`
      await logToDiscord(errorMsg, 'error')
      throw new Error(errorMsg)
    }

    console.log(`Found ${venueDiscoveryResult.new_discoveries} new trending venues`)
    await logToDiscord(`📸 Found ${venueDiscoveryResult.new_discoveries} new trending venues`)

    // STEP 1B: Discover trending wedding services from Instagram
    console.log('\n💐 Step 1B: Discovering trending wedding services...')

    const serviceDiscoveryResponse = await fetch(`${supabaseUrl}/functions/v1/discover-wedding-services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      }
    })

    let serviceDiscoveryResult = { success: false, new_discoveries: 0 }

    if (!serviceDiscoveryResponse.ok) {
      const errorText = await serviceDiscoveryResponse.text()
      console.warn(`Service discovery HTTP error: ${serviceDiscoveryResponse.status} - ${errorText}`)
      await logToDiscord(`⚠️ Service discovery failed: ${errorText.substring(0, 100)}`, 'error')
    } else {
      const serviceDiscoveryText = await serviceDiscoveryResponse.text()
      try {
        serviceDiscoveryResult = JSON.parse(serviceDiscoveryText)
        if (!serviceDiscoveryResult.success) {
          console.warn(`Service discovery failed: ${serviceDiscoveryResult.error}`)
        } else {
          await logToDiscord(`💐 Found ${serviceDiscoveryResult.new_discoveries} new trending services`)
        }
      } catch (parseError) {
        console.warn(`Service discovery JSON parse error: ${serviceDiscoveryText.substring(0, 100)}`)
      }
    }

    const totalNewDiscoveries = venueDiscoveryResult.new_discoveries + (serviceDiscoveryResult.new_discoveries || 0)
    console.log(`Total new discoveries: ${totalNewDiscoveries} (${venueDiscoveryResult.new_discoveries} venues + ${serviceDiscoveryResult.new_discoveries || 0} services)`)
    await logToDiscord(`🎯 Total discoveries: ${totalNewDiscoveries} (${venueDiscoveryResult.new_discoveries} venues + ${serviceDiscoveryResult.new_discoveries || 0} services)`, 'success')

    // STEP 2: Research top 5 discovered venues (increased from 3 for faster growth)
    console.log('\n🔍 Step 2: Researching discovered venues...')

    const { data: pendingDiscoveries } = await supabase
      .from('discovered_listings')
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
              .from('discovered_listings')
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
              .from('discovered_listings')
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

    console.log(`Researched ${researchedVenues.length} new listings`)
    await logToDiscord(`🔍 Researched ${researchedVenues.length} new listings`, 'success')

    // STEP 3: Verify enrichment and send push notifications
    if (researchedVenues.length > 0) {
      console.log('\n✅ Step 3: Verifying enrichment quality...')

      // Only notify about fully enriched listings (with photos and packages)
      const fullyEnriched = researchedVenues.filter(v =>
        v.images_count > 0 && v.packages_count > 0
      )

      console.log(`Fully enriched listings: ${fullyEnriched.length}/${researchedVenues.length}`)
      await logToDiscord(`✅ Enrichment: ${fullyEnriched.length}/${researchedVenues.length} fully enriched`)

      if (fullyEnriched.length === 0) {
        console.log('No fully enriched listings to notify about')
      } else {
        console.log('\n📱 Step 4: Sending push notifications...')

        // Get users who have notifications enabled
        const { data: users } = await supabase
          .from('users')
          .select('id, push_token, wedding_date, location_data')
          .not('push_token', 'is', null)
          .eq('notifications_enabled', true)

        if (users && users.length > 0) {
          // Prepare notification payload
          const topListing = fullyEnriched[0]
          const notificationTitle = '✨ New Trending Listings Discovered!'
          const notificationBody = fullyEnriched.length === 1
            ? `${topListing.title} is trending! ${topListing.why_trending}`
            : `${fullyEnriched.length} hot new listings just added, including ${topListing.title}`

          // Send notifications (using FCM or similar)
          const notificationPromises = users.map(async (user) => {
            try {
              // Send via Firebase Cloud Messaging or similar service
              await sendPushNotification({
                token: user.push_token,
                title: notificationTitle,
                body: notificationBody,
                data: {
                  type: 'new_listings',
                  listing_ids: fullyEnriched.map(v => v.id),
                  action: 'open_trending'
                }
              })

              // Log notification
              await supabase.from('notifications').insert({
                user_id: user.id,
                title: notificationTitle,
                body: notificationBody,
                type: 'new_listings',
                data: {
                  listing_ids: fullyEnriched.map(v => v.id)
                },
                sent_at: new Date().toISOString()
              })

            } catch (error) {
              console.error(`Failed to send notification to user ${user.id}:`, error)
            }
          })

          await Promise.allSettled(notificationPromises)

          console.log(`Sent notifications to ${users.length} users`)
          await logToDiscord(`📱 Sent ${fullyEnriched.length} listing notifications to ${users.length} users`, 'success')
        } else {
          await logToDiscord('📱 No users to notify (no push tokens)', 'info')
        }
      }
    }

    // Calculate fully enriched count
    const fullyEnrichedCount = researchedVenues.filter(v =>
      v.images_count > 0 && v.packages_count > 0
    ).length

    // Log pipeline completion
    await supabase.from('sync_logs').insert({
      source: 'morning_discovery_pipeline',
      status: 'success',
      records_processed: researchedVenues.length,
      metadata: {
        total_discoveries: totalNewDiscoveries,
        venue_discoveries: venueDiscoveryResult.new_discoveries,
        service_discoveries: serviceDiscoveryResult.new_discoveries || 0,
        researched: researchedVenues.length,
        fully_enriched: fullyEnrichedCount,
        notifications_sent: fullyEnrichedCount > 0
      },
      timestamp: new Date().toISOString()
    })

    console.log('\n✅ Morning discovery pipeline complete!')
    await logToDiscord(
      `✅ **Pipeline Complete**\n` +
      `• Discoveries: ${totalNewDiscoveries}\n` +
      `• Researched: ${researchedVenues.length}\n` +
      `• Fully Enriched: ${fullyEnrichedCount}`,
      'success'
    )

    return new Response(
      JSON.stringify({
        success: true,
        total_discoveries: totalNewDiscoveries,
        venue_discoveries: venueDiscoveryResult.new_discoveries,
        service_discoveries: serviceDiscoveryResult.new_discoveries || 0,
        researched: researchedVenues.length,
        fully_enriched: fullyEnrichedCount,
        listings: researchedVenues,
        message: `Pipeline complete: ${researchedVenues.length} listings researched, ${fullyEnrichedCount} fully enriched`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Morning pipeline error:', error)
    await logToDiscord(`❌ **Pipeline Failed**\n${error.message}`, 'error')

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
