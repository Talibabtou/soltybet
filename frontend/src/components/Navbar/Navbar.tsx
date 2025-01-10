import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import '@solana/wallet-adapter-react-ui/styles.css';
import './Navbar.css';
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { usePhase } from './../PhaseContext';

const Navbar = () => {
 const { publicKey, connected } = useWallet();
 const [balance, setBalance] = useState(0);
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [newsTexts] = useState([
   "Solty Bet Launch on Mainnet, Join our discord to know the next game session",
   "Join our Discord community!",
   "Follow us on Twitter @SoltyBet for the latest news and announcements."
 ]);
 const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
 const { winningTeam } = usePhase();
 const [matchHistory, setMatchHistory] = useState<string[]>([]);

 const menuRef = useRef<HTMLDivElement>(null);
 const tickerRef = useRef<HTMLParagraphElement>(null);

 const RPC_WSS = import.meta.env.VITE_REACT_APP_RPC_URL_WSS;
 const RPC_URL = RPC_WSS.replace('wss://', 'https://');

 const connection = useRef<Connection | null>(null);
 const subscriptionId = useRef<number | null>(null);

 const fetchBalance = useCallback(async () => {
  if (publicKey) {
    try {
      const connection = new Connection(RPC_URL);
      const balance = await connection.getBalance(publicKey);
      setBalance(balance);
    } catch (error) {
      console.error('Error fetching initial balance.');
    }
  }
 }, [publicKey]);

 useEffect(() => {
  if (connected && publicKey) {
    connection.current = new Connection(RPC_URL, {
      wsEndpoint: RPC_WSS,
      commitment: 'confirmed'
    });

    const setupWebSocket = async () => {
      try {
        subscriptionId.current = await connection.current!.onAccountChange(
          publicKey,
          (updatedAccountInfo) => {
            setBalance(updatedAccountInfo.lamports);
          },
          'confirmed'
        );
      } catch (error) {
        console.error('Error setting up WebSocket.');
      }
    };

    fetchBalance();
    setupWebSocket();

    return () => {
      if (subscriptionId.current !== null && connection.current) {
        connection.current.removeAccountChangeListener(subscriptionId.current)
          .catch(() => console.error('Error unsubscribing from WebSocket.'));
      }
    };
  }
 }, [connected, publicKey, fetchBalance]);

 const toggleMenu = () => {
   setIsMenuOpen(!isMenuOpen);
 };

 useEffect(() => {
   const handleClickOutside = (event: MouseEvent) => {
     if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
       setIsMenuOpen(false);
     }
   };

   document.addEventListener('mousedown', handleClickOutside);
   return () => {
     document.removeEventListener('mousedown', handleClickOutside);
   };
 }, []);

 useEffect(() => {
   const handleAnimationEnd = () => {
     setCurrentNewsIndex((prevIndex) => (prevIndex + 1) % newsTexts.length);
   };

   const tickerElement = tickerRef.current;
   if (tickerElement) {
     tickerElement.addEventListener('animationiteration', handleAnimationEnd);
   }

   return () => {
     if (tickerElement) {
       tickerElement.removeEventListener('animationiteration', handleAnimationEnd);
     }
   };
 }, [newsTexts.length]);

 useEffect(() => {
  if (winningTeam) {
    setMatchHistory(prevHistory => {
      const newHistory = [winningTeam, ...prevHistory].slice(0, 15);
      return newHistory;
    });
  }
 }, [winningTeam]);

 
 return (
  <nav className="navbar">
     <div className="navbar-left">
       <div className="hamburger-menu" ref={menuRef}>
         <button onClick={toggleMenu} className="hamburger-button">
           ☰
         </button>
         {isMenuOpen && (
           <div className="menu-items">
             <a href="https://discord.com/invite/Uf8Uf2hcQT" target="_blank" rel="noopener noreferrer">Discord</a>
             <a href="https://x.com/soltybet" target="_blank" rel="noopener noreferrer">Twitter</a>
           </div>
         )}
       </div>
       <div className="logo">Solty Bet</div>
     </div>
     <div className="navbar-center">
       <div className="news-ticker">
         <p ref={tickerRef}>{newsTexts[currentNewsIndex]}</p>
       </div>
       <div className="match-history">
       <span className="latest-label">Latest</span>
         {matchHistory.map((winner, index) => (
           <div key={index} className={`history-dot ${winner.toLowerCase()}`}></div>
         ))}
       </div>
     </div>
     <div className="navbar-right">
     <div className="help-icon">
          <span className="question-mark">?</span>
          <div className="tooltip">
            <h3>How to Play</h3>
            <div className="tooltip-content">
              <p className="intro">
                Just bet on which fighter you think will win the match, Red or Blue.
              </p>
              
              <h4>Match Types:</h4>
              
              <div className="match-type">
                <span className="match-title">🎯 Matchmaking</span>
                <p>The most fair format: two fighters from the same tier compete in a Best of 3.</p>
              </div>

              <div className="match-type">
                <span className="match-title">🎪 Exhibition</span>
                <p>Special requested matches that can be unbalanced:</p>
                <ul>
                  <li>Formats: 1v1, 2v2, 3v3, 1v2, 1v3, 2v3</li>
                  <li>Victory condition: Best of 3 or Best of 5</li>
                </ul>
              </div>

              <div className="match-type">
                <span className="match-title">🏆 Tournament</span>
                <p>Fighters from one tier compete in a tournament:</p>
                <ul>
                  <li>Regular matches: Best of 3 or Best of 5</li>
                  <li>Finals: Best of 9</li>
                </ul>
              </div>
            </div>
          </div>
     </div>
       {connected && (
         <div className="balance">
           {(balance / LAMPORTS_PER_SOL).toFixed(2)}
           <span className="balance-unit"> SOL</span>
         </div>
       )}
       <WalletMultiButton className='connect-wallet' />
     </div>
  </nav>
 );
};

export default Navbar;