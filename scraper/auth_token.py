import requests
from datetime import datetime, timedelta
from time import sleep
from message import send_to_discord

def initialize_token(user, secret_file):
    token_data = None
    token_expiry = None
    while not token_data:
        token_data = get_access_token(user, secret_file)
        if token_data:
            token_expiry = datetime.now() + timedelta(minutes=20)
        else:
            send_to_discord("scraper auth_token: Failed to obtain token. Retrying in 20 seconds.")
            sleep(20)
    headers = {
        'Authorization': f'Bearer {token_data['access']}',
        'Content-Type': 'application/json',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'"
        }
    return token_data, token_expiry, headers

def get_access_token(user, secret_file):
    try:
        with open(f'/run/secrets/{secret_file}', 'r') as secret_file:
            password = secret_file.read().strip()
        response = requests.post('http://backend:8000/api/token/', data={'username': user, 'password': password})
        response.raise_for_status()
        return response.json()
    except FileNotFoundError:
        send_to_discord("auth_token: Failed to read user secret")
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
        send_to_discord(f"scrap auth_token: failed refreshing token: {e}")
        return None
    except Exception as e:
        send_to_discord(f"db: Unexpected error token: {e}")
        return None

def check_and_refresh_token(token_data, token_expiry, headers, user, secret_file):
    current_time = datetime.now()
    
    # Check if token is expired or close to expiring
    if token_expiry is None or current_time >= token_expiry - timedelta(minutes=4):
        try:
            # First, try to refresh the token
            if token_data and 'refresh' in token_data:
                token_data = refresh_token(token_data['refresh'])
            
            # If refresh failed or there was no refresh token, reinitialize
            if not token_data:
                print("Token expired or refresh failed. Reinitializing...")
                token_data, token_expiry, headers = initialize_token(user, secret_file)
            else:
                token_expiry = current_time + timedelta(minutes=20)
                headers = {
                    'Authorization': f'Bearer {token_data['access']}',
                    'Content-Type': 'application/json',
                    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'"
                }
            
            if not token_data:
                raise Exception('Failed to obtain new token')
            
        except Exception as e:
            send_to_discord(f"Error refreshing/reinitializing token: {str(e)}")
            raise
    
    return token_data, token_expiry, headers