import WebSocket from 'ws'
import { ApiClient } from './api-client'
import { DiscordNotifier } from './discord-notifier'
import { Match, GamePhase, PhaseMessage } from './types'
import { StatsMonitor } from './stats-monitor'

export class TwitchListener {
  private ws: WebSocket | null = null
  private apiClient: ApiClient
  private discord: DiscordNotifier
  private currentMatch: Match | null = null
  private currentPhase: GamePhase = 'waiting'
  private reconnectAttempts = 0
  private maxReconnectAttempts = parseInt(process.env.MAX_RETRIES || '5')
  private matchStartTime: Date | null = null
  private statsMonitor: StatsMonitor
  private volumeInterval: NodeJS.Timeout | null = null

  constructor() {
    this.apiClient = new ApiClient()
    this.discord = new DiscordNotifier()
    this.statsMonitor = new StatsMonitor(this.apiClient)
  }

  async start(): Promise<void> {
    console.log('🎮 Starting SoltyBet Scraper...')
    this.statsMonitor.start()
    await this.connect()
  }

  async stop(): Promise<void> {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval)
    }
    this.statsMonitor.stop()
    if (this.ws) {
      this.ws.close()
    }
  }

  private async connect(): Promise<void> {
    try {
      this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443')

      this.ws.on('open', () => {
        console.log('✅ Connected to Twitch IRC')
        this.authenticate()
        this.reconnectAttempts = 0
      })

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString())
      })

      this.ws.on('close', () => {
        console.log('❌ Twitch connection closed')
        this.scheduleReconnect()
      })

      this.ws.on('error', (error) => {
        console.error('🔥 Twitch WebSocket error:', error)
        this.discord.sendError(`Twitch WebSocket error: ${error.message}`)
      })

      // Ping interval to keep connection alive
      setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('PING :tmi.twitch.tv')
        }
      }, parseInt(process.env.PING_INTERVAL || '30000'))
    } catch (error) {
      console.error('🔥 Failed to connect:', error)
      this.scheduleReconnect()
    }
  }

  private authenticate(): void {
    const nick = 'justinfan12345'
    const channel = process.env.TWITCH_CHANNEL || 'saltybet'

    this.ws?.send(`NICK ${nick}`)
    this.ws?.send('CAP REQ :twitch.tv/tags twitch.tv/commands')
    this.ws?.send(`JOIN #${channel}`)

    console.log(`📺 Joined #${channel}`)
  }

  private async handleMessage(message: string): Promise<void> {
    if (message.startsWith('PING')) {
      this.ws?.send('PONG :tmi.twitch.tv')
      return
    }

    if (!message.includes('PRIVMSG')) return

    const userIdMatch = message.match(/user-id=(\d+)/)
    const roomIdMatch = message.match(/room-id=(\d+)/)
    const messageMatch = message.match(/PRIVMSG #\S+ :(.*)/)

    if (!userIdMatch || !roomIdMatch || !messageMatch) return

    const userId = userIdMatch[1]
    const roomId = roomIdMatch[1]
    const text = messageMatch[1]

    // Only process messages from target user and room
    if (
      userId !== process.env.TARGET_USER_ID ||
      roomId !== process.env.TARGET_ROOM_ID
    ) {
      return
    }

    console.log(`🎯 Target message: ${text}`)
    await this.processPhase(text)
  }

  private async processPhase(text: string): Promise<void> {
    try {
      if (text.includes('Bets are OPEN')) {
        await this.handleBetsOpen(text)
      } else if (text.includes('Bets are locked')) {
        await this.handleBetsLocked()
      } else if (text.includes('wins!')) {
        await this.handleMatchEnd(text)
      }
    } catch (error) {
      console.error('🔥 Error processing phase:', error)
      this.discord.sendError(`Error processing phase: ${error}`)
    }
  }

  private async handleBetsOpen(text: string): Promise<void> {
    console.log('🟢 Bets are OPEN!')
    this.currentPhase = 'betting'

    // Cancel any existing volume monitoring
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval)
      this.volumeInterval = null
    }

    // Extract fighter names: "Bets are OPEN for Fighter1 vs Fighter2!"
    const fighterMatch = text.match(/for (.*?) vs (.*?)!/)
    if (!fighterMatch) return

    const redFighter = fighterMatch[1].trim()
    const blueFighter = fighterMatch[2].trim()

    // Create/get fighters and match from API
    this.currentMatch = await this.apiClient.createMatch(
      redFighter,
      blueFighter,
    )

    if (this.currentMatch) {
      await this.sendPhaseUpdate('Bets are OPEN!', redFighter, blueFighter)

      // Start volume monitoring
      this.startVolumeMonitoring()
    }
  }

  private async handleBetsLocked(): Promise<void> {
    console.log('🔒 Bets are LOCKED!')
    this.currentPhase = 'locked'
    this.matchStartTime = new Date() // Track fight start time

    if (this.currentMatch) {
      // TODO: Implement lock phase monitoring like v1
      // v1 polls get_volumes every 1 second for 15 seconds after lock
      // Then switches to handle_bets_locked for final volume calculation
      await this.startLockPhaseMonitoring()

      // Check for potential refunds (one-sided betting)
      const volumes = await this.apiClient.getBetsVolume(this.currentMatch.id)
      if (
        volumes &&
        ((volumes.total_red === 0 && volumes.total_blue > 0) ||
          (volumes.total_red > 0 && volumes.total_blue === 0))
      ) {
        console.log('⚠️ One-sided betting detected - potential refund')
        await this.discord.sendInfo('One-sided betting detected')

        // TODO: Trigger refund process like v1
        // v1 uses: executor.submit(handle_payout, headers, match, "Refund")
        // await this.processRefund()
      }
    }
  }

  private async handleMatchEnd(text: string): Promise<void> {
    console.log('🏁 Match ended!')
    this.currentPhase = 'finished'

    if (this.currentMatch && this.matchStartTime) {
      // Calculate fight duration
      const duration = Date.now() - this.matchStartTime.getTime()
      const durationSeconds = Math.floor(duration / 1000)
      const durationStr = `${Math.floor(durationSeconds / 60)}:${(
        durationSeconds % 60
      )
        .toString()
        .padStart(2, '0')}`

      console.log(`⏱️ Fight duration: ${durationStr}`)

      // Extract winner and update match
      const winner = text.split('wins!')[0].trim()
      await this.apiClient.updateMatchWinner(
        this.currentMatch.id,
        winner,
        durationStr,
      )

      await this.sendPhaseUpdate(text.split('.')[0] + '.')

      // TODO: Use ProcessPoolExecutor like v1 for payout processing
      // v1: executor.submit(handle_payout, headers, match, "Payout")
      await this.waitForPayouts()

      // Reset for next match
      this.currentMatch = null
      this.currentPhase = 'waiting'
      this.matchStartTime = null
    }
  }

  private startVolumeMonitoring(): void {
    if (!this.currentMatch) return

    this.volumeInterval = setInterval(async () => {
      if (this.currentPhase !== 'betting' || !this.currentMatch) {
        if (this.volumeInterval) {
          clearInterval(this.volumeInterval)
          this.volumeInterval = null
        }
        return
      }

      try {
        const volumes = await this.apiClient.getVolumes(this.currentMatch.id)
        if (volumes) {
          await this.sendPhaseUpdate(
            'Bets are OPEN!',
            this.currentMatch.redFighter.name,
            this.currentMatch.blueFighter.name,
            volumes.total_red,
            volumes.total_blue,
          )
        }
      } catch (error) {
        console.error('🔥 Error monitoring volumes:', error)
      }
    }, 2000)
  }

  // TODO: Implement lock phase monitoring like v1
  private async startLockPhaseMonitoring(): Promise<void> {
    if (!this.currentMatch) return

    const lockStartTime = new Date()
    const maxLockDuration = 15000 // 15 seconds like v1

    const lockInterval = setInterval(async () => {
      if (!this.currentMatch) {
        clearInterval(lockInterval)
        return
      }

      const elapsedTime = Date.now() - lockStartTime.getTime()

      try {
        let volumes
        if (elapsedTime <= maxLockDuration) {
          // Use get_volumes for first 15 seconds
          volumes = await this.apiClient.getVolumes(this.currentMatch.id)
        } else {
          // Switch to handle_bets_locked for final calculation
          volumes = await this.apiClient.getBetsVolume(this.currentMatch.id)
          clearInterval(lockInterval)
        }

        if (volumes) {
          await this.sendPhaseUpdate(
            'Bets are locked',
            this.currentMatch.redFighter.name,
            this.currentMatch.blueFighter.name,
            volumes.total_red,
            volumes.total_blue,
          )
        }
      } catch (error) {
        console.error('🔥 Error in lock phase monitoring:', error)
        clearInterval(lockInterval)
      }
    }, 1000) // Poll every 1 second like v1
  }

  private async sendPhaseUpdate(
    text: string,
    redFighter?: string,
    blueFighter?: string,
    totalRed?: number,
    totalBlue?: number,
  ): Promise<void> {
    const message: PhaseMessage = {
      type: 'phase',
      text,
      redFighter,
      blueFighter,
      match_id: this.currentMatch?.id,
      total_red: totalRed || 0,
      total_blue: totalBlue || 0,
    }

    // Send to frontend via WebSocket
    await this.apiClient.sendPhaseUpdate(message)
  }

  private async waitForPayouts(): Promise<void> {
    console.log('💰 Waiting for payout processing...')

    // TODO: Implement proper payout file monitoring like v1
    // v1 waits for /app/history/last_match.json to be created by Oracle
    // Polls file existence, validates JSON structure, processes payouts
    // Calls bet_payout and user_payout APIs, then sends info via WebSocket

    let attempts = 0
    const maxAttempts = 30 // 30 seconds timeout

    while (attempts < maxAttempts) {
      try {
        // TODO: Replace with file monitoring logic
        // Check if /app/history/last_match.json exists and is valid
        // if (await this.checkPayoutFile()) {
        //   await this.processPayoutFile()
        //   break
        // }

        // Check if payouts have been processed
        const payoutStatus = await this.apiClient.checkPayoutStatus(
          this.currentMatch?.id,
        )
        if (payoutStatus?.completed) {
          console.log('✅ Payouts processed successfully')
          break
        }
      } catch (error) {
        // Payout not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
    }

    if (attempts >= maxAttempts) {
      console.log('⚠️ Payout processing timeout')
      await this.discord.sendError('Payout processing timeout')
    }
  }

  // TODO: Add method to process payout file like v1's handle_payout()
  // private async processPayoutFile(): Promise<void> {
  //   // Read /app/history/last_match.json
  //   // Validate required fields: user_address, payout, bet_id
  //   // Convert payout to string (not float)
  //   // Call bet_payout and user_payout APIs
  //   // Send info via WebSocket
  //   // Clear the file after processing
  // }

  // TODO: Add file monitoring method
  // private async checkPayoutFile(): Promise<boolean> {
  //   // Check if /app/history/last_match.json exists and has valid JSON
  //   // Return true if file is ready for processing
  // }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔥 Max reconnection attempts reached')
      this.discord.sendError('Max reconnection attempts reached')
      process.exit(1)
    }

    this.reconnectAttempts++
    const delay = parseInt(process.env.RECONNECT_DELAY || '5000')

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.connect()
    }, delay)
  }
}
