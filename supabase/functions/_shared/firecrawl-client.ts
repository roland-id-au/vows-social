/**
 * Firecrawl API client for scraping vendor websites
 * API Documentation: https://docs.firecrawl.dev/api-reference/endpoint/scrape
 */

export interface FirecrawlScrapeOptions {
  url: string
  formats?: ('markdown' | 'html' | 'rawHtml' | 'screenshot' | 'links')[]
  onlyMainContent?: boolean
  includeTags?: string[]
  excludeTags?: string[]
  waitFor?: number
  timeout?: number
}

export interface FirecrawlImageData {
  url: string
  alt?: string
  description?: string
}

export interface FirecrawlPackageData {
  name: string
  price?: string
  description?: string
  inclusions?: string[]
  images?: string[]
}

export interface FirecrawlVendorSchema {
  gallery_images: FirecrawlImageData[]
  packages: FirecrawlPackageData[]
  additional_images: string[]
  pricing_information?: string
  features?: string[]
  capacity?: string
  contact_email?: string
  contact_phone?: string
}

export class FirecrawlClient {
  private apiKey: string
  private baseUrl = 'https://api.firecrawl.dev/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Scrape a wedding vendor website for images, packages, and pricing
   * Works for all vendor types: venues, photographers, caterers, florists, etc.
   */
  async scrapeVendorWebsite(url: string): Promise<FirecrawlVendorSchema | null> {
    try {
      console.log(`🔍 Scraping vendor website: ${url}`)

      const schema = {
        type: 'object',
        properties: {
          gallery_images: {
            type: 'array',
            description: 'Array of image objects from the gallery or portfolio section',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'Full URL of the image' },
                alt: { type: 'string', description: 'Alt text or caption if available' },
                description: { type: 'string', description: 'Description of what the image shows' }
              },
              required: ['url']
            }
          },
          additional_images: {
            type: 'array',
            description: 'Additional image URLs found throughout the website (service photos, event photos, work samples, etc)',
            items: { type: 'string' }
          },
          packages: {
            type: 'array',
            description: 'Service packages or offerings',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Package name' },
                price: { type: 'string', description: 'Package price or price range' },
                description: { type: 'string', description: 'What the package includes' },
                inclusions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of what is included in this package'
                },
                images: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Image URLs associated with this package'
                }
              },
              required: ['name']
            }
          },
          pricing_information: {
            type: 'string',
            description: 'General pricing information or pricing structure'
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'Service features, amenities, or capabilities'
          },
          capacity: {
            type: 'string',
            description: 'Capacity information if relevant (e.g., "up to 150 guests" for venues, "can accommodate 10 weddings per month" for services)'
          },
          contact_email: {
            type: 'string',
            description: 'Contact email address'
          },
          contact_phone: {
            type: 'string',
            description: 'Contact phone number'
          }
        },
        required: ['gallery_images', 'additional_images', 'packages']
      }

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['extract'],
          extract: {
            schema,
            systemPrompt: 'You are extracting wedding vendor information from a website. This could be a venue, photographer, caterer, florist, or any wedding service provider. Focus on finding high-quality images showcasing their work, service packages, and pricing information. Extract all relevant image URLs, especially from galleries, portfolios, sliders, and photo sections.',
            prompt: 'Extract all vendor images (portfolio, gallery, work samples), service packages, pricing, and business details from this website.'
          },
          onlyMainContent: false, // We want images from everywhere
          waitFor: 2000, // Wait for dynamic content to load
          timeout: 30000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Firecrawl API error: ${response.status} - ${errorText}`)
        return null
      }

      const data = await response.json()

      if (!data.success) {
        console.error('❌ Firecrawl scrape failed:', data.error)
        return null
      }

      const extractedData = data.data?.extract as FirecrawlVendorSchema

      if (!extractedData) {
        console.error('❌ No extracted data from Firecrawl')
        return null
      }

      console.log(`✅ Firecrawl scraped: ${extractedData.gallery_images?.length || 0} gallery images, ${extractedData.additional_images?.length || 0} additional images, ${extractedData.packages?.length || 0} packages`)

      return extractedData

    } catch (error) {
      console.error('❌ Firecrawl scrape error:', error)
      return null
    }
  }

  /**
   * Get all image URLs from scraped vendor data
   */
  extractAllImageUrls(scrapedData: FirecrawlVendorSchema): string[] {
    const imageUrls: string[] = []

    // Gallery images
    if (scrapedData.gallery_images) {
      imageUrls.push(...scrapedData.gallery_images.map(img => img.url))
    }

    // Additional images
    if (scrapedData.additional_images) {
      imageUrls.push(...scrapedData.additional_images)
    }

    // Package images
    if (scrapedData.packages) {
      for (const pkg of scrapedData.packages) {
        if (pkg.images) {
          imageUrls.push(...pkg.images)
        }
      }
    }

    // Remove duplicates and filter out invalid URLs
    const uniqueUrls = [...new Set(imageUrls)]
      .filter(url => url && url.startsWith('http'))

    return uniqueUrls
  }
}
