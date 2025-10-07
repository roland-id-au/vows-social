#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * End-to-End Pipeline Test Suite
 * Tests the complete vendor discovery pipeline:
 * Discovery → Enrichment → Publishing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://nidbhgqeyhrudtnizaya.supabase.co'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
  data?: any
}

const results: TestResult[] = []

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`  ${title}`)
  console.log('='.repeat(60) + '\n')
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const startTime = Date.now()
  try {
    await fn()
    const duration = Date.now() - startTime
    results.push({ name, passed: true, message: 'PASSED', duration })
    log('✅', `${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - startTime
    results.push({ name, passed: false, message: error.message, duration })
    log('❌', `${name} - ${error.message} (${duration}ms)`)
  }
}

async function callFunction(functionName: string): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  return await response.json()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// =============================================================================
// Test Suite
// =============================================================================

logSection('Pipeline E2E Test Suite')

// Test 1: Database Connectivity
await test('Database Connectivity', async () => {
  const { data, error } = await supabase
    .from('discovery_config')
    .select('id')
    .limit(1)

  if (error) throw new Error(`Database connection failed: ${error.message}`)
  log('  📊', 'Database connected successfully')
})

// Test 2: Check Discovery Queue
await test('Check Discovery Queue', async () => {
  const { data, error, count } = await supabase
    .from('discovery_queue')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')

  if (error) throw new Error(`Query failed: ${error.message}`)

  log('  📋', `Found ${count || 0} pending discovery tasks`)

  if ((count || 0) === 0) {
    throw new Error('No pending discovery tasks. Run seed-discovery-queue first.')
  }

  // Show first task
  if (data && data.length > 0) {
    const task = data[0]
    log('  🔍', `First task: ${task.query}`)
  }
})

// Test 3: Check Configuration
await test('Check Discovery Configuration', async () => {
  const { data, error, count } = await supabase
    .from('discovery_config')
    .select('*', { count: 'exact' })
    .eq('enabled', true)

  if (error) throw new Error(`Query failed: ${error.message}`)

  log('  ⚙️', `Found ${count || 0} enabled configurations`)

  if (data && data.length > 0) {
    const config = data[0]
    log('  📍', `Example: ${config.city}, ${config.country} - ${config.service_type}`)
    log('  🔑', `Keywords: ${config.keywords?.join(', ') || 'none'}`)
  }
})

// Test 4: Test Discovery Processor
logSection('Testing Discovery Processor')

let discoveryResult: any = null

await test('Run Discovery Processor', async () => {
  log('  🚀', 'Calling discovery-processor...')

  discoveryResult = await callFunction('discovery-processor')

  log('  📦', `Response: ${JSON.stringify(discoveryResult, null, 2)}`)

  if (!discoveryResult.success) {
    throw new Error(`Discovery failed: ${discoveryResult.error || 'Unknown error'}`)
  }

  log('  ✨', `Task ${discoveryResult.task_id}`)
  log('  🔍', `Discoveries: ${discoveryResult.discoveries_found}`)
  log('  📝', `Enrichment tasks: ${discoveryResult.enrichment_tasks_created}`)

  if (discoveryResult.discoveries_found === 0) {
    log('  ⚠️', 'WARNING: No vendors discovered. Check Perplexity API key and logs.')
  }
})

// Test 5: Check Discovered Listings
await test('Check Discovered Listings', async () => {
  const { data, error, count } = await supabase
    .from('discovered_listings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw new Error(`Query failed: ${error.message}`)

  log('  📊', `Total discovered listings: ${count || 0}`)

  if (data && data.length > 0) {
    log('  📝', 'Recent discoveries:')
    data.forEach((listing, i) => {
      log('    ', `${i + 1}. ${listing.name} (${listing.city}, ${listing.country}) - ${listing.enrichment_status}`)
    })
  }
})

// Test 6: Check Enrichment Queue
await test('Check Enrichment Queue', async () => {
  const { data, error, count } = await supabase
    .from('enrichment_queue')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')

  if (error) throw new Error(`Query failed: ${error.message}`)

  log('  📋', `Pending enrichment tasks: ${count || 0}`)

  if (data && data.length > 0) {
    const task = data[0]
    log('  🎯', `Next: ${task.vendor_name} in ${task.city}`)
  }
})

// Test 7: Test Enrichment Processor (only if we have enrichment tasks)
logSection('Testing Enrichment Processor')

let enrichmentResult: any = null

await test('Check if Enrichment Tasks Available', async () => {
  const { count } = await supabase
    .from('enrichment_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if ((count || 0) === 0) {
    log('  ⏭️', 'Skipping enrichment test - no pending tasks')
    throw new Error('No pending enrichment tasks to test')
  }

  log('  ✅', `${count} enrichment tasks ready to process`)
})

await test('Run Enrichment Processor', async () => {
  log('  🚀', 'Calling enrichment-processor...')
  log('  ⏱️', 'This may take 30-60 seconds (Perplexity + Firecrawl + image download)...')

  enrichmentResult = await callFunction('enrichment-processor')

  log('  📦', `Response: ${JSON.stringify(enrichmentResult, null, 2)}`)

  if (!enrichmentResult.success && enrichmentResult.message !== 'No pending tasks') {
    throw new Error(`Enrichment failed: ${enrichmentResult.error || 'Unknown error'}`)
  }

  if (enrichmentResult.listing_id) {
    log('  ✨', `Listing created: ${enrichmentResult.listing_id}`)
    log('  🖼️', `Images: ${enrichmentResult.images_count}`)
    log('  📦', `Packages: ${enrichmentResult.packages_count}`)
    log('  ⏱️', `Duration: ${enrichmentResult.duration_ms}ms`)
  }
})

// Test 8: Check Listings Table
await test('Check Listings Table', async () => {
  const { data, error, count } = await supabase
    .from('listings')
    .select('id, title, slug, service_type, location_data', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) throw new Error(`Query failed: ${error.message}`)

  log('  📊', `Total listings: ${count || 0}`)

  if (data && data.length > 0) {
    log('  📝', 'Recent listings:')
    data.forEach((listing, i) => {
      const loc = listing.location_data as any
      log('    ', `${i + 1}. ${listing.title} (${loc?.city || 'N/A'}) - ${listing.service_type}`)
      if (listing.slug) {
        log('    ', `   🔗 https://vows.social/venues/${listing.slug}`)
      }
    })
  }
})

