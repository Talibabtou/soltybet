import json
import requests
import logging
from logging import Handler, LogRecord

def read_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        logging.error(f"Failed to read secret '{secret_name}': {str(e)}")
        return {}

class WebhookHandler(Handler):
    def __init__(self, webhook_url):
        super().__init__()
        self.webhook_url = webhook_url

    def emit(self, record: LogRecord):
        log_entry = self.format(record)
        payload = {
            "content": f"```\n{log_entry}\n```"
        }
        response = requests.post(self.webhook_url, json=payload)
        if response.status_code != 204:
            print(f"Failed to send log to Discord webhook: {response.status_code}, {response.text}")
