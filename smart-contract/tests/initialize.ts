import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import * as fs from 'fs';

async function init() {
	// Basic setup
	const keypairFile = fs.readFileSync('/home/talibabtou/.config/solana/deposit-gate.json', 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));
	const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=7f7759aa-4312-455a-90da-f6f921256fe1");
	const wallet = new anchor.Wallet(keypair);
	const provider = new anchor.AnchorProvider(connection, wallet, {});
	
	// Program ID
	const programId = new PublicKey("5awMTFDmJv3EXEPstpJKD6fJ6FrLfcBw5Ek5CeutvKcM");
	
	// Find PDA
	const [gatePDA] = PublicKey.findProgramAddressSync(
		[Buffer.from("deposit_gate")],
		programId
	);

	try {
		const program = await Program.at(programId, provider);
		const tx = await program.methods
			.initialize(keypair.publicKey)
			.accounts({
				authority: keypair.publicKey,
				gate: gatePDA,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.rpc();

		console.log("Initialization successful!");
		console.log("Transaction signature:", tx);
		console.log("Gate PDA:", gatePDA.toBase58());
		console.log("Oracle set to:", keypair.publicKey.toBase58());
	} catch (error) {
		console.error("Failed to initialize:", error);
	}
}

init().catch(console.error); 