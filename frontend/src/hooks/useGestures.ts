import { useEffect, useRef, useState } from 'react';
import { useSensors } from './useSensors';

export type GestureCommand = 'ONE_WAVE' | 'TWO_WAVES' | 'THREE_WAVES' | 'HOLD' | 'CANCEL';
export type GestureSpatialZone = 'BEDROOM' | 'LIVING_ROOM' | 'KITCHEN' | 'GARAGE' | null;

export interface GestureState {
  lastCommand: GestureCommand | null;
  spatialZone: GestureSpatialZone;
  activeSequence: number;
}

// Distance zones based on prompt
// 5-10cm = BEDROOM
// 10-20cm = LIVING ROOM
// 20-30cm = KITCHEN
// 30-40cm = GARAGE
const determineZone = (distance: number): GestureSpatialZone => {
  if (distance >= 5 && distance < 10) return 'BEDROOM';
  if (distance >= 10 && distance < 20) return 'LIVING_ROOM';
  if (distance >= 20 && distance < 30) return 'KITCHEN';
  if (distance >= 30 && distance <= 40) return 'GARAGE';
  return null;
};

// Temporal thresholds
// Since poll interval is 1s, temporal states must accommodate slow updates.
// We'll consider a "wave" as distance falling into a valid zone, then leaving it within 3-4 polls.
export const useGestures = () => {
  const sensors = useSensors();
  const distance = sensors.reading?.distance ?? null;
  const valid = sensors.reading?.distanceValid ?? false;

  const [state, setState] = useState<GestureState>({
    lastCommand: null,
    spatialZone: null,
    activeSequence: 0
  });

  const history = useRef<{ ts: number, dist: number }[]>([]);
  const waveCount = useRef(0);
  const waveTimer = useRef<number | null>(null);
  const holding = useRef(false);

  useEffect(() => {
    if (!valid || distance === null) return;
    const now = Date.now();
    history.current.push({ ts: now, dist: distance });
    if (history.current.length > 10) history.current.shift(); // keep last 10s

    const zone = determineZone(distance);
    
    // HOLD detection
    if (zone && !holding.current) {
      // Check if we've been in roughly the same zone for 3 seconds (3 polls)
      const recent = history.current.slice(-4);
      if (recent.length >= 4) {
        const allInZone = recent.every(r => determineZone(r.dist) === zone);
        if (allInZone) {
          holding.current = true;
          setState({ lastCommand: 'HOLD', spatialZone: zone, activeSequence: 0 });
          return;
        }
      }
    }

    if (!zone && holding.current) {
      // Pulled hand away after hold
      holding.current = false;
      setState({ lastCommand: 'CANCEL', spatialZone: null, activeSequence: 0 });
      return;
    }

    // WAVE detection
    // A wave is a dip into a zone and back out
    const last = history.current[history.current.length - 2];
    if (last && zone === null && determineZone(last.dist) !== null && !holding.current) {
      const activeZone = determineZone(last.dist);
      waveCount.current += 1;
      
      if (waveTimer.current) window.clearTimeout(waveTimer.current);
      
      setState(s => ({ ...s, activeSequence: waveCount.current, spatialZone: activeZone }));
      
      // Wait to see if more waves happen
      waveTimer.current = window.setTimeout(() => {
        let cmd: GestureCommand = 'ONE_WAVE';
        if (waveCount.current === 2) cmd = 'TWO_WAVES';
        if (waveCount.current >= 3) cmd = 'THREE_WAVES';
        
        setState({ lastCommand: cmd, spatialZone: activeZone, activeSequence: 0 });
        waveCount.current = 0;
      }, 2500); // Wait 2.5s to resolve wave count
    }

  }, [distance, valid]);

  return state;
};
