#!/bin/bash

# Test Perplexity API directly to see what it returns

# Get API key from Supabase secrets
echo "🔑 Getting Perplexity API key from Supabase..."
PERPLEXITY_KEY=$(supabase secrets list | grep PERPLEXITY_API_KEY | awk '{print $1}')

if [ -z "$PERPLEXITY_KEY" ]; then
  echo "❌ Could not find PERPLEXITY_API_KEY"
  exit 1
fi

echo "✅ Found API key"
echo ""

# Test query
QUERY="wedding venue in Byron Bay, Australia. Return 10-15 results with business name, city, country, and website if available."

echo "📝 Testing Perplexity API with query:"
echo "   $QUERY"
echo ""

# Note: We can't easily get the actual key value from secrets list
# So this script is more of a template
echo "⚠️  Note: This script requires the actual Perplexity API key value."
echo ""
echo "To test manually:"
echo ""
echo "export PERPLEXITY_API_KEY='your-key-here'"
echo ""
echo "curl -X POST 'https://api.perplexity.ai/chat/completions' \\"
echo "  -H \"Authorization: Bearer \$PERPLEXITY_API_KEY\" \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"model\": \"sonar-pro\","
echo "    \"messages\": ["
echo "      {"
echo "        \"role\": \"system\","
echo "        \"content\": \"You are a wedding service discovery assistant. Find 10-15 unique, high-quality wedding service providers based on the query. Include their name, location (city, country), and any available website URL.\""
echo "      },"
echo "      {"
echo "        \"role\": \"user\","
echo "        \"content\": \"wedding venue in Byron Bay, Australia. Return 10-15 results with business name, city, country, and website if available.\""
echo "      }"
echo "    ],"
echo "    \"temperature\": 0.2,"
echo "    \"max_tokens\": 2000,"
echo "    \"response_format\": {"
echo "      \"type\": \"json_schema\","
echo "      \"json_schema\": {"
echo "        \"name\": \"discovery_results\","
echo "        \"schema\": {"
echo "          \"type\": \"object\","
echo "          \"properties\": {"
echo "            \"vendors\": {"
echo "              \"type\": \"array\","
echo "              \"items\": {"
echo "                \"type\": \"object\","
echo "                \"properties\": {"
echo "                  \"name\": {\"type\": \"string\"},"
echo "                  \"city\": {\"type\": \"string\"},"
echo "                  \"country\": {\"type\": \"string\"},"
echo "                  \"website\": {\"type\": \"string\"}"
echo "                },"
echo "                \"required\": [\"name\", \"city\", \"country\"]"
echo "              }"
echo "            }"
echo "          },"
echo "          \"required\": [\"vendors\"]"
echo "        },"
echo "        \"strict\": true"
echo "      }"
echo "    }"
echo "  }' | jq ."
echo ""
echo "Check the Supabase dashboard for logs:"
echo "https://supabase.com/dashboard/project/nidbhgqeyhrudtnizaya/logs/edge-functions"
