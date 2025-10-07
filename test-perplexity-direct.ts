/**
 * Direct Perplexity API Test
 * Tests if Perplexity API returns wedding venues for Sydney
 */

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')!

const query = "wedding venue in Sydney, Australia. Return 10-15 results with business name, city, country, and website if available."

console.log('🔍 Testing Perplexity API directly')
console.log('Query:', query)
console.log('')

const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: 'You are a wedding service discovery assistant. Find 10-15 unique, high-quality wedding service providers based on the query. Include their name, location (city, country), and any available website URL.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    temperature: 0.2,
    max_tokens: 2000,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'discovery_results',
        schema: {
          type: 'object',
          properties: {
            vendors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                  website: { type: 'string' }
                },
                required: ['name', 'city', 'country']
              }
            }
          },
          required: ['vendors']
        },
        strict: true
      }
    }
  })
})

console.log('📦 Response status:', response.status)

if (!response.ok) {
  const errorText = await response.text()
  console.error('❌ Error:', errorText)
  Deno.exit(1)
}

const data = await response.json()

console.log('📊 Model:', data.model)
console.log('📈 Usage:', JSON.stringify(data.usage, null, 2))
console.log('')

const result = JSON.parse(data.choices[0].message.content)
console.log('✨ Vendors found:', result.vendors.length)
console.log('')

if (result.vendors.length > 0) {
  console.log('📋 First 3 vendors:')
  result.vendors.slice(0, 3).forEach((vendor: any, i: number) => {
    console.log(`${i + 1}. ${vendor.name} (${vendor.city}, ${vendor.country})`)
    console.log(`   Website: ${vendor.website || 'N/A'}`)
  })
} else {
  console.log('⚠️  No vendors found!')
}

console.log('')
console.log('Full response:')
console.log(JSON.stringify(result, null, 2))
