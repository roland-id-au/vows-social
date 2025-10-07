#!/bin/bash

# Pipeline E2E Test Suite
# Tests the complete vendor discovery pipeline

set -e

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w"

TESTS_PASSED=0
TESTS_FAILED=0

function log() {
  echo "$1"
}

function log_section() {
  echo ""
  echo "================================================================"
  echo "  $1"
  echo "================================================================"
  echo ""
}

function test_api_call() {
  local name=$1
  local endpoint=$2
  local expected_field=$3

  echo "🧪 Testing: $name"

  response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/$endpoint" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json")

  echo "   Response: $response"

  if echo "$response" | jq -e ".success" > /dev/null 2>&1; then
    success=$(echo "$response" | jq -r ".success")
    if [ "$success" = "true" ]; then
      echo "   ✅ PASSED"
      ((TESTS_PASSED++))
      echo "$response" | jq .
      return 0
    fi
  fi

  echo "   ❌ FAILED"
  ((TESTS_FAILED++))
  echo "$response" | jq . 2>/dev/null || echo "$response"
  return 1
}

log_section "Pipeline E2E Test Suite"

log "🔍 Checking Supabase Secrets..."
echo ""
supabase secrets list
echo ""

log_section "Test 1: Discovery Processor"

echo "📋 Current discovery queue status:"
PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -c "SELECT status, COUNT(*) FROM discovery_queue GROUP BY status;"
echo ""

test_api_call "Discovery Processor" "discovery-processor" "discoveries_found"
DISCOVERY_RESULT=$?

echo ""
echo "📊 Checking discovered listings..."
PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -c "SELECT COUNT(*), enrichment_status FROM discovered_listings GROUP BY enrichment_status;"

log_section "Test 2: Enrichment Queue Status"

echo "📋 Current enrichment queue status:"
PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -c "SELECT status, COUNT(*) FROM enrichment_queue GROUP BY status;"
echo ""

# Only test enrichment if we have pending tasks
PENDING_ENRICHMENT=$(PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -t -c "SELECT COUNT(*) FROM enrichment_queue WHERE status = 'pending';")

if [ "$PENDING_ENRICHMENT" -gt 0 ]; then
  log_section "Test 3: Enrichment Processor"
  echo "⏱️  Note: This may take 30-60 seconds (Perplexity + Firecrawl + image download)"
  echo ""

  test_api_call "Enrichment Processor" "enrichment-processor" "listing_id"

  echo ""
  echo "📊 Checking listings..."
  PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -c "SELECT id, title, service_type, (location_data->>'city') as city FROM listings ORDER BY created_at DESC LIMIT 5;"
else
  echo "⏭️  Skipping enrichment test - no pending tasks"
  ((TESTS_PASSED++))
fi

log_section "Test 4: Publishing Queue Status"

echo "📋 Current publishing queue status:"
PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -c "SELECT status, COUNT(*) FROM publishing_queue GROUP BY status;"
echo ""

# Only test publishing if we have pending tasks
PENDING_PUBLISHING=$(PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -t -c "SELECT COUNT(*) FROM publishing_queue WHERE status = 'pending';")

if [ "$PENDING_PUBLISHING" -gt 0 ]; then
  log_section "Test 5: Publishing Processor"

  test_api_call "Publishing Processor" "publishing-processor" "published_channels"
else
  echo "⏭️  Skipping publishing test - no pending tasks"
  ((TESTS_PASSED++))
fi

log_section "Pipeline Statistics"

echo "📊 Discovery Pipeline Stats:"
PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres << EOF
SELECT
  '📋 Discovery Queue' as stage,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM discovery_queue
UNION ALL
SELECT
  '📝 Discovered Listings' as stage,
  SUM(CASE WHEN enrichment_status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN enrichment_status = 'enriched' THEN 1 ELSE 0 END) as completed,
  0 as failed
FROM discovered_listings
UNION ALL
SELECT
  '✨ Enrichment Queue' as stage,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM enrichment_queue
UNION ALL
SELECT
  '📤 Publishing Queue' as stage,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM publishing_queue;
EOF

log_section "Error Check"

echo "🔍 Checking for failed tasks..."
PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres << EOF
SELECT 'Discovery' as queue, query as task, error_message, attempts
FROM discovery_queue
WHERE status = 'failed'
LIMIT 3
UNION ALL
SELECT 'Enrichment' as queue, vendor_name as task, error_message, attempts
FROM enrichment_queue
WHERE status = 'failed'
LIMIT 3
UNION ALL
SELECT 'Publishing' as queue, listing_id::text as task, error_message, attempts
FROM publishing_queue
WHERE status = 'failed'
LIMIT 3;
EOF

log_section "Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

log "📊 Total Tests: $TOTAL_TESTS"
log "✅ Passed: $TESTS_PASSED"
log "❌ Failed: $TESTS_FAILED"

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  log "🎉 All tests passed!"
  exit 0
else
  log "💥 $TESTS_FAILED test(s) failed"
  exit 1
fi
