import requests
import asyncio
import json
import os
from datetime import datetime
from scrape import FirefoxDriverManager, wait_next_phase
from db import handle_bets_open, handle_wins, handle_payout, handle_bets_locked, handle_match_history
from time import sleep
from auth_token import check_and_refresh_token, initialize_token
from message import send_to_discord, send_phase
from concurrent.futures import ProcessPoolExecutor
import sys

def main():
    retry_delay = 20
    while True:
        try:
            driver = FirefoxDriverManager.get_instance()
            phase = {"text": None, "path": '/html/body/div/div[4]/div/span[2]'}
            while (phase["text"] is None or "Bets are OPEN!" not in phase["text"]):
                try:
                    phase["text"] = wait_next_phase(driver, phase["path"], phase["text"])
                    if phase["text"] is None:
                        element = driver.find_element_by_xpath(phase["path"])
                        phase["text"] = element.text
                except Exception as e:
                    print(f"Error while waiting for next phase: {e}")
                    sleep(2)
            token_data, token_expiry, headers = initialize_token()
            match_history_file = '/app/history/match_history.csv'
            if os.path.exists(match_history_file):
                handle_match_history(match_history_file, headers)
            current_time = None
            fighter_red, fighter_blue, match, total_blue, total_red = None, None, None, None, None
            with ProcessPoolExecutor() as executor:
                while True:
                    try:
                        token_data, token_expiry, headers = check_and_refresh_token(token_data, token_expiry, headers)
                        if "Bets are OPEN!" in phase["text"]:
                            fighter_red, fighter_blue, match = handle_bets_open(driver, headers)
                            if fighter_red and fighter_blue:
                                asyncio.run(send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers))
                        elif "Bets are locked" in phase["text"]:
                            current_time = datetime.now()
                            total_blue, total_red = handle_bets_locked(headers, match)
                            if total_red == 0 and total_blue > 0 or total_red > 0 and total_blue == 0:
                                futures = executor.submit(handle_payout, headers, match, "Refund")
                            if fighter_red and fighter_blue:
                                asyncio.run(send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers))
                        elif "wins!" in phase["text"]:
                            if fighter_red and fighter_blue and current_time and match:
                                handle_wins(phase, fighter_red, fighter_blue, current_time, match, headers)
                            asyncio.run(send_phase(phase, fighter_red, fighter_blue, total_blue, total_red, match, headers))
                            futures = executor.submit(handle_payout, headers, match, "Payout")
                        phase["text"] = wait_next_phase(driver, phase["path"], phase["text"])

                    except requests.exceptions.RequestException as e:
                        send_to_discord(f"main: API request: {e}")
                        sleep(60)
                    except Exception as e:
                        while phase["text"] == None or "Bets are OPEN!" not in phase["text"]:
                            phase["text"] = wait_next_phase(driver, phase["path"], phase["text"])
                        send_to_discord(f"main: Unexpected error: {e}")
                        sleep(60)
        except Exception as e:
            send_to_discord(f"main: Critical error: {e}")
            print(f"Retrying in {retry_delay} seconds...")
            sleep(retry_delay)

if __name__ == "__main__":
    main()