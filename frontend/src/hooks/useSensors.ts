import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { sensorService } from '../services/sensorService';
import type { SensorState, HttpChannel } from '../services/sensorService';
import {
  classifyGarage,
  classifyLight,
  GARAGE_SENSED_BAY,
} from '../config/sensors';
import type { GarageState, LightBand } from '../config/sensors';

/**
 * The service pushes a new state object every second. If every component
 * subscribed to that object, the whole tree would re-render at 1 Hz including
 * the isometric house, which is by far the most expensive thing on the page.
 *
 * So the base hook is a selector: it only re-renders a component when the
 * slice that component actually reads has changed. The house subscribes to a
 * boolean, not to a distance in centimetres.
 */
function useSensorSelector<T>(
  selector: (state: SensorState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  useEffect(() => {
    sensorService.start();
  }, []);

  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cache = useRef<{ has: boolean; value: T }>({ has: false, value: undefined as T });

  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(sensorService.getState());
    if (!cache.current.has || !isEqual(cache.current.value, next)) {
      cache.current = { has: true, value: next };
    }
    return cache.current.value;
    // isEqual is expected to be a stable module-level function.
  }, [isEqual]);

  const subscribe = useCallback((onChange: () => void) => sensorService.subscribe(() => onChange()), []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const shallowEqual = <T extends Record<string, unknown>>(a: T, b: T) => {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => Object.is(a[k], b[k]));
};

/** Full sensor state. Use only where the raw numbers are actually displayed. */
export const useSensors = (): SensorState => useSensorSelector((s) => s);

/** Just the HTTP channel health - changes rarely, so re-renders are rare. */
export const useHttpChannel = (): HttpChannel => useSensorSelector((s) => s.channel);

export interface GarageInfo {
  state: GarageState;
  distanceCm: number | null;
  sensedBay: number;
  stale: boolean;
  online: boolean;
}

export const useGarage = (): GarageInfo =>
  useSensorSelector(
    (s) => ({
      state: s.channel === 'online' && !s.stale ? classifyGarage(s.reading?.distance ?? null) : 'no-echo',
      distanceCm: s.reading?.distanceValid ? (s.reading.distance ?? null) : null,
      sensedBay: GARAGE_SENSED_BAY,
      stale: s.stale,
      online: s.channel === 'online',
    }),
    shallowEqual,
  );

export interface AmbientLightInfo {
  /** True only when the firmware says the LDR reads plausibly. */
  available: boolean;
  raw: number | null;
  max: number;
  band: LightBand | null;
  online: boolean;
  stale: boolean;
}

export const useAmbientLight = (): AmbientLightInfo =>
  useSensorSelector((s) => {
    const available = s.channel === 'online' && s.reading?.ldrAvailable === true;
    const raw = available ? (s.reading?.ldr ?? null) : null;
    return {
      available,
      raw,
      max: s.reading?.ldrMax ?? 4095,
      band: classifyLight(raw),
      online: s.channel === 'online',
      stale: s.stale,
    };
  }, shallowEqual);

/** Boolean-only view for the house scene, which must not re-render at 1 Hz. */
export const useGarageOccupied = (): boolean =>
  useSensorSelector((s) => {
    if (s.channel !== 'online' || s.stale) return false;
    return classifyGarage(s.reading?.distance ?? null) === 'occupied';
  });
