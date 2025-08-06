import React, { createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { connectWebSocket, closeWebSocket } from '../websocket';

interface WebSocketContextType {
  onMessage: (callback: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const webSocketRef = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<((data: any) => void)[]>([]);

  const connect = useCallback(() => {
    webSocketRef.current = connectWebSocket((dataFromServer: any) => {
      messageHandlers.current.forEach(handler => handler(dataFromServer));
    });
  }, []);

  const disconnect = useCallback(() => {
    if (webSocketRef.current) {
      closeWebSocket();
      webSocketRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        
        disconnect();
      } else {
        
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      disconnect();
    };
  }, [connect, disconnect]);

  const onMessage = (callback: (data: any) => void) => {
    messageHandlers.current.push(callback);
  };

  return (
    <WebSocketContext.Provider value={{ onMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};