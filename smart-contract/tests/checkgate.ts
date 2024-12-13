import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { DepositGate } from '../target/types/deposit_gate';
import * as fs from 'fs';

async function checkGate() {
	// Load the keypair from the specified file
	const keypairFile = fs.readFileSync('/home/talibabtou/.config/solana/deposit-gate.json', 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));

	const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=7f7759aa-4312-455a-90da-f6f921256fe1", "confirmed");
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
		// Fetch the gate account
		const gateAccount = await program.account.depositGate.fetch(gatePDA);

		console.log("Gate state:", gateAccount.isOpen ? "Open" : "Closed");
		console.log("Oracle pubkey:", gateAccount.oracle.toBase58());
	} catch (error) {
		console.error("Failed to check gate state:", error);
	}

	// After fetching the gate account, get the final balance
	const finalBalance = await connection.getBalance(keypair.publicKey);
	const lamportsUsed = initialBalance - finalBalance;

	console.log(`Lamports used: ${lamportsUsed}`);
}

checkGate();