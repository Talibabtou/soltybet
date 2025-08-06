import dotenv from 'dotenv'
import { TwitchListener } from './twitch-listener'

// Load environment variables
dotenv.config()

async function main() {
  console.log('🚀 SoltyBet Scraper v2 Starting...')

  const listener = new TwitchListener()

  // Graceful shutdown
  const shutdown = () => {
    console.log('👋 Shutting down gracefully...')
    listener.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await listener.start()
}

main().catch((error) => {
  console.error('🔥 Fatal error:', error)
  process.exit(1)
})
