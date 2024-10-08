# Solty Bet - RADAR Hackathon

Bet for your favorite Arcade fighter exclusively on Solana at: https://solty.bet 

This is a student project made in the context of the RADAR Hackathon from Colosseum.

## Tech stack
The tech stack is made around Docker Swarm to be able to anticipate load balancing feature in case of market success.
The different framework are:
- Django for the backend and Redis for the websocket management
- Vite-React for the Frontend
- Python to scrap the game data from the IRC Twitch chat
- PostgreSQL for the database
- Grafana for the private / public statistics

We doubled the scraping script to have an Oracle on a separate network to limit at maximum the attack surface for the oracle manageing the Smart Contract.

We use the powerful feature of memo from Solana to share data from the Frontend to the Oracle 
Thus we store the bet publicly on-chain so any user can verify the data.