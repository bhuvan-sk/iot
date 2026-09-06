import { useEffect, useRef, useState, useCallback } from 'react';
import { esp32WS } from '../services/esp32WebSocket';

export type GestureCommand = 'ONE_WAVE' | 'CANCEL';
export type GestureSpatialZone = 'BEDROOM' | 'LIVING_ROOM' | 'KITCHEN' | 'GARAGE' | null;

export interface GestureState {
  enabled: boolean;
  lastCommand: GestureCommand | null;
  spatialZone: GestureSpatialZone;
  recognizedAt: number | null;
  devState?: string;
  devRawDistance?: number | null;
}

const GESTURE_CONFIG = {
  // Timing
  hysteresisMs: 150, // Minimum time hand must be stable in a zone to count
  waveDurationMaxMs: 1200, // Maximum time hand can stay in zone for a wave
  cooldownMs: 1000, // Time to ignore sensor after a successful wave
};

const determineZone = (d: number): GestureSpatialZone => {
  if (d >= 5 && d <= 10) return 'BEDROOM';
  if (d > 10 && d <= 20) return 'LIVING_ROOM';
  if (d > 20 && d <= 30) return 'KITCHEN';
  if (d > 30 && d <= 40) return 'GARAGE';
  return null;
};

let globalGesturesEnabled = true;

export const useGestures = (onGesture?: (cmd: GestureCommand, zone: GestureSpatialZone) => void) => {
  const [state, setState] = useState<GestureState>({
    enabled: globalGesturesEnabled,
    lastCommand: null,
    spatialZone: null,
    recognizedAt: null,
    devState: 'IDLE',
    devRawDistance: null,
  });

  const toggleGestures = useCallback(() => {
    globalGesturesEnabled = !globalGesturesEnabled;
    setState(s => ({ ...s, enabled: globalGesturesEnabled }));
  }, []);

  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;

  const engine = useRef({
    state: 'IDLE' as 'IDLE' | 'TRACKING_ZONE' | 'COOLDOWN',
    currentZone: null as GestureSpatialZone,
    zoneLockTime: 0,
    cooldownStartTime: 0,
  });

  useEffect(() => {
    const unsub = esp32WS.onMessage((msg) => {
      if (!globalGesturesEnabled) return;
      
      const d = (msg.distanceValid && msg.distance !== undefined) ? msg.distance : null;
      const now = Date.now();
      const eng = engine.current;
      const rawZone = d !== null ? determineZone(d) : null;

      // 1. COOLDOWN: Ignore all data until cooldown finishes
      if (eng.state === 'COOLDOWN') {
        if (now - eng.cooldownStartTime > GESTURE_CONFIG.cooldownMs) {
          eng.state = 'IDLE';
          eng.currentZone = null;
          setState(s => ({ ...s, devState: 'IDLE', devRawDistance: d, spatialZone: null }));
        } else {
          // Just update diagnostics without breaking cooldown
          setState(s => ({ ...s, devRawDistance: d }));
        }
        return;
      }

      // 2. IDLE: Look for a hand entering a zone
      if (eng.state === 'IDLE') {
        if (rawZone !== null) {
          eng.state = 'TRACKING_ZONE';
          eng.currentZone = rawZone;
          eng.zoneLockTime = now;
          setState(s => ({ ...s, devState: 'TRACKING_ZONE', devRawDistance: d, spatialZone: rawZone }));
        } else {
          setState(s => ({ ...s, devRawDistance: d })); // keep diag up to date
        }
        return;
      }

      // 3. TRACKING ZONE: Hand is present, wait for it to leave
      if (eng.state === 'TRACKING_ZONE') {
        if (rawZone === eng.currentZone) {
          // Hand is stable in the same zone. Update diag only.
          setState(s => ({ ...s, devRawDistance: d }));
        } else if (rawZone !== null) {
          // Hand shifted to a completely different zone (e.g. 5cm -> 25cm). Reset lock.
          eng.currentZone = rawZone;
          eng.zoneLockTime = now;
          setState(s => ({ ...s, devState: 'TRACKING_ZONE', devRawDistance: d, spatialZone: rawZone }));
        } else {
          // Hand left the zone! (d == null)
          // Check if it was a valid wave
          const timeInZone = now - eng.zoneLockTime;
          
          if (timeInZone >= GESTURE_CONFIG.hysteresisMs && timeInZone <= GESTURE_CONFIG.waveDurationMaxMs) {
            // VALID WAVE! Hand entered, stayed briefly, and left.
            const finalZone = eng.currentZone;
            eng.state = 'COOLDOWN';
            eng.cooldownStartTime = now;
            eng.currentZone = null;
            
            setState(s => ({ 
              ...s, 
              devState: 'COOLDOWN', 
              devRawDistance: d, 
              spatialZone: null, 
              lastCommand: 'ONE_WAVE', 
              recognizedAt: now 
            }));
            
            if (onGestureRef.current) onGestureRef.current('ONE_WAVE', finalZone);
            
          } else {
            // INVALID WAVE: Too fast (noise) or too slow (just holding hand there)
            eng.state = 'IDLE';
            eng.currentZone = null;
            
            setState(s => ({ 
              ...s, 
              devState: 'IDLE', 
              devRawDistance: d, 
              spatialZone: null, 
              lastCommand: 'CANCEL', 
              recognizedAt: now 
            }));
            
            if (onGestureRef.current) onGestureRef.current('CANCEL', null);
          }
        }
        return;
      }
    });

    return () => { unsub(); };
  }, []);

  return { state, toggleGestures };
};
