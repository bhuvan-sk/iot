export interface SensorReading {
  id: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface Sensor {
  id: string;
  name: string;
  location: string;
  status: 'Normal' | 'Warning' | 'Critical' | 'Offline';
  lastReading?: SensorReading;
  connected: boolean;
}

export interface Device {
  id: string;
  name: string;
  location: string;
  type: 'Light' | 'Switch' | 'Other';
  gpio: number;
  state: 'ON' | 'OFF';
  connected: boolean;
}

export interface ESP32Status {
  status: 'Online' | 'Offline';
  ipAddress: string;
  wifiSignal: number;
  uptime: string;
  firmware: string;
  lastHeartbeat: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: string;
  dismissed: boolean;
}
