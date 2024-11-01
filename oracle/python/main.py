import asyncio
import websockets
import re
import logging
from compute import compute_bets, compute_payouts
from utils import load_bets, determine_winning_team, is_invalid_match, save_match_history, save_last_match, get_current_block_id
from payouts import process_payouts
from gate import set_gate_state
from config import load_config, logger
from message import send_to_discord
import subprocess
import pandas as pd

pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

class MatchContext:
	def __init__(self):
		self.bets_df = None
		self.current_phase = None
		self.invalid_match = False
		self.config = load_config()
		self.block_ids = [None, None]

TWITCH_WS_URL = 'wss://irc-ws.chat.twitch.tv:443'
NICK = 'justinfan12345'
TARGET_ROOM_ID = '43201452'
TARGET_USER_ID = '55853880'
CHANNEL_NAME = 'saltybet'

async def twitch_chat_listener(context: MatchContext):
	while True:
		try:
			async with websockets.connect(TWITCH_WS_URL) as websocket:
				await websocket.send(f'NICK {NICK}')
				await websocket.send(f'CAP REQ :twitch.tv/tags twitch.tv/commands')
				await websocket.send(f'JOIN #{CHANNEL_NAME}')

				logger.debug(f"Joining channel: #{CHANNEL_NAME}")
				sync_time = False
				while True:
					try:
						message = await websocket.recv()
						if message.startswith('PING'):
							await websocket.send('PONG :tmi.twitch.tv')
						elif 'PRIVMSG' in message:
							username = re.search(r'display-name=([^;]+)', message)
							user_id = re.search(r'user-id=(\d+)', message)
							room_id = re.search(r'room-id=(\d+)', message)
							msg = re.search(r'PRIVMSG #\S+ :(.*)', message)
							if username and user_id and room_id and msg:
								username = username.group(1)
								user_id = user_id.group(1)
								room_id = room_id.group(1)
								msg = msg.group(1)
								if user_id == TARGET_USER_ID and room_id == TARGET_ROOM_ID:
									logger.debug(f"Target message: {username}: {msg}")
									sync_time = await handle_phase(msg, context, sync_time)
					except asyncio.exceptions.IncompleteReadError:
						logging.warning("IncompleteReadError occurred. Reconnecting...")
						send_to_discord("IncompleteReadError occurred. Reconnecting...")
						break
					except websockets.exceptions.ConnectionClosedError:
						logging.warning("IncompleteReadError occurred. Reconnecting...")
						send_to_discord("ConnectionClosedError occurred. Reconnecting...")
						break
		except Exception as e:
			logging.error(f"An error occurred: {e}. Attempting to reconnect in 5 seconds...")
			await asyncio.sleep(5)

async def handle_phase(phase_text: str, context: MatchContext, sync_time: bool):
	"""Handle the current phase of the match."""
	if "Bets are OPEN" in phase_text:
		sync_time = True
		await handle_bets_open(context)
		context.current_phase = "Bets are OPEN!"
	elif "Bets are locked" in phase_text and sync_time:
		await handle_bets_locked(context)
		context.current_phase = "Bets are locked"
	elif "wins!" in phase_text and sync_time:
		await handle_match_over(phase_text, context)
		context.current_phase = "wins!"
	return sync_time

async def handle_bets_open(context: MatchContext):
	"""Handle the bets open phase."""
	if context.bets_df is not None and not context.bets_df.empty:
		logger.warning("Unresolved bets from previous match detected. Refunding...")
		await handle_invalid_match(context)
	context.bets_df = None
	context.invalid_match = False
	context.block_ids[0] = get_current_block_id()
	set_gate_state("open", context.config)
	logger.debug("Current block ID at bets open: %d", context.block_ids[0])
	result = subprocess.run(['node', '/javascript/buttonSimulation.js', '/app/keypair.json'], capture_output=True, text=True)
	logger.debug("Simulation result: %s", result.stdout)

async def handle_bets_locked(context: MatchContext):
	"""Handle the bets locked phase."""
	set_gate_state("close", context.config)
	context.block_ids[1] = get_current_block_id()
	logger.info("Fetching bets between blocks %d and %d", context.block_ids[0], context.block_ids[1])
	context.bets_df = load_bets(context.block_ids[0], context.block_ids[1])
	if context.bets_df is None or context.bets_df.empty:
		logger.debug("No bets to process.")
		context.bets_df = None
		return
	print(f"Red volume: {context.bets_df[context.bets_df['team'] == 'red']['initial_amount_bet'].sum()}")
	print(f"Blue volume: {context.bets_df[context.bets_df['team'] == 'blue']['initial_amount_bet'].sum()}")
	context.bets_df, context.invalid_match = compute_bets(context.bets_df)
	if context.invalid_match:
		await handle_invalid_match(context)

async def handle_match_over(phase_text: str, context: MatchContext):
	"""Handle the match over phase."""
	winning_team = determine_winning_team(phase_text)
	logger.info("handle match: %s", context.bets_df)
	if context.bets_df is None or context.bets_df.empty:
		return
	if is_invalid_match(context.bets_df, phase_text, context.current_phase):
		context.invalid_match = True
		return await handle_invalid_match(context)
	context.bets_df = compute_payouts(context.bets_df, winning_team, context.invalid_match)
	process_payouts(context.bets_df, context.config)
	save_last_match(context.bets_df, context.invalid_match)
	save_match_history(context.bets_df, context.invalid_match)
	context.bets_df = None

async def handle_invalid_match(context: MatchContext):
	"""Handle the invalid match phase."""
	logger.debug("Handling invalid match, refunding bets.")
	if context.bets_df is None:
		logger.debug("No bets to process for invalid match.")
		return
	context.bets_df['payout'] = context.bets_df['initial_amount_bet']
	process_payouts(context.bets_df, context.config)
	save_last_match(context.bets_df, context.invalid_match)
	save_match_history(context.bets_df, context.invalid_match)
	context.bets_df = None

async def main():
	retry_delay = 20
	while True:
		try:
			context = MatchContext()
			await twitch_chat_listener(context)
		except Exception as e:
			send_to_discord(f"main: Critical error: {e}")
			logger.error("Critical error: %s", e)
			print(f"Retrying in {retry_delay} seconds...")
			await asyncio.sleep(retry_delay)

if __name__ == "__main__":
	print("Starting main")
	logger.debug("Starting main")
	asyncio.run(main())
