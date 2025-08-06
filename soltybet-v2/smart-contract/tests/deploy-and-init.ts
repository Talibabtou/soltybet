import { GateClient } from '../src/gate-client'
import { PublicKey } from '@solana/web3.js'

async function deployAndInit() {
  console.log('🚀 SoltyBet Gate Deployment & Initialization')
  console.log('===============================================')

  const client = new GateClient()

  try {
    // Check if already initialized
    console.log('\n🔍 Checking if gate is already initialized...')
    const isInitialized = await client.isInitialized()

    if (isInitialized) {
      console.log('⚠️  Gate is already initialized!')
      console.log('\n📊 Current state:')
      const state = await client.checkGateState()
      console.log(`   State: ${state.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}`)
      console.log(`   Oracle: ${state.oracle}`)
      console.log(`   Gate PDA: ${client.getGatePDA().toBase58()}`)
      console.log(`   Program ID: ${client.getProgramId().toBase58()}`)
      return
    }

    // Initialize the gate
    console.log('\n🏗️  Initializing gate...')

    // Get oracle from command line or use default
    const args = process.argv.slice(2)
    const customOracle = args[0]

    let oraclePublicKey: PublicKey | undefined
    if (customOracle) {
      try {
        oraclePublicKey = new PublicKey(customOracle)
        console.log(`👤 Using custom oracle: ${customOracle}`)
      } catch (error) {
        console.error('❌ Invalid oracle public key provided')
        process.exit(1)
      }
    } else {
      console.log(
        `👤 Using default oracle: ${client.getOraclePublicKey().toBase58()}`,
      )
    }

    const tx = await client.initialize(oraclePublicKey)

    console.log('\n✅ Deployment completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   Transaction: ${tx}`)
    console.log(`   Gate PDA: ${client.getGatePDA().toBase58()}`)
    console.log(`   Program ID: ${client.getProgramId().toBase58()}`)
    console.log(
      `   Oracle: ${
        oraclePublicKey?.toBase58() || client.getOraclePublicKey().toBase58()
      }`,
    )

    // Verify initialization
    console.log('\n🔍 Verifying initialization...')
    const finalState = await client.checkGateState()
    console.log(
      `   Initial state: ${finalState.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}`,
    )
  } catch (error) {
    console.error('\n💥 Deployment failed:', error)
    process.exit(1)
  }
}

console.log('💡 Usage:')
console.log('   npm run deploy              # Deploy with default oracle')
console.log('   npm run deploy <oracle_pubkey>  # Deploy with custom oracle')
console.log('')

deployAndInit().catch((error) => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})
