#!/bin/bash

# Local backfill script to process pending discoveries
# Usage: ./scripts/backfill-discoveries.sh [LIMIT] [DELAY_SECONDS]
#
# Examples:
#   ./scripts/backfill-discoveries.sh           # Process all pending discoveries
#   ./scripts/backfill-discoveries.sh 10        # Process only 10 discoveries
#   ./scripts/backfill-discoveries.sh 10 3      # Process 10 with 3 second delay

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M"

LIMIT=${1:-9999}
DELAY=${2:-5}

echo "🚀 Starting local backfill..."
echo "   Limit: $LIMIT discoveries"
echo "   Delay: ${DELAY}s between requests"
echo ""

# Fetch pending discoveries
echo "📊 Fetching pending discoveries..."

DISCOVERIES=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_pending_discoveries" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"limit_count\": $LIMIT}")

# Check if we got valid JSON
if ! echo "$DISCOVERIES" | jq empty 2>/dev/null; then
  echo "❌ Failed to fetch discoveries. Response:"
  echo "$DISCOVERIES"
  exit 1
fi

TOTAL=$(echo "$DISCOVERIES" | jq '. | length')

if [ "$TOTAL" -eq 0 ]; then
  echo "✅ No pending discoveries found!"
  exit 0
fi

echo "Found $TOTAL pending discoveries"
echo ""

# Counters
PROCESSED=0
SUCCEEDED=0
FAILED=0
START_TIME=$(date +%s)

# Process each discovery
echo "$DISCOVERIES" | jq -c '.[]' | while read -r discovery; do
  PROCESSED=$((PROCESSED + 1))

  ID=$(echo "$discovery" | jq -r '.id')
  NAME=$(echo "$discovery" | jq -r '.name')
  LOCATION=$(echo "$discovery" | jq -r '.location // "Unknown"')
  CITY=$(echo "$discovery" | jq -r '.city')
  STATE=$(echo "$discovery" | jq -r '.state')
  SERVICE_TYPE=$(echo "$discovery" | jq -r '.service_type // "venue"')
  ENGAGEMENT=$(echo "$discovery" | jq -r '.engagement_score // 0')

  echo "[$PROCESSED/$TOTAL] 🔍 Researching: $NAME"
  echo "   📍 $LOCATION, $CITY"
  echo "   📊 Engagement: $ENGAGEMENT/10"
  echo "   🏷️  Type: $SERVICE_TYPE"

  # Call deep-research-venue Edge Function
  RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/deep-research-venue" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"venueName\": \"$NAME\",
      \"location\": \"$LOCATION, $CITY\",
      \"city\": \"$CITY\",
      \"state\": \"$STATE\",
      \"serviceType\": \"$SERVICE_TYPE\",
      \"forceRefresh\": false
    }")

  # Check if successful
  SUCCESS=$(echo "$RESULT" | jq -r '.success // false')

  if [ "$SUCCESS" = "true" ]; then
    SUCCEEDED=$((SUCCEEDED + 1))
    LISTING_ID=$(echo "$RESULT" | jq -r '.listing.id')
    PHOTOS=$(echo "$RESULT" | jq -r '.listing.images | length // 0')
    PACKAGES=$(echo "$RESULT" | jq -r '.listing.packages | length // 0')

    echo "   ✅ Success! Created listing: $LISTING_ID"
    echo "   📸 Photos: $PHOTOS"
    echo "   📦 Packages: $PACKAGES"

    # Update discovery status
    curl -s -X PATCH "$SUPABASE_URL/rest/v1/discovered_listings?id=eq.$ID" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{
        \"status\": \"researched\",
        \"listing_id\": \"$LISTING_ID\",
        \"researched_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
      }" > /dev/null
  else
    FAILED=$((FAILED + 1))
    ERROR=$(echo "$RESULT" | jq -r '.error // "Unknown error"')
    echo "   ❌ Failed: $ERROR"

    # Mark as failed
    curl -s -X PATCH "$SUPABASE_URL/rest/v1/discovered_listings?id=eq.$ID" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\": \"research_failed\"}" > /dev/null
  fi

  # Rate limiting
  if [ $PROCESSED -lt $TOTAL ]; then
    echo "   ⏱️  Waiting ${DELAY}s..."
    sleep $DELAY
  fi

  echo ""
done

# Final summary
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo "===================================================================="
echo "🎉 Backfill Complete!"
echo "===================================================================="
echo "Total Processed: $PROCESSED"
echo "✅ Succeeded: $SUCCEEDED"
echo "❌ Failed: $FAILED"
echo "⏱️  Total Time: ${TOTAL_TIME}s ($((TOTAL_TIME / 60))min)"
echo ""
