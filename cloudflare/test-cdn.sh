#!/bin/bash

# CDN Testing Script for images.vows.social

set -e

echo "=========================================="
echo "CDN Deployment Test"
echo "=========================================="
echo ""

# Test 1: Worker health check (workers.dev URL)
echo "🧪 Test 1: Worker Health Check (workers.dev)"
WORKER_URL="https://images-vows-social.blake-c6e.workers.dev/health"
echo "   Testing: $WORKER_URL"

if curl -s -f "$WORKER_URL" > /dev/null; then
  echo "   ✅ Worker is responding on workers.dev URL"
else
  echo "   ❌ Worker health check failed"
  exit 1
fi

echo ""

# Test 2: Check DNS for custom domain
echo "🧪 Test 2: DNS Configuration"
echo "   Checking: images.vows.social"

if nslookup images.vows.social > /dev/null 2>&1; then
  echo "   ✅ DNS record exists"
  DNS_EXISTS=true
else
  echo "   ⚠️  DNS record not found (NXDOMAIN)"
  echo ""
  echo "   To add DNS record:"
  echo "   1. Go to: https://dash.cloudflare.com"
  echo "   2. Select domain: vows.social"
  echo "   3. Go to: DNS → Records"
  echo "   4. Add CNAME record:"
  echo "      - Name: images"
  echo "      - Target: images-vows-social.blake-c6e.workers.dev"
  echo "      - Proxy: Enabled (orange cloud)"
  echo ""
  DNS_EXISTS=false
fi

echo ""

# Test 3: Custom domain health check (if DNS exists)
if [ "$DNS_EXISTS" = true ]; then
  echo "🧪 Test 3: Custom Domain Health Check"
  CUSTOM_URL="https://images.vows.social/health"
  echo "   Testing: $CUSTOM_URL"

  if curl -s -f "$CUSTOM_URL" > /dev/null; then
    echo "   ✅ Custom domain is working!"
  else
    echo "   ⚠️  Custom domain not responding yet (DNS may be propagating)"
  fi
else
  echo "🧪 Test 3: Custom Domain - SKIPPED (DNS not configured)"
fi

echo ""

# Test 4: Image loading test (if available)
echo "🧪 Test 4: Sample Image Test"
echo "   Checking for sample images..."

# Try to fetch a sample image path from the database
SAMPLE_PATH=$(supabase db remote --linked <<EOF 2>/dev/null | grep -v "^Manage" | tail -1 || echo ""
SELECT metadata->>'storage_path' FROM listing_media LIMIT 1;
EOF
)

if [ -n "$SAMPLE_PATH" ] && [ "$SAMPLE_PATH" != "Manage remote databases" ]; then
  echo "   Found sample: $SAMPLE_PATH"

  # Test with workers.dev URL
  TEST_URL="https://images-vows-social.blake-c6e.workers.dev/$SAMPLE_PATH"
  echo "   Testing: $TEST_URL"

  if curl -s -I "$TEST_URL" | head -1 | grep "200" > /dev/null; then
    echo "   ✅ Image loads successfully!"

    # Check cache header
    CACHE_STATUS=$(curl -s -I "$TEST_URL" | grep -i "x-cache" || echo "No cache header")
    echo "   Cache status: $CACHE_STATUS"
  else
    echo "   ⚠️  Image not accessible"
  fi
else
  echo "   ⏭️  No sample images found in database yet"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "✅ Worker deployed: https://images-vows-social.blake-c6e.workers.dev"
echo "✅ Worker health: OK"

if [ "$DNS_EXISTS" = true ]; then
  echo "✅ DNS configured: images.vows.social"
else
  echo "⚠️  DNS needs configuration: images.vows.social"
fi

echo ""
echo "Next steps:"
if [ "$DNS_EXISTS" = false ]; then
  echo "1. Add DNS record (see instructions above)"
  echo "2. Wait 1-5 minutes for DNS propagation"
  echo "3. Re-run this test: ./cloudflare/test-cdn.sh"
else
  echo "1. Run pipeline test to generate images"
  echo "2. Images will automatically use CDN URLs"
  echo "3. Check cache hit rate in Cloudflare dashboard"
fi

echo ""
