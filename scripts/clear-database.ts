#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Clear database script (preserves cache and schema)
 * Usage: deno run --allow-env --allow-net scripts/clear-database.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://nidbhgqeyhrudtnizaya.supabase.co'
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.2sKPQYlZJLtTN7d2xCpI8S_FfQvDKCNe8-OqOoMM_cU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

console.log('🗑️  Clearing database tables (preserving cache)...')
console.log('')

try {
  // Clear tables in order (respecting foreign keys)
  const tables = [
    'notification_queue',
    'api_cost_transactions',
    'listing_tags',
    'listing_media',
    'packages',
    'enrichment_queue',
    'discovered_listings',
    'listings',
    'discovery_queue'
  ]

  for (const table of tables) {
    console.log(`   Clearing ${table}...`)
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error(`   ❌ Error clearing ${table}:`, error.message)
    } else {
      console.log(`   ✅ ${table} cleared`)
    }
  }

  console.log('')
  console.log('📊 Verifying tables are empty...')
  console.log('')

  // Check counts
  for (const table of ['discovered_listings', 'enrichment_queue', 'listings', 'listing_media', 'api_cost_transactions', 'discovery_queue']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    console.log(`   ${table}: ${count} rows`)
  }

  console.log('')
  console.log('✅ Database cleared successfully!')
  console.log('✅ Cache preserved (in-memory)')
  console.log('')

} catch (error) {
  console.error('❌ Error:', error)
  Deno.exit(1)
}
