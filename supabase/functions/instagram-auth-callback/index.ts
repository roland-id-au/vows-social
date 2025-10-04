// Instagram OAuth Callback Handler
// Handles Instagram OAuth authorization and stores access tokens

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Logger } from '../_shared/logger.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'

const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID')!
const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')!
const INSTAGRAM_REDIRECT_URI = Deno.env.get('INSTAGRAM_REDIRECT_URI')!
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://vows.social'

interface InstagramTokenResponse {
  access_token: string
  user_id: number
}

interface InstagramLongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface InstagramUserProfile {
  id: string
  username: string
  account_type: string
  media_count: number
}

Deno.serve(async (req) => {
  const logger = new Logger('instagram-oauth-callback')
  const discord = new DiscordLogger()

  try {
    // Parse query parameters
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const errorReason = url.searchParams.get('error_reason')
    const errorDescription = url.searchParams.get('error_description')
    const state = url.searchParams.get('state') // Can be used for listing_id

    // Handle authorization errors
    if (error) {
      logger.error('Instagram authorization failed', {
        error,
        reason: errorReason,
        description: errorDescription
      })

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=${error}`
        }
      })
    }

    if (!code) {
      logger.error('No authorization code provided')
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=no_code`
        }
      })
    }

    logger.info('Received Instagram authorization code', { state })

    // Step 1: Exchange authorization code for short-lived access token
    const tokenParams = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: INSTAGRAM_REDIRECT_URI,
      code: code
    })

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('Failed to exchange code for token', { status: tokenResponse.status, error: errorText })

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=token_exchange_failed`
        }
      })
    }

    const tokenData: InstagramTokenResponse = await tokenResponse.json()
    logger.info('Obtained short-lived access token', { userId: tokenData.user_id })

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedUrl = `https://graph.instagram.com/access_token?` + new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: INSTAGRAM_APP_SECRET,
      access_token: tokenData.access_token
    })

    const longLivedResponse = await fetch(longLivedUrl)

    if (!longLivedResponse.ok) {
      const errorText = await longLivedResponse.text()
      logger.error('Failed to get long-lived token', { status: longLivedResponse.status, error: errorText })

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=long_lived_token_failed`
        }
      })
    }

    const longLivedData: InstagramLongLivedTokenResponse = await longLivedResponse.json()
    const expiresAt = new Date(Date.now() + longLivedData.expires_in * 1000)

    logger.info('Obtained long-lived access token', {
      expiresIn: longLivedData.expires_in,
      expiresAt: expiresAt.toISOString()
    })

    // Step 3: Fetch user profile information
    const profileUrl = `https://graph.instagram.com/${tokenData.user_id}?` + new URLSearchParams({
      fields: 'id,username,account_type,media_count',
      access_token: longLivedData.access_token
    })

    const profileResponse = await fetch(profileUrl)

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      logger.error('Failed to fetch user profile', { status: profileResponse.status, error: errorText })

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=profile_fetch_failed`
        }
      })
    }

    const profile: InstagramUserProfile = await profileResponse.json()

    logger.info('Fetched Instagram profile', {
      username: profile.username,
      accountType: profile.account_type,
      mediaCount: profile.media_count
    })

    // Step 4: Store in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('instagram_accounts')
      .select('id, listing_id')
      .eq('instagram_id', profile.id)
      .single()

    let listingId = existingAccount?.listing_id || null

    // If state parameter contains listing_id, use it
    if (state) {
      listingId = state
    }

    const accountData = {
      instagram_id: profile.id,
      username: profile.username,
      account_type: profile.account_type,
      media_count: profile.media_count,
      listing_id: listingId,
      has_access_token: true,
      access_token_expires_at: expiresAt.toISOString(),
      last_synced_at: null,
      sync_status: 'active',
      sync_error: null
    }

    const { data: account, error: dbError } = await supabase
      .from('instagram_accounts')
      .upsert(accountData, { onConflict: 'instagram_id' })
      .select()
      .single()

    if (dbError) {
      logger.error('Failed to store Instagram account', { error: dbError })

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=database_error`
        }
      })
    }

    logger.info('Instagram account stored successfully', {
      id: account.id,
      username: profile.username,
      listingId: listingId
    })

    // Store access token in secrets table (encrypted)
    const { error: secretError } = await supabase
      .from('vault.secrets')
      .upsert({
        name: `instagram_token_${profile.id}`,
        secret: longLivedData.access_token
      })

    if (secretError) {
      logger.warn('Failed to store token in vault', { error: secretError })
      // Continue anyway - token can be refreshed
    }

    // Log to Discord
    await discord.log(`✅ Instagram connected: @${profile.username}`, {
      color: 0x00ff00,
      metadata: {
        'Account Type': profile.account_type,
        'Media Count': profile.media_count.toString(),
        'Expires': expiresAt.toLocaleDateString()
      }
    })

    // Redirect back to frontend with success
    const redirectUrl = listingId
      ? `${FRONTEND_URL}/vendor/listings/${listingId}?instagram_success=true`
      : `${FRONTEND_URL}/vendor/settings?instagram_success=true`

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl
      }
    })

  } catch (error) {
    logger.error('Unexpected error in OAuth callback', { error: error.message })

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${FRONTEND_URL}/vendor/settings?instagram_error=unexpected_error`
      }
    })
  }
})
