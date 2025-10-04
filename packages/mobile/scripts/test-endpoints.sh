#!/bin/bash
# Test all API endpoints

set -e

echo "🧪 Testing API Endpoints"
echo "========================"
echo ""

# Get service role key
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Please enter your Supabase Service Role Key:"
    read -s SUPABASE_SERVICE_ROLE_KEY
    export SUPABASE_SERVICE_ROLE_KEY
fi

API_BASE="https://v1-api.vows.social/functions/v1"

echo "Base URL: $API_BASE"
echo ""

# Test 1: Research a single venue
echo "1️⃣  Testing deep-research-venue..."
RESPONSE=$(curl -s -X POST \
  "$API_BASE/deep-research-venue" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "venueName": "Test Venue",
    "location": "Sydney",
    "city": "Sydney",
    "state": "NSW"
  }')

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ deep-research-venue is working"
else
    echo "❌ deep-research-venue failed"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 2: Discover trending venues
echo "2️⃣  Testing discover-trending-venues..."
RESPONSE=$(curl -s -X POST \
  "$API_BASE/discover-trending-venues" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ discover-trending-venues is working"
else
    echo "❌ discover-trending-venues failed"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 3: Batch research
echo "3️⃣  Testing batch-research-venues..."
RESPONSE=$(curl -s -X POST \
  "$API_BASE/batch-research-venues" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "venues": [],
    "delayBetweenRequests": 1000
  }')

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ batch-research-venues is working"
else
    echo "❌ batch-research-venues failed"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 4: Scheduled refresh
echo "4️⃣  Testing scheduled-venue-refresh..."
RESPONSE=$(curl -s -X POST \
  "$API_BASE/scheduled-venue-refresh" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ scheduled-venue-refresh is working"
else
    echo "❌ scheduled-venue-refresh failed"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 5: Morning pipeline
echo "5️⃣  Testing morning-discovery-pipeline..."
echo "   (This may take a while...)"
RESPONSE=$(curl -s -X POST \
  "$API_BASE/morning-discovery-pipeline" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ morning-discovery-pipeline is working"
else
    echo "❌ morning-discovery-pipeline failed"
    echo "Response: $RESPONSE"
fi
echo ""

echo "🎉 Testing complete!"
echo ""
