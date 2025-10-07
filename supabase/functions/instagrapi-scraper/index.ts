/**
 * Instagram Scraper using instagram-scraper-deno
 * Handles monitoring user accounts
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { IgApiClient } from 'npm:instagram-private-api@^1.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InstagramPost {
  id: string
  caption: string
  posted_at: string
  likes: number
  comments: number
  image_urls: string[]
  media_type: number
  is_video: boolean
}

// Singleton Instagram client
let ig: IgApiClient | null = null
let isLoggedIn = false

async function getInstagramClient() {
  if (!ig) {
    ig = new IgApiClient()
    ig.state.generateDevice(Deno.env.get('INSTAGRAM_USERNAME') || 'the_vows_social')
  }

  // Login if not already logged in
  if (!isLoggedIn) {
    const username = Deno.env.get('INSTAGRAM_USERNAME')
    const password = Deno.env.get('INSTAGRAM_PASSWORD')

    if (!username || !password) {
      throw new Error('Instagram credentials not configured')
    }

    try {
      await ig.account.login(username, password)
      isLoggedIn = true
      console.log(`Logged in to Instagram as @${username}`)
    } catch (error) {
      console.error('Instagram login failed:', error)
      throw new Error(`Instagram login failed: ${error.message}`)
    }
  }

  return ig
}

async function getUserPosts(username: string, limit: number = 12) {
  try {
    const ig = await getInstagramClient()

    // Get user ID from username
    const userId = await ig.user.getIdByUsername(username)

    // Fetch user feed
    const userFeed = ig.feed.user(userId)
    const items = await userFeed.items()

    const posts: InstagramPost[] = items.slice(0, limit).map((item: any) => {
      // Extract image URLs
      const image_urls: string[] = []

      if (item.image_versions2?.candidates) {
        image_urls.push(item.image_versions2.candidates[0].url)
      }

      // Handle carousel albums
      if (item.carousel_media) {
        item.carousel_media.forEach((media: any) => {
          if (media.image_versions2?.candidates) {
            image_urls.push(media.image_versions2.candidates[0].url)
          }
        })
      }

      return {
        id: item.pk,
        caption: item.caption?.text || '',
        posted_at: new Date(item.taken_at * 1000).toISOString(),
        likes: item.like_count || 0,
        comments: item.comment_count || 0,
        image_urls,
        media_type: item.media_type,
        is_video: item.media_type === 2
      }
    })

    return posts
  } catch (error) {
    console.error(`Failed to fetch posts for @${username}:`, error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = body.action
    const username = body.username
    const limit = body.limit || 12

    console.log(`Instagram API action: ${action} for @${username}`)

    if (action === 'monitor_user') {
      try {
        const posts = await getUserPosts(username, limit)

        return new Response(
          JSON.stringify({
            success: true,
            username,
            posts,
            total_posts: posts.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error: any) {
        console.error('Error fetching Instagram data:', error)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch user posts: ${error.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // For hashtag and location discovery - implement later
    return new Response(
      JSON.stringify({
        success: false,
        error: `Action "${action}" not implemented yet. Only "monitor_user" is supported.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error: any) {
    console.error('Instagram scraper error:', error)

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
