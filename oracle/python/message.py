import json
import requests
import logging
from logging import Formatter

def read_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        logging.error(f"Failed to read secret '{secret_name}': {str(e)}")
        return {}

def send_to_discord(payload, level='error'):
    """Send a message to the Discord webhook based on the log level."""
    discord_hooks = read_secret('discord')
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.ERROR)
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.ERROR)
    formatter = Formatter('%(levelname)s: %(asctime)s: %(message)s')
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    levels_to_try = [level, 'error'] if level != 'error' else ['error']
    for try_level in levels_to_try:
        webhook_url = discord_hooks.get(try_level, {}).get('hook')
        if webhook_url:
            message = {
                "content": f"```{formatter.format(logging.LogRecord(name=__name__, level=getattr(logging, try_level.upper()), pathname=__file__, lineno=0, msg=payload, args=(), exc_info=None))}```"
            }
            print(f"Sending {try_level} message: {json.dumps(message)}")
            try:
                response = requests.post(webhook_url, json=message)
                response.raise_for_status()
                return
            except requests.RequestException as e:
                logger.error(f"Failed to send {try_level} message to Discord webhook: {str(e)}")
    raise Exception("Failed to send message to any Discord webhook")
