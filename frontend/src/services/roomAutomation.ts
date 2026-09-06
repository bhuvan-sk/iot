import { sensorService } from './sensorService';
import type { SensorState } from './sensorService';
import { deviceStore } from './deviceStore';
import { ROOMS } from '../config/rooms';
import {
  DEFAULT_ROOM_AUTOMATION,
  AUTOMATION_STORAGE_KEY,
  AUTOMATION_DEBOUNCE_MS,
  AUTOMATION_MIN_COMMAND_GAP_MS,
  LDR_HYSTERESIS,
  PRESENCE_HYSTERESIS_CM,
  brightness,
} from '../config/automation';
import type { RoomAutomationConfig, RoomMode, AutomationVerdict } from '../config/automation';

/**
 * The automation engine.
 *
 *   lightOn = darkEnough && presenceDetected
 *
 * One engine for all rooms, driven by the shared sensor feed. Per room it
 * keeps three pieces of latched state so the LEDs behave:
 *
 *   1. HYSTERESIS - "dark" and "present" are sticky. Once a room is dark it
 *      stays dark until brightness climbs past threshold + margin. Same for
 *      presence in centimetres. A reading hovering exactly on a threshold
 *      therefore cannot oscillate.
 *   2. DEBOUNCE - a newly desired state must hold for AUTOMATION_DEBOUNCE_MS
 *      before any command is sent.
 *   3. DIFFING - a command only goes out when desired !== the device's known
 *      state, and never more often than AUTOMATION_MIN_COMMAND_GAP_MS.
 *
 * MANUAL rooms are never touched. Switching a room back to AUTO lets the
 * engine resume on the next evaluation.
 */

export interface RoomEvaluation {
  roomId: string;
  mode: RoomMode;
  darknessThreshold: number;
  presenceThresholdCm: number;
  /** Latched, hysteresis-applied verdicts. null when the input is unusable. */
  dark: boolean | null;
  presence: boolean | null;
  desired: boolean | null;
  verdict: AutomationVerdict;
  /** True while a change is waiting out the debounce window. */
  settling: boolean;
}

type Listener = (state: Record<string, RoomEvaluation>) => void;

interface Latch {
  dark: boolean;
  presence: boolean;
  pendingDesired: boolean | null;
  pendingSince: number;
  lastCommandAt: number;
}

