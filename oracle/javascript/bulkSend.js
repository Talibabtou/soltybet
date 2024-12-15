import { PublicKey, Transaction, SystemProgram, Connection, sendAndConfirmTransaction, Keypair, ComputeBudgetProgram } from '@solana/web3.js';
import fs from 'fs';
import process from 'process';
import { loadConfig } from './config.js';

const config = loadConfig();

async function calculatePriorityFee(connection) {
	const recentPriorityFees = await connection.getRecentPrioritizationFees();
	const medianPriorityFee = recentPriorityFees.reduce((a, b) => a + b.prioritizationFee, 0) / recentPriorityFees.length;
	const priorityFee = Math.ceil(medianPriorityFee * 1.1);
	return priorityFee;
}

export function generateTransactions(batchSize, dropList, fromWallet, priorityFee) {
	let result = [];

	const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
		microLamports: priorityFee
	});

	let txInstructions = dropList.map(drop => {
		const numLamports = drop.numSOL;
		try {
			const toPubkey = new PublicKey(drop.walletAddress);
			return SystemProgram.transfer({
				fromPubkey: fromWallet.publicKey,
				toPubkey: toPubkey,
				lamports: numLamports
			});
		} catch (error) {
			return null;
		}
	}).filter(instruction => instruction !== null);

	const numTransactions = Math.ceil(txInstructions.length / batchSize);
	for (let i = 0; i < numTransactions; i++) {
		let bulkTransaction = new Transaction();
		bulkTransaction.add(priorityFeeIx);
		let lowerIndex = i * batchSize;
		let upperIndex = (i + 1) * batchSize;
		for (let j = lowerIndex; j < upperIndex; j++) {
			if (txInstructions[j]) bulkTransaction.add(txInstructions[j]);
		}
		result.push(bulkTransaction);
	}

	return result;
}

export async function sendTransactions(connection, transactions, signers, maxRetries = 3) {
	let transactionResults = [];

	for (let transaction of transactions) {
		let retries = 0;
		let success = false;
		
		while (retries < maxRetries && !success) {
			try {
				let signature = await sendAndConfirmTransaction(connection, transaction, signers);
				const addresses = transaction.instructions
					.filter(ix => ix.keys.length > 1)
					.map(instruction => instruction.keys[1].pubkey.toBase58());
				
				addresses.forEach(address => {
					transactionResults.push({
						address: address,
						signature: signature
					});
				});
				success = true;
			} catch (error) {
				retries++;
				console.error(`Attempt ${retries}/${maxRetries} failed:`, error);
				await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
			}
		}
	}

	return transactionResults;
}

export async function main(jsonData, keypairPath) {
	try {
		const dropList = JSON.parse(jsonData);
		const fromWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8'))));
		const connection = new Connection(config.rpc_url, 'confirmed');
		
		const priorityFee = await calculatePriorityFee(connection);
		
		const transactions = generateTransactions(10, dropList, fromWallet, priorityFee);
		const signers = [fromWallet];

		const transactionResults = await sendTransactions(connection, transactions, signers);
		
		return JSON.stringify(transactionResults);
	} catch (error) {
		return JSON.stringify({ error: error.message });
	}
}

const jsonData = process.argv[2];
const keypairPath = process.argv[3];

main(jsonData, keypairPath)
	.then(result => console.log(result))
	.catch(console.error);