#!/bin/bash

# Backfill Enrichment Tasks
# Creates enrichment tasks for discovered listings without them

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w"

echo "================================================================"
echo "  Backfill Missing Enrichment Tasks"
echo "================================================================"
echo ""

echo "📊 Checking pending discovered listings without enrichment tasks..."
echo ""

# Get pending listings
pending=$(curl -s -X GET "$SUPABASE_URL/rest/v1/discovered_listings?enrichment_status=eq.pending&select=id,name,city,country,type,location" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

echo "$pending" | jq -r '.[] | "  - \(.name) (\(.city), \(.country))"'

count=$(echo "$pending" | jq length)
echo ""
echo "Found $count pending discoveries"
echo ""

if [ "$count" -eq 0 ]; then
  echo "✅ No backfill needed - all pending discoveries have enrichment tasks"
  exit 0
fi

echo "🔄 Creating enrichment tasks..."
echo ""

# For each pending listing, check if enrichment task exists, if not create it
echo "$pending" | jq -c '.[]' | while read -r listing; do
  discovery_id=$(echo "$listing" | jq -r '.id')
  vendor_name=$(echo "$listing" | jq -r '.name')
  city=$(echo "$listing" | jq -r '.city')
  country=$(echo "$listing" | jq -r '.country')
  location=$(echo "$listing" | jq -r '.location')
  service_type=$(echo "$listing" | jq -r '.type')

  echo "  Checking: $vendor_name ($city)..."

  # Check if enrichment task already exists
  existing=$(curl -s -X GET "$SUPABASE_URL/rest/v1/enrichment_queue?discovery_id=eq.$discovery_id&select=id" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY")

  if [ "$(echo "$existing" | jq length)" -gt 0 ]; then
    echo "    ⏭️  Already has enrichment task, skipping"
    continue
  fi

  # Create enrichment task
  response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/enrichment_queue" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"discovery_id\": \"$discovery_id\",
      \"vendor_name\": \"$vendor_name\",
      \"location\": \"$location\",
      \"city\": \"$city\",
      \"country\": \"$country\",
      \"service_type\": \"$service_type\",
      \"priority\": 5,
      \"scheduled_for\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
    }")

  if echo "$response" | jq -e '.[0].id' > /dev/null 2>&1; then
    task_id=$(echo "$response" | jq -r '.[0].id')
    echo "    ✅ Created enrichment task: $task_id"
  else
    echo "    ❌ Failed to create task"
    echo "    Error: $(echo "$response" | jq -r '.message // .error // "Unknown error"')"
  fi
done

echo ""
echo "================================================================"
echo "  Backfill Complete"
echo "================================================================"
echo ""

echo "📊 Final stats:"
echo ""

# Check enrichment queue
pending_tasks=$(curl -s -X GET "$SUPABASE_URL/rest/v1/enrichment_queue?status=eq.pending&select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" | jq -r '.[0].count // 0')

echo "  Enrichment queue (pending): $pending_tasks"
echo ""

if [ "$pending_tasks" -gt 0 ]; then
  echo "✅ Ready to process! Run enrichment processor:"
  echo "   curl -X POST \"$SUPABASE_URL/functions/v1/enrichment-processor\" \\"
  echo "     -H \"Authorization: Bearer $ANON_KEY\""
  echo ""
else
  echo "⚠️  No pending enrichment tasks. Check if discoveries are marked correctly."
fi
