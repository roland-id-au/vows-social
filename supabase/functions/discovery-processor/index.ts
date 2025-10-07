/**
 * Discovery Queue Processor
 * Processes one discovery task at a time from the discovery_queue
 * Calls Perplexity to discover vendors, creates enrichment tasks
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DiscordLogger } from '../_shared/discord-logger.ts'
import { perplexityCache } from '../_shared/perplexity-cache.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DiscoveryTask {
  id: string
  query: string
  location: string
  city: string
  country: string
  service_type: string
  attempts: number
  max_attempts: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)
  const discord = new DiscordLogger()

  try {
    // Get next pending discovery task
    const { data: task, error: taskError } = await supabase
      .rpc('get_next_discovery_task')
      .single() as { data: DiscoveryTask | null, error: any }

    if (taskError || !task) {
      console.log('No pending discovery tasks')
      return new Response(
        JSON.stringify({ success: true, message: 'No pending tasks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing discovery task ${task.id}: ${task.query}`)

    // Mark as processing
    await supabase
      .from('discovery_queue')
      .update({
        status: 'processing',
        attempts: task.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', task.id)

    // Call Perplexity to discover vendors
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')!

    // Include location in cache key to invalidate old cache entries that didn't have location
    const cacheKey = `discovery-v2-${task.query}-${task.location}-${task.service_type}`

    let discoveries: any[] = []
    let apiCostUsd = 0
    let usage: any = {}

    // Check cache first
    const cached = perplexityCache.get(cacheKey)
    if (cached) {
      console.log('✅ Using cached discovery results (cache hit)')
      console.log('   Cached vendors:', cached.length)
      console.log('   💰 Cache hit - $0.00 API cost')
      discoveries = cached
      // Note: apiCostUsd remains 0 for cache hits
    } else {
      console.log('❌ Cache miss - calling Perplexity API')

      // The query already includes location (e.g., "wedding venue in Sydney, Australia")
      // Don't add location again - it would duplicate it!
      const queryContent = `${task.query}. Return 10-15 results with business name, city, country, and website if available.`
      console.log('🔍 Calling Perplexity API')
      console.log('   Query:', queryContent)
      console.log('   Cache key:', cacheKey)
      console.log('   Location:', task.location)

      // Call Perplexity API
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a wedding service discovery assistant. Find 10-15 unique, high-quality wedding service providers based on the query. Include their name, location (city, country), and any available website URL.'
            },
            {
              role: 'user',
              content: queryContent
            }
          ],
          temperature: 0.2,
          max_tokens: 2000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'discovery_results',
              schema: {
                type: 'object',
                properties: {
                  vendors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        city: { type: 'string' },
                        country: { type: 'string' },
                        website: { type: 'string' }
                      },
                      required: ['name', 'city', 'country']
                    }
                  }
                },
                required: ['vendors']
              },
              strict: true
            }
          }
        })
      })

      if (!perplexityResponse.ok) {
        const status = perplexityResponse.status
        const errorText = await perplexityResponse.text()

        // Detect error type and create user-friendly message
        let errorType = 'Unknown Error'
        let errorDetails = errorText
        let severity = 'error'

        if (status === 401) {
          errorType = 'Authentication Failed'
          errorDetails = 'Invalid or missing Perplexity API key. Check PERPLEXITY_API_KEY in Supabase secrets.'
          severity = 'critical'
        } else if (status === 402) {
          errorType = 'Payment Required / Insufficient Credits'
          errorDetails = 'Perplexity API account has insufficient credits or payment method expired. Please top up credits at https://www.perplexity.ai/settings/api'
          severity = 'critical'
        } else if (status === 429) {
          errorType = 'Rate Limit Exceeded'
          errorDetails = 'Too many requests to Perplexity API. Will retry with backoff.'
          severity = 'warning'
        } else if (status === 500 || status === 502 || status === 503) {
          errorType = 'Perplexity API Service Error'
          errorDetails = 'Perplexity API is experiencing issues. Will retry.'
          severity = 'warning'
        }

        console.error('❌ Perplexity API Error')
        console.error(`   Type: ${errorType}`)
        console.error(`   Status: ${status}`)
        console.error(`   Details: ${errorDetails}`)
        console.error(`   Raw Response: ${errorText.substring(0, 500)}`)

        // Send Discord alert for critical errors
        if (severity === 'critical') {
          await discord.error(
            `🚨 CRITICAL: Perplexity API - ${errorType}`,
            new Error(errorDetails),
            {
              'Status Code': status.toString(),
              'Task ID': task.id,
              'Query': task.query,
              'Action Required': status === 402
                ? '💳 Add credits at https://www.perplexity.ai/settings/api'
                : '🔑 Check API key in Supabase secrets'
            }
          )
        }

        throw new Error(`Perplexity API ${errorType}: ${status} - ${errorDetails}`)
      }

      const data = await perplexityResponse.json()

      // Log usage metrics for monitoring
      usage = data.usage || {}
      console.log('📦 Perplexity response received:', {
        model: data.model,
        usage: usage,
        content_length: data.choices[0].message.content.length
      })

      // Calculate API cost (Perplexity sonar-pro pricing)
      // Approximate rates: $0.005/1K input tokens, $0.015/1K output tokens
      apiCostUsd = 0
      if (usage.prompt_tokens && usage.completion_tokens) {
        const inputCost = (usage.prompt_tokens / 1000) * 0.005
        const outputCost = (usage.completion_tokens / 1000) * 0.015
        apiCostUsd = inputCost + outputCost
        console.log(`   💰 Estimated cost: $${apiCostUsd.toFixed(4)} (${usage.prompt_tokens} input + ${usage.completion_tokens} output tokens)`)
      } else if (usage.total_tokens) {
        // Fallback: estimate 20% input, 80% output
        const inputCost = (usage.total_tokens * 0.2 / 1000) * 0.005
        const outputCost = (usage.total_tokens * 0.8 / 1000) * 0.015
        apiCostUsd = inputCost + outputCost
        console.log(`   💰 Estimated cost: $${apiCostUsd.toFixed(4)} (${usage.total_tokens} tokens)`)
      }

      // Check for usage warnings
      if (usage.total_tokens) {
        console.log(`   Token usage: ${usage.total_tokens} tokens`)

        // Log high token usage (helps with cost monitoring)
        if (usage.total_tokens > 1500) {
          console.warn(`   ⚠️  High token usage detected: ${usage.total_tokens} tokens`)
        }
      }

      // Check response headers for credit information
      const rateLimitRemaining = perplexityResponse.headers.get('x-ratelimit-remaining')
      const rateLimitReset = perplexityResponse.headers.get('x-ratelimit-reset')

      if (rateLimitRemaining) {
        console.log(`   Rate limit remaining: ${rateLimitRemaining} requests`)

        // Alert if running low on rate limit
        if (parseInt(rateLimitRemaining) < 10) {
          await discord.logWarning(
            '⚠️ Perplexity API Rate Limit Low',
            {
              'Remaining Requests': rateLimitRemaining,
              'Reset Time': rateLimitReset || 'Unknown',
              'Task': task.query
            }
          )
        }
      }

      const result = JSON.parse(data.choices[0].message.content)
      console.log('📋 Parsed result:', result)

      discoveries = result.vendors || []
      console.log(`✨ Extracted ${discoveries.length} vendors from response`)
      if (discoveries.length > 0) {
        console.log('   First vendor:', discoveries[0])
      }

      // Cache the results
      perplexityCache.set(cacheKey, discoveries, 'discovery')
    }

    console.log(`📊 Found ${discoveries.length} vendors total`)

    // Save to discovered_listings and create enrichment tasks
    let savedCount = 0
    let duplicateCount = 0

    for (const vendor of discoveries) {
      console.log(`\n🔄 Processing: ${vendor.name} (${vendor.city})`)

      // Check if already discovered (using maybeSingle to handle multiple or zero results)
      const { data: existing } = await supabase
        .from('discovered_listings')
        .select('id')
        .eq('name', vendor.name)
        .eq('city', vendor.city)
        .eq('country', vendor.country)
        .maybeSingle()

      if (existing) {
        console.log(`   ⏭️  Skipping duplicate: ${vendor.name}`)
        duplicateCount++
        continue
      }

      console.log(`   💾 Saving new discovery...`)

      // Save to discovered_listings
      const { data: discovery, error: saveError } = await supabase
        .from('discovered_listings')
        .insert({
          name: vendor.name,
          location: `${vendor.city}, ${vendor.country}`,
          city: vendor.city,
          country: vendor.country,
          type: task.service_type,
          enrichment_status: 'pending'
        })
        .select()
        .single()

      if (saveError) {
        console.error(`   ❌ Error saving discovery: ${saveError.message}`)
        console.error('   Vendor data:', vendor)
        continue
      }

      console.log(`   ✅ Saved discovery: ${discovery.id}`)

      // Record API cost for this discovery (split cost across all vendors)
      // Record even for $0 (cache hits) to track all discoveries
      if (discoveries.length > 0) {
        const costPerVendor = apiCostUsd > 0 ? apiCostUsd / discoveries.length : 0
        const isCacheHit = apiCostUsd === 0
        try {
          await supabase.rpc('record_api_cost', {
            p_discovery_id: discovery.id,
            p_service: 'perplexity',
            p_operation: 'discovery',
            p_cost_usd: costPerVendor,
            p_tokens_used: usage.total_tokens ? Math.floor(usage.total_tokens / discoveries.length) : null,
            p_metadata: JSON.stringify({
              model: 'sonar-pro',
              query: task.query,
              location: task.location,
              cache_hit: isCacheHit
            })
          })
        } catch (costError) {
          console.error(`   ⚠️  Failed to record cost: ${costError.message}`)
          // Don't fail the whole operation if cost tracking fails
        }
      }

      // Create enrichment task with error handling
      console.log(`   📝 Creating enrichment task...`)
      const { data: enrichmentTask, error: enrichmentError } = await supabase
        .from('enrichment_queue')
        .insert({
          discovery_id: discovery.id,
          vendor_name: vendor.name,
          location: `${vendor.city}, ${vendor.country}`,
          city: vendor.city,
          country: vendor.country,
          service_type: task.service_type,
          website: vendor.website,
          priority: 5,
          scheduled_for: new Date().toISOString()
        })
        .select()
        .single()

      if (enrichmentError) {
        console.error(`   ❌ Error creating enrichment task: ${enrichmentError.message}`)
        await discord.error(
          `Failed to create enrichment task for ${vendor.name}`,
          enrichmentError
        )
        // Don't increment savedCount if enrichment task failed
        continue
      }

      console.log(`   ✅ Created enrichment task: ${enrichmentTask.id}`)
      savedCount++
    }

    console.log(`\n📊 Processing complete:`)
    console.log(`   ✅ Saved: ${savedCount} new vendors`)
    console.log(`   ⏭️  Duplicates: ${duplicateCount}`)
    console.log(`   📋 Total found: ${discoveries.length}`)

    // Mark task as completed
    await supabase
      .from('discovery_queue')
      .update({
        status: 'completed',
        discoveries_found: savedCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id)

    await discord.discovery(
      `Discovery completed: ${task.query} in ${task.city}`,
      {
        'Location': task.location,
        'Total Found': discoveries.length.toString(),
        'New Saved': savedCount.toString(),
        'Duplicates': duplicateCount.toString(),
        'Service Type': task.service_type,
        'API Cost': apiCostUsd > 0 ? `$${apiCostUsd.toFixed(4)}` : '💾 Cache Hit ($0.00)',
        'Cost per Vendor': apiCostUsd > 0 && discoveries.length > 0 ? `$${(apiCostUsd / discoveries.length).toFixed(4)}` : '$0.00'
      }
    )

    console.log(`✅ Discovery task completed: ${savedCount} vendors queued for enrichment`)

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        discoveries_found: savedCount,
        enrichment_tasks_created: savedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Discovery processor error:', error)

    // Update task with error information
    if (task) {
      const errorMessage = error.message || error.toString()
      const isApiError = errorMessage.includes('Perplexity API')
      const isCritical = errorMessage.includes('CRITICAL') || errorMessage.includes('Payment Required') || errorMessage.includes('Authentication Failed')

      await supabase
        .from('discovery_queue')
        .update({
          status: task.attempts + 1 >= task.max_attempts ? 'failed' : 'pending',
          error_message: errorMessage.substring(0, 500), // Truncate to 500 chars
          last_error_at: new Date().toISOString(),
          // Schedule retry with exponential backoff for transient errors
          scheduled_for: isApiError && !isCritical
            ? new Date(Date.now() + Math.pow(2, task.attempts) * 60 * 60 * 1000).toISOString() // 1h, 2h, 4h
            : new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes for other errors
        })
        .eq('id', task.id)
    }

    await discord.error(
      'Discovery processor failed',
      error,
      task ? {
        'Task ID': task.id,
        'Query': task.query,
        'City': task.city,
        'Attempts': (task.attempts + 1).toString()
      } : undefined
    )

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
