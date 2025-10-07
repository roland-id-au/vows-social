/**
 * Instagram Challenge Email Webhook
 * Receives emails from Cloudflare Email Worker
 * Extracts challenge codes and submits to Instagram API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Logger } from '../_shared/logger.ts'
import { DiscordLogger } from '../_shared/discord-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChallengeEmail {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
}

// Extract challenge code from email body
function extractChallengeCode(text: string, html?: string): string | null {
  const content = text || html || ''

  // Instagram security codes are typically 6 digits
  const patterns = [
    /\b(\d{6})\b/,  // 6-digit code
    /code:\s*(\d{6})/i,  // "code: 123456"
    /verification code.*?(\d{6})/i,  // "verification code is 123456"
    /security code.*?(\d{6})/i,  // "security code is 123456"
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

// Determine challenge type from email
function getChallengeType(subject: string, text: string): string {
  const content = (subject + ' ' + text).toLowerCase()

  if (content.includes('security code')) return 'security_code'
  if (content.includes('verification')) return 'verification'
  if (content.includes('login') || content.includes('sign in')) return 'login_verification'
  if (content.includes('two-factor') || content.includes('2fa')) return 'two_factor'

  return 'unknown'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logger = new Logger('instagram-challenge-email')
  const discord = new DiscordLogger()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const email: ChallengeEmail = await req.json()

    logger.info('Received challenge email', {
      from: email.from,
      subject: email.subject
    })

    await discord.log('📬 Instagram Challenge Email Received', {
      color: 0x0099ff,
      metadata: {
        'From': email.from,
        'Subject': email.subject,
        'To': email.to
      }
    })

    // Extract challenge code
    const challengeCode = extractChallengeCode(email.text || '', email.html)
    const challengeType = getChallengeType(email.subject, email.text || '')

    if (!challengeCode) {
      logger.warn('No challenge code found in email')

      await discord.log('⚠️ Instagram Challenge Email: No code found', {
        color: 0xff9900,
        metadata: {
          'Subject': email.subject,
          'From': email.from
        }
      })

      // Store anyway for manual review
      await supabase
        .from('instagram_challenge_emails')
        .insert({
          from_email: email.from,
          to_email: email.to,
          subject: email.subject,
          body_text: email.text,
          body_html: email.html,
          challenge_type: challengeType,
          status: 'failed',
          error_message: 'No challenge code found',
          raw_email_data: email
        })

      return new Response(
        JSON.stringify({ success: false, error: 'No challenge code found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    logger.info('Challenge code extracted', { code: challengeCode, type: challengeType })

    await discord.log('🔑 Instagram Challenge Code Extracted', {
      color: 0x00ff00,
      metadata: {
        'Code': `**${challengeCode}**`,
        'Type': challengeType,
        'From': email.from,
        'Action': 'Stored in DB - active client will submit'
      }
    })

    // Store email with extracted code
    const { error: insertError } = await supabase
      .from('instagram_challenge_emails')
      .insert({
        from_email: email.from,
        to_email: email.to,
        subject: email.subject,
        body_text: email.text,
        body_html: email.html,
        challenge_code: challengeCode,
        challenge_type: challengeType,
        extracted_at: new Date().toISOString(),
        status: 'extracted',
        raw_email_data: email
      })

    if (insertError) {
      throw new Error(`Failed to store email: ${insertError.message}`)
    }

    logger.info('Challenge code stored in database - waiting for active client to submit')

    return new Response(
      JSON.stringify({
        success: true,
        code: challengeCode,
        type: challengeType,
        stored: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    logger.error('Challenge email processing failed', { error: error.message })

    await discord.log(`❌ Challenge Email Error: ${error.message}`, {
      color: 0xff0000
    })

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
