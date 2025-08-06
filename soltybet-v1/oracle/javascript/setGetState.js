import { PublicKey, Connection, Keypair, TransactionInstruction, Transaction, sendAndConfirmTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import * as fs from 'fs';
import process from 'process';
import crypto from 'crypto';
import { loadConfig } from './config.js';

const config = loadConfig();

const getInstructionIdentifier = (instructionName) => {
	const hash = crypto.createHash('sha256').update(instructionName).digest();
	return hash.slice(0, 8);
};

async function calculatePriorityFee(connection) {
	const recentPriorityFees = await connection.getRecentPrioritizationFees();
	const medianPriorityFee = recentPriorityFees.reduce((a, b) => a + b.prioritizationFee, 0) / recentPriorityFees.length;
	const priorityFee = Math.ceil(medianPriorityFee * 1.1);
	console.log(`Using priority fee of ${priorityFee} microLamports`);
	return priorityFee;
}

async function setGateState(open) {
	const keypairFile = fs.readFileSync(config.oracle_wallet, 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));

	const connection = new Connection(config.rpc_url, "confirmed");

	const priorityFee = await calculatePriorityFee(connection);

	const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
		microLamports: priorityFee
	});

	const programId = new PublicKey(config.deposit_gate_address);
	const [gatePDA] = PublicKey.findProgramAddressSync(
		[Buffer.from("deposit_gate")],
		programId
	);

	try {
		const instructionData = Buffer.concat([
			getInstructionIdentifier('global:set_gate'),
			Buffer.from([open ? 1 : 0])
		]);

		const instruction = new TransactionInstruction({
			keys: [
				{ pubkey: gatePDA, isSigner: false, isWritable: true },
				{ pubkey: keypair.publicKey, isSigner: true, isWritable: false },
			],
			programId: programId,
			data: instructionData,
		});

		const transaction = new Transaction()
			.add(priorityFeeIx)
			.add(instruction);
		const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

		console.log(`Gate ${open ? "opened" : "closed"} successfully. Transaction signature:`, signature);
	} catch (error) {
		console.error(`Failed to ${open ? "open" : "close"} gate:`, error);
	}
}

async function checkGate() {
	const keypairFile = fs.readFileSync(config.oracle_wallet, 'utf-8');
	const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));

	const connection = new Connection(config.rpc_url, "confirmed");

	const programId = new PublicKey(config.deposit_gate_address);
	const [gatePDA] = PublicKey.findProgramAddressSync(
		[Buffer.from("deposit_gate")],
		programId
	);

	try {
		const instructionData = getInstructionIdentifier('global:check_gate');

		const instruction = new TransactionInstruction({
			keys: [
				{ pubkey: gatePDA, isSigner: false, isWritable: false },
				{ pubkey: keypair.publicKey, isSigner: true, isWritable: false },
			],
			programId: programId,
			data: instructionData,
		});

		const transaction = new Transaction().add(instruction);
		const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

		console.log(`Gate state checked successfully. Transaction signature:`, signature);
	} catch (error) {
		console.error("Failed to check gate state:", error);
	}
}

const action = process.argv[2];

if (action === "check") {
	checkGate();
} else if (action === "open" || action === "close") {
	const open = action === "open";
	setGateState(open);
} else {
	console.error("Invalid action. Use 'open', 'close', or 'check'.");
}

export { setGateState, checkGate };