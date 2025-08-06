from config import logger
import pandas as pd
from utils import both_teams_bet

def apply_ref_royalties(row):
	"""Apply referrer royalties to the bet."""
	if pd.notna(row['referrer_address']):
		row['referrer_royalty'] = row['initial_amount_bet'] * 0.005
		row['amount_bet'] -= row['referrer_royalty']
	return row

def calculate_house_fee(row):
	"""Calculate house fee based on referrer status."""
	house_fee = row['payout'] * 0.03 if pd.notna(row['referrer_address']) else row['payout'] * 0.04
	return house_fee

def compute_bets(bets_df: pd.DataFrame):
	"""Process bets to apply referrer royalties and calculate contribution rates."""
	#logger.info("compute_bets: %s", bets_df)
	if bets_df.empty:
		return bets_df, False
	bets_df['amount_bet'] = bets_df['initial_amount_bet']
	if not both_teams_bet(bets_df):
		bets_df['payout'] = bets_df['amount_bet']
		return bets_df, True
	bets_df = bets_df.apply(apply_ref_royalties, axis=1)
	team_totals = bets_df.groupby('team')['amount_bet'].sum()
	bets_df['contribution_rate'] = bets_df['amount_bet'] / bets_df['team'].map(team_totals)
	return bets_df, False

def compute_payouts(bets_df, winning_team, is_invalid):
	"""Process payouts based on the winning team and calculate house fees."""
	if bets_df.empty:
		return bets_df, False
	team_totals = bets_df.groupby('team')['amount_bet'].sum()
	bets_df['payout'] = bets_df.get('payout', 0.0)
	if winning_team not in team_totals:
		logger.error("Match is over without a winner, funds will be refunded to bettors")
		return bets_df
	total_bets = team_totals.sum()
	bets_df['payout'] = bets_df.apply(lambda row: 
		(row['contribution_rate'] * total_bets).round(5) if row['team'] == winning_team else 0.0, axis=1)
	if not is_invalid:
		bets_df['house_fee'] = bets_df.apply(calculate_house_fee, axis=1)
		bets_df['payout'] -= bets_df['house_fee']
	else:
		bets_df['house_fee'] = 0.0
	current_house_fee = bets_df['house_fee'].sum()
	logger.info("Total house fee collected during the match: %s", current_house_fee)
	return bets_df