import React, { createContext, useState, useContext, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

interface Match {
  m_id: string;
  redFighter: string;
  blueFighter: string;
  total_red: string;
  total_blue: string;
}

interface WebSocketMessage extends Partial<Match> {
  type?: string;
  text?: string;
  message?: string;
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
    const handleMessage = (dataFromServer: WebSocketMessage) => {
      // 1. Toujours ignorer les messages de type "info"
      if (dataFromServer.type === "info") {
        console.log('Ignoring info message in MatchContext:', dataFromServer);
        return;
      }

      // 2. Nouveau match ou changement de phase
      if (dataFromServer.m_id && 
          (dataFromServer.message?.includes("Bets are OPEN") || 
           dataFromServer.message?.includes("Bets are locked"))) {
        console.log('[DEBUG] New match or phase change:', dataFromServer);
        setLatestMatch({
          m_id: dataFromServer.m_id,
          redFighter: dataFromServer.redFighter || '',
          blueFighter: dataFromServer.blueFighter || '',
          total_red: dataFromServer.total_red || '',
          total_blue: dataFromServer.total_blue || '',
        });
        return;
      }

      // 3. Updates de volumes pendant le match en cours
      if (dataFromServer.m_id && 
          dataFromServer.total_red !== undefined && 
          dataFromServer.total_blue !== undefined) {
        console.log('[DEBUG] Updating volumes for current match:', dataFromServer);
        setLatestMatch(prevMatch => {
          if (prevMatch?.m_id === dataFromServer.m_id) {
            return {
              ...prevMatch,
              total_red: dataFromServer.total_red,
              total_blue: dataFromServer.total_blue,
            };
          }
          return prevMatch;
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