import { PublicKey, Transaction, SystemProgram, Connection, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import fs from 'fs';
import process from 'process';
import { loadConfig } from './config.js';

const config = loadConfig();

export function generateTransactions(batchSize, dropList, fromWallet) {
	let result = [];

	let txInstructions = dropList.map(drop => {
		const numLamports = BigInt(drop.numSOL);
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
	let failedTransactions = [];
	let transactionResults = [];

	for (let transaction of transactions) {
		let retries = 0;
		let success = false;
		while (retries < maxRetries && !success) {
			try {
				let signature = await sendAndConfirmTransaction(connection, transaction, signers);
				const addresses = transaction.instructions.map(instruction => instruction.keys[1].pubkey.toBase58());
				addresses.forEach(address => {
					transactionResults.push({ address: address, signature: signature });
				});
				success = true;
			} catch (error) {
				retries++;
				if (retries >= maxRetries) {
					failedTransactions.push(transaction);
				}
			}
		}
	}

	if (failedTransactions.length > 0) {
		await sendTransactions(connection, failedTransactions, signers, maxRetries);
	}

	return transactionResults;
}

export async function main(jsonData, keypairPath) {
	try {
		const dropList = JSON.parse(jsonData);
		const fromWallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf8'))));
		const connection = new Connection(config.rpc_url, 'confirmed');
		const transactions = generateTransactions(10, dropList, fromWallet);
		const signers = [fromWallet];

		const transactionResults = await sendTransactions(connection, transactions, signers);
		
		const addressToSignatureMap = {};
		transactionResults.forEach(result => {
			addressToSignatureMap[result.address] = result.signature;
		});

		return JSON.stringify(addressToSignatureMap);
	} catch (error) {
		return JSON.stringify({ error: error.message });
	}
}

const jsonData = process.argv[2];
const keypairPath = process.argv[3];

main(jsonData, keypairPath)
	.then(result => console.log(result))
	.catch(console.error);