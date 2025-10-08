/**
 * Instagram Scraper using instagram-scraper-deno
 * Handles monitoring user accounts
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { IgApiClient } from 'npm:instagram-private-api@^1.45.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DiscordLogger } from '../_shared/discord-logger.ts'

// Delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const discord = new DiscordLogger()

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
let pendingChallenge: any = null

// Load session from Supabase Storage
async function loadSession(): Promise<any | null> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase.storage
      .from('instagram-sessions')
      .download('session.json')

    if (error || !data) {
      console.log('No existing session found')
      return null
    }

    const text = await data.text()
    const session = JSON.parse(text)
    console.log('Loaded existing Instagram session from storage')

    await discord.log('📥 Instagram Session Restored', {
      color: 0x0099ff,
      metadata: {
        'Source': 'Supabase Storage',
        'Status': 'Session loaded successfully'
      }
    })

    return session
  } catch (error) {
    console.error('Failed to load session:', error)
    return null
  }
}

// Save session to Supabase Storage
async function saveSession(session: any): Promise<void> {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const sessionJson = JSON.stringify(session)

    const { error } = await supabase.storage
      .from('instagram-sessions')
      .upload('session.json', new Blob([sessionJson]), {
        upsert: true,
        contentType: 'application/json'
      })

    if (error) {
      console.error('Failed to save session:', error)

      await discord.log('⚠️ Session Save Failed', {
        color: 0xff9900,
        metadata: {
          'Error': error.message || 'Unknown error',
          'Storage': 'Supabase Storage'
        }
      })
    } else {
      console.log('Instagram session saved to storage')

      await discord.log('💾 Instagram Session Saved', {
        color: 0x0099ff,
        metadata: {
          'Storage': 'Supabase Storage',
          'Status': 'Session persisted successfully'
        }
      })
    }
  } catch (error: any) {
    console.error('Failed to save session:', error)

    await discord.log('❌ Session Save Error', {
      color: 0xff0000,
      metadata: {
        'Error': error.message || 'Unknown error',
        'Storage': 'Supabase Storage'
      }
    })
  }
}

async function getInstagramClient() {
  if (!ig) {
    const username = Deno.env.get('INSTAGRAM_USERNAME')
    if (!username) {
      throw new Error('INSTAGRAM_USERNAME environment variable not set')
    }

    ig = new IgApiClient()
    ig.state.generateDevice(username)

    // Try to restore session from storage
    const savedSession = await loadSession()
    if (savedSession) {
      try {
        await ig.state.deserialize(savedSession)
        isLoggedIn = true
        console.log('Instagram session restored from storage')
        return ig
      } catch (error) {
        console.error('Failed to restore session, will re-login:', error)
        isLoggedIn = false
      }
    }
  }

  // Login if not already logged in
  if (!isLoggedIn) {
    // Direct Instagram login
    const username = Deno.env.get('INSTAGRAM_USERNAME')
    const password = Deno.env.get('INSTAGRAM_PASSWORD')

    if (!username || !password) {
      throw new Error('Instagram credentials not configured')
    }

    try {
      console.log(`Attempting Instagram login as @${username}...`)

      // Clear old challenge records for fresh start
      await supabase
        .from('instagram_challenge_state')
        .delete()
        .eq('username', username)

      await supabase
        .from('instagram_challenge_emails')
        .delete()
        .eq('to_email', 'sugar@vows.social')

      console.log('Cleared old challenge records')

      await discord.log('🔄 Instagram Login Attempt', {
        color: 0xffaa00,
        metadata: {
          'Method': 'Direct',
          'Username': `@${username}`,
          'Status': 'Attempting fresh login...'
        }
      })

      await ig.account.login(username, password)
      isLoggedIn = true
      console.log(`Logged in to Instagram as @${username}`)

      await discord.log('✅ Instagram Login Success', {
        color: 0x00ff00,
        metadata: {
          'Method': 'Direct',
          'Username': `@${username}`,
          'Status': 'Logged in successfully'
        }
      })

      // Save session to storage
      const session = await ig.state.serialize()
      await saveSession(session)
    } catch (error: any) {
      // Handle challenge_required error
      const isChallengeError =
        error.name === 'IgChallengeRequiredError' ||
        error.message?.includes('challenge_required') ||
        error.message?.includes('challenge required')

      if (isChallengeError) {
        console.log('Challenge required - storing challenge state...')

        await discord.log('🔒 Instagram Challenge Required', {
          color: 0xff6600,
          metadata: {
            'Username': `@${username}`,
            'Type': 'Security Challenge',
            'Action': 'Requesting email verification'
          }
        })

        // Store challenge state for later code submission
        pendingChallenge = error

        try {
          // Try to send challenge via email/SMS
          await ig.challenge.selectVerifyMethod('1') // '0' for SMS, '1' for email
          console.log('Challenge verification sent via email to the account email')

          // Save the challenge session state so it can be restored later
          const challengeSession = await ig.state.serialize()
          await saveSession(challengeSession)

          // Create challenge state record in database
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          )

          await supabase
            .from('instagram_challenge_state')
            .upsert({
              username,
              status: 'pending',
              created_at: new Date().toISOString()
            }, { onConflict: 'username' })

          await discord.log('📧 Challenge Email Sent', {
            color: 0x0099ff,
            metadata: {
              'Destination': 'sugar@vows.social',
              'Type': 'Email Verification',
              'Next Step': 'Awaiting code from Instagram (120s timeout)'
            }
          })

          // Wait for challenge code from email webhook (120 second timeout)
          console.log('Waiting for challenge code from email webhook...')
          const startTime = Date.now()
          const timeout = 120000 // 120 seconds

          while (Date.now() - startTime < timeout) {
            // Poll database for extracted challenge code
            const { data: challengeEmail } = await supabase
              .from('instagram_challenge_emails')
              .select('challenge_code, status, error_message')
              .eq('to_email', 'sugar@vows.social')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (challengeEmail?.challenge_code) {
              console.log('Challenge code received:', challengeEmail.challenge_code)

              await discord.log('🔑 Challenge Code Received', {
                color: 0x0099ff,
                metadata: {
                  'Code': `**${challengeEmail.challenge_code}**`,
                  'Action': 'Submitting with active client...'
                }
              })

              // Submit the code using the active Instagram client
              try {
                await ig.challenge.sendSecurityCode(challengeEmail.challenge_code)
                console.log('Challenge code submitted successfully!')
                isLoggedIn = true
                pendingChallenge = null

                // Update database status
                await supabase
                  .from('instagram_challenge_state')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                  })
                  .eq('username', username)

                await discord.log('✅ Challenge Auto-Resolved', {
                  color: 0x00ff00,
                  metadata: {
                    'Method': 'Email webhook + Active client',
                    'Duration': `${Math.round((Date.now() - startTime) / 1000)}s`
                  }
                })

                // Save authenticated session
                const authedSession = await ig.state.serialize()
                await saveSession(authedSession)

                return ig
              } catch (submitError: any) {
                console.error('Challenge code submission failed:', submitError)

                await discord.log('❌ Challenge Code Submission Failed', {
                  color: 0xff0000,
                  metadata: {
                    'Code': challengeEmail.challenge_code,
                    'Error': submitError.message || 'Unknown error'
                  }
                })

                throw new Error(`Challenge code submission failed: ${submitError.message}`)
              }
            }

            // Check for errors from webhook
            if (challengeEmail?.status === 'failed') {
              throw new Error(`Challenge email processing failed: ${challengeEmail.error_message || 'Unknown error'}`)
            }

            // Not completed yet, wait and try again
            await delay(2000) // Wait 2 seconds between checks
          }

          // Timeout reached without resolution
          await discord.log('⏱️ Challenge Timeout', {
            color: 0xff9900,
            metadata: {
              'Duration': '120s',
              'Status': 'No response from email webhook'
            }
          })

          throw new Error(JSON.stringify({
            type: 'challenge_timeout',
            message: 'Challenge email sent but not resolved within 120 seconds. Check sugar@vows.social and try again.',
            method: 'email'
          }))
        } catch (challengeError: any) {
          console.error('Challenge send failed:', challengeError)

          await discord.log('⚠️ Challenge Email Failed', {
            color: 0xff9900,
            metadata: {
              'Error': challengeError.message || 'Unknown error',
              'Attempting': 'Auto-solve'
            }
          })

          // Fallback: try auto-solve
          try {
            await ig.challenge.auto(true)
            console.log('Challenge auto-solved successfully')
            isLoggedIn = true
            pendingChallenge = null

            await discord.log('✅ Challenge Auto-Solved', {
              color: 0x00ff00,
              metadata: {
                'Method': 'Automatic',
                'Status': 'Challenge resolved'
              }
            })

            return ig
          } catch (autoError) {
            await discord.log('❌ Challenge Failed', {
              color: 0xff0000,
              metadata: {
                'Error': 'Auto-solve failed',
                'Required': 'Manual email verification',
                'Email': 'sugar@vows.social'
              }
            })

            throw new Error(JSON.stringify({
              type: 'challenge_required',
              message: 'Instagram challenge required - check sugar@vows.social for code',
              challengeUrl: error.checkpoint_url || error.challenge_url
            }))
          }
        }
      }

      console.error('Instagram login failed:', error)

      await discord.log('❌ Instagram Login Failed', {
        color: 0xff0000,
        metadata: {
          'Username': `@${username}`,
          'Error': error.message || 'Unknown error',
          'Type': error.name || 'LoginError'
        }
      })

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

async function submitChallengeCode(code: string) {
  try {
    console.log('Submitting challenge code to Instagram...')

    await discord.log('🔑 Challenge Code Submitted', {
      color: 0x0099ff,
      metadata: {
        'Code': code,
        'Status': 'Submitting to Instagram...'
      }
    })

    // Initialize client if needed (Edge Functions are stateless)
    if (!ig) {
      const username = Deno.env.get('INSTAGRAM_USERNAME')
      if (!username) {
        throw new Error('INSTAGRAM_USERNAME environment variable not set')
      }

      ig = new IgApiClient()
      ig.state.generateDevice(username)

      // Try to restore challenge session from storage
      const savedSession = await loadSession()
      if (savedSession) {
        try {
          await ig.state.deserialize(savedSession)
          console.log('Restored session for challenge submission')
        } catch (err) {
          console.error('Failed to restore session for challenge:', err)
        }
      }
    }

    // Submit the security code
    await ig.challenge.sendSecurityCode(code)

    console.log('Challenge code accepted - login successful')

    // Clear pending challenge and mark as logged in
    pendingChallenge = null
    isLoggedIn = true

    // Save authenticated session to storage
    const session = await ig.state.serialize()
    await saveSession(session)

    // Mark challenge as completed in database
    const username = Deno.env.get('INSTAGRAM_USERNAME')
    if (username) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      await supabase
        .from('instagram_challenge_state')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('username', username)
    }

    await discord.log('✅ Challenge Code Accepted', {
      color: 0x00ff00,
      metadata: {
        'Code': code,
        'Status': 'Login completed successfully'
      }
    })

    return { success: true, message: 'Challenge completed, logged in successfully' }
  } catch (error: any) {
    console.error('Challenge code submission failed:', error)

    await discord.log('❌ Challenge Code Rejected', {
      color: 0xff0000,
      metadata: {
        'Code': code,
        'Error': error.message || 'Unknown error'
      }
    })

    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let lockAcquired = false

  try {
    const body = await req.json()
    const action = body.action
    const username = body.username
    const hashtag = body.hashtag
    const limit = body.limit || 12

    console.log(`Instagram API action: ${action}`, username ? `for @${username}` : '')

    // Acquire lock to prevent concurrent Instagram API usage
    const requestId = crypto.randomUUID()
    const { data: acquired } = await supabase.rpc('acquire_instagram_lock', {
      lock_owner: requestId
    })

    if (!acquired) {
      console.log('Instagram API locked by another request, waiting...')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Instagram API is currently in use by another request. Please try again in a moment.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    lockAcquired = true
    console.log('Instagram API lock acquired:', requestId)

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

    // Submit challenge code
    if (action === 'submit_challenge') {
      try {
        const code = body.code

        if (!code) {
          return new Response(
            JSON.stringify({ success: false, error: 'Challenge code is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const result = await submitChallengeCode(code)

        return new Response(
          JSON.stringify({
            success: true,
            ...result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (error: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Challenge submission failed: ${error.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // Unknown action
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Supported: monitor_user, follow_user, get_following, discover_hashtag, submit_challenge`
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
  } finally {
    // Always release lock when done (even if error occurred)
    if (lockAcquired) {
      try {
        await supabase.rpc('release_instagram_lock')
        console.log('Instagram API lock released')
      } catch (err) {
        console.error('Failed to release lock:', err)
      }
    }
  }
})
