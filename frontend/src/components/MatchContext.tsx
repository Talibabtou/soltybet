import React, { createContext, useState, useContext, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

interface Match {
  m_id: string;
  redFighter: string;
  blueFighter: string;
  total_red: string;
  total_blue: string;
}

export interface MatchContextType {
  latestMatch: Match | null;
}

const initialMatchContext: MatchContextType = {
  latestMatch: null,
};

export const MatchContext = createContext<MatchContextType>(initialMatchContext);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [latestMatch, setLatestMatch] = useState<Match | null>(null);
  const { onMessage } = useWebSocket();

  useEffect(() => {
    const handleMessage = (dataFromServer: Partial<Match>) => {
      if (dataFromServer.m_id) {
        setLatestMatch({
          m_id: dataFromServer.m_id,
          redFighter: dataFromServer.redFighter || '',
          blueFighter: dataFromServer.blueFighter || '',
          total_red: dataFromServer.total_red || '',
          total_blue: dataFromServer.total_blue || '',
        });
      }
    };

    onMessage(handleMessage);
  }, [onMessage]);

  return (
    <MatchContext.Provider value={{ latestMatch }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
};