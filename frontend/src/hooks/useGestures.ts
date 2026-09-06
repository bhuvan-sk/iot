import { useEffect, useRef, useState, useCallback } from 'react';
import { esp32WS } from '../services/esp32WebSocket';

export type GestureCommand = 'ONE_WAVE' | 'TWO_WAVES' | 'THREE_WAVES' | 'HOLD' | 'CANCEL';
export type GestureSpatialZone = 'BEDROOM' | 'LIVING_ROOM' | 'KITCHEN' | null;

export interface GestureState {
  enabled: boolean;
  lastCommand: GestureCommand | null;
  spatialZone: GestureSpatialZone;
  recognizedAt: number | null;
}

const GESTURE_CONFIG = {
  maxWaveDistance: 30, // anything beyond 30 is out of gesture range
  minWaveDurationMs: 50,
  maxWaveDurationMs: 1200,
  waveGapMaxMs: 1000, // time to wait for another wave
  holdDurationMs: 3000,
  cooldownDurationMs: 2000,
  hysteresisMs: 300 // time to settle in a zone
};

const determineZone = (d: number): GestureSpatialZone => {
  if (d >= 5 && d <= 10) return 'BEDROOM';
  if (d > 10 && d <= 20) return 'LIVING_ROOM';
  if (d > 20 && d <= 30) return 'KITCHEN';
  return null;
};

// Global state for enable/disable to survive unmounts
let globalGesturesEnabled = true;

export const useGestures = (onGesture?: (cmd: GestureCommand, zone: GestureSpatialZone) => void) => {
  const [state, setState] = useState<GestureState>({
    enabled: globalGesturesEnabled,
    lastCommand: null,
    spatialZone: null,
    recognizedAt: null
  });

  const toggleGestures = useCallback(() => {
    globalGesturesEnabled = !globalGesturesEnabled;
    setState(s => ({ ...s, enabled: globalGesturesEnabled }));
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;
  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;

  // Engine state
  const engine = useRef({
    state: 'IDLE' as 'IDLE' | 'TRACKING' | 'WAITING_FOR_NEXT_WAVE' | 'COOLDOWN',
    zone: null as GestureSpatialZone,
    zoneEntryTime: 0,
    waves: 0,
    lastWaveEndTime: 0,
    holdFired: false
  });

  useEffect(() => {
    const unsub = esp32WS.onMessage((msg) => {
      if (!globalGesturesEnabled) return;
      if (msg.distance === undefined || !msg.distanceValid) return;

      const d = msg.distance;
      const now = Date.now();
      const eng = engine.current;

      if (eng.state === 'COOLDOWN') {
        if (now - eng.lastWaveEndTime > GESTURE_CONFIG.cooldownDurationMs) {
          eng.state = 'IDLE';
          eng.zone = null;
          setState(s => ({ ...s, spatialZone: null, lastCommand: null }));
        }
        return;
      }

      const currentRawZone = determineZone(d);
      
      // Update stable zone for UI
      if (currentRawZone !== eng.zone) {
        if (currentRawZone !== null) {
          if (now - eng.zoneEntryTime > GESTURE_CONFIG.hysteresisMs) {
            eng.zone = currentRawZone;
            eng.zoneEntryTime = now;
            setState(s => ({ ...s, spatialZone: currentRawZone }));
          }
        } else {
          // Instantly leave zone if we pull away
          eng.zoneEntryTime = now;
        }
      } else {
        eng.zoneEntryTime = now; // reset hysteresis timer while in same zone
      }

      if (eng.state === 'IDLE') {
        if (currentRawZone !== null) {
          eng.state = 'TRACKING';
          eng.zoneEntryTime = now;
          eng.holdFired = false;
        }
      } 
      else if (eng.state === 'TRACKING') {
        if (currentRawZone !== null) {
          // Check hold
          if (!eng.holdFired && now - eng.zoneEntryTime > GESTURE_CONFIG.holdDurationMs) {
            eng.holdFired = true;
            eng.state = 'COOLDOWN';
            eng.lastWaveEndTime = now;
            eng.zone = null;
            setState(s => ({ ...s, lastCommand: 'HOLD', spatialZone: eng.zone, recognizedAt: now }));
            if (onGestureRef.current) onGestureRef.current('HOLD', eng.zone);
          }
        } else {
          // Pulled away
          const duration = now - eng.zoneEntryTime;
          if (duration >= GESTURE_CONFIG.minWaveDurationMs && duration <= GESTURE_CONFIG.maxWaveDurationMs && !eng.holdFired) {
            eng.waves++;
            eng.state = 'WAITING_FOR_NEXT_WAVE';
            eng.lastWaveEndTime = now;
          } else {
            // Cancel or too long/short
            eng.state = 'IDLE';
            if (!eng.holdFired && eng.waves > 0) {
               setState(s => ({ ...s, lastCommand: 'CANCEL', recognizedAt: now }));
               if (onGestureRef.current) onGestureRef.current('CANCEL', null);
            }
            eng.waves = 0;
            eng.zone = null;
            setState(s => ({ ...s, spatialZone: null }));
          }
        }
      }
      else if (eng.state === 'WAITING_FOR_NEXT_WAVE') {
        if (currentRawZone !== null) {
          // Back in! Another wave starts
          if (now - eng.lastWaveEndTime < GESTURE_CONFIG.waveGapMaxMs) {
            eng.state = 'TRACKING';
            eng.zoneEntryTime = now;
            eng.holdFired = false;
          } else {
            // Gap was too long, reset
            eng.state = 'TRACKING';
            eng.waves = 0;
            eng.zoneEntryTime = now;
            eng.holdFired = false;
          }
        } else {
          // Waiting...
          if (now - eng.lastWaveEndTime > GESTURE_CONFIG.waveGapMaxMs) {
            // Time's up, execute waves!
            const finalWaves = eng.waves;
            const finalZone = stateRef.current.spatialZone;
            
            eng.state = 'COOLDOWN';
            eng.lastWaveEndTime = now;
            eng.waves = 0;
            eng.zone = null;

            let cmd: GestureCommand = 'ONE_WAVE';
            if (finalWaves === 2) cmd = 'TWO_WAVES';
            if (finalWaves >= 3) cmd = 'THREE_WAVES';

            setState(s => ({ ...s, lastCommand: cmd, spatialZone: null, recognizedAt: now }));
            if (onGestureRef.current) onGestureRef.current(cmd, finalZone);
          }
        }
      }
    });

    return () => { unsub(); };
  }, []);

  return { state, toggleGestures };
};
