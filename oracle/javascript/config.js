import fs from 'fs';

export function loadConfig() {
	const rawData = fs.readFileSync('config.json');
	return JSON.parse(rawData);
}

const config = loadConfig();
export const priority_fee = config.priority_fee;
export const house_wallet = config.house_wallet;
export const oracle_wallet = config.oracle_wallet;
export const rpc_url = config.rpc_url;
export const deposit_gate_address = config.deposit_gate_address;