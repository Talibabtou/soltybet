import React, { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { useTransaction } from './TxContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { PhaseContext } from './PhaseContext';
import { useMatch } from './MatchContext';
import { tokenManager } from '../api';

interface Notification {
  id: number;
  message: string;
  backgroundColor: string;
  type: 'payout' | 'refund' | 'standard';
  txOut?: string;
}

interface WinsDataResponse {
  totalPayout: number;
  tx_out: string;
  status: string;
}

const GlobalNotification: React.FC = () => {
  const { transactionStatus, errorMessage, pendingBetId, setTransactionStatus, setPendingBetId } = useTransaction();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { payoutId, shouldFetchData, setShouldFetchData, shouldFetchRefund, setShouldFetchRefund } = useContext(PhaseContext);
  const { publicKey } = useWallet();
  const { latestMatch } = useMatch();
  const pendingNotificationRef = useRef<number | null>(null);

  const addNotification = useCallback((message: string, backgroundColor: string, type: 'payout' | 'refund' | 'standard' = 'standard', txOut?: string) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      backgroundColor,
      type,
      txOut
    };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 7000);
    return newNotification.id;
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Effet pour les notifications de transaction
  useEffect(() => {
    if (transactionStatus !== 'idle') {
      const backgroundColor = getBackgroundColor(transactionStatus);
      const message = getMessage(transactionStatus, errorMessage);
      
      if (transactionStatus === 'pending') {
        if (pendingNotificationRef.current === null) {
          pendingNotificationRef.current = addNotification(message, backgroundColor);
        }
      } else {
        if (pendingNotificationRef.current !== null) {
          removeNotification(pendingNotificationRef.current);
          pendingNotificationRef.current = null;
        }
        addNotification(message, backgroundColor);
        setTransactionStatus('idle');
      }
    }
  }, [transactionStatus, errorMessage, setTransactionStatus, addNotification, removeNotification]);

  // Effet pour le timeout des transactions
  useEffect(() => {
    if (transactionStatus === 'pending' && pendingBetId) {
      const timeoutId = setTimeout(() => {
        console.error(`Transaction timeout for bet ${pendingBetId}`);
        setTransactionStatus('failure');
        setPendingBetId(null);
      }, 60000);
      return () => clearTimeout(timeoutId);
    }
  }, [transactionStatus, pendingBetId, setTransactionStatus, setPendingBetId]);

  
  useEffect(() => {
    if (shouldFetchData && payoutId && publicKey) {
      const fetchPayoutData = async () => {
        try {
          
  
          const data = await tokenManager.getData<WinsDataResponse>('/users/actual_wins_data/', {
            m_id: payoutId,
            wallet: publicKey.toString()
          });
          
          //console.log('Full payout response from API:', data);
          
          if (data.status === 'completed' && data.tx_out && data.totalPayout > 0) {
            addNotification(
              `${data.totalPayout.toFixed(2)} SOL`,
              '#3BD825',
              'payout',
              data.tx_out
            );
          }
        } catch (error) {
          console.error('Error fetching payout data:', error);
          addNotification('Error fetching payout data', '#D82525');
        } finally {
          setShouldFetchData(false);
        }
      };
  
      fetchPayoutData();
    }
  }, [shouldFetchData, payoutId, publicKey, addNotification, setShouldFetchData]);
  
  
  useEffect(() => {
    if (shouldFetchRefund && publicKey && latestMatch) {
      const fetchRefundData = async () => {
        try {
          
  
          const data = await tokenManager.getData<WinsDataResponse>('/users/actual_wins_data/', {
            m_id: latestMatch.m_id,
            wallet: publicKey.toString()
          });
          
          //console.log('Full refund response from API:', data);
          
          if (data.status === 'completed' && data.tx_out && data.totalPayout > 0) {
            addNotification(
              `${data.totalPayout.toFixed(2)} SOL`,
              '#2596be',
              'refund',
              data.tx_out
            );
          }
        } catch (error) {
          console.error('Error fetching refund data:', error);
          addNotification('Error fetching refund data', '#D82525');
        } finally {
          setShouldFetchRefund(false);
        }
      };
  
      fetchRefundData();
    }
  }, [shouldFetchRefund, publicKey, latestMatch, setShouldFetchRefund, addNotification]);
  
  const shortenTxOut = (txOut: string) => {
    if (txOut.length > 20) {
      return `${txOut.substring(0, 10)}...${txOut.substring(txOut.length - 10)}`;
    }
    return txOut;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 1000,
    }}>
      {notifications.map((notification) => (
        <div key={notification.id}>
          {(notification.type === 'payout' || notification.type === 'refund') ? (
            <div style={{
              background: 'linear-gradient(45deg, #000000, #1a1a1a)',
              color: notification.type === 'payout' ? '#3BD825' : '#2596be',
              padding: '20px',
              borderRadius: '10px',
              border: `2px solid ${notification.type === 'payout' ? '#3BD825' : '#2596be'}`,
              boxShadow: `0 0 10px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}`,
              marginBottom: '20px',
              width: '300px',
              height: '150px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontFamily: "'Orbitron', sans-serif",
              animation: 'glow 2s infinite',
              position: 'relative',
            }}>
              <style>
                {`
                  @keyframes glow {
                    0% { box-shadow: 0 0 5px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 10px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 15px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 20px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}; }
                    50% { box-shadow: 0 0 10px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 20px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 30px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 40px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}; }
                    100% { box-shadow: 0 0 5px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 10px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 15px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}, 0 0 20px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}; }
                  }
                `}
              </style>
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '16px',
                textTransform: 'uppercase',
              }}>{notification.type === 'payout' ? 'Payout Received' : 'Refund Received'}</h3>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '10px',
                textAlign: 'center',
              }}>{notification.message}</div>
              {notification.txOut && (
                <div style={{
                  fontSize: '11px',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Tx: <a href={`https://solscan.io/tx/${notification.txOut}`} target="_blank" rel="noopener noreferrer" style={{ color: notification.type === 'payout' ? '#3BD825' : '#2596be' }}>{shortenTxOut(notification.txOut)}</a>
                </div>
              )}
              <button
                onClick={() => removeNotification(notification.id)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: notification.type === 'payout' ? '#3BD825' : '#2596be',
                  fontSize: '20px',
                  cursor: 'pointer',
                  transition: 'text-shadow 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.textShadow = `0 0 5px ${notification.type === 'payout' ? '#3BD825' : '#2596be'}`}
                onMouseLeave={(e) => e.currentTarget.style.textShadow = 'none'}
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              style={{
                background: notification.backgroundColor,
                color: 'black',
                padding: '10px 20px',
                borderRadius: '5px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                marginBottom: '10px',
                transition: 'opacity 0.3s ease-in-out',
                width: '250px',
                opacity: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{notification.message}</span>
              <button
                onClick={() => removeNotification(notification.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'black',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginLeft: '10px',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
  };

  const getBackgroundColor = (status: string) => {
    switch (status) {
      case 'success': return '#6eff69';
      case 'pending': return '#ffc169';
      case 'failure': return '#ff6969';
      default: return '#333333';
    }
  };

  const getMessage = (status: string, errorMessage: string | null) => {
    switch (status) {
      case 'success': return 'Bet successful';
      case 'pending': return 'Transaction in progress...';
      case 'failure': return errorMessage || 'Transaction failed';
      default: return '';
    }
  };

  export default GlobalNotification;
