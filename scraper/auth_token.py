import requests
from datetime import datetime, timedelta
from time import sleep
from message import send_to_discord

def initialize_token():
    token_data = None
    token_expiry = None
    while not token_data:
        token_data = get_access_token()
        if token_data:
            token_expiry = datetime.now() + timedelta(minutes=4)
        else:
            send_to_discord("auth_token: Failed to obtain token. Retrying in 20 seconds.")
            sleep(20)
    headers = {
        'Authorization': f'Bearer {token_data['access']}',
        'Content-Type': 'application/json',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'"
        }
    return token_data, token_expiry, headers

def get_access_token():
    try:
        with open('/run/secrets/scraper_pass', 'r') as secret_file:
            scraper_password = secret_file.read().strip()
        print(scraper_password)
        response = requests.post('http://backend:8000/api/token/', data={'username': 'scrap', 'password': scraper_password})
        response.raise_for_status()
        return response.json()
    except FileNotFoundError:
        send_to_discord("auth_token: Failed to read scraper_pass secret")
        return None
    except requests.exceptions.RequestException as e:
        send_to_discord(f"auth_token: failed obtaining token: {e}")
        return None
    except Exception as e:
        send_to_discord(f"db: Unexpected error token: {e}")
        return None

def refresh_token(refresh_token):
    try:
        response = requests.post('http://backend:8000/api/token/refresh/', json={'refresh': refresh_token})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        send_to_discord(f"auth_token: failed refreshing token: {e}")
        return None
    except Exception as e:
        send_to_discord(f"db: Unexpected error token: {e}")
        return None

def check_and_refresh_token(token_data, token_expiry, headers):
    if datetime.now() >= token_expiry - timedelta(minutes=30):
        token_data = refresh_token(token_data['refresh'])
        if token_data:
            token_expiry = datetime.now() + timedelta(minutes=15)
        else:
            token_data = get_access_token()
            if token_data:
                token_expiry = datetime.now() + timedelta(minutes=15)
            else:
                raise Exception('Token: Failed to obtain new token')
        headers = {
              'Authorization': f'Bearer {token_data['access']}',
              'Content-Type': 'application/json',
              'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'"
              }
    return token_data, token_expiry, headers