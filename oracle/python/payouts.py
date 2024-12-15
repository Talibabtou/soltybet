import pandas as pd
import subprocess
import json
from config import logger

def parse_payouts(bets_df, config):
	"""Parse payouts from the bets DataFrame and prepare a JSON object for transactions."""
	payouts = {}
	for _, row in bets_df.iterrows():
		user_address = row['user_address']
		payout = row['payout']
		referrer = row.get('referrer_address')
		ref_royalty = row.get('referrer_royalty', 0)
		payouts[user_address] = payouts.get(user_address, 0) + payout
		if pd.notna(referrer) and ref_royalty > 0:
			payouts[referrer] = payouts.get(referrer, 0) + ref_royalty
	if 'house_fee' in bets_df.columns:
		house_fee_total = bets_df['house_fee'].sum()
		payouts[config['house_wallet']] = payouts.get(config['house_wallet'], 0) + house_fee_total
	for address in payouts:
		payouts[address] -= config['priority_fee']
	transactions = [{"walletAddress": address, "numSOL": int(amount * 1e9)} for address, amount in payouts.items() if amount > 0]
	return json.dumps(transactions)

def update_with_valid_hash(bets_df, json_output):
	"""Update the bets DataFrame with valid_hash based on user_address."""
	try:
		transaction_results = json.loads(json_output)
	except (ValueError, json.JSONDecodeError) as e:
		print("Error parsing JSON output:", e)
		return
	for index, row in bets_df.iterrows():
		user_address = row['user_address']
		payout = row['payout']
		if user_address in transaction_results and payout > 0:
			bets_df.at[index, 'valid_hash'] = transaction_results[user_address]
		else:
			bets_df.at[index, 'valid_hash'] = None

def process_payouts(bets_df, config):
	"""Process payouts by calling the JavaScript function to send transactions."""
	if bets_df.empty:
		logger.debug("No bets to process for payouts.")
		return
	json_data = parse_payouts(bets_df, config)
	if not json_data:
		logger.error("Error: JSON data is empty or malformed.")
		return
	try:
		result = subprocess.run(
			['node', 'javascript/bulkSend.js', json_data, config['oracle_wallet']], 
			capture_output=True, 
			text=True,
			timeout=30
		)
		json_output = result.stdout.strip()
		logger.info(f"Raw output received: '{json_output}'")
		logger.info(f"Output type: {type(json_output)}")
		logger.info(f"Output length: {len(json_output)}")
		
		if not json_output:
			logger.error("Error: No output from JavaScript execution.")
			return
		try:
			transaction_results = json.loads(json_output)
			if isinstance(transaction_results, dict):
				update_with_valid_hash(bets_df, json_output)
				logger.info("Successfully updated transaction hashes")
			else:
				logger.error(f"Invalid transaction results format: {json_output}")
		except json.JSONDecodeError as e:
			logger.error(f"Failed to parse transaction results: {e}")
	except subprocess.TimeoutExpired:
		logger.error("Bulk send operation timed out after 5 minutes")
	except Exception as e:
		logger.error(f"Unexpected error during payout processing: {str(e)}")