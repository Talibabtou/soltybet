import requests
import logging
from scrape import FirefoxDriverManager, wait_next_phase
from time import sleep
from message import send_to_discord
from compute import compute_bets, compute_payouts
from utils import load_bets, determine_winning_team, is_invalid_match, save_match_history, save_last_match, get_current_block_id
from payouts import process_payouts
from gate import set_gate_state
from config import load_config
import subprocess

class MatchContext:
	def __init__(self):
		self.bets_df = None
		self.current_phase = None
		self.invalid_match = False
		self.config = load_config()
		self.block_ids = [None, None]

logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s - %(levelname)s - %(funcName)s - %(message)s'
)

def handle_bets_open(context: MatchContext):
	"""Handle the bets open phase."""
	context.bets_df = None
	context.invalid_match = False

	set_gate_state("open", context.config)
	context.block_ids[0] = get_current_block_id()
	logging.info("Current block ID at bets open: %d", context.block_ids[0])
	result = subprocess.run(['node', '/javascript/buttonSimulation.js', '/run/secrets/keypair'], capture_output=True, text=True)
	logging.info("Simulation result: %s", result.stdout)

def handle_bets_locked(context: MatchContext):
    """Handle the bets locked phase."""
    set_gate_state("close", context.config)
    context.block_ids[1] = get_current_block_id()
    logging.info("Fetching bets between blocks %d and %d", context.block_ids[0], context.block_ids[1])
    context.bets_df = load_bets(context.block_ids[0], context.block_ids[1])
    
    if context.bets_df is None or context.bets_df.empty:
        logging.info("No bets to process.")
        context.bets_df = None
        return

    context.bets_df, context.invalid_match = compute_bets(context.bets_df)
    if context.invalid_match:
        context = handle_invalid_match(context)

def handle_match_over(phase_text: str, context: MatchContext):
	"""Handle the match over phase."""
	winning_team = determine_winning_team(phase_text)
	logging.info("handle match: %s", context.bets_df)
	if context.bets_df is None or context.bets_df.empty:
		return

	if is_invalid_match(context.bets_df, phase_text, context.current_phase):
		context.invalid_match = True
		return handle_invalid_match(context)

	context.bets_df = compute_payouts(context.bets_df, winning_team, context.invalid_match)
	process_payouts(context.bets_df, context.config)
	save_match_history(context.bets_df, context.invalid_match)
	save_last_match(context.bets_df, context.invalid_match)
	context.bets_df = None

def handle_invalid_match(context: MatchContext):
	"""Handle the invalid match phase."""
	logging.info("Handling invalid match, refunding bets.")
	if context.bets_df is None:
		logging.info("No bets to process for invalid match.")
		return

	context.bets_df['payout'] = context.bets_df['initial_amount_bet']
	process_payouts(context.bets_df, context.config)
	save_match_history(context.bets_df, context.invalid_match)
	save_last_match(context.bets_df, context.invalid_match)
	context.bets_df = None

def handle_phase(phase_text: str, context: MatchContext) -> MatchContext:
	"""Handle the current phase of the match."""
	phase_handlers = {
		"Bets are OPEN!": handle_bets_open,
		"Bets are locked": handle_bets_locked,
		"wins!": lambda ctx: handle_match_over(phase_text, ctx),
	}

	if context.bets_df is not None and is_invalid_match(context.bets_df, phase_text, context.current_phase):
		context.invalid_match = True
		return handle_invalid_match(context)

	for phase_keyword, handler in phase_handlers.items():
		if phase_keyword in phase_text:
			handler(context)
			context.current_phase = phase_keyword
	return context

def main():
	retry_delay = 20
	while True:
		try:
			driver = FirefoxDriverManager.get_instance()
			phase = {"text": None, "path": '/html/body/div/div[4]/div/span[2]'}
			context = MatchContext()
			while phase["text"] is None or "Bets are OPEN!" not in phase["text"]:
				phase["text"] = wait_next_phase(driver, phase["path"], phase["text"])
			while True:
				try:
					if context is None:
						logging.error("Context is None. Reinitializing context.")
						context = MatchContext()

					if phase["text"] != context.current_phase:
						context = handle_phase(phase["text"], context)
						if context.bets_df is not None:
							logging.info("Current bets_df state:\n%s", context.bets_df)
					phase["text"] = wait_next_phase(driver, phase["path"], phase["text"])
				except Exception as e:
					send_to_discord(f"main: Unexpected error: {e}")
					logging.error("Unexpected error: %s", e)
					sleep(60)
		except Exception as e:
			send_to_discord(f"main: Critical error: {e}")
			logging.error("Critical error: %s", e)
			print(f"Retrying in {retry_delay} seconds...")
			sleep(retry_delay)

if __name__ == "__main__":
	print("Starting main")
	logging.info("Starting main")
	main()