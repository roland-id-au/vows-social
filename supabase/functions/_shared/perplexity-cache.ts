// Perplexity Response Cache with Adaptive TTLs
// - Discovery queries: 12 hours (trending lists change)
// - Vendor enrichment: 7 days (specific vendor details rarely change)

interface CacheEntry {
  response: any
  timestamp: number
  accessCount: number
  ttlMs: number
}

class PerplexityCache {
  private cache: Map<string, CacheEntry> = new Map()

  // TTL constants
  private readonly DISCOVERY_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
  private readonly VENDOR_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

  private generateKey(prompt: string): string {
    // Create a hash-like key from the prompt
    return btoa(prompt).substring(0, 50)
  }

  /**
   * Get cached response if not expired
   * @param prompt The Perplexity prompt
   * @returns Cached response or null if expired/not found
   */
  get(prompt: string): any | null {
    const key = this.generateKey(prompt)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    // Check if expired
    if (age > entry.ttlMs) {
      this.cache.delete(key)
      console.log(`[PerplexityCache] EXPIRED - Key: ${key.substring(0, 20)}... Age: ${Math.floor(age / 1000 / 3600)}h`)
      return null
    }

    // Reset timestamp on access (extending TTL)
    entry.timestamp = now
    entry.accessCount++

    const ttlHours = Math.floor(entry.ttlMs / 1000 / 3600)
    console.log(`[PerplexityCache] HIT - Key: ${key.substring(0, 20)}... Age: ${Math.floor(age / 1000 / 3600)}h/${ttlHours}h, Accesses: ${entry.accessCount}`)

    return entry.response
  }

  /**
   * Cache a response with appropriate TTL
   * @param prompt The Perplexity prompt
   * @param response The response to cache
   * @param type 'discovery' for trending lists or 'vendor' for specific vendor details
   */
  set(prompt: string, response: any, type: 'discovery' | 'vendor' = 'discovery'): void {
    const key = this.generateKey(prompt)
    const ttlMs = type === 'vendor' ? this.VENDOR_TTL_MS : this.DISCOVERY_TTL_MS

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      accessCount: 0,
      ttlMs
    })

    const ttlHours = Math.floor(ttlMs / 1000 / 3600)
    console.log(`[PerplexityCache] SET (${type}) - Key: ${key.substring(0, 20)}... TTL: ${ttlHours}h, Total cached: ${this.cache.size}`)

    // Clean up old entries (garbage collection)
    this.cleanup()
  }

  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttlMs) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[PerplexityCache] Cleaned up ${removed} expired entries`)
    }
  }

  clear(): void {
    this.cache.clear()
    console.log('[PerplexityCache] Cleared all entries')
  }

  stats(): { size: number; entries: Array<{ key: string; age: number; accesses: number }> } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 20) + '...',
      age: Math.floor((now - entry.timestamp) / 1000),
      accesses: entry.accessCount
    }))

    return {
      size: this.cache.size,
      entries
    }
  }
}

// Singleton instance
export const perplexityCache = new PerplexityCache()
