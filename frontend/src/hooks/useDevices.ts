import { useEffect, useState } from 'react';
import { deviceStore } from '../services/deviceStore';
import type { Device } from '../types';

/**
 * Shared live device state. Every consumer (3D house, room panel, toggles)
 * reads the same store, so a light switched from the house is instantly
 * reflected everywhere.
 */
export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>(deviceStore.getDevices());

  useEffect(() => {
    deviceStore.start();
    return deviceStore.subscribe(setDevices);
  }, []);

  return {
    devices,
    toggle: (id: string) => deviceStore.toggle(id),
    refresh: () => deviceStore.refresh(),
  };
};
