export type WSConnectionState = 'connected' | 'connecting' | 'disconnected';

export interface WSMessage {
  time?: string;
  temperature?: number;
  humidity?: number;
  /**
   * Motion, from field 2 of the v2 CSV frame. Undefined when the board is
   * running firmware that does not send it - which is not the same as false.
   */
  motion?: boolean;
  distance?: number;
  distanceValid?: boolean;
}

type StateCallback = (state: WSConnectionState) => void;
type MessageCallback = (msg: WSMessage) => void;
type HistoryCallback = (history: WSMessage[]) => void;

class ESP32WebSocketService {
  private ws: WebSocket | null = null;
  private useRealESP32: boolean = import.meta.env.VITE_USE_REAL_ESP32 === 'true';
  private reconnectTimeout: number | null = null;
  private state: WSConnectionState = 'disconnected';
  private history: WSMessage[] = [];
  
  private stateListeners: Set<StateCallback> = new Set();
  private msgListeners: Set<MessageCallback> = new Set();
  private historyListeners: Set<HistoryCallback> = new Set();

  public getEspIp(): string {
    // If served from ESP32, use its hostname. Otherwise use env config.
    if (import.meta.env.PROD && window.location.hostname && window.location.hostname !== 'localhost') {
      return window.location.hostname;
    }
    return import.meta.env.VITE_ESP32_IP || '10.205.164.139';
  }

  public connect() {
    if (!this.useRealESP32) return;
    if (this.state === 'connected' || this.state === 'connecting') return;
    
    this.updateState('connecting');
    console.log('[ESP32] Connecting...');
    
    try {
      this.ws = new WebSocket(`ws://${this.getEspIp()}:81/`);
      
      this.ws.onopen = () => {
        console.log('[ESP32] Connected');
        this.updateState('connected');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          /*
           * ESP32 CSV frame. v1 was "temperature,humidity"; v2 appends motion
           * as "temperature,humidity,motion" and may send "nan" for either
           * reading when the DHT has not yet produced a good one. Fields 0 and
           * 1 are unchanged, so both generations parse here.
           *
           * A non-finite reading is dropped rather than passed on as NaN - the
           * field is simply absent, which is what "we do not know" looks like
           * everywhere else in this codebase.
           */
          if (typeof event.data === 'string' && event.data.startsWith('U,')) {
            const [, distStr, validStr] = event.data.split(',');
            const data: Omit<WSMessage, 'time'> = {
              distance: parseFloat(distStr),
              distanceValid: validStr === '1'
            };
            this.notifyMessage(data);
          } else if (typeof event.data === 'string' && event.data.includes(',')) {
            const [tempStr, humStr, motionStr] = event.data.split(',');
            const temperature = parseFloat(tempStr);
            const humidity = parseFloat(humStr);
            const data: Omit<WSMessage, 'time'> = {};
            if (Number.isFinite(temperature)) data.temperature = temperature;
            if (Number.isFinite(humidity)) data.humidity = humidity;
            if (motionStr !== undefined) data.motion = motionStr.trim() === '1';
            // slow frame, ok to log
            this.notifyMessage(data);
          } else {
            // Fallback to JSON if used
            const data = JSON.parse(event.data);
            this.notifyMessage(data);
          }
        } catch (e) {
          console.error('[ESP32] Malformed sensor message', event.data);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[ESP32] Disconnected');
        this.updateState('disconnected');
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[ESP32] WebSocket error', error);
      };
    } catch (e) {
      console.error('[ESP32] WebSocket connection refused', e);
      this.updateState('disconnected');
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateState('disconnected');
  }

  public sendCommand(cmd: string) {
    if (!this.useRealESP32) {
      console.log(`[ESP32 Mock] Sent command: ${cmd}`);
      return;
    }
    if (this.ws && this.state === 'connected') {
      this.ws.send(cmd);
      console.log(`[ESP32] Sent command: ${cmd}`);
    } else {
      console.warn(`[ESP32] Cannot send command ${cmd}, disconnected.`);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    console.log('[ESP32] Reconnecting in 3s...');
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }

  private updateState(newState: WSConnectionState) {
    this.state = newState;
    this.stateListeners.forEach(cb => cb(this.state));
  }

  private notifyMessage(msg: Omit<WSMessage, 'time'>) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullMsg: WSMessage = { ...msg, time };
    
    this.history.push(fullMsg);
    if (this.history.length > 100) {
      this.history.shift();
    }

    this.msgListeners.forEach(cb => cb(fullMsg));
    this.historyListeners.forEach(cb => cb([...this.history]));
  }

  public onStateChange(cb: StateCallback) {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => this.stateListeners.delete(cb);
  }

  public onMessage(cb: MessageCallback) {
    this.msgListeners.add(cb);
    return () => this.msgListeners.delete(cb);
  }

  public onHistory(cb: HistoryCallback) {
    this.historyListeners.add(cb);
    cb([...this.history]);
    return () => this.historyListeners.delete(cb);
  }

  public getState() {
    return this.state;
  }
}

export const esp32WS = new ESP32WebSocketService();
