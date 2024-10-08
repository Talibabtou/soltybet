import requests
from datetime import datetime, timedelta
from time import sleep
from message import send_to_discord
import logging

def initialize_token(user, secret_file):
    token_data = None
    token_expiry = None
    while not token_data:
        token_data = get_access_token(user, secret_file)
        if token_data:
            token_expiry = datetime.now() + timedelta(minutes=15)
            print(f"Token expiry set to: {token_expiry}, user={user}")
        else:
            send_to_discord("initialize_token: Failed to obtain token. Retrying in 20 seconds.")
            sleep(20)
    headers = {
        'Authorization': f'Bearer {token_data["access"]}',
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
    except FileNotFoundError as e:
        send_to_discord(f"get_access_token: Failed to read user secret: {e}")
    except requests.exceptions.RequestException as e:
        send_to_discord(f"get_access_token: Failed obtaining token: {e}")
    except Exception as e:
        send_to_discord(f"get_access_token: Unexpected error: {e}")
    return None

def refresh_token(refresh_token):
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post('http://backend:8000/api/token/refresh/', 
                                 json={'refresh': refresh_token},
                                 headers=headers)
        response.raise_for_status()
        new_token_data = response.json()
        if 'access' not in new_token_data:
            raise ValueError("Refresh response doesn't contain access token")
        print("Token refreshed successfully")
        return new_token_data
    except requests.exceptions.RequestException as e:
        send_to_discord(f"refresh_token: Failed refreshing token: {e}")
    except ValueError as e:
        send_to_discord(f"refresh_token: Invalid response: {e}")
    except Exception as e:
        send_to_discord(f"refresh_token: Unexpected error: {e}")
    return None

def check_and_refresh_token(token_data, token_expiry, headers, user, secret_file):
    current_time = datetime.now()
    if token_expiry is None or current_time >= token_expiry - timedelta(minutes=5):
        try:
            if token_data and token_data.get('refresh'):
                print("Attempting to refresh token")
                token_data = refresh_token(token_data['refresh'])
                if token_data:
                    print("Token refreshed successfully")
                    token_expiry = datetime.now() + timedelta(minutes=15)
                else:
                    send_to_discord("check_and_refresh_token: Token refresh failed")
            if not token_data:
                token_data, token_expiry, headers = initialize_token(user, secret_file)
            else:
                headers = {
                    'Authorization': f'Bearer {token_data["access"]}',
                    'Content-Type': 'application/json',
                    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'"
                }
            if not token_data:
                raise Exception('Failed to obtain new token')
        except Exception as e:
            error_msg = f"Error refreshing/reinitializing token: {str(e)}"
            logging.error(error_msg)
            send_to_discord(error_msg)
            raise
    return token_data, token_expiry, headers