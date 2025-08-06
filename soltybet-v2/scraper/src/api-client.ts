import fetch from 'node-fetch'
import { Match, Fighter, VolumeData, PhaseMessage } from './types'

export class ApiClient {
  private baseUrl: string
  private token: string
  // TODO: Add JWT token management like v1
  // - tokenExpiry: Date tracking
  // - refreshToken functionality
  // - automatic token refresh before expiry (15min in v1)

  constructor() {
    this.baseUrl = process.env.VPS_API_URL || 'http://localhost:8000/api'
    this.token = process.env.VPS_API_TOKEN || ''

    // TODO: Initialize JWT authentication like v1's initialize_token()
    // Should get access token from username/password stored in secrets
  }

  // TODO: Add JWT token management methods
  // async initializeToken(username: string, secretFile: string): Promise<void>
  // async refreshToken(refreshToken: string): Promise<void>
  // async checkAndRefreshToken(): Promise<void>

  async updateMatchWinner(
    matchId: string,
    winnerName: string,
    duration?: string,
  ): Promise<void> {
    try {
      // TODO: Update fighter ELO ratings like v1's update_fighter_stats()
      // Should call update_elo and update_fighter endpoints for both fighters

      await this.request(`/matches/${matchId}/winner`, {
        method: 'PUT',
        body: JSON.stringify({
          winner_name: winnerName,
          duration: duration,
        }),
      })
    } catch (error) {
      console.error('🔥 Error updating winner:', error)
    }
  }

  // TODO: Add missing v1 methods
  // async updateFighterElo(winnerId: string, loserId: string): Promise<void>
  // async updateFighterStats(fighterId: string, isWin: boolean): Promise<void>

  async checkPayoutStatus(matchId?: string): Promise<any> {
    if (!matchId) return null
    try {
      return await this.request(`/matches/${matchId}/payout-status`)
    } catch (error) {
      return null
    }
  }

  // Make request method public for StatsMonitor
  async request(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`

    // TODO: Add automatic token refresh before request if needed
    // await this.checkAndRefreshToken()

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        // TODO: Add CSP header like v1: 'Content-Security-Policy': "default-src 'self'..."
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      )
    }

    return response.json()
  }

  async createMatch(redName: string, blueName: string): Promise<Match | null> {
    try {
      // Create/get fighters
      const redFighter = await this.request('/fighters', {
        method: 'POST',
        body: JSON.stringify({ name: redName.replace(' ', '_') }),
      })

      const blueFighter = await this.request('/fighters', {
        method: 'POST',
        body: JSON.stringify({ name: blueName.replace(' ', '_') }),
      })

      // Create match
      const match = await this.request('/matches', {
        method: 'POST',
        body: JSON.stringify({
          red_fighter_id: redFighter.id,
          blue_fighter_id: blueFighter.id,
        }),
      })

      return {
        ...match,
        redFighter,
        blueFighter,
      }
    } catch (error) {
      console.error('🔥 Error creating match:', error)
      return null
    }
  }

  async getVolumes(matchId: string): Promise<VolumeData | null> {
    try {
      return await this.request(`/matches/${matchId}/volumes`)
    } catch (error) {
      console.error('🔥 Error getting volumes:', error)
      return null
    }
  }

  // TODO: Add v1's handle_bets_locked equivalent
  // Should call bets_volume endpoint and return total_red, total_blue, total_bets
  async getBetsVolume(matchId: string): Promise<VolumeData | null> {
    try {
      const response = await this.request(`/bets/bets_volume/?m_id=${matchId}`)
      return {
        total_red: response.total_red,
        total_blue: response.total_blue,
        bet_count: response.debug_info?.total_bets || 0,
      }
    } catch (error) {
      console.error('🔥 Error getting bets volume:', error)
      return null
    }
  }

  async sendPhaseUpdate(message: PhaseMessage): Promise<void> {
    try {
      // Get WebSocket token
      const tokenResponse = await this.request('/ws-token', { method: 'POST' })
      const wsToken = tokenResponse.token

      // Send via WebSocket (you might want to implement this differently)
      const wsUrl = `${process.env.FRONTEND_WS_URL}?token=${wsToken}`

      // Simple WebSocket send (you might want to maintain persistent connection)
      const WebSocket = require('ws')
      const ws = new WebSocket(wsUrl, {
        headers: { Origin: process.env.WS_ORIGIN },
      })

      ws.on('open', () => {
        ws.send(JSON.stringify(message))
        ws.close()
      })
    } catch (error) {
      console.error('🔥 Error sending phase update:', error)
    }
  }

  // TODO: Add payout processing methods like v1's handle_payout()
  // async processBetPayouts(payoutData: any[]): Promise<void>
  // async processUserPayouts(payoutData: any[]): Promise<void>
}
