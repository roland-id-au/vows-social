#!/bin/bash
# Interactive environment setup script

set -e

echo "🔧 Environment Setup"
echo "===================="
echo ""

# Create .env file
ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists"
    echo "Do you want to overwrite it? (y/N)"
    read -r OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        echo "Aborted"
        exit 0
    fi
fi

echo "Let's set up your environment variables..."
echo ""

# Supabase URL
echo "1. Enter your Supabase Project URL:"
echo "   (e.g., https://xxxxx.supabase.co)"
read -r SUPABASE_URL

# Supabase Keys
echo ""
echo "2. Enter your Supabase Anon Key:"
read -r SUPABASE_ANON_KEY

echo ""
echo "3. Enter your Supabase Service Role Key:"
read -s SUPABASE_SERVICE_ROLE_KEY
echo ""

# Perplexity API
echo ""
echo "4. Enter your Perplexity API Key:"
read -s PERPLEXITY_API_KEY
echo ""

# Google Maps API
echo ""
echo "5. Enter your Google Maps API Key:"
read -r GOOGLE_MAPS_API_KEY

# Firebase (optional)
echo ""
echo "6. Enter your Firebase Cloud Messaging Server Key (optional, press Enter to skip):"
read -s FCM_SERVER_KEY
echo ""

# Create .env file
cat > "$ENV_FILE" << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# API Domain
API_BASE_URL=https://v1-api.vows.social

# Perplexity AI
PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY

# Google Maps
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY

# Firebase Cloud Messaging (optional)
FCM_SERVER_KEY=$FCM_SERVER_KEY
EOF

echo ""
echo "✅ Environment file created: $ENV_FILE"
echo ""

# Update admin CLI to use .env
if [ ! -f "admin/.env" ]; then
    cp "$ENV_FILE" "admin/.env"
    echo "✅ Created admin/.env for CLI tool"
fi

# Add to .gitignore
if ! grep -q ".env" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo "admin/.env" >> .gitignore
    echo "✅ Added .env to .gitignore"
fi

echo ""
echo "🔒 Security reminders:"
echo "   - .env file contains sensitive keys"
echo "   - Never commit .env to git"
echo "   - Rotate keys periodically"
echo ""
echo "Next steps:"
echo "   1. Run: ./scripts/deploy.sh"
echo "   2. Configure custom domain in Supabase Dashboard"
echo "   3. Run: ./scripts/setup-cron.sh"
echo ""