// Test 9: Check Publishing Queue
await test('Check Publishing Queue', async () => {
  const { data, error, count } = await supabase
    .from('publishing_queue')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')

  if (error) throw new Error(`Query failed: ${error.message}`)

  log('  📋', `Pending publishing tasks: ${count || 0}`)

  if (data && data.length > 0) {
    const task = data[0]
    log('  🎯', `Next: Listing ${task.listing_id} → ${task.channels.join(', ')}`)
  }
})

// Test 10: Test Publishing Processor (only if we have publishing tasks)
logSection('Testing Publishing Processor')

let publishingResult: any = null

await test('Run Publishing Processor', async () => {
  const { count } = await supabase
    .from('publishing_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if ((count || 0) === 0) {
    log('  ⏭️', 'No pending publishing tasks')
    throw new Error('No pending publishing tasks to test')
  }

  log('  🚀', 'Calling publishing-processor...')

  publishingResult = await callFunction('publishing-processor')

  log('  📦', `Response: ${JSON.stringify(publishingResult, null, 2)}`)

  if (!publishingResult.success && publishingResult.message !== 'No pending tasks') {
    throw new Error(`Publishing failed: ${publishingResult.error || 'Unknown error'}`)
  }

  if (publishingResult.published_channels) {
    log('  ✨', `Published to: ${publishingResult.published_channels.join(', ')}`)
  }
})

// Test 11: Pipeline Stats
logSection('Pipeline Statistics')

