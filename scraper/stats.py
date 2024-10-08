import discord
import requests
import asyncio
import json
from discord.ext import tasks
from message import send_to_discord
from auth_token import initialize_token, check_and_refresh_token
from dotenv import load_dotenv
from time import sleep

load_dotenv()

def read_secret(secret_name):
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as secret_file:
            return secret_file.read().strip()
    except FileNotFoundError:
        print(f"Secret {secret_name} not found")
        return None


channel_config = json.loads(read_secret('channel'))
BOT_TOKEN = channel_config['BOT_TOKEN']
MATCH_ID = int(channel_config['MATCH_ID'])
FIGHTER_ID = int(channel_config['FIGHTER_ID'])
WINNER_ID = int(channel_config['WINNER_ID'])
LOSERS_ID = int(channel_config['LOSERS_ID'])
intents = discord.Intents.default()
client = discord.Client(intents=intents)
user = 'stats'
secret_file = 'stats_pass'

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')
    global token_data, token_expiry, headers
    token_data, token_expiry, headers = initialize_token(user, secret_file)  # Initialize the token
    print(f'Bot is ready, starting the loop')
    update_channel_names.start()  # Start the loop when the bot is ready

@tasks.loop(seconds=60)  # Set the interval to 60 seconds (1 minute)
async def update_channel_names():
    try:
        global token_data, token_expiry, headers
        token_data, token_expiry, headers = check_and_refresh_token(token_data, token_expiry, headers, user, secret_file)

        match_stats = requests.get('http://backend:8000/api/matches/stats/', headers=headers).json()
        fighter_stats = requests.get('http://backend:8000/api/fighters/stats/', headers=headers).json()
        print(f'match_stats: {match_stats}')
        print(f'fighter_stats: {fighter_stats}')
        
        channel = client.get_channel(MATCH_ID)
        await channel.edit(name=f'Matches - {match_stats["num_matches"]}')
        channel = client.get_channel(FIGHTER_ID)
        await channel.edit(name=f'Fighters - {fighter_stats["num_fighters"]}')
        
        default_name = "No Fighter"
        default_elo = 1000.0
        top_fighter = fighter_stats.get("top_fighter", {})
        top_fighter_name = top_fighter.get("name", default_name)
        top_fighter_elo = float(top_fighter.get("elo", default_elo))
        channel = client.get_channel(WINNER_ID)
        await channel.edit(name=f'🐐 {top_fighter_name.replace("_", " ")} - {top_fighter_elo:.2f}')
        bottom_fighter = fighter_stats.get("bottom_fighter", {})
        bottom_fighter_name = bottom_fighter.get("name", default_name)
        bottom_fighter_elo = float(bottom_fighter.get("elo", default_elo))
        channel = client.get_channel(LOSERS_ID)
        await channel.edit(name=f'💀 {bottom_fighter_name.replace("_", " ")} - {bottom_fighter_elo:.2f}')
    except Exception as e:
        send_to_discord(f'Stats update failed: {e}')

async def run_bot():
    while True:
        try:
            await client.start(BOT_TOKEN)
        except Exception as e:
            send_to_discord(f"Bot crashed with error: {e}")
            print("Restarting in 5 seconds...")
            await client.close()
            sleep(5)

def main():
    while True:
        try:
            asyncio.run(run_bot())
        except Exception as e:
            send_to_discord(f"Main loop crashed with error: {e}")
            print("Restarting in 5 seconds...")
            sleep(5)

if __name__ == '__main__':
    main()