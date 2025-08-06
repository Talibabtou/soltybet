import fetch from 'node-fetch'

export class DiscordNotifier {
  private webhookUrl: string

  constructor() {
    this.webhookUrl = process.env.DISCORD_ERROR_WEBHOOK || ''
  }

  async sendError(message: string): Promise<void> {
    if (!this.webhookUrl) return

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔥 **Scraper Error**: \`\`\`${message}\`\`\``,
        }),
      })
    } catch (error) {
      console.error('Failed to send Discord notification:', error)
    }
  }

  async sendInfo(message: string): Promise<void> {
    if (!this.webhookUrl) return

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `ℹ️ **Scraper Info**: ${message}`,
        }),
      })
    } catch (error) {
      console.error('Failed to send Discord notification:', error)
    }
  }
}