await test('Get Pipeline Stats', async () => {
  // Discovery stats
  const { count: totalDiscoveries } = await supabase
    .from('discovered_listings')
    .select('*', { count: 'exact', head: true })

  const { count: pendingEnrichment } = await supabase
    .from('discovered_listings')
    .select('*', { count: 'exact', head: true })
    .eq('enrichment_status', 'pending')

  const { count: enrichedListings } = await supabase
    .from('discovered_listings')
    .select('*', { count: 'exact', head: true })
    .eq('enrichment_status', 'enriched')

  // Listings stats
  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })

  // Queue stats
  const { count: pendingDiscovery } = await supabase
    .from('discovery_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: completedDiscovery } = await supabase
    .from('discovery_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { count: pendingPublishing } = await supabase
    .from('publishing_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: publishedListings } = await supabase
    .from('publishing_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

  log('  📊', 'Pipeline Overview:')
  log('    ', `┌─ Discovery Queue: ${pendingDiscovery || 0} pending, ${completedDiscovery || 0} completed`)
  log('    ', `├─ Discovered Listings: ${totalDiscoveries || 0} total`)
  log('    ', `│  ├─ Pending Enrichment: ${pendingEnrichment || 0}`)
  log('    ', `│  └─ Enriched: ${enrichedListings || 0}`)
  log('    ', `├─ Published Listings: ${totalListings || 0} total`)
  log('    ', `└─ Publishing Queue: ${pendingPublishing || 0} pending, ${publishedListings || 0} published`)
})

// Test 12: Check for Errors
await test('Check for Failed Tasks', async () => {
  const { data: failedDiscovery } = await supabase
    .from('discovery_queue')
    .select('id, query, error_message, attempts')
    .eq('status', 'failed')
    .limit(5)

  const { data: failedEnrichment } = await supabase
    .from('enrichment_queue')
    .select('id, vendor_name, error_message, attempts')
    .eq('status', 'failed')
    .limit(5)

  const { data: failedPublishing } = await supabase
    .from('publishing_queue')
    .select('id, listing_id, error_message, attempts')
    .eq('status', 'failed')
    .limit(5)

  let hasErrors = false

  if (failedDiscovery && failedDiscovery.length > 0) {
    hasErrors = true
    log('  ⚠️', `Failed discovery tasks: ${failedDiscovery.length}`)
    failedDiscovery.forEach(task => {
      log('    ', `- ${task.query}: ${task.error_message || 'Unknown error'} (${task.attempts} attempts)`)
    })
  }

  if (failedEnrichment && failedEnrichment.length > 0) {
    hasErrors = true
    log('  ⚠️', `Failed enrichment tasks: ${failedEnrichment.length}`)
    failedEnrichment.forEach(task => {
      log('    ', `- ${task.vendor_name}: ${task.error_message || 'Unknown error'} (${task.attempts} attempts)`)
    })
  }

  if (failedPublishing && failedPublishing.length > 0) {
    hasErrors = true
    log('  ⚠️', `Failed publishing tasks: ${failedPublishing.length}`)
    failedPublishing.forEach(task => {
      log('    ', `- Listing ${task.listing_id}: ${task.error_message || 'Unknown error'} (${task.attempts} attempts)`)
    })
  }

  if (!hasErrors) {
    log('  ✅', 'No failed tasks found')
  }
})

// =============================================================================
// Test Summary
// =============================================================================

logSection('Test Summary')

const passed = results.filter(r => r.passed).length
const failed = results.filter(r => !r.passed).length
const total = results.length

log('📊', `Total Tests: ${total}`)
log('✅', `Passed: ${passed}`)
log('❌', `Failed: ${failed}`)
log('⏱️', `Total Duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`)

if (failed > 0) {
  console.log('\n❌ Failed Tests:')
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.message}`)
  })
}

// Exit with appropriate code
console.log('')
if (failed === 0) {
  log('🎉', 'All tests passed!')
  Deno.exit(0)
} else {
  log('💥', `${failed} test(s) failed`)
  Deno.exit(1)
}
