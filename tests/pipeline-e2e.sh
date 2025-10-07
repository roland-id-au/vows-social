#!/bin/bash

# End-to-End Pipeline Test
# Tests: Discovery → Enrichment → Image Storage → CDN

set -e

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZGJoZ3FleWhydWR0bml6YXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODkzMDcsImV4cCI6MjA3NDk2NTMwN30.InpMiPXzRV4NKli2x35fasbbVY_6c1oQFjy6Xhyul0w"

echo "=========================================="
echo "🧪 End-to-End Pipeline Test"
echo "=========================================="
echo ""
echo "Testing: Discovery → Enrichment → Images"
echo ""

# Step 1: Seed discovery queue
echo "📋 Step 1: Seeding Discovery Queue"
echo "-----------------------------------"

curl -s -X POST "$SUPABASE_URL/functions/v1/seed-discovery-queue" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "locations": [
      {"city": "Sydney", "country": "Australia"},
      {"city": "Melbourne", "country": "Australia"}
    ],
    "service_types": ["venue"]
  }' | jq -r '.message // .error // .'

echo ""
sleep 2

# Step 2: Run discovery (3 times)
echo "🔍 Step 2: Running Discovery (3 batches)"
echo "-----------------------------------"

for i in 1 2 3; do
  echo ""
  echo "Discovery run $i/3..."

  RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/discovery-processor" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json")

  SUCCESS=$(echo "$RESULT" | jq -r '.success // false')
  FOUND=$(echo "$RESULT" | jq -r '.discoveries_found // 0')

  if [ "$SUCCESS" = "true" ]; then
    echo "   ✅ Found $FOUND vendors"
  else
    echo "   ⚠️  No pending tasks or error"
    break
  fi

  sleep 3
done

echo ""

# Step 3: Check discovered vendors
echo "📊 Step 3: Checking Discovered Vendors"
echo "-----------------------------------"

DISCOVERED_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/discovered_listings?select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" \
  -I | grep -i "content-range" | grep -o "/[0-9]*" | cut -d'/' -f2)

echo "Total discovered: $DISCOVERED_COUNT vendors"

# Show sample
echo ""
echo "Sample vendors:"
curl -s "$SUPABASE_URL/rest/v1/discovered_listings?select=name,city,enrichment_status&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.[] | "   - \(.name) (\(.city)) - \(.enrichment_status)"'

echo ""
sleep 2

# Step 4: Run enrichment (3 times)
echo "✨ Step 4: Running Enrichment (3 batches)"
echo "-----------------------------------"

for i in 1 2 3; do
  echo ""
  echo "Enrichment run $i/3..."

  RESULT=$(curl -s -X POST "$SUPABASE_URL/functions/v1/enrichment-processor" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json")

  SUCCESS=$(echo "$RESULT" | jq -r '.success // false')

  if [ "$SUCCESS" = "true" ]; then
    IMAGES=$(echo "$RESULT" | jq -r '.images_count // 0')
    SLUG=$(echo "$RESULT" | jq -r '.listing_slug // "unknown"')
    echo "   ✅ Enriched: $SLUG ($IMAGES images)"
  else
    MESSAGE=$(echo "$RESULT" | jq -r '.message // .error // "No tasks"')
    echo "   ⚠️  $MESSAGE"
    break
  fi

  sleep 5
done

echo ""

# Step 5: Check enriched listings
echo "📊 Step 5: Checking Enriched Listings"
echo "-----------------------------------"

ENRICHED_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/listings?select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" \
  -I | grep -i "content-range" | grep -o "/[0-9]*" | cut -d'/' -f2)

echo "Total enriched: $ENRICHED_COUNT listings"

# Show sample
echo ""
echo "Sample listings:"
curl -s "$SUPABASE_URL/rest/v1/listings?select=title,slug,location_data&limit=3" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.[] | "   - \(.title)\n     Slug: \(.slug)\n     City: \(.location_data.city)"'

echo ""

# Step 6: Check images
echo "🖼️  Step 6: Checking Image Storage"
echo "-----------------------------------"

IMAGE_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/listing_media?select=count" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Prefer: count=exact" \
  -I | grep -i "content-range" | grep -o "/[0-9]*" | cut -d'/' -f2)

