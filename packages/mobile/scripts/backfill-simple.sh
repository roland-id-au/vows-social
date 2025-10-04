#!/bin/bash

# Simple backfill script using only curl
# Usage: ./scripts/backfill-simple.sh [LIMIT] [DELAY_SECONDS]

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4OTMwNywiZXhwIjoyMDc0OTY1MzA3fQ.Ae1SOpALHEq0K68a0cwK38ugbHx4hKiqzC28q1Hkf6M"

LIMIT=${1:-999}
DELAY=${2:-5}

echo "🚀 Starting backfill..."
echo "   Limit: $LIMIT"
echo "   Delay: ${DELAY}s"
echo ""

# Fetch pending discoveries
echo "📊 Fetching pending discoveries..."
DISCOVERIES=$(curl -s "$SUPABASE_URL/rest/v1/discovered_listings?status=eq.pending_research&order=engagement_score.desc&limit=$LIMIT" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY")

# Count discoveries
TOTAL=$(echo "$DISCOVERIES" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")

if [ "$TOTAL" = "0" ]; then
  echo "✅ No pending discoveries!"
  exit 0
fi

echo "Found $TOTAL pending discoveries"
echo ""

PROCESSED=0
SUCCEEDED=0
FAILED=0

# Process each discovery
echo "$DISCOVERIES" | python3 -c "
import sys, json
discoveries = json.load(sys.stdin)
for d in discoveries:
    print(json.dumps(d))
" | while read -r discovery; do
  PROCESSED=$((PROCESSED + 1))

  ID=$(echo "$discovery" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
  NAME=$(echo "$discovery" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
  CITY=$(echo "$discovery" | python3 -c "import sys, json; print(json.load(sys.stdin)['city'])")
  STATE=$(echo "$discovery" | python3 -c "import sys, json; print(json.load(sys.stdin)['state'])")
  LOCATION=$(echo "$discovery" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('location', 'Unknown'))")
  SERVICE_TYPE=$(echo "$discovery" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('service_type', 'venue'))")

  echo "[$PROCESSED/$TOTAL] 🔍 $NAME"
  echo "   📍 $LOCATION, $CITY"
  echo "   🏷️  $SERVICE_TYPE"

  # Call research function
  RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/deep-research-venue" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"venueName\":\"$NAME\",\"location\":\"$LOCATION, $CITY\",\"city\":\"$CITY\",\"state\":\"$STATE\",\"serviceType\":\"$SERVICE_TYPE\",\"forceRefresh\":false}")

  SUCCESS=$(echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(str(d.get('success', False)).lower())")

  if [ "$SUCCESS" = "true" ]; then
    echo "   ✅ Success!"
    LISTING_ID=$(echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['listing']['id'])")

    # Update status
    curl -s -X PATCH "$SUPABASE_URL/rest/v1/discovered_listings?id=eq.$ID" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\":\"researched\",\"listing_id\":\"$LISTING_ID\",\"researched_at\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > /dev/null
  else
    echo "   ❌ Failed"
    curl -s -X PATCH "$SUPABASE_URL/rest/v1/discovered_listings?id=eq.$ID" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\":\"research_failed\"}" > /dev/null
  fi

  if [ $PROCESSED -lt $TOTAL ]; then
    echo "   ⏱️  Waiting ${DELAY}s..."
    sleep $DELAY
  fi
  echo ""
done

echo "✅ Backfill complete!"
