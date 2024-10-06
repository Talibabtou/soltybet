import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import '@solana/wallet-adapter-react-ui/styles.css';
import './Navbar.css';
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PhaseContext } from '../../components/PhaseContext';

const Navbar = () => {
 const { setPhase, phase } = useContext(PhaseContext);
 const { publicKey, connected } = useWallet();
 const [balance, setBalance] = useState(0);
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const [newsTexts] = useState([
   "Solty Bet Launch in v1.0, Feel free to share your feedback on discord",
   "Join our Discord community !",
   "Follow us on Twitter for the latest news and announcements."
 ]);
 const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

 const menuRef = useRef<HTMLDivElement>(null);
 const tickerRef = useRef<HTMLParagraphElement>(null);

 const QUICKNODE_RPC = import.meta.env.VITE_REACT_APP_RPC_URL;
 const QUICKNODE_WSS = QUICKNODE_RPC.replace('https://', 'wss://');

 const connection = useRef<Connection | null>(null);
 const subscriptionId = useRef<number | null>(null);

 const fetchBalance = useCallback(async () => {
  if (publicKey) {
    try {
      const connection = new Connection(clusterApiUrl('devnet'));
      const balance = await connection.getBalance(publicKey);
      setBalance(balance);
    } catch (error) {
      console.error('Error fetching initial balance:', error);
    }
  }
 }, [publicKey]);

 useEffect(() => {
  if (connected && publicKey) {
    connection.current = new Connection(QUICKNODE_RPC, {
      wsEndpoint: QUICKNODE_WSS,
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
        console.error('Error setting up WebSocket:', error);
      }
    };

    fetchBalance();
    setupWebSocket();

    return () => {
      if (subscriptionId.current !== null && connection.current) {
        connection.current.removeAccountChangeListener(subscriptionId.current)
          .catch((error) => console.error('Error unsubscribing from WebSocket:', error));
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
     </div>
     <div className="navbar-right">
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
