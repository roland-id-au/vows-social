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
    // Try Facebook login first (for accounts linked to Facebook)
    const fbPhone = Deno.env.get('INSTAGRAM_FB_PHONE')
    const fbPassword = Deno.env.get('INSTAGRAM_FB_PASSWORD')

    if (fbPhone && fbPassword) {
      try {
        console.log('Attempting Facebook login for Instagram...')

        // Facebook login flow
        await ig.account.loginWithFacebook(fbPhone, fbPassword)

        isLoggedIn = true
        console.log('Logged in to Instagram via Facebook')
        return ig
      } catch (fbError) {
        console.error('Facebook login failed:', fbError)
        // Fall through to regular Instagram login
      }
    }

    // Fallback to regular Instagram login
    const username = Deno.env.get('INSTAGRAM_USERNAME')
    const password = Deno.env.get('INSTAGRAM_PASSWORD')

    if (!username || !password) {
      throw new Error('Neither Facebook nor Instagram credentials configured')
    }

    try {
      console.log(`Attempting Instagram login as @${username}...`)
      await ig.account.login(username, password)
      isLoggedIn = true
      console.log(`Logged in to Instagram as @${username}`)
    } catch (error: any) {
      // Handle challenge_required error
      if (error.name === 'IgChallengeRequiredError') {
        console.log('Challenge required - attempting auto-solve...')

        try {
          // Automatically resolve challenge if possible
          await ig.challenge.auto(true) // true = reset existing challenge
          console.log('Challenge auto-solved successfully')
          isLoggedIn = true
          return ig
        } catch (challengeError: any) {
          console.error('Challenge auto-solve failed:', challengeError)

          // Return detailed challenge info for manual resolution
          throw new Error(JSON.stringify({
            type: 'challenge_required',
            message: 'Instagram challenge required - check logs for details',
            challengeUrl: error.checkpoint_url || error.challenge_url,
            hint: 'Login manually to Instagram and complete the challenge, then retry'
          }))
        }
      }

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

async function followUser(username: string) {
  try {
    const ig = await getInstagramClient()
    const userId = await ig.user.getIdByUsername(username)

    // Check if already following
    const friendship = await ig.friendship.show(userId)

    if (friendship.following) {
      console.log(`Already following @${username}`)
      return { success: true, already_following: true }
    }

    // Follow the user
    await ig.friendship.create(userId)
    console.log(`Successfully followed @${username}`)

    return { success: true, followed: true }
  } catch (error: any) {
    console.error(`Failed to follow @${username}:`, error)
    throw error
  }
}

async function getFollowing(limit: number = 50) {
  try {
    const ig = await getInstagramClient()
    const accountId = await ig.account.currentUser()

    // Get following list
    const following = await ig.feed.accountFollowing(accountId.pk).items()

    const accounts = following.slice(0, limit).map((user: any) => ({
      username: user.username,
      full_name: user.full_name,
      is_verified: user.is_verified,
      follower_count: user.follower_count
    }))

    return accounts
  } catch (error: any) {
    console.error('Failed to fetch following list:', error)
    throw error
  }
}

async function discoverByHashtag(hashtag: string, limit: number = 20) {
  try {
    const ig = await getInstagramClient()

    // Remove # if present
    const cleanHashtag = hashtag.replace('#', '')

    // Get hashtag feed
    const hashtagFeed = ig.feed.tag(cleanHashtag)
    const items = await hashtagFeed.items()

    const accounts = new Map<string, any>()

    // Extract unique accounts from hashtag posts
    items.slice(0, limit).forEach((item: any) => {
      if (item.user && !accounts.has(item.user.username)) {
        accounts.set(item.user.username, {
          username: item.user.username,
          full_name: item.user.full_name,
          is_verified: item.user.is_verified,
          follower_count: item.user.follower_count,
          discovered_via_hashtag: cleanHashtag
        })
      }
    })

    return Array.from(accounts.values())
  } catch (error: any) {
    console.error(`Failed to discover via #${hashtag}:`, error)
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
    const hashtag = body.hashtag
    const limit = body.limit || 12

    console.log(`Instagram API action: ${action}`, username ? `for @${username}` : '')

    // Monitor user posts
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

    // Follow user
    if (action === 'follow_user') {
      try {
        const result = await followUser(username)

        return new Response(
          JSON.stringify({
            success: true,
            username,
            ...result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to follow user: ${error.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // Get following list
    if (action === 'get_following') {
      try {
        const accounts = await getFollowing(limit)

        return new Response(
          JSON.stringify({
            success: true,
            accounts,
            total: accounts.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch following: ${error.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // Discover by hashtag
    if (action === 'discover_hashtag') {
      try {
        const accounts = await discoverByHashtag(hashtag, limit)

        return new Response(
          JSON.stringify({
            success: true,
            hashtag,
            accounts,
            total: accounts.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to discover via hashtag: ${error.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // Unknown action
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Supported: monitor_user, follow_user, get_following, discover_hashtag`
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
