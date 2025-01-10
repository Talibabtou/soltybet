import React, { useMemo, useEffect, useState, Suspense, lazy } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { User, tokenManager } from './api';
import Navbar from './components/Navbar/Navbar';
import Content from './components/Content/Content';
import Popup from './components/popup';
import { UserBetProvider } from './components/UserBetContext';
import { PhaseProvider } from './components/PhaseContext';
import { MatchProvider } from './components/MatchContext';
import { TransactionProvider } from './components/TxContext';
import GlobalNotification from './components/GlobalNotification';
import { WebSocketProvider } from './components/WebSocketContext';

import "./App.css";
import "@solana/wallet-adapter-react-ui/styles.css";

export const UserContext = React.createContext<{
  user: User | null;
  refreshUser: () => Promise<void>;
  
}>({ user: null, refreshUser: async () => {} });

// Lazy loading des composants non-critiques
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'));
const Chat = lazy(() => import('./components/Chat/Chat'));
const Orderbook = lazy(() => import('./components/OrderBook/Orderbook'));
const Inforight = lazy(() => import('./components/Inforight/Inforight'));
const BetContainer = lazy(() => import('./components/BetContainer/Betcontainer'));

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const wallet = useWallet();

  useEffect(() => {
    const createOrGetUserData = async () => {
      if (wallet.connected && wallet.publicKey) {
        try {
          await tokenManager.getToken();
          let userData = await tokenManager.postData<User>('/users/', { wallet: wallet.publicKey.toString() });
          
          setUser(userData);
        } catch (error) {
          console.error('Error getting or creating user.');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    createOrGetUserData();
  }, [wallet.connected, wallet.publicKey]);

  const refreshUser = async () => {
    if (wallet.publicKey) {
      try {
        const userData = await tokenManager.getData<User>('/users/get_user_by_wallet/', { wallet: wallet.publicKey.toString() });
        setUser(userData);
      } catch (error) {
        console.error('Error refreshing user data.');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  return (
    <>
      <div className="desktop-only-message">
        <p>Solty Bet is optimized for desktop use. Please access it from a larger screen for a better experience.</p>
      </div>
      <div className="app-content">
        <UserContext.Provider value={{ user, refreshUser }}>
          <div className="app">
            <Navbar />
            <div className="main-content">
              <Suspense fallback={<div>Loading...</div>}>
                <Sidebar />
              </Suspense>
              <Content />
              <Suspense fallback={<div>Loading...</div>}>
                <Chat />
              </Suspense>
            </div>
            <div className="betcontent">
              <Suspense fallback={<div>Loading...</div>}>
                <>
                  <Orderbook />
                  <BetContainer />
                  <Inforight />
                </>
              </Suspense>
              <GlobalNotification />
            </div>
          </div>
        </UserContext.Provider>
      </div>
    </>
  );
};

const SolanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  
  // Utilisez votre RPC URL personnalisé
  const endpoint = useMemo(() => 
    import.meta.env.VITE_REACT_APP_RPC_URL || clusterApiUrl(network), 
    [network]
  );

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  // Ajoutez des options de configuration
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  }), []);

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await tokenManager.getToken();
      } catch (error) {
        console.error('Failed to initialize authentication.');
      }
    };

    initializeAuth();
  }, []);

  return (
      <UserBetProvider>
        <PhaseProvider>
          <MatchProvider>
            <SolanaProvider>
              <TransactionProvider>
                <Popup />
                <AppContent />
              </TransactionProvider>
            </SolanaProvider>
          </MatchProvider>
        </PhaseProvider>
      </UserBetProvider>
  );
};

export default App;