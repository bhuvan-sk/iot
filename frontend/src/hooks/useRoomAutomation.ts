import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { roomAutomation } from '../services/roomAutomation';
import type { RoomEvaluation } from '../services/roomAutomation';
import type { RoomMode } from '../config/automation';

const subscribe = (cb: () => void) => roomAutomation.subscribe(() => cb());
const getSnapshot = () => roomAutomation.getEvaluations();

/**
 * Automation state for every room, plus the setters the room panel needs.
 *
 * The engine only publishes when a rendered field actually changes, so a
 * steady 1 Hz sensor stream does not re-render the tree.
 */
export const useRoomAutomation = () => {
  useEffect(() => {
    roomAutomation.start();
  }, []);

  const evaluations = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setMode = useCallback((roomId: string, mode: RoomMode) => {
    roomAutomation.setMode(roomId, mode);
  }, []);

  const setDarkness = useCallback((roomId: string, value: number) => {
    roomAutomation.setThresholds(roomId, { darknessThreshold: value });
  }, []);

  const setPresence = useCallback((roomId: string, value: number) => {
    roomAutomation.setThresholds(roomId, { presenceThresholdCm: value });
  }, []);

  return { evaluations, setMode, setDarkness, setPresence };
};

export type { RoomEvaluation };
