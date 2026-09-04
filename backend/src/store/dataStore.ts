import { Sensor, Device, ESP32Status, Automation, Alert, SensorReading } from '../models/types';

export const sensors: Sensor[] = [
  { id: 'dht-living', name: 'Living Room Sensor', location: 'Living Room', status: 'Normal', connected: true },
  { id: 'dht-bedroom', name: 'Bedroom Sensor', location: 'Bedroom', status: 'Normal', connected: true },
  { id: 'dht-kitchen', name: 'Kitchen Sensor', location: 'Kitchen', status: 'Warning', connected: true },
];

export const sensorHistory: Record<string, SensorReading[]> = {
  'dht-living': [],
  'dht-bedroom': [],
  'dht-kitchen': [],
};

export const devices: Device[] = [
  { id: 'dev-red-light', name: 'Red Light', location: 'Living Room', type: 'Light', gpio: 26, state: 'OFF', connected: true },
  { id: 'dev-green-light', name: 'Green Light', location: 'Bedroom', type: 'Light', gpio: 17, state: 'OFF', connected: true },
  { id: 'dev-yellow-light', name: 'Yellow Light', location: 'Kitchen', type: 'Light', gpio: 25, state: 'OFF', connected: true },
  { id: 'dev-blue-light', name: 'Blue Light', location: 'Hallway', type: 'Light', gpio: 19, state: 'OFF', connected: true },
];

export let esp32Status: ESP32Status = {
  status: 'Online',
  ipAddress: '192.168.1.100',
  wifiSignal: -54,
  uptime: '0h 0m',
  firmware: 'v1.0.0',
  lastHeartbeat: new Date().toISOString()
};

export function updateEsp32Status(status: Partial<ESP32Status>) {
  esp32Status = { ...esp32Status, ...status };
}

export const automations: Automation[] = [
  { id: 'auto-1', name: 'Cool down living room', trigger: 'Temperature > 30C', action: 'Living Room Light ON', enabled: true },
  { id: 'auto-2', name: 'Goodnight', trigger: '11:00 PM', action: 'Bedroom Light OFF', enabled: true },
  { id: 'auto-3', name: 'High humidity warning', trigger: 'Humidity > 75%', action: 'Kitchen Light ON', enabled: false },
];

export const alerts: Alert[] = [
  { id: 'alert-1', message: 'Kitchen humidity is high', type: 'warning', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), dismissed: false },
  { id: 'alert-2', message: 'Living room sensor connected', type: 'info', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), dismissed: false },
];
