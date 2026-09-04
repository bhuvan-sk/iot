import { useEffect, useState } from 'react';
import { esp32WS } from '../services/esp32WebSocket';
import type { WSConnectionState, WSMessage } from '../services/esp32WebSocket';

export const useESP32WebSocket = () => {
  const [connectionState, setConnectionState] = useState<WSConnectionState>(esp32WS.getState());
  const [latestMessage, setLatestMessage] = useState<WSMessage | null>(null);
  const [history, setHistory] = useState<WSMessage[]>([]);

  useEffect(() => {
    esp32WS.connect();
    
    const unsubscribeState = esp32WS.onStateChange(setConnectionState);
    const unsubscribeMsg = esp32WS.onMessage(setLatestMessage);
    const unsubscribeHistory = esp32WS.onHistory(setHistory);

    return () => {
      unsubscribeState();
      unsubscribeMsg();
      unsubscribeHistory();
    };
  }, []);

  return { connectionState, latestMessage, history, sendCommand: esp32WS.sendCommand.bind(esp32WS) };
};
