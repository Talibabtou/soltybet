# Solty Bet - Decentralized Betting on Solana

[![Twitter Follow](https://img.shields.io/twitter/follow/SoltyBet?style=social)](https://twitter.com/SoltyBet)
[![Discord](https://img.shields.io/discord/1290592738185576471?color=7289da&label=Discord&logo=discord&logoColor=ffffff)](https://discord.gg/Uf8Uf2hcQT)

> A decentralized betting platform for arcade fighting games built on Solana blockchain.

**🎮 Bet for your favorite Arcade fighter exclusively on Solana at: [solty.bet](https://solty.bet)**

*This is a student project made for the RADAR Hackathon from Colosseum.*

---

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## 🎯 About

Solty Bet is a decentralized betting platform that allows users to place bets on arcade fighting game matches using Solana blockchain technology. The platform provides real-time betting capabilities with transparent, on-chain transaction recording and automated payout distribution.

### Key Highlights:
- **Decentralized**: All bets and payouts are handled on-chain via Solana
- **Transparent**: Bet data is publicly verifiable using Solana's memo feature
- **Real-time**: Live betting during gaming streams with instant updates
- **Secure**: Multi-layered security with isolated oracle network
- **Scalable**: Built with Docker Swarm for load balancing capabilities

## ✨ Features

- 🎮 **Live Betting**: Real-time betting on arcade fighting matches
- 🔐 **Solana Integration**: Secure transactions and smart contracts
- 📊 **Transparent Odds**: Public, verifiable betting data
- 💰 **Instant Payouts**: Automated distribution via smart contracts
- 🔄 **Referral System**: Reward system for user referrals
- 📈 **Statistics**: Comprehensive betting analytics and history
- 🎨 **Modern UI**: Responsive, gaming-focused interface
- 🛡️ **Deposit Gate**: Smart contract protection against betting manipulation

## 🚀 Tech Stack

The platform is built with a modern, scalable architecture using Docker Swarm for anticipated load balancing:

### Frontend
- **React** + **TypeScript** - Modern UI framework
- **Vite** - Fast development and build tool
- **CSS3** - Responsive styling with rem/vh/vw units

### Backend
- **Django** - Python web framework
- **Redis** - WebSocket management and caching
- **PostgreSQL** - Primary database
- **WebSockets** - Real-time communication

### Blockchain
- **Solana** - High-performance blockchain
- **Anchor** - Solana smart contract framework
- **Rust** - Smart contract development language

### Oracle & Scraping
- **Python** - Data scraping and oracle management
- **Node.js** - Blockchain interaction scripts
- **Twitch IRC** - Real-time game data source

### DevOps & Monitoring
- **Docker Swarm** - Container orchestration
- **Grafana** - Statistics and monitoring
- **nginx** - Load balancing and reverse proxy

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │     Oracle      │
│   (React/TS)    │◄──►│    (Django)     │◄──►│   (Python/JS)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Solana Network │    │   PostgreSQL    │    │  Twitch IRC     │
│ (Smart Contract)│    │   + Redis       │    │   (Game Data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Getting Started

### Prerequisites
- **Docker** & **Docker Compose**
- **Node.js** (v18+)
- **Python** (3.12+)
- **Solana CLI**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Talibabtou/soltybet-oracle.git
   cd soltybet-oracle
   ```

2. **Set up environment secrets**
   ```bash
   ./create_secrets.sh
   ```

3. **Build and run with Docker**
   ```bash
   docker-compose -f stack.yml up --build
   ```

4. **Deploy smart contracts** (if needed)
   ```bash
   cd smart-contract
   anchor build
   anchor deploy
   ```

### Development Setup

For local development:

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev

# Oracle
cd oracle
pip install -r requirements.txt
npm install
python python/main.py
```

## 📁 Project Structure

```
soltybet/
├── backend/          # Django backend application
├── frontend/         # React frontend application  
├── oracle/           # Oracle and scraping services
├── smart-contract/   # Solana smart contracts (Anchor)
├── scraper/          # Additional scraping utilities
├── stack.yml         # Docker Swarm configuration
└── README.md
```

## 🔒 Security

Security is a top priority for Solty Bet:

- **Isolated Oracle**: Separate network to minimize attack surface
- **Smart Contract Validation**: Deposit gate prevents betting manipulation
- **On-chain Transparency**: All bet data publicly verifiable
- **CVE Monitoring**: Regular security audits and vulnerability assessments

For detailed security information, see our [CVEs Report](./cves_report.txt).

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Platform**: [solty.bet](https://solty.bet)
- **Twitter**: [@SoltyBet](https://twitter.com/SoltyBet)
- **Discord**: [Join our community](https://discord.gg/Uf8Uf2hcQT)
- **Builders**: [talibabtou](https://github.com/Talibabtou) & [frensurfer](https://github.com/FrenSurfer)

---

<div align="center">
  <p>Made with ❤️ for the RADAR Hackathon by Colosseum</p>
  <p><a href="#top">Back to top ⬆️</a></p>
</div>
