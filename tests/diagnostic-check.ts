#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Diagnostic Check
 * Checks Supabase configuration and API keys
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://nidbhgqeyhrudtnizaya.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w'

console.log('🔍 Diagnostic Check')
console.log('='.repeat(60))

// Check Supabase connection
console.log('\n📡 Checking Supabase connection...')
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

try {
  const { data, error } = await supabase
    .from('discovery_config')
    .select('count')
    .limit(1)

  if (error) {
    console.log('❌ Database connection failed:', error.message)
  } else {
    console.log('✅ Database connected')
  }
} catch (e) {
  console.log('❌ Connection error:', e.message)
}

// Check environment variables needed by functions
console.log('\n🔑 Checking Required Secrets (in Supabase Edge Functions):')
const requiredSecrets = [
  'PERPLEXITY_API_KEY',
  'FIRECRAWL_API_KEY',
  'DISCORD_WEBHOOK_URL'
]

console.log('\nTo check secrets, run:')
console.log('  supabase secrets list')
console.log('\nTo set missing secrets, run:')
requiredSecrets.forEach(secret => {
  console.log(`  supabase secrets set ${secret}=your_key_here`)
})

// Check recent function invocations
console.log('\n📊 Checking Recent Activity...')

const { data: recentDiscoveries, count: discoveryCount } = await supabase
  .from('discovery_queue')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .limit(3)

console.log(`\n📋 Discovery Queue (${discoveryCount || 0} total):`)
if (recentDiscoveries && recentDiscoveries.length > 0) {
  recentDiscoveries.forEach(task => {
    console.log(`  - [${task.status}] ${task.query}`)
    if (task.error_message) {
      console.log(`    ⚠️ Error: ${task.error_message}`)
    }
  })
} else {
  console.log('  (empty)')
}

const { data: recentListings, count: listingsCount } = await supabase
  .from('discovered_listings')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .limit(3)

console.log(`\n📝 Discovered Listings (${listingsCount || 0} total):`)
if (recentListings && recentListings.length > 0) {
  recentListings.forEach(listing => {
    console.log(`  - ${listing.name} (${listing.city}, ${listing.country}) [${listing.enrichment_status}]`)
  })
} else {
  console.log('  (empty)')
}

// Check function logs via API call
console.log('\n🔍 Testing Discovery Function Directly...')

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/discovery-processor`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  const result = await response.json()

  console.log('Response:', JSON.stringify(result, null, 2))

  if (result.success) {
    console.log('✅ Function executed successfully')
    console.log(`   Discoveries found: ${result.discoveries_found}`)

    if (result.discoveries_found === 0) {
      console.log('\n⚠️  WARNING: No vendors discovered!')
      console.log('   Possible causes:')
      console.log('   1. PERPLEXITY_API_KEY not set in Supabase secrets')
      console.log('   2. Perplexity API returning unexpected format')
      console.log('   3. Rate limiting or API errors')
      console.log('\n   To check logs:')
      console.log('   https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions')
    }
  } else {
    console.log('❌ Function failed:', result.error)
  }
} catch (e) {
  console.log('❌ Function call error:', e.message)
}

console.log('\n📚 Useful Commands:')
console.log('  View function logs: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions')
console.log('  List secrets:       supabase secrets list')
console.log('  Set secret:         supabase secrets set KEY=value')
console.log('  Deploy function:    supabase functions deploy FUNCTION_NAME')
console.log('')
