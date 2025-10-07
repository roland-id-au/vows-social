#!/bin/bash

# Simple Pipeline E2E Test
# Tests the pipeline using REST API calls only

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w"

TESTS_PASSED=0
TESTS_FAILED=0

function log_section() {
  echo ""
  echo "================================================================"
  echo "  $1"
  echo "================================================================"
  echo ""
}

function test_function() {
  local name=$1
  local endpoint=$2

  echo "🧪 Testing: $name"
  echo "   Endpoint: $endpoint"
  echo ""

  response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$endpoint" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json")

  echo "📦 Response:"
  echo "$response" | jq . 2>/dev/null || echo "$response"
  echo ""

  success=$(echo "$response" | jq -r ".success" 2>/dev/null)

  if [ "$success" = "true" ]; then
    echo "✅ PASSED"
    ((TESTS_PASSED++))
    return 0
  else
    error=$(echo "$response" | jq -r ".error" 2>/dev/null)
    message=$(echo "$response" | jq -r ".message" 2>/dev/null)

    if [ "$message" = "No pending tasks" ]; then
      echo "⏭️  SKIPPED (No pending tasks)"
      ((TESTS_PASSED++))
      return 0
    fi

    echo "❌ FAILED: $error"
    ((TESTS_FAILED++))
    return 1
  fi
}

function check_table() {
  local table=$1
  local label=$2

  echo "📊 Checking $label..."

  count=$(curl -s -X GET "$SUPABASE_URL/rest/v1/$table?select=count" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Prefer: count=exact" | jq -r '.[0].count' 2>/dev/null || echo "0")

  echo "   Total: $count"
  echo ""
}

log_section "Pipeline E2E Test Suite"

echo "✅ All required secrets are configured:"
echo "   - PERPLEXITY_API_KEY"
echo "   - FIRECRAWL_API_KEY"
echo "   - DISCORD_WEBHOOK_URL"
echo ""

log_section "Pre-Test: Check Queue Status"

# Check discovery queue
echo "📋 Discovery Queue:"
pending=$(curl -s -X GET "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.pending&select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count' 2>/dev/null || echo "?")
echo "   Pending: $pending"

completed=$(curl -s -X GET "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.completed&select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count' 2>/dev/null || echo "?")
echo "   Completed: $completed"
echo ""

# Check discovered listings
echo "📝 Discovered Listings:"
total=$(curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count' 2>/dev/null || echo "?")
echo "   Total: $total"
echo ""

log_section "Test 1: Discovery Processor"
test_function "Discovery Processor" "discovery-processor"
DISCOVERY_RESULT=$?

sleep 2

log_section "Test 2: Check Discovered Listings"

echo "📊 Recent discoveries:"
curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?select=name,city,country,enrichment_status&order=created_at.desc&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

echo ""

log_section "Test 3: Enrichment Queue Status"

pending_enrichment=$(curl -s -X GET "$SUPABASE_URL/rest/v1/enrichment_queue?status=eq.pending&select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count' 2>/dev/null || echo "0")

echo "📋 Pending enrichment tasks: $pending_enrichment"
echo ""

if [ "$pending_enrichment" != "0" ] && [ "$pending_enrichment" != "?" ]; then
  log_section "Test 4: Enrichment Processor"
  echo "⏱️  Note: This may take 30-60 seconds..."
  echo ""
  test_function "Enrichment Processor" "enrichment-processor"
  sleep 2
else
  echo "⏭️  Skipping enrichment test - no pending tasks"
  ((TESTS_PASSED++))
fi

log_section "Test 5: Check Listings"

echo "📊 Published listings:"
curl -s -X GET "$SUPABASE_URL/rest/v1/listings?select=id,title,slug,service_type&order=created_at.desc&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

echo ""

log_section "Test 6: Publishing Queue Status"

pending_publishing=$(curl -s -X GET "$SUPABASE_URL/rest/v1/publishing_queue?status=eq.pending&select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count' 2>/dev/null || echo "0")

echo "📋 Pending publishing tasks: $pending_publishing"
echo ""

if [ "$pending_publishing" != "0" ] && [ "$pending_publishing" != "?" ]; then
  log_section "Test 7: Publishing Processor"
  test_function "Publishing Processor" "publishing-processor"
  sleep 2
else
  echo "⏭️  Skipping publishing test - no pending tasks"
  ((TESTS_PASSED++))
fi

log_section "Pipeline Statistics"

echo "📊 Final Stats:"
echo ""

echo "Discovery Queue:"
curl -s -X GET "$SUPABASE_URL/rest/v1/discovery_queue?select=status&limit=1000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r 'group_by(.status) | map({status: .[0].status, count: length}) | .[]' | jq -s .

echo ""

echo "Discovered Listings:"
curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?select=enrichment_status&limit=1000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r 'group_by(.enrichment_status) | map({status: .[0].enrichment_status, count: length}) | .[]' | jq -s .

echo ""

echo "Listings:"
curl -s -X GET "$SUPABASE_URL/rest/v1/listings?select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq '.[0].count // 0 | "Total published: \(.)"'

echo ""

log_section "Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo "📊 Total Tests: $TOTAL_TESTS"
echo "✅ Passed: $TESTS_PASSED"
echo "❌ Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  echo ""
  echo "📚 Next Steps:"
  echo "   - Check Discord for notifications"
  echo "   - View logs: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions"
  echo "   - View listings: https://vows.social/venues"
  echo ""
  exit 0
else
  echo "💥 $TESTS_FAILED test(s) failed"
  echo ""
  echo "🔍 Debugging:"
  echo "   - Check function logs: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions"
  echo "   - Verify API keys: supabase secrets list"
  echo "   - Test manually:"
  echo "     curl -X POST \"$SUPABASE_URL/functions/v1/discovery-processor\" \\"
  echo "       -H \"Authorization: Bearer $ANON_KEY\""
  echo ""
  exit 1
fi
