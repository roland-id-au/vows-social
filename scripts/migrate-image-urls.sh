#!/bin/bash

# Script to migrate image URLs from Supabase Storage to images.vows.social CDN
# Run this AFTER deploying the Cloudflare Worker and configuring DNS

set -e

SUPABASE_URL="https://nidbhgqeyhrudtnizaya.supabase.co"
CDN_URL="https://images.vows.social"
DB_URL="postgresql://postgres.nidbhgqeyhrudtnizaya:Vows2025!@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

echo "======================================"
echo "Image URL Migration to CDN"
echo "======================================"
echo ""

# Function to check if CDN is working
check_cdn() {
  echo "🔍 Checking CDN health..."

  if curl -s -f "${CDN_URL}/health" > /dev/null; then
    echo "✅ CDN health check passed"
    return 0
  else
    echo "❌ CDN health check failed"
    echo "   Please ensure:"
    echo "   1. Cloudflare Worker is deployed"
    echo "   2. DNS CNAME is configured (images.vows.social)"
    echo "   3. DNS has propagated (can take 5-10 minutes)"
    return 1
  fi
}

# Function to test a sample image
test_sample_image() {
  echo ""
  echo "🧪 Testing sample image..."

  # Get a sample image URL from database
  SAMPLE_URL=$(PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -tAc "SELECT url FROM listing_media LIMIT 1" 2>/dev/null)

  if [ -z "$SAMPLE_URL" ]; then
    echo "⚠️  No images found in database to test"
    return 0
  fi

  echo "   Sample URL: ${SAMPLE_URL}"

  # Extract path from URL
  if [[ $SAMPLE_URL == *"listing-images/"* ]]; then
    IMAGE_PATH="${SAMPLE_URL##*listing-images/}"
    CDN_TEST_URL="${CDN_URL}/${IMAGE_PATH}"

    echo "   Testing CDN: ${CDN_TEST_URL}"

    if curl -s -f -I "${CDN_TEST_URL}" | head -n 1 | grep "200" > /dev/null; then
      echo "✅ Image loads successfully from CDN"

      # Check cache header
      CACHE_STATUS=$(curl -s -I "${CDN_TEST_URL}" | grep -i "x-cache" | cut -d' ' -f2 || echo "UNKNOWN")
      echo "   Cache status: ${CACHE_STATUS}"
      return 0
    else
      echo "❌ Image failed to load from CDN"
      return 1
    fi
  else
    echo "⚠️  Sample URL doesn't match expected format"
    return 0
  fi
}

# Function to show current stats
show_stats() {
  echo ""
  echo "📊 Current Image URL Stats"
  echo "-----------------------------------"

  TOTAL=$(PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -tAc "SELECT COUNT(*) FROM listing_media" 2>/dev/null || echo "0")
  echo "   Total images: ${TOTAL}"

  SUPABASE_COUNT=$(PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -tAc "SELECT COUNT(*) FROM listing_media WHERE url LIKE 'https://nidbhgqeyhrudtnizaya.supabase.co%'" 2>/dev/null || echo "0")
  echo "   Supabase URLs: ${SUPABASE_COUNT}"

  CDN_COUNT=$(PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -tAc "SELECT COUNT(*) FROM listing_media WHERE url LIKE 'https://images.vows.social%'" 2>/dev/null || echo "0")
  echo "   CDN URLs: ${CDN_COUNT}"

  if [ "$SUPABASE_COUNT" -gt 0 ]; then
    echo ""
    echo "⚠️  Found ${SUPABASE_COUNT} images still using Supabase URLs"
    echo "   These will be migrated to CDN URLs"
  fi

  if [ "$CDN_COUNT" -gt 0 ]; then
    echo ""
    echo "✅ ${CDN_COUNT} images already using CDN URLs"
  fi
}

# Function to run migration
run_migration() {
  echo ""
  echo "🚀 Running migration..."
  echo "-----------------------------------"

  # Run the migration SQL
  PGPASSWORD="Vows2025!" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.nidbhgqeyhrudtnizaya -d postgres -f supabase/migrations/028_migrate_image_urls_to_cdn.sql

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully"

    # Show updated stats
    show_stats
  else
    echo ""
    echo "❌ Migration failed"
    exit 1
  fi
}

# Main execution
main() {
  # Check CDN health
  if ! check_cdn; then
    echo ""
    echo "❌ Aborting: CDN is not ready"
    exit 1
  fi

  # Test sample image
  if ! test_sample_image; then
    echo ""
    echo "⚠️  Warning: Sample image test failed"
    echo "   Migration will continue, but images may not load"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Aborted by user"
      exit 1
    fi
  fi

  # Show current stats
  show_stats

  # Confirm migration
  echo ""
  echo "⚠️  This will update ALL image URLs in the database"
  echo "   From: https://nidbhgqeyhrudtnizaya.supabase.co/storage/..."
  echo "   To:   https://images.vows.social/..."
  echo ""
  read -p "Proceed with migration? (y/N): " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_migration
    echo ""
    echo "🎉 Migration complete!"
    echo ""
    echo "Next steps:"
    echo "1. Update image-storage.ts to use CDN URLs by default"
    echo "2. Test image loading on vows.social website"
    echo "3. Monitor CDN cache hit rate in Cloudflare dashboard"
  else
    echo ""
    echo "❌ Migration cancelled by user"
    exit 0
  fi
}

# Run main function
main
