import requests
import os
from datetime import datetime
from message import send_to_discord, send_info
import time
import json
import asyncio
import csv
from decimal import Decimal

def clear_file(file_path):
	try:
		os.remove(file_path)
		#print(f"File {file_path} has been deleted.")
	except FileNotFoundError:
		print(f"File {file_path} not found.")
	except PermissionError:
		print(f"Permission denied: Unable to delete {file_path}.")
	except Exception as e:
		print(f"An error occurred while trying to delete {file_path}: {e}")

def update_fighter_stats(winner, loser, headers):
	requests.put(f'http://backend:8000/api/fighters/update_elo/',
				json={"winner_id": winner["f_id"], "loser_id": loser["f_id"]},
				headers=headers).raise_for_status()
	requests.put(f'http://backend:8000/api/fighters/update_fighter/',
				json={"f_id": winner["f_id"], "win": True}, headers=headers).raise_for_status()
	requests.put(f'http://backend:8000/api/fighters/update_fighter/',
				json={"f_id": loser["f_id"], "win": False}, headers=headers).raise_for_status()

def handle_bets_open(red_fighter, blue_fighter, headers):
	response_red, response_blue, match = None, None, None
	try:
		response_red = requests.post('http://backend:8000/api/fighters/', json={"name": red_fighter.replace(" ", "_")}, headers=headers)
		response_red.raise_for_status()
		response_blue = requests.post('http://backend:8000/api/fighters/', json={"name": blue_fighter.replace(" ", "_")}, headers=headers)
		response_blue.raise_for_status()
		fighter_red = response_red.json()
		fighter_blue = response_blue.json()
		response_match = requests.post('http://backend:8000/api/matches/',
									   json={"red_id": fighter_red["f_id"], "blue_id": fighter_blue["f_id"]},
									   headers=headers)
		response_match.raise_for_status()
		match = response_match.json()
		return fighter_red, fighter_blue, match
	except Exception as e:
		message = []
		message.append("db: bet phase: red: ")
		if response_red:
			message.append(f"{response_red.json()}")
		else:
			message.append(f"{red_fighter}")
		if response_blue:
			message.append(f" - blue: {response_blue.json()}")
		else:
			message.append(f" - blue: {blue_fighter}")
		message.append(f" {e}")
		send_to_discord(f" {json.dumps(message, indent=4)} {e}")
		return None, None, None

def handle_bets_locked(headers, match):
    try:
        m_id = match["m_id"]
        time.sleep(1)
        response = requests.get(f'http://backend:8000/api/bets/bets_volume/?m_id={m_id}', headers=headers)
        response.raise_for_status()
        data = response.json()
        
        total_red = data['total_red']
        total_blue = data['total_blue']
        total_bets = data['debug_info']['total_bets']
        
        
        return total_red, total_blue
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching bets volume: {e}")
        return 0, 0

def handle_wins(phase, fighter_red, fighter_blue, current_time, match, headers):
	duration = datetime.now() - current_time
	duration_str = f"{duration.total_seconds() // 3600:02.0f}:{(duration.total_seconds() % 3600) // 60:02.0f}:{duration.total_seconds() % 60:02.0f}"
	winner, _, _ = phase["text"].partition("wins!")
	winner = winner.strip()
	try:
		if winner == fighter_red["name"].replace("_", " "):
			winner = fighter_red
			loser = fighter_blue
		else:
			winner = fighter_blue
			loser = fighter_red
		update_fighter_stats(winner, loser, headers)
		requests.put(f'http://backend:8000/api/matches/update_match/',
					 json={"match": match["m_id"], "winner": winner["f_id"], "duration": duration_str}, headers=headers).raise_for_status()
	except requests.exceptions.RequestException as e:
		send_to_discord(f"db: win phase: red: {fighter_red} - blue: {fighter_blue} - match: {match} - winner: {winner} - duration: {duration_str} - {e}")
	except Exception as e:
		send_to_discord(f"db: Unexpected error: {e}")

def handle_payout(headers, match, info):
    file_path = '/app/history/last_match.json'
    start_time = time.time()
    timeout = 30
    while True:
        if time.time() - start_time > timeout:
            print("scraper: Payout request timed out after 30 seconds")
            return
        try:
            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                time.sleep(0.5)
                continue

            time.sleep(1)

            with open(file_path, 'r') as file:
                data = json.load(file)
            
            
            if not data or not isinstance(data, list):
                time.sleep(0.5)
                continue

            # Vérification de la structure des données
            for item in data:
                required_fields = ['user_address', 'payout', 'bet_id']
                missing_fields = [field for field in required_fields if field not in item]
                if missing_fields:
                    raise ValueError(f"Missing required fields: {missing_fields} in item: {item}")
                
                # S'assurer que payout est une chaîne de caractères
                if 'payout' in item:
                    item['payout'] = str(item['payout'])  # Convertir en string au lieu de float
                if 'referrer_royalty' in item:
                    item['referrer_royalty'] = str(item['referrer_royalty'])  # Aussi pour referrer_royalty

            bet_response = requests.put(
                'http://backend:8000/api/bets/bet_payout/',
                json=data, 
                headers=headers, 
                timeout=10
            )
            bet_response.raise_for_status()
            
            # Ajout d'un délai entre les requêtes
            time.sleep(0.5)
            
            
            user_response = requests.put(
                'http://backend:8000/api/users/user_payout/',
                json=data, 
                headers=headers, 
                timeout=10
            )
            
            # Log de la réponse en cas d'erreur
            if user_response.status_code != 200:
                print("User payout error response:", user_response.text)
            
            user_response.raise_for_status()
            print("Payout successful")
            
            asyncio.run(send_info(info, match["m_id"], headers))
            clear_file(file_path)
            return
            
        except ValueError as e:
            send_to_discord(f"scraper: Data validation error: {str(e)}")
            return
        except requests.RequestException as e:
            send_to_discord(f"scraper: API Error during payout: {str(e)}\nResponse: {e.response.text if hasattr(e, 'response') else 'No response text'}")
            return
        except Exception as e:
            send_to_discord(f"scraper: Unexpected error during payout: {str(e)}")
            return

def process_match_history(file_path):
	processed_data = []
	with open(file_path, 'r') as file:
		csv_reader = csv.DictReader(file)
		for row in csv_reader:
			try:
				processed_bet = {
					'bet_id': row['bet_id'],
					'payout': float(Decimal(row['payout'])),
					'valid_hash': row['valid_hash'],
					'invalid_match': row.get('invalid_match') if row.get('invalid_match') != '' else None
				}
				processed_data.append(processed_bet)
			except KeyError as e:
				print(f"Missing key in CSV row: {e}")
			except ValueError as e:
				print(f"Error converting value in CSV row: {e}")
	return processed_data

def handle_match_history(file_path, headers):
	processed_data = process_match_history(file_path)
	if processed_data:
		try:
			history = json.loads(json.dumps(processed_data))
			response = requests.put('http://backend:8000/api/bets/bet_payout/',
									json=history, headers=headers)
			response.raise_for_status()
			print("Bet payout processed successfully")
			response = requests.put('http://backend:8000/api/users/user_totals/',
									headers=headers)
			response.raise_for_status()
			print("User totals updated successfully")
		except json.JSONDecodeError as e:
			print(f"Error creating valid JSON: {e}")
		except requests.RequestException as e:
			print(f"Error sending processed data to API: {e}")
	else:
		print("No valid data found in match history")