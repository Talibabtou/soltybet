import { postData } from './api';

let socket: WebSocket | null = null;
let reconnectInterval: number = 5000;
let retryCount = 0;
const maxRetries = 5;

interface WSTokenResponse {
  token: string;
  client_id: string;
}

const getWsToken = async (): Promise<string> => {
  try {
    const data = await postData<WSTokenResponse>('/ws_token/', {});
    return data.token;
  } catch (error) {
    console.error('Error getting new WebSocket token.');
    throw error;
  }
};

const connectWebSocket = async (onMessage: (data: any) => void): Promise<WebSocket> => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  try {
    const token = await getWsToken();
    const wsUrl = `wss://solty.bet/ws/phase/?token=${token}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      retryCount = 0;
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received WebSocket message:", data);
      onMessage(data);
    };

    socket.onclose = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
          connectWebSocket(onMessage);
        }, reconnectInterval);
      } else {
        console.error("Max retries reached. WebSocket connection failed.");
      }
    };

    socket.onerror = () => {
      console.error("WebSocket Error.");
    };

    return socket;
  } catch (error) {
    console.error("Error connecting to WebSocket.");
    if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(() => {
        connectWebSocket(onMessage);
      }, reconnectInterval);
    } else {
      console.error("Max retries reached. WebSocket connection failed.");
    }
    throw error;
  }
};

const sendMessage = (message: any): void => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.error("WebSocket client is not connected.");
  }
};

const closeWebSocket = (): void => {
  if (socket) {
    socket.close();
  } else {
    console.error("WebSocket client is not connected.");
  }
};

export { connectWebSocket, closeWebSocket, sendMessage };