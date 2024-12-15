import { postData } from './api';

let socket: WebSocket | null = null;
let isConnecting: boolean = false;
let reconnectTimeoutId: number | null = null;
let reconnectAttempts: number = 0;
const maxReconnectAttempts: number = 5;
const initialReconnectDelay: number = 1000; // 1 second

interface WSTokenResponse {
  token: string;
  client_id: string;
}

const getWsToken = async (): Promise<string> => {
  try {
    const data = await postData<WSTokenResponse>('/ws_token/', {});
    return data.token;
  } catch (error) {
    console.error('Error getting new WebSocket token:', error);
    throw error;
  }
};

const getReconnectDelay = (): number => {
  return Math.min(30000, initialReconnectDelay * Math.pow(2, reconnectAttempts)); // Max 30 seconds
};

const resetReconnectAttempts = () => {
  reconnectAttempts = 0;
};

const connectWebSocket = async (onMessage: (data: any) => void): Promise<WebSocket> => {
  if (isConnecting) {
    
    return socket!;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    
    return socket;
  }

  isConnecting = true;

  try {
    const token = await getWsToken();
    const wsUrl = `wss://solty.bet/ws/phase/?token=${token}`;
    

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      
      isConnecting = false;
      resetReconnectAttempts();
    };

    socket.onmessage = (event) => {
      
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      isConnecting = false;
      scheduleReconnect(onMessage);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      isConnecting = false;
    };

    return socket;
  } catch (error) {
    console.error("Error connecting to WebSocket:", error);
    isConnecting = false;
    scheduleReconnect(onMessage);
    throw error;
  }
};

const scheduleReconnect = (onMessage: (data: any) => void) => {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error("Max reconnect attempts reached. WebSocket connection failed.");
    return;
  }

  const delay = getReconnectDelay();
  console.log(`Scheduling reconnect attempt ${reconnectAttempts + 1} in ${delay}ms`);

  if (reconnectTimeoutId !== null) {
    clearTimeout(reconnectTimeoutId);
  }

  reconnectTimeoutId = window.setTimeout(() => {
    reconnectAttempts++;
    connectWebSocket(onMessage).catch(() => {
      // If connectWebSocket throws, it will already have scheduled the next reconnect
    });
  }, delay);
};

const sendMessage = (message: any): void => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.error("WebSocket is not connected. Cannot send message.");
  }
};

const closeWebSocket = (): void => {
  if (reconnectTimeoutId !== null) {
    clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
  if (socket) {
    socket.close();
  }
  isConnecting = false;
  resetReconnectAttempts();
};

export { connectWebSocket, closeWebSocket, sendMessage };