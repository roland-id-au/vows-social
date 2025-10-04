#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

// Admin CLI tool for managing venue research and automation
// Usage: deno run --allow-net --allow-env --allow-read cli.ts <command> [options]

import { parse } from "https://deno.land/std@0.208.0/flags/mod.ts";
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Load .env file if it exists
try {
  const env = await load();
  Object.assign(Deno.env.toObject(), env);
} catch {
  // .env file doesn't exist, use environment variables
}

const API_BASE_URL = Deno.env.get('API_BASE_URL') || 'https://v1-api.vows.social';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable required');
  console.error('   Set it in your environment or create an .env file');
  Deno.exit(1);
}

const args = parse(Deno.args);
const command = args._[0]?.toString();

async function callFunction(functionName: string, body: any = {}) {
  const url = `${API_BASE_URL}/functions/v1/${functionName}`;

  console.log(`📡 Calling: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function researchVenue() {
  const name = args.name || args.n;
  const location = args.location || args.l;
  const city = args.city || args.c;
  const state = args.state || args.s || 'NSW';

  if (!name || !location) {
    console.error('❌ Usage: cli.ts research --name "Venue Name" --location "Sydney" --city "Sydney" --state "NSW"');
    Deno.exit(1);
  }

  console.log(`🔍 Researching: ${name} in ${location}...`);

  const result = await callFunction('deep-research-venue', {
    venueName: name,
    location,
    city: city || location,
    state
  });

  if (result.success) {
    console.log('✅ Success!');
    console.log(`   Venue ID: ${result.listing.id}`);
    console.log(`   Title: ${result.listing.title}`);
    console.log(`   Images: ${result.listing.images_count}`);
    console.log(`   Packages: ${result.listing.packages_count}`);
  } else {
    console.error('❌ Failed:', result.error || result.message);
  }
}

async function batchResearch() {
  const file = args.file || args.f;

  if (!file) {
    console.error('❌ Usage: cli.ts batch --file venues.json');
    console.error('\nFile format: [{"venueName": "Name", "location": "City", "city": "City", "state": "NSW"}]');
    Deno.exit(1);
  }

  console.log(`📁 Loading venues from ${file}...`);

  const content = await Deno.readTextFile(file);
  const venues = JSON.parse(content);

  console.log(`🔍 Batch researching ${venues.length} venues...`);

  const result = await callFunction('batch-research-venues', {
    venues,
    delayBetweenRequests: args.delay || 5000
  });

  if (result.success) {
    console.log('\n✅ Batch complete!');
    console.log(`   Total: ${result.summary.total}`);
    console.log(`   Successful: ${result.summary.successful}`);
    console.log(`   Failed: ${result.summary.failed}`);
    console.log(`   Skipped: ${result.summary.skipped}`);

    if (result.summary.failed > 0) {
      console.log('\n❌ Failed venues:');
      result.details
        .filter((d: any) => d.status === 'failed')
        .forEach((d: any) => console.log(`   - ${d.venue}: ${d.error}`));
    }
  } else {
    console.error('❌ Batch failed:', result.error);
  }
}

async function discover() {
  console.log('📸 Discovering trending venues from Instagram...');

  const result = await callFunction('discover-trending-venues');

  if (result.success) {
    console.log('\n✅ Discovery complete!');
    console.log(`   Total discovered: ${result.total_discovered}`);
    console.log(`   New discoveries: ${result.new_discoveries}`);

    if (result.new_discoveries > 0) {
      console.log('\n🔥 New trending venues:');
      result.discoveries.forEach((d: any) => {
        console.log(`\n   📍 ${d.name} (${d.type})`);
        console.log(`      Location: ${d.location}`);
        console.log(`      Engagement: ${d.engagement_score}/10`);
        console.log(`      Why trending: ${d.why_trending}`);
      });
    }
  } else {
    console.error('❌ Discovery failed:', result.error);
  }
}

async function morningPipeline() {
  console.log('🌅 Running morning discovery pipeline...');

  const result = await callFunction('morning-discovery-pipeline');

  if (result.success) {
    console.log('\n✅ Pipeline complete!');
    console.log(`   Discoveries: ${result.discoveries}`);
    console.log(`   Researched: ${result.researched}`);

    if (result.researched > 0) {
      console.log('\n🆕 New venues added:');
      result.venues.forEach((v: any) => {
        console.log(`\n   ✨ ${v.title}`);
        console.log(`      Images: ${v.images_count}`);
        console.log(`      Trending: ${v.why_trending}`);
      });
    }
  } else {
    console.error('❌ Pipeline failed:', result.error);
  }
}

async function refresh() {
  console.log('🔄 Running scheduled venue refresh...');

  const result = await callFunction('scheduled-venue-refresh');

  if (result.success) {
    console.log('\n✅ Refresh complete!');
    console.log(`   Refreshed: ${result.refreshed}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Total: ${result.total}`);
  } else {
    console.error('❌ Refresh failed:', result.error);
  }
}

function showHelp() {
  console.log(`
🏛️  The Vow Society - Admin CLI

COMMANDS:

  research         Research a single venue
    --name, -n     Venue name (required)
    --location, -l Location description (required)
    --city, -c     City name (default: same as location)
    --state, -s    State code (default: NSW)

  batch           Batch research multiple venues
    --file, -f     JSON file with venue list (required)
    --delay        Delay between requests in ms (default: 5000)

  discover        Discover trending venues from Instagram

  morning         Run full morning discovery pipeline
                  (discover → research → notify)

  refresh         Refresh existing venue data

  help            Show this help message

EXAMPLES:

  # Research single venue
  ./cli.ts research --name "Botanical Gardens" --location "Sydney"

  # Batch research from file
  ./cli.ts batch --file venues.json

  # Discover trending venues
  ./cli.ts discover

  # Run morning pipeline
  ./cli.ts morning

  # Refresh venue data
  ./cli.ts refresh

ENVIRONMENT VARIABLES:

  API_BASE_URL              API base URL (default: https://v1-api.vows.social)
  SUPABASE_SERVICE_ROLE_KEY Supabase service role key

  Create a .env file in the admin/ directory with these variables.
`);
}

// Main execution
switch (command) {
  case 'research':
    await researchVenue();
    break;
  case 'batch':
    await batchResearch();
    break;
  case 'discover':
    await discover();
    break;
  case 'morning':
    await morningPipeline();
    break;
  case 'refresh':
    await refresh();
    break;
  case 'help':
  default:
    showHelp();
    break;
}
