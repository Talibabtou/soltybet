import json

def load_config():
	with open('config.json', 'r') as f:
		config = json.load(f)
	return config

config = load_config()
priority_fee = config['priority_fee']
house_wallet = config['house_wallet']
oracle_wallet = config['oracle_wallet']
rpc_url = config['rpc_url']
deposit_gate_address = config['deposit_gate_address']