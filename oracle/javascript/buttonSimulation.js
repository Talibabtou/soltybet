import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction, Keypair } from '@solana/web3.js';
import { sha256 } from "@noble/hashes/sha256";
import { Buffer } from 'buffer';
import fs from 'fs';
import { loadConfig } from './config.js';

const config = loadConfig();

const sighash = (nameSpace, ixName) => {
	const preimage = `${nameSpace}:${ixName}`;
	return Buffer.from(sha256(preimage)).subarray(0, 8);
};

const loadKeypair = (path) => {
	const secretKeyString = fs.readFileSync(path, 'utf8');
	const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
	return Keypair.fromSecretKey(secretKey);
};

const checkBalance = async (connection, publicKey) => {
	const balance = await connection.getBalance(publicKey);
	console.log(`Balance for ${publicKey.toBase58()}: ${balance} lamports`);
	return balance;
};

const handleBet = async (color, betAmount, keypair, recipientPublicKey) => {
	try {
		const connection = new Connection(config.rpc_url, 'confirmed');
		const amountInLamports = Math.floor(betAmount * 1e9);

		const balance = await checkBalance(connection, keypair.publicKey);
		if (balance < amountInLamports) {
			throw new Error(`Insufficient funds: ${balance} lamports`);
		}

		const messageData = {
			color: color,
			fighterName: color === 'red' ? 'Red Fighter' : 'Blue Fighter',
			referrerWallet: null,
			b_id: 'placeholder_bet_id'
		};

		const message = JSON.stringify(messageData);

		const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
		const memoInstruction = new TransactionInstruction({
			keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
			programId: memoProgram,
			data: Buffer.from(message, 'utf-8'),
		});

		const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

		const programId = new PublicKey(config.deposit_gate_address);
		const [gatePDA] = PublicKey.findProgramAddressSync(
			[Buffer.from("deposit_gate")],
			programId
		);

		const ixDiscriminator = sighash('global', 'check_gate');

		const checkGateIx = new TransactionInstruction({
			programId: programId,
			keys: [
				{ pubkey: gatePDA, isSigner: false, isWritable: false },
			],
			data: Buffer.concat([ixDiscriminator, Buffer.alloc(0)])
		});

		const transaction = new Transaction({
			feePayer: keypair.publicKey,
			blockhash: blockhash,
			lastValidBlockHeight: lastValidBlockHeight,
		})
		.add(checkGateIx)
		.add(memoInstruction)
		.add(
			SystemProgram.transfer({
				fromPubkey: keypair.publicKey,
				toPubkey: recipientPublicKey,
				lamports: amountInLamports,
			})
		);

		transaction.sign(keypair);
		const signature = await connection.sendRawTransaction(transaction.serialize());

		const confirmation = await connection.confirmTransaction({
			blockhash: blockhash,
			lastValidBlockHeight: lastValidBlockHeight,
			signature: signature
		});

		if (confirmation.value.err) {
			throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
		}

		console.log("Transaction successful:", signature);

		const timestamp = Math.floor(Date.now() / 1000);
		console.log(`Transaction timestamp: ${timestamp}`);

		return signature;

	} catch (error) {
		console.error("Transaction failed", error);
		return null;
	}
};


const simulateTransactions = async (keypairPath, oracleWalletPath) => {
	const betAmount = 0.1;
	const keypair = loadKeypair(keypairPath);
	const oracleKeypair = loadKeypair(oracleWalletPath);
	const recipientPublicKey = oracleKeypair.publicKey;

	const redSignature = await handleBet('red', betAmount, keypair, recipientPublicKey);
	const blueSignature = await handleBet('blue', betAmount, keypair, recipientPublicKey);

	return { redSignature, blueSignature };
};

const keypairPath = process.argv[2];
const oracleWalletPath = config.oracle_wallet;

simulateTransactions(keypairPath, oracleWalletPath).then((result) => {
	console.log("Simulation result:", result);
	process.exit(0);
}).catch((error) => {
	console.error("Simulation failed:", error);
	process.exit(1);
});
