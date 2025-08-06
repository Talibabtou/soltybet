import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair, ComputeBudgetProgram } from '@solana/web3.js';
import * as fs from 'fs';

async function openGate() {
	const keypairFile = fs.readFileSync('/home/talibabtou/.config/solana/deposit-gate.json', 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));
	const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=7f7759aa-4312-455a-90da-f6f921256fe1");

	// Get recent priority fee levels
	const recentPriorityFees = await connection.getRecentPrioritizationFees();
	
	// Calculate median priority fee from recent transactions (last 5 seconds)
	const medianPriorityFee = recentPriorityFees.reduce((a, b) => a + b.prioritizationFee, 0) / recentPriorityFees.length;
	
	// Add 20% to ensure we're above median
	const priorityFee = Math.ceil(medianPriorityFee * 1.2);
	
	console.log(`Using priority fee of ${priorityFee} microLamports`);

	const wallet = new anchor.Wallet(keypair);
	const provider = new anchor.AnchorProvider(connection, wallet, {
		commitment: 'confirmed',
		preflightCommitment: 'confirmed',
	});

	const programId = new PublicKey("5awMTFDmJv3EXEPstpJKD6fJ6FrLfcBw5Ek5CeutvKcM");
	const [gatePDA] = PublicKey.findProgramAddressSync(
		[Buffer.from("deposit_gate")],
		programId
	);

	try {
		const program = await Program.at(programId, provider);
		
		// Create priority fee instruction
		const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: priorityFee
		});

		const tx = await program.methods
			.setGate(true)
			.accounts({
				gate: gatePDA,
				oracle: provider.wallet.publicKey,
			})
			.preInstructions([priorityFeeIx])  // Add priority fee instruction
			.rpc();

		console.log("Gate opened successfully. Transaction signature:", tx);
	} catch (error) {
		console.error("Failed to open gate:", error);
	}
}

openGate().catch(console.error);