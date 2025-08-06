import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import {
  PublicKey,
  Connection,
  Keypair,
  ComputeBudgetProgram,
} from '@solana/web3.js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export class GateClient {
  private connection: Connection
  private program: Program
  private oracle: Keypair
  private gatePDA: PublicKey

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL!,
      (process.env.COMMITMENT as any) || 'confirmed',
    )

    this.oracle = this.loadOracleKeypair()
    this.gatePDA = this.deriveGatePDA()
    this.program = this.initializeProgram()
  }

  private loadOracleKeypair(): Keypair {
    if (process.env.ORACLE_PRIVATE_KEY) {
      return Keypair.fromSecretKey(
        anchor.utils.bytes.bs58.decode(process.env.ORACLE_PRIVATE_KEY),
      )
    } else if (process.env.ORACLE_KEYPAIR_PATH) {
      const keypairFile = fs.readFileSync(
        process.env.ORACLE_KEYPAIR_PATH.replace('~', require('os').homedir()),
        'utf-8',
      )
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)))
    } else {
      throw new Error('No oracle keypair configuration found')
    }
  }

  private deriveGatePDA(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from(process.env.GATE_SEED || 'deposit_gate')],
      new PublicKey(process.env.PROGRAM_ID!),
    )
    return pda
  }

  private initializeProgram(): Program {
    const wallet = new anchor.Wallet(this.oracle)
    const provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: (process.env.COMMITMENT as any) || 'confirmed',
      preflightCommitment:
        (process.env.PREFLIGHT_COMMITMENT as any) || 'confirmed',
    })

    // Load the IDL and create program
    const idl = require('../target/idl/deposit_gate.json')
    return new Program(idl, provider)
  }

  private async getPriorityFee(): Promise<number> {
    if (process.env.AUTO_PRIORITY_FEE !== 'true') {
      return 0
    }

    try {
      const recentFees = await this.connection.getRecentPrioritizationFees()
      const medianFee =
        recentFees.reduce((a, b) => a + b.prioritizationFee, 0) /
        recentFees.length
      const multiplier = parseFloat(
        process.env.PRIORITY_FEE_MULTIPLIER || '1.2',
      )
      const maxFee = parseInt(process.env.MAX_PRIORITY_FEE || '100000')

      return Math.min(Math.ceil(medianFee * multiplier), maxFee)
    } catch (error) {
      console.warn('Failed to get priority fee, using default:', error)
      return 0
    }
  }

  async checkGateState(): Promise<{ isOpen: boolean; oracle: string }> {
    try {
      const gateAccount = await (this.program.account as any).depositGate.fetch(
        this.gatePDA,
      )
      return {
        isOpen: gateAccount.isOpen, // Note: using camelCase for JS
        oracle: gateAccount.oracle.toBase58(),
      }
    } catch (error) {
      throw new Error(`Failed to fetch gate state: ${error}`)
    }
  }

  async setGate(newState: boolean): Promise<string> {
    try {
      const priorityFee = await this.getPriorityFee()
      const instructions = []

      if (priorityFee > 0) {
        instructions.push(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          }),
        )
      }

      // Use snake_case method names to match deployed contract
      const tx = await this.program.methods
        .setGate(newState) // This will be converted to set_gate
        .accounts({
          gate: this.gatePDA,
          oracle: this.oracle.publicKey,
        })
        .preInstructions(instructions)
        .rpc()

      console.log(`Gate ${newState ? 'opened' : 'closed'} successfully`)
      console.log(`Transaction signature: ${tx}`)
      return tx
    } catch (error) {
      throw new Error(`Failed to set gate: ${error}`)
    }
  }

  async initialize(oraclePublicKey?: PublicKey): Promise<string> {
    try {
      const oracle = oraclePublicKey || this.oracle.publicKey
      const priorityFee = await this.getPriorityFee()
      const instructions = []

      if (priorityFee > 0) {
        instructions.push(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          }),
        )
      }

      const tx = await this.program.methods
        .initialize(oracle)
        .accounts({
          authority: this.oracle.publicKey,
          gate: this.gatePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions(instructions)
        .rpc()

      console.log('✅ Gate initialized successfully!')
      console.log(`📝 Transaction signature: ${tx}`)
      console.log(`🔑 Gate PDA: ${this.gatePDA.toBase58()}`)
      console.log(`👤 Oracle set to: ${oracle.toBase58()}`)
      return tx
    } catch (error) {
      throw new Error(`Failed to initialize gate: ${error}`)
    }
  }

  async openGate(): Promise<string> {
    return this.setGate(true)
  }

  async closeGate(): Promise<string> {
    return this.setGate(false)
  }

  getGatePDA(): PublicKey {
    return this.gatePDA
  }

  getProgramId(): PublicKey {
    return new PublicKey(process.env.PROGRAM_ID!)
  }

  getOraclePublicKey(): PublicKey {
    return this.oracle.publicKey
  }

  async isInitialized(): Promise<boolean> {
    try {
      await (this.program.account as any).depositGate.fetch(this.gatePDA)
      return true
    } catch (error) {
      return false
    }
  }
}
