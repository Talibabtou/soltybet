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

async function fetchTransactionsWithinBlocks(startBlock, endBlock) {
	const connection = new Connection(config.rpc_url, 'confirmed');
	const oracleKeypair = loadKeypair(config.oracle_wallet);
	const oracleWallet = oracleKeypair.publicKey;

	try {
		let signatures = [];
		let before = undefined;
		const limit = 10;
		while (true) {
			const fetchedSignatures = await connection.getSignaturesForAddress(oracleWallet, { before, limit });
			if (fetchedSignatures.length === 0) break;
			signatures = signatures.concat(fetchedSignatures);
			before = fetchedSignatures[fetchedSignatures.length - 1].signature;
			if (fetchedSignatures[fetchedSignatures.length - 1].slot < startBlock) break;
		}

		const transactions = await Promise.all(
			signatures.map(async (signatureInfo) => {
				const transaction = await connection.getTransaction(signatureInfo.signature, {
					maxSupportedTransactionVersion: 0
				});
				return transaction;
			})
		);

		const filteredTransactions = transactions.filter(tx => tx && tx.slot >= startBlock && tx.slot <= endBlock);

		const bets = filteredTransactions
			.map((tx) => {
				const message = tx.transaction.message;
				const meta = tx.meta;

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
							console.error('Failed to parse memo:', e);
						}
					}
				}

				const oracleWalletIndex = message.accountKeys.findIndex((accountKey) => accountKey.equals(oracleWallet));
				const balanceIncreased = meta.postBalances[oracleWalletIndex] > meta.preBalances[oracleWalletIndex];

				if (hasCheckGateInstruction && memoData && balanceIncreased) {
					const userAddress = message.accountKeys[0].toBase58();
					const initialAmountBet = (meta.postBalances[oracleWalletIndex] - meta.preBalances[oracleWalletIndex]) / 1e9;
					const bet = {
						bet_id: memoData.b_id,
						user_address: userAddress,
						initial_amount_bet: initialAmountBet,
						team: memoData.color,
						referrer_address: memoData['referrerWallet'] || null
					};
					return bet;
				}
				return null;
			})
			.filter((bet) => bet !== null);

		return JSON.stringify(bets, null, 2);
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