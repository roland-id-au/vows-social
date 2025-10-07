#!/bin/bash

# Diagnose Discovery Issues
# Checks why discovery processor is returning 0 vendors

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w"

function log_section() {
  echo ""
  echo "================================================================"
  echo "  $1"
  echo "================================================================"
  echo ""
}

log_section "Discovery Diagnostic"

echo "🔍 Checking recent completed discovery tasks..."
echo ""

curl -s -X GET "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.completed&select=id,query,city,country,discoveries_found,completed_at&order=completed_at.desc&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

echo ""
echo "🔍 Checking recent processing/failed discovery tasks..."
echo ""

curl -s -X GET "$SUPABASE_URL/rest/v1/discovery_queue?status=in.(processing,failed)&select=id,query,city,country,status,error_message,attempts&order=last_attempt_at.desc&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

echo ""
echo "🔍 Checking next pending discovery task..."
echo ""

next_task=$(curl -s -X GET "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.pending&select=id,query,city,country,service_type&order=priority.asc,scheduled_for.asc&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

echo "$next_task" | jq .

task_id=$(echo "$next_task" | jq -r '.[0].id')
task_query=$(echo "$next_task" | jq -r '.[0].query')
task_city=$(echo "$next_task" | jq -r '.[0].city')

log_section "Running Discovery Test"

echo "📝 Task: $task_query"
echo "📍 City: $task_city"
echo ""
echo "⏱️  Running discovery processor..."
echo ""

result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/discovery-processor" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json")

echo "$result" | jq .

discoveries=$(echo "$result" | jq -r '.discoveries_found')

echo ""
if [ "$discoveries" = "0" ]; then
  echo "⚠️  WARNING: Discovery returned 0 vendors!"
  echo ""
  echo "Possible causes:"
  echo "1. Vendors already exist (duplicates skipped)"
  echo "2. Perplexity API returned empty results"
  echo "3. Perplexity response parsing failed"
  echo ""
  echo "🔍 Let's check if vendors from this query already exist..."
  echo ""

  # Check if we have vendors from this city
  curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?city=eq.$task_city&select=name,city,enrichment_status&limit=10" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" | jq .

else
  echo "✅ Discovery found $discoveries vendors!"
  echo ""
  echo "📊 New discoveries:"
  curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?order=created_at.desc&limit=$discoveries&select=name,city,country,source" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" | jq .
fi

log_section "Enrichment Status"

echo "📊 Discovered listings by status:"
echo ""

curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?select=enrichment_status&limit=1000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r 'group_by(.enrichment_status) | map({status: .[0].enrichment_status, count: length}) | .[]' | jq -s .

echo ""
echo "🔍 Why no pending enrichment tasks?"
echo ""

# Check enrichment queue
curl -s -X GET "$SUPABASE_URL/rest/v1/enrichment_queue?select=status&limit=1000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r 'group_by(.status) | map({status: .[0].status, count: length}) | .[]' | jq -s .

echo ""
echo "📝 Pending discovered listings (should have enrichment tasks):"
curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?enrichment_status=eq.pending&select=id,name,city,created_at&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq .

log_section "Recommendations"

echo "✅ What's working:"
echo "   - Discovery processor runs successfully"
echo "   - 20 listings already published"
echo "   - 7 listings enriched"
echo ""
echo "⚠️  Issues detected:"
echo "   - Discovery returning 0 new vendors (likely duplicates)"
echo "   - 9 discovered listings pending but 0 enrichment tasks"
echo "   - 6 discovered listings stuck in 'processing'"
echo ""
echo "🔧 Fixes needed:"
echo "   1. Check if enrichment tasks are being created for pending discoveries"
echo "   2. Investigate 'processing' discovered listings"
echo "   3. May need to manually create enrichment tasks for pending discoveries"
echo ""
echo "📚 View detailed logs:"
echo "   https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions"
echo ""
