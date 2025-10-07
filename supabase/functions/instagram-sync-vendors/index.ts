// Sync Instagram Vendors
// Fetches latest posts from connected vendor Instagram accounts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Logger } from '../_shared/logger.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'

interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

interface SyncResult {
  accountId: string
  username: string
  newPosts: number
  totalPosts: number
  errors: string[]
}

// Helper: Extract hashtags from caption
function extractHashtags(caption: string): string[] {
  if (!caption) return []
  const hashtagRegex = /#(\w+)/g
  const matches = caption.match(hashtagRegex)
  return matches ? matches.map(tag => tag.toLowerCase()) : []
}

// Helper: Extract mentions from caption
function extractMentions(caption: string): string[] {
  if (!caption) return []
  const mentionRegex = /@(\w+)/g
  const matches = caption.match(mentionRegex)
  return matches ? matches.map(mention => mention.substring(1)) : []
}

// Helper: Detect wedding-related content
function isWeddingRelated(caption: string, hashtags: string[]): boolean {
  const weddingKeywords = [
    'wedding', 'bride', 'groom', 'married', 'marriage', 'ceremony', 'reception',
    'engagement', 'proposal', 'bridal', 'weddinginspiration', 'weddingday',
    'justmarried', 'bridetobe', 'weddingphotography', 'weddingvenue'
  ]

  const text = caption?.toLowerCase() || ''
  const allHashtags = hashtags.join(' ').toLowerCase()

  return weddingKeywords.some(keyword =>
    text.includes(keyword) || allHashtags.includes(keyword)
  )
}

// Helper: Detect wedding themes from hashtags and caption
function detectThemes(caption: string, hashtags: string[]): string[] {
  const themes: string[] = []
  const text = `${caption} ${hashtags.join(' ')}`.toLowerCase()

  const themeMap: Record<string, string[]> = {
    'boho': ['boho', 'bohemian', 'bohowedding'],
    'rustic': ['rustic', 'rusticwedding', 'barnwedding'],
    'modern': ['modern', 'modernwedding', 'contemporary'],
    'vintage': ['vintage', 'vintagewedding', 'retro'],
    'romantic': ['romantic', 'romance', 'romanticwedding'],
    'elegant': ['elegant', 'elegance', 'luxury', 'luxurywedding'],
    'minimalist': ['minimalist', 'minimal', 'simple'],
    'garden': ['garden', 'gardenwedding', 'outdoor'],
    'beach': ['beach', 'beachwedding', 'coastal'],
    'industrial': ['industrial', 'urban', 'warehouse']
  }

  for (const [theme, keywords] of Object.entries(themeMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      themes.push(theme)
    }
  }

  return themes
}

// Main sync function
async function syncInstagramAccount(
  accountId: string,
  username: string,
  instagramId: string,
  accessToken: string,
  supabase: any,
  logger: Logger
): Promise<SyncResult> {
  const result: SyncResult = {
    accountId,
    username,
    newPosts: 0,
    totalPosts: 0,
    errors: []
  }

  try {
    // Fetch recent media (last 25 posts)
    const mediaUrl = `https://graph.instagram.com/${instagramId}/media?` + new URLSearchParams({
      fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      limit: '25',
      access_token: accessToken
    })

    const mediaResponse = await fetch(mediaUrl)

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text()
      result.errors.push(`Failed to fetch media: ${errorText}`)
      return result
    }

    const mediaData = await mediaResponse.json()
    const posts: InstagramMedia[] = mediaData.data || []
    result.totalPosts = posts.length

    logger.info(`Fetched ${posts.length} posts from @${username}`)

    // Process each post
    for (const post of posts) {
      try {
        // Check if post already exists
        const { data: existing } = await supabase
          .from('instagram_posts')
          .select('id')
          .eq('instagram_media_id', post.id)
          .single()

        if (existing) {
          // Update engagement metrics
          await supabase
            .from('instagram_posts')
            .update({
              like_count: post.like_count || 0,
              comment_count: post.comments_count || 0
            })
            .eq('instagram_media_id', post.id)

          continue // Skip to next post
        }

        // Extract metadata
        const caption = post.caption || ''
        const hashtags = extractHashtags(caption)
        const mentions = extractMentions(caption)
        const wedding_related = isWeddingRelated(caption, hashtags)
        const themes = detectThemes(caption, hashtags)

        // Insert new post
        const { error: insertError } = await supabase
          .from('instagram_posts')
          .insert({
            instagram_media_id: post.id,
            instagram_account_id: accountId,
            media_type: post.media_type,
            media_url: post.media_url,
            thumbnail_url: post.thumbnail_url,
            permalink: post.permalink,
            caption: caption,
            posted_at: post.timestamp,
            hashtags: hashtags,
            mentions: mentions,
            like_count: post.like_count || 0,
            comment_count: post.comments_count || 0,
            is_wedding_related: wedding_related,
            detected_themes: themes,
            discovered_via: 'vendor_sync',
            processed: true,
            processed_at: new Date().toISOString()
          })

        if (insertError) {
          result.errors.push(`Failed to insert post ${post.id}: ${insertError.message}`)
          continue
        }

        result.newPosts++

      } catch (postError: any) {
        result.errors.push(`Error processing post ${post.id}: ${postError.message}`)
      }
    }

    // Update account sync status
    await supabase
      .from('instagram_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'active',
        sync_error: null,
        media_count: result.totalPosts
      })
      .eq('id', accountId)

    logger.info(`Synced @${username}: ${result.newPosts} new posts out of ${result.totalPosts}`)

  } catch (error: any) {
    result.errors.push(`Account sync failed: ${error.message}`)

    // Update account with error status
    await supabase
      .from('instagram_accounts')
      .update({
        sync_status: 'error',
        sync_error: error.message
      })
      .eq('id', accountId)
  }

  return result
}

