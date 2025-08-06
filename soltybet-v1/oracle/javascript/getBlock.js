import { Connection } from '@solana/web3.js';
import { loadConfig } from './config.js';

const config = loadConfig();

const printCurrentBlockId = async () => {
	const connection = new Connection(config.rpc_url, 'confirmed');
	const maxRetries = 5;
	const baseDelay = 100;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const currentSlot = await connection.getSlot();
			if (currentSlot) {
				console.log(currentSlot.toString());
				return;
			}
		} catch (error) {
			const delay = baseDelay * Math.pow(2, attempt);
			console.error(`Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}`);
			if (attempt < maxRetries - 1) {
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	console.error('Failed to get current block ID after all retries');
	process.exit(1);
};

printCurrentBlockId();
