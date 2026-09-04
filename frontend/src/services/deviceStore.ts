import type { Device } from '../types';
import { ROOMS, roomById } from '../config/rooms';
import { getDevices, toggleDevice as toggleDeviceApi } from './api';
import { setLed } from './deviceControl';

type DevicesCallback = (devices: Device[]) => void;

/**
 * Shared device state, following the same singleton + subscriber pattern as
 * esp32WebSocket.ts so the whole app reads one truth.
 *
 * REAL mode  (VITE_USE_REAL_ESP32=true):
 *   The device list is seeded from the static room/hardware map. The firmware
 *   drives all four LEDs LOW on boot, so 'OFF' is the correct initial state.
 *   Toggling goes straight out over the existing LED HTTP route. The Express
 *   backend is never contacted - this is what lets the dashboard run with
 *   nothing but the ESP32 on the network.
 *
 * MOCK mode  (VITE_USE_REAL_ESP32=false):
 *   Unchanged from before - the list is fetched from the Express backend and
 *   toggles POST to /api/devices/:id/toggle, then refresh.
 */
class DeviceStore {
  private useRealESP32: boolean = import.meta.env.VITE_USE_REAL_ESP32 === 'true';
  private devices: Device[] = [];
  private listeners: Set<DevicesCallback> = new Set();
  private pollInterval: number | null = null;
  private started = false;

  private seedFromRooms(): Device[] {
    return ROOMS.map((room) => ({
      id: room.id,
      name: room.deviceName,
      location: room.name,
      type: 'Light' as const,
      gpio: room.gpio,
      state: 'OFF' as const,
      connected: true,
    }));
  }

  public start() {
    if (this.started) return;
    this.started = true;

    if (this.useRealESP32) {
      // No backend round-trip: the hardware map is the device list.
      this.devices = this.seedFromRooms();
      this.notify();
      return;
    }

    void this.refresh();
    this.pollInterval = window.setInterval(() => void this.refresh(), 5000);
  }

  public stop() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.started = false;
  }

  /** Mock mode only - pulls the current device list from the Express backend. */
  public async refresh() {
    if (this.useRealESP32) return;
    try {
      this.devices = await getDevices();
      this.notify();
    } catch (error) {
      console.error('Failed to fetch devices', error);
    }
  }

  public async toggle(id: string) {
    const device = this.devices.find((d) => d.id === id);
    if (!device) return;
    const next: 'ON' | 'OFF' = device.state === 'ON' ? 'OFF' : 'ON';

    if (this.useRealESP32) {
      const room = roomById(id);
      if (!room) {
        console.warn(`[ESP32] No hardware mapping for device ${id}`);
        return;
      }
      try {
        await setLed(room.color, next === 'ON');
        this.setState(id, next);
      } catch (error) {
        console.error(`[ESP32] Failed to toggle ${device.name}`, error);
      }
      return;
    }

    try {
      const updated = await toggleDeviceApi(id);
      this.setState(id, updated.state);
    } catch (error) {
      console.error('Failed to toggle device', error);
    }
  }

  private setState(id: string, state: 'ON' | 'OFF') {
    this.devices = this.devices.map((d) => (d.id === id ? { ...d, state } : d));
    this.notify();
  }

  private notify() {
    const snapshot = [...this.devices];
    this.listeners.forEach((cb) => cb(snapshot));
  }

  public subscribe(cb: DevicesCallback) {
    this.listeners.add(cb);
    cb([...this.devices]);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getDevices() {
    return [...this.devices];
  }
}

export const deviceStore = new DeviceStore();
