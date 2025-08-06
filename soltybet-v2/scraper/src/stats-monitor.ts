import fetch from 'node-fetch'
import { DiscordNotifier } from './discord-notifier'

interface FighterStats {
  num_fighters: number
  num_matches: number
  top_fighter: {
    name: string
    elo: number
  }
  bottom_fighter: {
    name: string
    elo: number
  }
}

export class StatsMonitor {
  private discord: DiscordNotifier
  private apiClient: any // Your existing ApiClient
  private interval: NodeJS.Timeout | null = null

  constructor(apiClient: any) {
    this.discord = new DiscordNotifier()
    this.apiClient = apiClient
  }

  start(): void {
    console.log('📊 Starting stats monitoring...')

    // Update every minute
    this.interval = setInterval(() => {
      this.updateStats()
    }, 60000)

    // Initial update
    this.updateStats()
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  private async updateStats(): Promise<void> {
    try {
      const matchStats = await this.apiClient.request('/matches/stats')
      const fighterStats = await this.apiClient.request('/fighters/stats')

      console.log(
        `📊 Stats: ${matchStats.num_matches} matches, ${fighterStats.num_fighters} fighters`,
      )

      // Could send to Discord or update external systems
      if (fighterStats.top_fighter) {
        console.log(
          `🐐 Top: ${fighterStats.top_fighter.name} (${fighterStats.top_fighter.elo})`,
        )
      }
      if (fighterStats.bottom_fighter) {
        console.log(
          `💀 Bottom: ${fighterStats.bottom_fighter.name} (${fighterStats.bottom_fighter.elo})`,
        )
      }
    } catch (error) {
      console.error('🔥 Error updating stats:', error)
    }
  }
}
