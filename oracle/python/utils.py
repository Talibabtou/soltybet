import pandas as pd
import subprocess
import json
import logging
import time
import os

def get_current_block_id():
	result = subprocess.run(['node', 'javascript/getBlock.js'], capture_output=True, text=True)
	if result.returncode != 0:
		logging.error("Failed to get current block ID: %s", result.stderr)
		return None
	return int(result.stdout.strip())

def load_bets(open_timestamp: int, close_timestamp: int) -> pd.DataFrame:
	"""Load bets from the blockchain within the given timestamps."""
	try:
		result = subprocess.run(
			['node', 'javascript/fetch.js', str(open_timestamp), str(close_timestamp)],
			capture_output=True,
			text=True
		)
		output = result.stdout.strip()
		logging.info("fetch.js output: %s", output)
		if not output:
			logging.error("No output from fetch.js")
			return None

		bets = json.loads(output)

		if isinstance(bets, dict) and 'error' in bets:
			logging.error("Error from fetch.js: %s", bets['error'])
			return None

		bets_df = pd.DataFrame(bets, columns=['bet_id', 'user_address', 'initial_amount_bet', 'team', 'referrer_address'])
		logging.info("Loaded bets data from blockchain.")
		return bets_df
	except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
		logging.error("Failed to fetch bets: %s", e)
		return None

def both_teams_bet(bets_df: pd.DataFrame) -> bool:
	"""Check if both teams have betted."""
	if bets_df is None:
		return False

	expected_teams = ['red', 'blue']
	team_totals = bets_df.groupby('team')['amount_bet'].sum()
	for team in expected_teams:
		if team not in team_totals or team_totals[team] == 0:
			return False
	return True

def is_invalid_match(bets_df: pd.DataFrame, phase_text: str, current_phase: str) -> bool:
	"""Check if the match is invalid based on bets data and phase transitions."""
	if bets_df is None:
		return True

	if not both_teams_bet(bets_df):
		logging.warning("Invalid match detected: one or both teams have no bets.")
		return True

	valid_transitions = {
		None: "Bets are OPEN!",
		"Bets are OPEN!": "Bets are locked",
		"Bets are locked": "wins!",
		"wins!": "Bets are OPEN!"
	}

	for phase_keyword in valid_transitions.values():
		if phase_keyword in phase_text:
			if valid_transitions.get(current_phase) != phase_keyword:
				logging.warning("Invalid phase transition detected: %s -> %s", current_phase, phase_keyword)
				return True

	return False

def determine_winning_team(phase_text: str) -> str:
	"""Determine the winning team from the phase text."""

	if "Team Red" in phase_text:
		return 'red'
	elif "Team Blue" in phase_text:
		return 'blue'
	return None

def save_match_history(match_df: pd.DataFrame, invalid_match: bool, file_path: str = '/app/history/match_history.csv'):
	"""Save match history to a CSV file without empty lines between matches."""
	if match_df.empty:
		logging.info("No match history to save.")
		return

	if not match_df.empty and match_df.notna().any().any():
		file_exists = os.path.isfile(file_path)

		match_df['invalid_match'] = invalid_match

		default_values = {'bet_id': '', 'referrer_address': '', 'contribution_rate': 0.0, 'referrer_royalty': 0.0, 'house_fee': 0.0, 'valid_hash': ''}
		for col, default_value in default_values.items():
			match_df[col] = match_df.get(col, default_value)

		float_columns = ['amount_bet', 'initial_amount_bet', 'contribution_rate', 'payout', 'referrer_royalty', 'house_fee']
		match_df[float_columns] = match_df[float_columns].round(5)

		match_df = match_df[['bet_id', 'user_address', 'amount_bet', 'initial_amount_bet', 'team', 
							 'contribution_rate', 'payout', 'valid_hash', 'referrer_address', 'referrer_royalty', 'house_fee', 'invalid_match']]
		
		logging.info("Current bets_df state:\n%s", match_df)

		mode = 'a' if file_exists else 'w'
		match_df.to_csv(file_path, mode=mode, header=not file_exists, index=False)
		logging.info("Match history saved to %s", file_path)

def save_last_match(match_df: pd.DataFrame, invalid_match: bool, file_path: str = '/app/history/last_match.json'):
	"""Save the last match results to a JSON file, including validity status."""
	if match_df.empty:
		logging.info("No last match data to save.")
		with open(file_path, 'w') as json_file:
			json.dump([], json_file)
		return
	
	if not match_df.empty and match_df.notna().any().any():
		for col in ['referrer_address', 'referrer_royalty', 'valid_hash']:
			if col not in match_df.columns:
				match_df[col] = None
		for col in ['contribution_rate', 'house_fee']:
			if col not in match_df.columns:
				match_df[col] = 0

		float_columns = ['payout', 'referrer_royalty', 'house_fee']
		match_df[float_columns] = match_df[float_columns].round(5)

		last_match_data = match_df[['bet_id', 'user_address', 'payout', 'valid_hash','referrer_address', 'referrer_royalty']].copy()
		last_match_data['invalid_match'] = invalid_match

		match_data = last_match_data.to_dict(orient='records')

		match_data = [{k: (v if pd.notna(v) else None) for k, v in record.items()} for record in match_data]

		with open(file_path, 'w') as json_file:
			json.dump(match_data, json_file)
		logging.info("Last match results saved to %s", file_path)