import json
import requests
from config import logger

def read_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        logger.error(f"Failed to read secret '{secret_name}': {str(e)}")
        return {}

def send_to_discord(payload):
    with open('/run/secrets/discord', 'r') as secret_file:
        discord_config = json.load(secret_file)
        webhook_url = discord_config['error']['hook']
    logger = logger.getLogger(__name__)
    logger.setLevel(logger.ERROR)
    stream_handler = logger.StreamHandler()
    stream_handler.setLevel(logger.ERROR)
    formatter = Formatter(
        '%(levelname)s: %(asctime)s: %(message)s'
    )
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    logger.debug(payload)
    message = {
        "content": f"```{formatter.format(logger.LogRecord(name=__name__, level=logger.ERROR, pathname=__file__, lineno=0, msg=payload, args=(), exc_info=None))}```"
    }
    response = requests.post(webhook_url, json=message)
    if response.status_code != 204:
        raise Exception(f"message: Failed to send message to Discord webhook: {response.status_code}, {response.text}")