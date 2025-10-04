// Discord Logger for Real-time Operational Streaming
// Posts structured messages to Discord webhook

const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL')

export interface DiscordLogOptions {
  color?: number // Hex color
  metadata?: Record<string, string>
  timestamp?: boolean
}

export class DiscordLogger {
  private webhookUrl: string

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || DISCORD_WEBHOOK_URL || ''
  }

  async log(message: string, options: DiscordLogOptions = {}) {
    if (!this.webhookUrl) {
      console.warn('Discord webhook URL not configured')
      return
    }

    const embed: any = {
      description: message,
      color: options.color || 0x3498db,
      timestamp: options.timestamp !== false ? new Date().toISOString() : undefined
    }

    // Add metadata as fields
    if (options.metadata) {
      embed.fields = Object.entries(options.metadata).map(([name, value]) => ({
        name,
        value: value.toString(),
        inline: true
      }))
    }

    const payload = {
      embeds: [embed]
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Failed to send Discord message:', await response.text())
      }
    } catch (error) {
      console.error('Error sending Discord message:', error)
    }
  }

  async discovery(message: string, stats?: { total?: number; new?: number; city?: string }) {
    await this.log(`🔍 ${message}`, {
      color: 0x9b59b6,
      metadata: stats as Record<string, string>
    })
  }

  async enrichment(message: string, stats?: { enriched?: number; pending?: number }) {
    await this.log(`✨ ${message}`, {
      color: 0xf39c12,
      metadata: stats as Record<string, string>
    })
  }

  async error(message: string, error?: any) {
    await this.log(`❌ ${message}`, {
      color: 0xe74c3c,
      metadata: error ? { Error: error.message || error.toString() } : undefined
    })
  }

  async success(message: string, metadata?: Record<string, string>) {
    await this.log(`✅ ${message}`, {
      color: 0x2ecc71,
      metadata
    })
  }

  async dailyDigest(stats: {
    errors: number
    warnings: number
    discoveries: number
    enriched: number
    perplexity_calls: number
    users_active: number
  }) {
    const message = `**📊 Daily Report**\n\n` +
      `• Errors: ${stats.errors}\n` +
      `• Warnings: ${stats.warnings}\n` +
      `• Discoveries: ${stats.discoveries}\n` +
      `• Enriched: ${stats.enriched}\n` +
      `• Perplexity Calls: ${stats.perplexity_calls}\n` +
      `• Active Users: ${stats.users_active}`

    await this.log(message, {
      color: stats.errors > 0 ? 0xff9900 : 0x00ff00
    })
  }
}
