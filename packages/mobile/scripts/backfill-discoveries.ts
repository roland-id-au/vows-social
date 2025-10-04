#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Local backfill script to process pending discoveries
 *
 * Usage:
 *   deno run --allow-net --allow-env scripts/backfill-discoveries.ts
 *
 * Options:
 *   --limit=N     Process only N discoveries (default: all)
 *   --chunk=N     Process N at a time (default: 10)
 *   --delay=MS    Delay between requests in ms (default: 5000)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://nidbhgqeyhrudtnizaya.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M'

// Parse command line args
const args = Deno.args.reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=')
    acc[key] = value || true
  }
  return acc
}, {} as Record<string, any>)

const LIMIT = args.limit ? parseInt(args.limit) : undefined
const CHUNK_SIZE = args.chunk ? parseInt(args.chunk) : 10
const DELAY_MS = args.delay ? parseInt(args.delay) : 5000

console.log('🚀 Starting local backfill...')
console.log(`   Chunk size: ${CHUNK_SIZE}`)
console.log(`   Delay: ${DELAY_MS}ms`)
if (LIMIT) console.log(`   Limit: ${LIMIT} discoveries`)
console.log('')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Fetch pending discoveries
console.log('📊 Fetching pending discoveries...')
let query = supabase
  .from('discovered_listings')
  .select('*')
  .eq('status', 'pending_research')
  .order('engagement_score', { ascending: false })

if (LIMIT) {
  query = query.limit(LIMIT)
}

const { data: discoveries, error } = await query

if (error) {
  console.error('❌ Error fetching discoveries:', error)
  Deno.exit(1)
}

if (!discoveries || discoveries.length === 0) {
  console.log('✅ No pending discoveries found!')
  Deno.exit(0)
}

console.log(`Found ${discoveries.length} pending discoveries\n`)

// Statistics
let processed = 0
let succeeded = 0
let failed = 0
let skipped = 0

const startTime = Date.now()

// Process in chunks
for (let i = 0; i < discoveries.length; i += CHUNK_SIZE) {
  const chunk = discoveries.slice(i, Math.min(i + CHUNK_SIZE, discoveries.length))
  const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
  const totalChunks = Math.ceil(discoveries.length / CHUNK_SIZE)

  console.log(`\n📦 Chunk ${chunkNum}/${totalChunks} (${chunk.length} discoveries)`)
  console.log('─'.repeat(60))

  for (const discovery of chunk) {
    processed++
    const progress = `[${processed}/${discoveries.length}]`

    try {
      console.log(`${progress} 🔍 Researching: ${discovery.name}`)
      console.log(`   📍 ${discovery.location}, ${discovery.city}`)
      console.log(`   📊 Engagement: ${discovery.engagement_score}/10`)
      console.log(`   🏷️  Type: ${discovery.service_type || 'venue'}`)

      // Call the deep-research-venue Edge Function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/deep-research-venue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venueName: discovery.name,
          location: `${discovery.location}, ${discovery.city}`,
          city: discovery.city,
          state: discovery.state,
          serviceType: discovery.service_type || 'venue',
          forceRefresh: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        succeeded++
        console.log(`   ✅ Success! Created listing: ${result.listing.id}`)
        console.log(`   📸 Photos: ${result.listing.images?.length || 0}`)
        console.log(`   📦 Packages: ${result.listing.packages?.length || 0}`)

        // Update discovery status
        await supabase
          .from('discovered_listings')
          .update({
            status: 'researched',
            listing_id: result.listing.id,
            researched_at: new Date().toISOString()
          })
          .eq('id', discovery.id)

      } else {
        failed++
        console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`)

        // Mark as failed
        await supabase
          .from('discovered_listings')
          .update({ status: 'research_failed' })
          .eq('id', discovery.id)
      }

    } catch (error) {
      failed++
      console.log(`   ❌ Error: ${error.message}`)

      // Mark as failed
      await supabase
        .from('discovered_listings')
        .update({
          status: 'research_failed',
          error_message: error.message
        })
        .eq('id', discovery.id)
    }

    // Rate limiting delay between requests
    if (processed < discoveries.length) {
      console.log(`   ⏱️  Waiting ${DELAY_MS/1000}s...`)
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  // Progress summary after each chunk
  const elapsed = (Date.now() - startTime) / 1000
  const rate = processed / elapsed
  const remaining = discoveries.length - processed
  const eta = remaining / rate

  console.log('\n📈 Progress Summary:')
  console.log(`   Processed: ${processed}/${discoveries.length}`)
  console.log(`   ✅ Succeeded: ${succeeded}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⏱️  Elapsed: ${Math.round(elapsed)}s`)
  console.log(`   🚀 Rate: ${rate.toFixed(2)}/s`)
  if (remaining > 0) {
    console.log(`   ⏰ ETA: ${Math.round(eta)}s (${Math.round(eta/60)}min)`)
  }
}

// Final summary
const totalTime = (Date.now() - startTime) / 1000

console.log('\n' + '='.repeat(60))
console.log('🎉 Backfill Complete!')
console.log('='.repeat(60))
console.log(`Total Processed: ${processed}`)
console.log(`✅ Succeeded: ${succeeded} (${Math.round(succeeded/processed*100)}%)`)
console.log(`❌ Failed: ${failed} (${Math.round(failed/processed*100)}%)`)
console.log(`⏱️  Total Time: ${Math.round(totalTime)}s (${Math.round(totalTime/60)}min)`)
console.log(`🚀 Average Rate: ${(processed/totalTime).toFixed(2)}/s`)
console.log('')

// Fetch updated stats
const { data: stats } = await supabase
  .from('discovered_listings')
  .select('status')

if (stats) {
  const statusCounts = stats.reduce((acc: any, d: any) => {
    acc[d.status] = (acc[d.status] || 0) + 1
    return acc
  }, {})

  console.log('📊 Updated Discovery Queue:')
  console.log(`   Pending: ${statusCounts.pending_research || 0}`)
  console.log(`   Researched: ${statusCounts.researched || 0}`)
  console.log(`   Failed: ${statusCounts.research_failed || 0}`)
}

const { data: listingsCount } = await supabase
  .from('normalized_listings')
  .select('id', { count: 'exact', head: true })

if (listingsCount) {
  console.log(`\n🏆 Total Listings in Database: ${listingsCount.length || 0}`)
}
