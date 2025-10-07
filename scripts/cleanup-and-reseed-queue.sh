#!/bin/bash

# Cleanup old discovery tasks and re-seed with proper format

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w"

echo "================================================================"
echo "  Cleanup and Re-seed Discovery Queue"
echo "================================================================"
echo ""

echo "📊 Current discovery queue status:"
curl -s "$SUPABASE_URL/rest/v1/discovery_queue?select=status&limit=1000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | \
  jq -r 'group_by(.status) | map({status: .[0].status, count: length}) | .[]' | jq -s .

echo ""
echo "⚠️  Deleting old pending tasks (they have wrong format)..."
echo ""

# Delete old pending tasks (those without proper city or with old location format)
deleted=$(curl -s -X DELETE "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.pending" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: return=representation")

count=$(echo "$deleted" | jq length)
echo "✅ Deleted $count old pending tasks"
echo ""

echo "🌱 Re-seeding discovery queue with correct format..."
echo ""

result=$(curl -s -X POST "$SUPABASE_URL/functions/v1/seed-discovery-queue" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json")

echo "$result" | jq .

tasks_created=$(echo "$result" | jq -r '.tasks_created')

echo ""
if [ "$tasks_created" -gt 0 ]; then
  echo "✅ Created $tasks_created new discovery tasks"
  echo ""
  echo "📋 Sample tasks:"
  curl -s "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.pending&select=query,city,country,location&limit=5" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" | jq .
else
  echo "⚠️  No tasks created. Checking existing tasks..."
  curl -s "$SUPABASE_URL/rest/v1/discovery_queue?status=eq.pending&select=query,city,country,location&limit=3" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" | jq .
fi

echo ""
echo "================================================================"
echo "  Ready to Test"
echo "================================================================"
echo ""
echo "Run discovery processor:"
echo "  curl -X POST \"$SUPABASE_URL/functions/v1/discovery-processor\" \\"
echo "    -H \"Authorization: Bearer $ANON_KEY\""
echo ""
