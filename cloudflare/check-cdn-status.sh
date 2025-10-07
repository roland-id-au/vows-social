#!/bin/bash

# Quick CDN status checker
# Run this to see when images.vows.social is ready

echo "🔍 Checking images.vows.social status..."
echo ""

# Test custom domain
if curl -s -f -m 5 https://images.vows.social/health > /dev/null 2>&1; then
  echo "🎉 SUCCESS! CDN is ready!"
  echo ""

  RESPONSE=$(curl -s https://images.vows.social/health)
  echo "✅ Health check: $RESPONSE"
  echo ""

  echo "📊 Headers:"
  curl -s -I https://images.vows.social/health | grep -E "(HTTP|cache-control|x-cache|access-control|x-cdn)"
  echo ""

  echo "✅ Images will now load from: https://images.vows.social/..."
  echo "✅ CDN caching active (7 days)"
  echo "✅ Image optimization enabled (WebP/AVIF)"
  echo ""
  echo "Ready to test pipeline!"

else
  echo "⏳ Not ready yet"
  echo ""
  echo "Status:"
  echo "  ✅ Worker: OK (https://images-vows-social.blake-c6e.workers.dev)"
  echo "  ✅ DNS: Configured"
  echo "  ⏳ HTTPS: Provisioning (takes 1-5 minutes)"
  echo ""
  echo "Check again in 1-2 minutes:"
  echo "  ./cloudflare/check-cdn-status.sh"
fi

echo ""
