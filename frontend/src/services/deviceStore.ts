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
  /** Last LED command failure, surfaced in the diagnostics panel. */
  private lastError: string | null = null;

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
    if (!device) return false;
    return this.setDevice(id, device.state === 'ON' ? 'OFF' : 'ON');
  }

  /**
   * Drives one light to an explicit state and reports whether the hardware
   * confirmed it. Automatic lighting needs "make it ON" rather than "flip it",
   * and it needs to know whether the command actually landed.
   *
   * Local state is only updated after the ESP32 answers, so a light is never
   * shown as switched when the command failed.
   */
  public async setDevice(id: string, next: 'ON' | 'OFF'): Promise<boolean> {
    const device = this.devices.find((d) => d.id === id);
    if (!device) return false;
    if (device.state === next) return true;

    if (this.useRealESP32) {
      const room = roomById(id);
      if (!room) {
        console.warn(`[ESP32] No hardware mapping for device ${id}`);
        return false;
      }
      try {
        await setLed(room.color, next === 'ON');
        this.lastError = null;
        this.setState(id, next);
        return true;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'LED request failed';
        console.error(`[ESP32] Failed to switch ${device.name}`, error);
        this.notify();
        return false;
      }
    }

    try {
      const updated = await toggleDeviceApi(id);
      this.setState(id, updated.state);
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Toggle failed';
      console.error('Failed to toggle device', error);
      this.notify();
      return false;
    }
  }

  public getLastError() {
    return this.lastError;
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
