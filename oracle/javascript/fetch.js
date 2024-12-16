import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import { loadConfig } from './config.js';

const config = loadConfig();

const loadKeypair = (path) => {
	const secretKeyString = fs.readFileSync(path, 'utf8');
	const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
	return Keypair.fromSecretKey(secretKey);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

async function fetchWithRetry(fn, retries = MAX_RETRIES) {
	try {
		return await fn();
	} catch (error) {
		if (retries > 0) {
			await sleep(RETRY_DELAY);
			return fetchWithRetry(fn, retries - 1);
		}
		throw error;
	}
}

async function fetchTransactionsWithinBlocks(startBlock, endBlock) {
	const connection = new Connection(config.rpc_url, 'confirmed');
	const oracleKeypair = loadKeypair(config.oracle_wallet);
	const oracleWallet = oracleKeypair.publicKey;

	try {
		let signatures = [];
		let before = undefined;
		const limit = 50;

		while (true) {
			const fetchedSignatures = await fetchWithRetry(async () => {
				return await connection.getSignaturesForAddress(oracleWallet, { before, limit });
			});
			
			if (fetchedSignatures.length === 0) break;
			signatures = signatures.concat(fetchedSignatures);
			before = fetchedSignatures[fetchedSignatures.length - 1].signature;
			if (fetchedSignatures[fetchedSignatures.length - 1].slot < startBlock) break;
		}

		const transactions = await Promise.all(
			signatures.map(async (signatureInfo) => {
				return await fetchWithRetry(async () => {
					const tx = await connection.getTransaction(signatureInfo.signature, {
						maxSupportedTransactionVersion: 0
					});
					if (!tx) {
						return null;
					}
					return tx;
				});
			})
		);

		const filteredTransactions = transactions
			.filter(tx => tx && tx.slot >= startBlock && tx.slot <= endBlock)
			.filter(tx => tx.transaction && tx.transaction.message && tx.meta);

		const bets = filteredTransactions
			.map((tx) => {
				try {
					const message = tx.transaction.message;
					const meta = tx.meta;

					if (!message || !message.accountKeys || !meta) {
						return null;
					}

					const hasCheckGateInstruction = meta.logMessages.some(
						(log) => log.includes('Instruction: CheckGate')
					);

					const memo = meta.logMessages.find(
						(log) => log.includes('Memo (len')
					);
					let memoData = null;
					if (memo) {
						const memoContent = memo.match(/Memo \(len \d+\): "(.*)"/);
						if (memoContent && memoContent[1]) {
							try {
								const unescapedMemo = memoContent[1].replace(/\\"/g, '"');
								memoData = JSON.parse(unescapedMemo);
							} catch (e) {
								return null;
							}
						}
					}

					const oracleWalletIndex = message.accountKeys.findIndex((accountKey) => accountKey.equals(oracleWallet));
					if (oracleWalletIndex === -1) {
						return null;
					}

					const balanceIncreased = meta.postBalances[oracleWalletIndex] > meta.preBalances[oracleWalletIndex];

					if (hasCheckGateInstruction && memoData && balanceIncreased) {
						return {
							bet_id: memoData.b_id,
							user_address: message.accountKeys[0].toBase58(),
							initial_amount_bet: (meta.postBalances[oracleWalletIndex] - meta.preBalances[oracleWalletIndex]) / 1e9,
							team: memoData.color,
							referrer_address: memoData['referrerWallet'] || null
						};
					}
					return null;
				} catch (error) {
					return null;
				}
			})
			.filter((bet) => bet !== null);

		return JSON.stringify(bets);
	} catch (error) {
		return JSON.stringify({ error: error.message });
	}
}

export { fetchTransactionsWithinBlocks };

const startBlock = parseInt(process.argv[2], 10);
const endBlock = parseInt(process.argv[3], 10);

fetchTransactionsWithinBlocks(startBlock, endBlock)
	.then(result => console.log(result))
	.catch(console.error);