function loadConfig(): Record<string, RoomAutomationConfig> {
  const base: Record<string, RoomAutomationConfig> = {};
  ROOMS.forEach((r) => {
    base[r.id] = { ...(DEFAULT_ROOM_AUTOMATION[r.id] ?? DEFAULT_ROOM_AUTOMATION['dev-red-light']) };
  });
  try {
    const raw = localStorage.getItem(AUTOMATION_STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Record<string, Partial<RoomAutomationConfig>>;
    Object.entries(saved).forEach(([id, cfg]) => {
      if (base[id]) base[id] = { ...base[id], ...cfg };
    });
  } catch {
    /* corrupt or unavailable storage: fall back to defaults */
  }
  return base;
}

class RoomAutomationService {
  private config = loadConfig();
  private latches = new Map<string, Latch>();
  private evaluations: Record<string, RoomEvaluation> = {};
  private listeners = new Set<Listener>();
  private started = false;
  private unsubscribe: (() => void) | null = null;
  private applying = false;

  private latch(id: string): Latch {
    let l = this.latches.get(id);
    if (!l) {
      l = { dark: false, presence: false, pendingDesired: null, pendingSince: 0, lastCommandAt: 0 };
      this.latches.set(id, l);
    }
    return l;
  }

  public start() {
    if (this.started) return;
    this.started = true;
    this.unsubscribe = sensorService.subscribe((s) => void this.evaluate(s));
  }

  public stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.started = false;
  }

  // ------------------------------------------------------------ config ----

  public getConfig(roomId: string): RoomAutomationConfig {
    return this.config[roomId] ?? DEFAULT_ROOM_AUTOMATION['dev-red-light'];
  }

  public setMode(roomId: string, mode: RoomMode) {
    this.config[roomId] = { ...this.getConfig(roomId), mode };
    // Leaving AUTO drops any half-settled decision so the room does not get a
    // stale command the moment it is switched back.
    const l = this.latch(roomId);
    l.pendingDesired = null;
    this.persist();
    void this.evaluate(sensorService.getState());
  }

  public setThresholds(roomId: string, patch: Partial<Pick<RoomAutomationConfig, 'darknessThreshold' | 'presenceThresholdCm'>>) {
    this.config[roomId] = { ...this.getConfig(roomId), ...patch };
    this.persist();
    void this.evaluate(sensorService.getState());
  }

  private persist() {
    try {
      localStorage.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      /* storage unavailable - settings simply won't survive a reload */
    }
  }

  // -------------------------------------------------------- evaluation ----

  private async evaluate(sensor: SensorState) {
    if (this.applying) return;

    const online = sensor.channel === 'online' && !sensor.stale;
    const ldrOk = online && sensor.reading?.ldrAvailable === true;
    const rawLdr = ldrOk ? (sensor.reading?.ldr ?? null) : null;
    const echoOk = online && sensor.reading?.distanceValid === true;
    const distance = echoOk ? (sensor.reading?.distance ?? null) : null;

    const now = Date.now();
    const next: Record<string, RoomEvaluation> = {};
    const commands: { id: string; on: boolean }[] = [];

    for (const room of ROOMS) {
      const cfg = this.getConfig(room.id);
      const l = this.latch(room.id);

      // --- darkness, with sticky hysteresis -------------------------------
      let dark: boolean | null = null;
      if (rawLdr !== null) {
        const b = brightness(rawLdr);
        dark = l.dark
          ? b < cfg.darknessThreshold + LDR_HYSTERESIS // stay dark until clearly brighter
          : b < cfg.darknessThreshold;
        l.dark = dark;
      }

      // --- presence, with sticky hysteresis -------------------------------
      let presence: boolean | null = null;
      if (distance !== null) {
        presence = l.presence
          ? distance <= cfg.presenceThresholdCm + PRESENCE_HYSTERESIS_CM
          : distance <= cfg.presenceThresholdCm;
        l.presence = presence;
      }

      // --- verdict ---------------------------------------------------------
      let verdict: AutomationVerdict;
      let desired: boolean | null = null;

      if (cfg.mode === 'MANUAL') {
        verdict = 'manual';
      } else if (!online) {
        verdict = 'offline';
      } else if (dark === null) {
        verdict = 'no-ldr';
      } else if (presence === null) {
        verdict = 'no-echo';
      } else {
        desired = dark && presence;
        verdict = desired ? 'on' : !dark ? 'bright' : 'no-presence';
      }

      // --- debounce + diff --------------------------------------------------
      let settling = false;
      if (desired !== null) {
        if (l.pendingDesired !== desired) {
          l.pendingDesired = desired;
          l.pendingSince = now;
        }
        const held = now - l.pendingSince >= AUTOMATION_DEBOUNCE_MS;
        const device = deviceStore.getDevices().find((d) => d.id === room.id);
        const current = device?.state === 'ON';
        settling = !held && current !== desired;

        if (held && current !== desired && now - l.lastCommandAt >= AUTOMATION_MIN_COMMAND_GAP_MS) {
          l.lastCommandAt = now;
          commands.push({ id: room.id, on: desired });
        }
      } else {
        l.pendingDesired = null;
      }

      next[room.id] = {
        roomId: room.id,
        mode: cfg.mode,
        darknessThreshold: cfg.darknessThreshold,
        presenceThresholdCm: cfg.presenceThresholdCm,
        dark,
        presence,
        desired,
        verdict,
        settling,
      };
    }

    this.publish(next);

    if (commands.length) {
      this.applying = true;
      try {
        for (const c of commands) {
          await deviceStore.setDevice(c.id, c.on ? 'ON' : 'OFF');
        }
      } finally {
        this.applying = false;
      }
    }
  }

  private publish(next: Record<string, RoomEvaluation>) {
    // Only notify when something a component renders has actually changed,
    // so a steady sensor stream does not re-render the tree every second.
    const prev = this.evaluations;
    const changed = ROOMS.some((r) => {
      const a = prev[r.id];
      const b = next[r.id];
      if (!a) return true;
      return (
        a.mode !== b.mode ||
        a.dark !== b.dark ||
        a.presence !== b.presence ||
        a.desired !== b.desired ||
        a.verdict !== b.verdict ||
        a.settling !== b.settling ||
        a.darknessThreshold !== b.darknessThreshold ||
        a.presenceThresholdCm !== b.presenceThresholdCm
      );
    });
    if (!changed) return;
    this.evaluations = next;
    this.listeners.forEach((cb) => cb(next));
  }

  public subscribe(cb: Listener) {
    this.listeners.add(cb);
    cb(this.evaluations);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getEvaluations() {
    return this.evaluations;
  }
}

export const roomAutomation = new RoomAutomationService();
