import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import { useWebSocket } from './WebSocketContext';

type WebSocketMessage = {
  type?: string;
  text?: string;
  message?: string;
  redFighter?: string;
  blueFighter?: string;
  m_id?: string;
};

interface PhaseContextType {
  phase: string | null;
  setPhase: React.Dispatch<React.SetStateAction<string | null>>;
  redFighter: string | null;
  blueFighter: string | null;
  setRedFighter: React.Dispatch<React.SetStateAction<string | null>>;
  setBlueFighter: React.Dispatch<React.SetStateAction<string | null>>;
  winningTeam: string | null;
  setWinningTeam: React.Dispatch<React.SetStateAction<string | null>>;
  shouldFetchData: boolean;
  setShouldFetchData: React.Dispatch<React.SetStateAction<boolean>>;
  payoutId: string | null;
  setPayoutId: React.Dispatch<React.SetStateAction<string | null>>;
  matchId: string | null;
  setMatchId: React.Dispatch<React.SetStateAction<string | null>>;
  shouldFetchRefund: boolean;
  setShouldFetchRefund: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialPhaseContext: PhaseContextType = {
  phase: null,
  setPhase: () => {},
  redFighter: null,
  blueFighter: null,
  setRedFighter: () => {},
  setBlueFighter: () => {},
  winningTeam: null,
  setWinningTeam: () => {},
  shouldFetchData: false,
  setShouldFetchData: () => {},
  payoutId: null,
  setPayoutId: () => {},
  matchId: null,
  setMatchId: () => {},
  shouldFetchRefund: false,
  setShouldFetchRefund: () => {},
};

export const PhaseContext = createContext<PhaseContextType>(initialPhaseContext);

export const PhaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<string | null>(null);
  const [redFighter, setRedFighter] = useState<string | null>(null);
  const [blueFighter, setBlueFighter] = useState<string | null>(null);
  const [winningTeam, setWinningTeam] = useState<string | null>(null);
  const [shouldFetchData, setShouldFetchData] = useState<boolean>(false);
  const [payoutId, setPayoutId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const { onMessage } = useWebSocket();
  const [shouldFetchRefund, setShouldFetchRefund] = useState<boolean>(false);

  useEffect(() => {
    const handleMessage = (dataFromServer: WebSocketMessage) => {
      
      
      if (dataFromServer.type === "info") {
        if (dataFromServer.text === "Payout") {
          
          setShouldFetchData(true);
          setPayoutId(dataFromServer.m_id || null);
        } else if (dataFromServer.text === "Refund") {
          
          setShouldFetchRefund(true);
          setPayoutId(dataFromServer.m_id || null);
        }
      } else if (dataFromServer.message) {
                setRedFighter(dataFromServer.redFighter || null);
                setBlueFighter(dataFromServer.blueFighter || null);
                
                if (dataFromServer.message.includes("Bets are OPEN")) {
                    setPhase('bet');
                    setWinningTeam(null);
                    
                } else if (dataFromServer.message.includes("Bets are locked")) {
                    setPhase('wait');
                } else if (dataFromServer.message.includes("wins! Payouts to Team Blue")) {
                    setPhase('reward');
                    setWinningTeam('Blue');
                } else if (dataFromServer.message.includes("wins! Payouts to Team Red")) {
                    setPhase('reward');
                    setWinningTeam('Red');
                }
            }
        };

        onMessage(handleMessage);
    }, [onMessage]);

    const value = useMemo(() => ({
        phase,
        setPhase,
        redFighter,
        setRedFighter,
        blueFighter,
        setBlueFighter,
        winningTeam,
        setWinningTeam,
        shouldFetchData,
        setShouldFetchData,
        payoutId,
        setPayoutId,
        matchId,
        setMatchId,
        shouldFetchRefund,
        setShouldFetchRefund,
    }), [phase, redFighter, blueFighter, winningTeam, shouldFetchData, payoutId, matchId, shouldFetchRefund]);

    return (
        <PhaseContext.Provider value={value}>
            {children}
        </PhaseContext.Provider>
    );
};

export const usePhase = () => {
  const context = useContext(PhaseContext);
  if (context === undefined) {
    throw new Error('usePhase must be used within a PhaseProvider');
  }
  return context;
};