// Main handler
Deno.serve(async (req) => {
  const logger = new Logger('instagram-sync-vendors')
  const discord = new DiscordLogger()
  const startTime = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    logger.info('Starting Instagram vendor sync from listings')

    // Get all listings with Instagram handles
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, instagram_handle, location_data, country, category')
      .not('instagram_handle', 'is', null)
      .neq('instagram_handle', '')
      .limit(50) // Process 50 at a time

    if (listingsError) {
      throw new Error(`Failed to fetch listings: ${listingsError.message}`)
    }

    if (!listings || listings.length === 0) {
      logger.info('No listings with Instagram handles found')

      await discord.log('📸 Instagram Sync: No listings with handles', {
        color: 0xaaaaaa
      })

      return new Response(JSON.stringify({
        success: true,
        accounts_synced: 0,
        message: 'No listings with Instagram handles'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    logger.info(`Found ${listings.length} listings with Instagram handles`)

    // Sync each listing's Instagram account
    let accountsProcessed = 0
    let totalNewPosts = 0
    let totalErrors = 0

    for (const listing of listings) {
      try {
        const handle = listing.instagram_handle.replace('@', '').trim()

        // Check if instagram_account exists for this listing
        const { data: existingAccount } = await supabase
          .from('instagram_accounts')
          .select('id, username, last_synced_at')
          .eq('listing_id', listing.id)
          .single()

        // Skip if synced recently (within 24 hours)
        if (existingAccount?.last_synced_at) {
          const lastSynced = new Date(existingAccount.last_synced_at)
          const hoursSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60)
          if (hoursSinceSync < 24) {
            logger.info(`Skipping @${handle} - synced ${hoursSinceSync.toFixed(1)}h ago`)
            continue
          }
        }

        // Fetch account profile and posts using instagrapi
        logger.info(`Fetching Instagram profile for @${handle}`)

        const instagrapiResponse = await fetch(`${supabaseUrl}/functions/v1/instagrapi-scraper`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'monitor_user',
            username: handle,
            limit: 25
          })
        })

        if (!instagrapiResponse.ok) {
          logger.warn(`Failed to fetch @${handle}: ${instagrapiResponse.status}`)
          totalErrors++
          continue
        }

        const instagrapiData = await instagrapiResponse.json()

        if (!instagrapiData.success) {
          logger.warn(`No data for @${handle}: ${instagrapiData.error || 'Unknown error'}`)
          totalErrors++
          continue
        }

        const posts = instagrapiData.posts || []

        if (posts.length === 0) {
          logger.info(`@${handle} has no posts`)
          continue
        }

        // Extract city from location_data
        const city = listing.location_data?.city || null
        const country = listing.country || 'Australia'

        // Create or update instagram_account
        let accountId = existingAccount?.id

        if (!accountId) {
          const { data: newAccount, error: accountError } = await supabase
            .from('instagram_accounts')
            .insert({
              listing_id: listing.id,
              instagram_id: handle, // Use username as ID since we don't have pk
              username: handle,
              sync_status: 'active',
              last_synced_at: new Date().toISOString()
            })
            .select('id')
            .single()

          if (accountError) {
            logger.error(`Failed to create account for @${handle}: ${accountError.message}`)
            totalErrors++
            continue
          }

          accountId = newAccount.id
          logger.info(`Created instagram_account for @${handle}`)
        } else {
          // Update existing account
          await supabase
            .from('instagram_accounts')
            .update({
              sync_status: 'active',
              last_synced_at: new Date().toISOString()
            })
            .eq('id', accountId)

          logger.info(`Updated instagram_account for @${handle}`)
        }

        // Process posts
        let newPostsCount = 0

        for (const post of posts) {
          try {
            // Check if post exists
            const { data: existingPost } = await supabase
              .from('instagram_posts')
              .select('id')
              .eq('instagram_media_id', post.id.toString())
              .single()

            if (existingPost) {
              // Update engagement metrics
              await supabase
                .from('instagram_posts')
                .update({
                  like_count: post.likes || 0,
                  comment_count: post.comments || 0
                })
                .eq('id', existingPost.id)
              continue
            }

            // Extract metadata
            const caption = post.caption || ''
            const hashtags = extractHashtags(caption)
            const mentions = extractMentions(caption)
            const wedding_related = isWeddingRelated(caption, hashtags)
            const themes = detectThemes(caption, hashtags)

            // Get media URL (first image from array)
            const media_url = post.image_urls?.[0] || null

            // Map media type
            let mediaType = 'IMAGE'
            if (post.media_type === 2 || post.is_video) {
              mediaType = 'VIDEO'
            } else if (post.media_type === 8) {
              mediaType = 'CAROUSEL_ALBUM'
            }

            // Insert new post
            const { error: insertError } = await supabase
              .from('instagram_posts')
              .insert({
                instagram_media_id: post.id.toString(),
                instagram_account_id: accountId,
                media_type: mediaType,
                media_url: media_url,
                thumbnail_url: media_url,
                permalink: `https://www.instagram.com/p/${post.id}/`,
                caption: caption,
                posted_at: post.posted_at,
                hashtags: hashtags,
                mentions: mentions,
                like_count: post.likes || 0,
                comment_count: post.comments || 0,
                is_wedding_related: wedding_related,
                detected_themes: themes,
                city: city,
                country: country,
                discovered_via: 'vendor_sync',
                processed: true,
                processed_at: new Date().toISOString()
              })

            if (!insertError) {
              newPostsCount++
            } else {
              logger.warn(`Failed to insert post for @${handle}: ${insertError.message}`)
            }
          } catch (postError: any) {
            logger.warn(`Error processing post for @${handle}: ${postError.message}`)
          }
        }

        accountsProcessed++
        totalNewPosts += newPostsCount

        logger.info(`Synced @${handle}: ${newPostsCount} new posts out of ${posts.length}`)

        // Rate limiting: wait 2 seconds between accounts
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error: any) {
        logger.error(`Error processing listing ${listing.id}: ${error.message}`)
        totalErrors++
      }
    }

    const duration = Date.now() - startTime

    // Discord notification
    await discord.log(`📸 Instagram Sync Complete`, {
      color: totalErrors > 0 ? 0xff9900 : 0x00ff00,
      metadata: {
        'Listings Processed': accountsProcessed.toString(),
        'New Posts': totalNewPosts.toString(),
        'Errors': totalErrors.toString(),
        'Duration': `${(duration / 1000).toFixed(1)}s`
      }
    })

    logger.info('Instagram vendor sync completed', {
      accounts: accountsProcessed,
      newPosts: totalNewPosts,
      errors: totalErrors,
      duration
    })

    return new Response(JSON.stringify({
      success: true,
      accounts_synced: accountsProcessed,
      new_posts: totalNewPosts,
      total_errors: totalErrors,
      duration_ms: duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    logger.error('Instagram vendor sync failed', { error: error.message })

    await discord.log(`❌ Instagram Sync Failed: ${error.message}`, {
      color: 0xff0000
    })

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
