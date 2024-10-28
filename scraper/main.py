import asyncio
import websockets
import re
from db import handle_bets_open, handle_bets_locked, handle_wins, handle_payout
from auth_token import check_and_refresh_token, initialize_token
from message import send_phase, send_to_discord
from concurrent.futures import ProcessPoolExecutor
import time
from datetime import datetime
TWITCH_WS_URL = 'wss://irc-ws.chat.twitch.tv:443'
NICK = 'justinfan12345'
TARGET_ROOM_ID = '43201452'
TARGET_USER_ID = '55853880'
CHANNEL_NAME = 'saltybet'
user = 'scrap'
secret_file = 'scraper_pass'


async def twitch_chat_listener():
	token_data, token_expiry, headers = initialize_token(user, secret_file)
	current_time = None
	fighter_red, fighter_blue, match, total_blue, total_red = None, None, None, None, None
	phase = {"text": None}
	sync_time = False

	while True:
		try:
			async with websockets.connect(TWITCH_WS_URL) as websocket:
				await websocket.send(f'NICK {NICK}')
				await websocket.send(f'CAP REQ :twitch.tv/tags twitch.tv/commands')
				await websocket.send(f'JOIN #{CHANNEL_NAME}')
				print(f"Joining channel: #{CHANNEL_NAME}")

				with ProcessPoolExecutor() as executor:
					while True:
						try:
							token_data, token_expiry, headers = check_and_refresh_token(token_data, token_expiry, headers, user, secret_file)
							print(f"Updated token expiry: {token_expiry}")
							
							message = await asyncio.wait_for(websocket.recv(), timeout=30)
							
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
										print(f"Target message: {username}: {msg}")
										if "Bets are OPEN" in msg:
											sync_time = True
											total_blue, total_red = None, None
											await send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers)
											phase["text"] = "Bets are OPEN!"
											red_fighter = re.search(r'for (.*?) vs', msg)
											blue_fighter = re.search(r'vs (.*?)!', msg)
											if red_fighter and blue_fighter:
												red_fighter = red_fighter.group(1)
												blue_fighter = blue_fighter.group(1)
												fighter_red, fighter_blue, match = handle_bets_open(red_fighter, blue_fighter, headers)
												if fighter_red and fighter_blue:
													await send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers)
										elif "Bets are locked" in msg and sync_time:
											phase["text"] = "Bets are locked"
											current_time = datetime.now()
											time.sleep(0.5)
											total_blue, total_red = handle_bets_locked(headers, match)
											if total_red == 0 and total_blue > 0 or total_red > 0 and total_blue == 0:
												executor.submit(handle_payout, headers, match, "Refund")
											if fighter_red and fighter_blue:
												await send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers)
										elif "wins!" in msg and sync_time:
											truncated_msg = msg.split('.')[0] + '.'
											phase["text"] = truncated_msg
											if fighter_red and fighter_blue and current_time and match:
												handle_wins(phase, fighter_red, fighter_blue, current_time, match, headers)
											await send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers)
											executor.submit(handle_payout, headers, match, "Payout")

						except asyncio.TimeoutError:
							print("No message received, sending PING")
							await websocket.send('PING :tmi.twitch.tv')
						except websockets.exceptions.ConnectionClosed:
							print("WebSocket connection closed. Reconnecting...")
							await send_to_discord(f": WebSocket connection closed. Reconnecting...{e}")
							break
						except Exception as e:
							print(f"Error processing message: {e}")
							await send_to_discord(f"Error in twitch_chat_listener: {e}")
							
		except websockets.exceptions.WebSocketException as e:
			print(f"WebSocket error: {e}. Reconnecting in 5 seconds...")
			await send_to_discord(f"WebSocket error: {e}. Reconnecting in 5 seconds...")
			await asyncio.sleep(5)
		except Exception as e:
			print(f"Unexpected error: {e}. Reconnecting in 10 seconds...")
			await send_to_discord(f"Unexpected error: {e}. Reconnecting in 10 seconds...")
			await send_to_discord(f"Unexpected error in twitch_chat_listener: {e}")
			await asyncio.sleep(10)


async def main():
	retry_delay = 20
	while True:
		try:
			print(f"Connecting to Twitch chat room {TARGET_ROOM_ID}")
			print(f"Listening for messages from user {TARGET_USER_ID}")
			await twitch_chat_listener()
		except Exception as e:
			error_message = f"An error occurred: {e}"
			print(error_message)
			await send_to_discord(error_message)
			print(f"Retrying in {retry_delay} seconds...")
			await asyncio.sleep(retry_delay)

if __name__ == "__main__":
	retry_delay = 20
	while True:
		try:
			asyncio.run(main())
		except Exception as e:
			error_message = f"Critical error in main loop: {e}"
			print(error_message)
			try:
				asyncio.run(send_to_discord(error_message))
			except:
				print("Failed to send error message to Discord")
			print(f"Restarting the entire script in {retry_delay} seconds...")
			time.sleep(retry_delay)