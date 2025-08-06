import { GateClient } from '../src/gate-client'

async function checkGate(client: GateClient) {
  console.log('\n🔍 Checking gate state...')
  try {
    const state = await client.checkGateState()
    console.log(`✅ Current state: ${state.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}`)
    console.log(`🔑 Oracle: ${state.oracle}`)
    return state
  } catch (error) {
    console.error('❌ Failed to check gate:', error)
    throw error
  }
}

async function openGate(client: GateClient) {
  console.log('\n🚪 Opening gate...')
  try {
    const tx = await client.openGate()
    console.log(`✅ Gate opened successfully!`)
    console.log(`📝 Transaction: ${tx}`)
    return tx
  } catch (error) {
    console.error('❌ Failed to open gate:', error)
    throw error
  }
}

async function closeGate(client: GateClient) {
  console.log('\n🔒 Closing gate...')
  try {
    const tx = await client.closeGate()
    console.log(`✅ Gate closed successfully!`)
    console.log(`📝 Transaction: ${tx}`)
    return tx
  } catch (error) {
    console.error('❌ Failed to close gate:', error)
    throw error
  }
}

async function main() {
  const client = new GateClient()

  try {
    console.log('🎮 SoltyBet Gate Operations')
    console.log('============================')

    const initialState = await checkGate(client)

    const args = process.argv.slice(2)
    const operation = args[0]?.toLowerCase()

    switch (operation) {
      case 'open':
        if (initialState.isOpen) {
          console.log('\n⚠️  Gate is already open!')
        } else {
          await openGate(client)
          await checkGate(client)
        }
        break

      case 'close':
        if (!initialState.isOpen) {
          console.log('\n⚠️  Gate is already closed!')
        } else {
          await closeGate(client)
          await checkGate(client)
        }
        break

      case 'toggle':
        if (initialState.isOpen) {
          await closeGate(client)
        } else {
          await openGate(client)
        }
        await checkGate(client)
        break

      case 'check':
      case undefined:
        console.log('\n✅ Check complete!')
        break

      default:
        console.log('\n📖 Usage:')
        console.log('  npm run gate              # Check current state')
        console.log('  npm run gate check        # Check current state')
        console.log('  npm run gate open         # Open the gate')
        console.log('  npm run gate close        # Close the gate')
        console.log('  npm run gate toggle       # Toggle gate state')
        break
    }
  } catch (error) {
    console.error('\n💥 Operation failed:', error)
    process.exit(1)
  }
}

process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!')
  process.exit(0)
})

main().catch((error) => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})

// # Check current gate state
// npm run gate
// # or
// npm run gate:check

// # Open the gate
// npm run gate:open

// # Close the gate
// npm run gate:close

// # Toggle gate state (open if closed, close if open)
// npm run gate:toggle
