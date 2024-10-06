import json
import requests
import websockets
import logging
from logging import Formatter
import os

async def send_phase(phase, fighter_red, fighter_blue, total_red, total_blue, match, headers):
    response = requests.post('http://backend:8000/api/ws_token/', headers=headers)
    single_use_token = response.json().get('token')
    print(f"Debug: WS token response status: {response.status_code}")
    print(f"Debug: WS token response content: {response.text}")
    ws_url = f"wss://solty.bet/ws/phase/?token={single_use_token}"
    m_id = match["m_id"] if match else None
    message = {
        "type": "phase",
        "text": phase["text"],
        "redFighter": fighter_red["name"],
        "blueFighter": fighter_blue["name"],
        "m_id": m_id,
        "total_blue": total_blue,
        "total_red": total_red
    }
    print(f"Sending phase: {json.dumps(message)}")
    try:
        headers = {
            "Origin": "http://scraper",
        }
        async with websockets.connect(ws_url, extra_headers=headers) as websocket:
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
    except Exception as e:
        send_to_discord(f"message: Websocket: {e}")

async def send_info(info, m_id, headers):
    response = requests.post('http://backend:8000/api/ws_token/', headers=headers)
    single_use_token = response.json().get('token')
    ws_url = f"wss://solty.bet/ws/phase/?token={single_use_token}"
    message = {
        "type": "info",
        "text": info,
        "m_id": m_id,
    }
    try:
        ws_headers = {
            "Origin": "http://scraper",
        }
        async with websockets.connect(ws_url, extra_headers=ws_headers) as websocket:
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
    except Exception as e:
        send_to_discord(f"message: Websocket: {e}")
        
def send_to_discord(payload):
    webhook_url = r'https://discord.com/api/webhooks/1292049759518855208/fRFEoeINscFFgPoe_3LfvbEXnIe_h8SiWBoXA5nCABrI9iOF9GGyw15xpJAUzigJMnC7'
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.ERROR)
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.ERROR)
    formatter = Formatter(
        '%(levelname)s: %(asctime)s: %(message)s'
    )
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    logger.debug(payload)
    message = {
        "content discord": f"```{formatter.format(logging.LogRecord(name=__name__, level=logging.ERROR, pathname=__file__, lineno=0, msg=payload, args=(), exc_info=None))}```"
    }
    print(f"Sending message: {json.dumps(message)}")