echo "Total images: $IMAGE_COUNT"

# Check image URLs and metadata
echo ""
echo "Sample images with metadata:"
curl -s "$SUPABASE_URL/rest/v1/listing_media?select=url,width,height,title,alt_text&limit=3" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.[] | "   - \(.url | split("/") | .[-1])\n     Title: \(.title // "N/A")\n     Dimensions: \(.width // "?")x\(.height // "?")\n     Alt: \(.alt_text // "N/A")"'

echo ""

# Step 7: Check image quality
echo "🔍 Step 7: Checking Image Quality"
echo "-----------------------------------"

# Get image stats
curl -s "$SUPABASE_URL/rest/v1/listing_media?select=width,height,url&width=not.is.null&limit=100" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '
  [.[] | {width, height}] |
  "Images with dimensions: \(length)
Min width: \([.[].width] | min)
Max width: \([.[].width] | max)
Avg width: \(([.[].width] | add / length) | floor)
Min height: \([.[].height] | min)
Max height: \([.[].height] | max)
Avg height: \(([.[].height] | add / length) | floor)"'

echo ""

# Step 8: Test CDN (if available)
echo "🌐 Step 8: Testing CDN"
echo "-----------------------------------"

SAMPLE_URL=$(curl -s "$SUPABASE_URL/rest/v1/listing_media?select=url&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '.[0].url // ""')

if [ -n "$SAMPLE_URL" ]; then
  echo "Testing image: $SAMPLE_URL"

  if curl -s -f -I -m 5 "$SAMPLE_URL" > /dev/null 2>&1; then
    echo "✅ Image loads successfully!"

    # Check for CDN headers
    CACHE_HEADER=$(curl -s -I -m 5 "$SAMPLE_URL" | grep -i "cache-control" || echo "No cache header")
    echo "   $CACHE_HEADER"

    # Check if using CDN domain
    if [[ "$SAMPLE_URL" == *"images.vows.social"* ]]; then
      echo "   ✅ Using CDN domain (images.vows.social)"
    else
      echo "   ⚠️  Using fallback URL (worker.dev or storage)"
    fi
  else
    echo "⚠️  Image not accessible (CDN may still be provisioning)"
  fi
else
  echo "⚠️  No images to test"
fi

echo ""

# Step 9: Check API costs
echo "💰 Step 9: Checking API Costs"
echo "-----------------------------------"

curl -s "$SUPABASE_URL/rest/v1/api_cost_transactions?select=service,operation,cost_usd,metadata&order=created_at.desc&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq -r '
  if length == 0 then
    "No cost data yet"
  else
    .[] | "   \(.service)/\(.operation): $\(.cost_usd) \(if .metadata.cache_hit then "(💾 cache hit)" else "" end)"
  end'

echo ""

TOTAL_COST=$(curl -s "$SUPABASE_URL/rest/v1/api_cost_transactions?select=cost_usd" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq '[.[] | .cost_usd] | add // 0')

echo "Total API cost: \$$TOTAL_COST"

echo ""

# Summary
echo "=========================================="
echo "📊 Pipeline Test Summary"
echo "=========================================="
echo ""
echo "✅ Discovered: $DISCOVERED_COUNT vendors"
echo "✅ Enriched: $ENRICHED_COUNT listings"
echo "✅ Images: $IMAGE_COUNT stored"
echo "💰 Total cost: \$$TOTAL_COST"
echo ""

if [ "$ENRICHED_COUNT" -gt 0 ] && [ "$IMAGE_COUNT" -gt 0 ]; then
  echo "🎉 Pipeline test PASSED!"
  echo ""
  echo "View results:"
  echo "   Supabase: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/editor"
  echo "   Listings: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/editor/listings"
else
  echo "⚠️  Pipeline test incomplete"
  echo ""
  echo "Check logs:"
  echo "   Discovery: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/functions/discovery-processor/logs"
  echo "   Enrichment: https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/functions/enrichment-processor/logs"
fi

echo ""
