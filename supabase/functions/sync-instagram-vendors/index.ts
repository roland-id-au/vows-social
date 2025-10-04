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
  const logger = new Logger('sync-instagram-vendors')
  const discord = new DiscordLogger()
  const startTime = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    logger.info('Starting Instagram vendor sync')

    // Get all active Instagram accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('sync_status', 'active')
      .eq('has_access_token', true)

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`)
    }

    if (!accounts || accounts.length === 0) {
      logger.info('No active Instagram accounts to sync')

      await discord.log('📸 Instagram Sync: No accounts', {
        color: 0xaaaaaa
      })

      return new Response(JSON.stringify({
        success: true,
        accounts_synced: 0,
        message: 'No active accounts'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    logger.info(`Found ${accounts.length} accounts to sync`)

    // Sync each account
    const results: SyncResult[] = []
    let totalNewPosts = 0
    let totalErrors = 0

    for (const account of accounts) {
      // Get access token from vault (placeholder - implement proper token storage)
      // For now, we'll skip accounts without tokens
      const accessToken = 'PLACEHOLDER' // TODO: Implement secure token retrieval

      if (accessToken === 'PLACEHOLDER') {
        logger.warn(`Skipping account @${account.username} - no access token`)
        continue
      }

      const result = await syncInstagramAccount(
        account.id,
        account.username,
        account.instagram_id,
        accessToken,
        supabase,
        logger
      )

      results.push(result)
      totalNewPosts += result.newPosts
      totalErrors += result.errors.length

      // Rate limiting: wait 1 second between accounts
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const duration = Date.now() - startTime

    // Log sync results
    const { error: logError } = await supabase
      .from('instagram_sync_logs')
      .insert({
        sync_type: 'vendor_sync',
        accounts_synced: results.length,
        posts_discovered: results.reduce((sum, r) => sum + r.totalPosts, 0),
        new_posts: totalNewPosts,
        errors_count: totalErrors,
        duration_ms: duration,
        metadata: { results }
      })

    if (logError) {
      logger.warn('Failed to log sync results', { error: logError })
    }

    // Discord notification
    await discord.log(`📸 Instagram Sync Complete`, {
      color: totalErrors > 0 ? 0xff9900 : 0x00ff00,
      metadata: {
        'Accounts': results.length.toString(),
        'New Posts': totalNewPosts.toString(),
        'Errors': totalErrors.toString(),
        'Duration': `${(duration / 1000).toFixed(1)}s`
      }
    })

    logger.info('Instagram vendor sync completed', {
      accounts: results.length,
      newPosts: totalNewPosts,
      errors: totalErrors,
      duration
    })

    return new Response(JSON.stringify({
      success: true,
      accounts_synced: results.length,
      new_posts: totalNewPosts,
      total_errors: totalErrors,
      duration_ms: duration,
      results
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
