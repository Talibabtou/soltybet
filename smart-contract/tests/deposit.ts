import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL, Transaction, Keypair } from '@solana/web3.js';
import { DepositGate } from '../target/types/deposit_gate';
import * as fs from 'fs';

async function checkGateAndTransfer() {
	const keypairFile = fs.readFileSync('<KEYPAIR_FILE_PATH>', 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));

	const connection = new Connection("https://api.devnet.solana.com", "confirmed");
	const wallet = new anchor.Wallet(keypair);
	const provider = new anchor.AnchorProvider(connection, wallet, {});
	anchor.setProvider(provider);

	const program = anchor.workspace.DepositGate as Program<DepositGate>;

	// Use the recipient from deposit_gate.ts
	const recipient = new PublicKey("J6X3g8fjvbGZzZaPyy9kxUMCjeo8cJYPY7pQCneQgg1d");
	const initialBalance = await connection.getBalance(keypair.publicKey);

	const [gatePDA] = PublicKey.findProgramAddressSync(
		[Buffer.from("deposit_gate")],
		program.programId
	);

	try {
		const checkGateIx = await program.methods
			.checkGate()
			.accounts({
				gate: gatePDA,
			})
			.instruction();

		const transferIx = SystemProgram.transfer({
			fromPubkey: keypair.publicKey,
			toPubkey: recipient,
			lamports: 0.1 * LAMPORTS_PER_SOL,
		});

		const tx = new Transaction().add(checkGateIx, transferIx);
		const txSignature = await provider.sendAndConfirm(tx);

		console.log("Transaction successful. Signature:", txSignature);
		console.log("Transferred 0.1 SOL to:", recipient.toBase58());
	} catch (error) {
		console.error("Transaction failed:", error);
	}

	const finalBalance = await connection.getBalance(keypair.publicKey);
	const solUsed = (initialBalance - finalBalance) / LAMPORTS_PER_SOL;

	console.log(`SOL used: ${solUsed.toFixed(9)}`);
}

checkGateAndTransfer();