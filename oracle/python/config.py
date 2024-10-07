import json
import logging
from webhook_handler import WebhookHandler, read_secret

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

def setup_logger():
    discord_hooks = read_secret('discord')
    
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

    for level in ['info', 'warning', 'error']:
        webhook_url = discord_hooks.get(level, {}).get('hook')
        if webhook_url:
            webhook_handler = WebhookHandler(webhook_url)
            webhook_handler.setLevel(getattr(logging, level.upper()))
            logger.addHandler(webhook_handler)

    return logger

logger = setup_logger()