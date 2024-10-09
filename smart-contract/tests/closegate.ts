import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { DepositGate } from '../target/types/deposit_gate';
import * as fs from 'fs';

async function closeGate() {
    // Load the keypair from the specified file
    const keypairFile = fs.readFileSync('<KEYPAIR_FILE_PATH>', 'utf-8');
    const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    // Get the initial balance
    const initialBalance = await connection.getBalance(keypair.publicKey);

    const program = anchor.workspace.DepositGate as Program<DepositGate>;

    // Derive the PDA for the gate account
    const [gatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("deposit_gate")],
        program.programId
    );

    try {
        // Set the gate to closed
        const tx = await program.methods
            .setGate(false)
            .accounts({
                gate: gatePDA,
                oracle: provider.wallet.publicKey,
            })
            .rpc();

        console.log("Gate closed successfully. Transaction signature:", tx);
    } catch (error) {
        console.error("Failed to close gate:", error);
    }

    // After closing the gate, get the final balance
    const finalBalance = await connection.getBalance(keypair.publicKey);
    const lamportsUsed = initialBalance - finalBalance;
    const solUsed = lamportsUsed / 1e9;

    console.log(`SOL used: ${solUsed.toFixed(9)}`);
}

closeGate();