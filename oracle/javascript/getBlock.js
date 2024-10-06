import { Connection } from '@solana/web3.js';
import { loadConfig } from './config.js';

const config = loadConfig();

const printCurrentBlockId = async () => {
	const connection = new Connection(config.rpc_url, 'confirmed');

	try {
		const currentSlot = await connection.getSlot();
		console.log(`${currentSlot}`);
	} catch (error) {
		console.error('Failed to get current block ID:', error);
	}
};

printCurrentBlockId();