#!/bin/bash
# Deployment script for The Vow Society Backend
# Deploys all Edge Functions to Supabase with custom domain v1-api.vows.social

set -e

echo "🚀 The Vow Society - Backend Deployment"
echo "======================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Install with: npm install -g supabase"
    exit 1
fi

# Check if logged in
echo "📋 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "Please run: supabase login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Link to project if not already linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "🔗 Linking to Supabase project..."
    echo "Please enter your project reference ID:"
    read -r PROJECT_REF
    supabase link --project-ref "$PROJECT_REF"
else
    echo "✅ Already linked to project"
fi

echo ""
echo "📦 Deploying Edge Functions..."
echo ""

# Deploy each function
FUNCTIONS=(
    "deep-research-venue"
    "batch-research-venues"
    "discover-trending-venues"
    "morning-discovery-pipeline"
    "scheduled-venue-refresh"
)

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying: $func"
    supabase functions deploy "$func" --no-verify-jwt
    echo "✅ Deployed: $func"
    echo ""
done

echo "🗄️  Running database migrations..."
supabase db push

echo ""
echo "🔑 Setting environment secrets..."
echo "Please enter your Perplexity API key:"
read -s PERPLEXITY_KEY
supabase secrets set PERPLEXITY_API_KEY="$PERPLEXITY_KEY"

echo ""
echo "Please enter your Firebase Cloud Messaging Server Key (or press Enter to skip):"
read -s FCM_KEY
if [ -n "$FCM_KEY" ]; then
    supabase secrets set FCM_SERVER_KEY="$FCM_KEY"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Your API endpoints:"
echo "   Base URL: https://v1-api.vows.social"
echo "   Functions:"
for func in "${FUNCTIONS[@]}"; do
    echo "     - https://v1-api.vows.social/functions/v1/$func"
done

echo ""
echo "🔧 Next steps:"
echo "   1. Configure custom domain in Supabase Dashboard:"
echo "      Settings → API → Custom Domain → v1-api.vows.social"
echo "   2. Add DNS records for v1-api.vows.social"
echo "   3. Test endpoints with: ./scripts/test-endpoints.sh"
echo "   4. Set up cron jobs: ./scripts/setup-cron.sh"
echo ""
