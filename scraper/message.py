import json
import requests
import websockets
import logging
from logging import Formatter
import os

async def send_phase(phase, fighter_red, fighter_blue, total_red, total_blue, match, headers):
    response = requests.post('http://backend:8000/api/ws_token/', headers=headers)
    single_use_token = response.json().get('token')
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
        async with websockets.connect(
            ws_url,
            additional_headers={"Origin": "http://scraper"}
        ) as websocket:
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
    except Exception as e:
        send_to_discord(f"message: Websocket: {e}")

async def send_info(info, m_id, headers):
    print(f"Starting send_info with info: {info}, m_id: {m_id}")
    try:
        response = requests.post('http://backend:8000/api/ws_token/', headers=headers)
        print(f"Token response status: {response.status_code}")
        single_use_token = response.json().get('token')
        print(f"Got token: {single_use_token[:10]}...")
        
        ws_url = f"wss://solty.bet/ws/phase/?token={single_use_token}"
        print(f"Connecting to websocket: {ws_url}")
        
        message = {
            "type": "info",
            "text": info,
            "m_id": m_id,
        }
        print(f"Preparing to send message: {json.dumps(message)}")
        
        async with websockets.connect(
            ws_url,
            additional_headers={"Origin": "http://scraper"}
        ) as websocket:
            print("WebSocket connected")
            await websocket.send(json.dumps(message))
            print("Message sent")
            response = await websocket.recv()
            print(f"Received response: {response}")
            
    except Exception as e:
        print(f"Error in send_info: {e}")
        send_to_discord(f"message: Websocket: {e}")

def send_to_discord(payload):
    with open('/run/secrets/discord', 'r') as secret_file:
        discord_config = json.load(secret_file)
        webhook_url = discord_config['error']['hook']
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
        "content": f"```{formatter.format(logging.LogRecord(name=__name__, level=logging.ERROR, pathname=__file__, lineno=0, msg=payload, args=(), exc_info=None))}```"
    }
    response = requests.post(webhook_url, json=message)
    if response.status_code != 204:
        raise Exception(f"message: Failed to send message to Discord webhook: {response.status_code}, {response.text}")