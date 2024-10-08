import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { DepositGate } from '../target/types/deposit_gate';
import * as fs from 'fs';

async function checkGate() {
	const keypairFile = fs.readFileSync('<KEYPAIR_FILE_PATH>', 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));
	const connection = new Connection("https://api.devnet.solana.com", "confirmed");
	const wallet = new anchor.Wallet(keypair);
	const provider = new anchor.AnchorProvider(connection, wallet, {});
	anchor.setProvider(provider);
	const initialBalance = await connection.getBalance(keypair.publicKey);
	const program = anchor.workspace.DepositGate as Program<DepositGate>;
	const [gatePDA] = PublicKey.findProgramAddressSync(
		[Buffer.from("deposit_gate")],
		program.programId
	);

	try {
		const gateAccount = await program.account.depositGate.fetch(gatePDA);
		console.log("Gate state:", gateAccount.isOpen ? "Open" : "Closed");
		console.log("Oracle pubkey:", gateAccount.oracle.toBase58());
	} catch (error) {
		console.error("Failed to check gate state:", error);
	}
	const finalBalance = await connection.getBalance(keypair.publicKey);
	const lamportsUsed = initialBalance - finalBalance;
	console.log(`Lamports used: ${lamportsUsed}`);
}

checkGate();