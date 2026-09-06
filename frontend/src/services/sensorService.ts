import { esp32BaseUrl } from './deviceControl';
import {
  SENSOR_POLL_INTERVAL_MS,
  SENSOR_REQUEST_TIMEOUT_MS,
  SENSOR_STALE_AFTER_MS,
  SENSOR_FAILURES_BEFORE_OFFLINE,
} from '../config/sensors';
import { LDR_ADC_MAX } from '../config/automation';

/**
 * Polls GET http://<esp32-ip>/sensors for the readings that do not arrive over
 * the WebSocket - ultrasonic distance and the LDR.
 *
 * Same singleton + subscriber shape as esp32WebSocket.ts, for the same reason:
 * one interval and one in-flight request for the whole app, no matter how many
 * components are mounted.
 *
 * The DHT WebSocket is untouched and remains the source of truth for
 * temperature and humidity. /sensors also reports them, but only as a fallback
 * for the diagnostics view - the live path stays the WebSocket.
 */

export interface SensorReading {
  temperature: number | null;
  humidity: number | null;
  /** cm, or null when the ultrasonic returned no usable echo. */
  distance: number | null;
  distanceValid: boolean;
  /** Raw ADC count 0..ldrMax, or null when the LDR looks disconnected. */
  ldr: number | null;
  ldrAvailable: boolean;
  ldrMax: number;
  /** Current (held) PIR motion state. A live measurement. */
  motion: boolean;
  /**
   * Whether the FIRMWARE has the PIR feature configured and usable - not
   * whether a sensor is physically attached. A digital PIR idles LOW and an
   * unwired pin also reads LOW, so disconnection cannot be detected at all.
   * False here means the board is not offering the feature (old firmware, or
   * still warming up); it is never evidence that the sensor is missing.
   */
  motionSensorAvailable: boolean;
  receivedAt: number;
}

export type HttpChannel = 'connecting' | 'online' | 'offline';

export interface SensorState {
  reading: SensorReading | null;
  channel: HttpChannel;
  /** True when the last good reading is older than SENSOR_STALE_AFTER_MS. */
  stale: boolean;
  lastError: string | null;
  lastUpdatedAt: number | null;
}

type Listener = (state: SensorState) => void;

const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

const INITIAL: SensorState = {
  reading: null,
  channel: useRealESP32 ? 'connecting' : 'offline',
  stale: false,
  lastError: useRealESP32 ? null : 'Mock mode: no ESP32 sensor endpoint',
  lastUpdatedAt: null,
};

/** Accepts a finite number, otherwise null. Never coerces junk into 0. */
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

class SensorService {
  private state: SensorState = INITIAL;
  private listeners: Set<Listener> = new Set();
  private timer: number | null = null;
  private inFlight: AbortController | null = null;
  private failures = 0;
  private staleTimer: number | null = null;
  private started = false;

  public start() {
    if (this.started || !useRealESP32) return;
    this.started = true;
    void this.poll();
    this.timer = window.setInterval(() => void this.poll(), SENSOR_POLL_INTERVAL_MS);
    // Re-evaluate staleness on its own cadence so the UI degrades even when
    // polls stop coming back at all.
    this.staleTimer = window.setInterval(() => this.checkStale(), 1000);
  }

  public stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.staleTimer !== null) window.clearInterval(this.staleTimer);
    this.inFlight?.abort();
    this.timer = null;
    this.staleTimer = null;
    this.inFlight = null;
    this.started = false;
  }

  private async poll() {
    // Never let a slow board stack requests: drop this tick instead.
    if (this.inFlight) return;

    const controller = new AbortController();
    this.inFlight = controller;
    const timeout = window.setTimeout(() => controller.abort(), SENSOR_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${esp32BaseUrl()}/sensors`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = (await response.json()) as Record<string, unknown>;

      /*
       * Three firmware generations are supported.
       *
       *   current: { ..., motion, motionSensorAvailable }
       *   prior:   { distance, distanceValid, ldr, ldrAvailable, ldrMax }
       *   older:   { distance, light }
       *
       * When the explicit validity flags are absent we derive them from the
       * values themselves rather than discarding a perfectly good reading.
       * An older board reporting a real 87cm echo must still drive the UI.
       */
      const distance = num(raw.distance);
      const distanceValid =
        typeof raw.distanceValid === 'boolean'
          ? raw.distanceValid && distance !== null
          : // no flag: a finite reading inside the HC-SR04's usable window
            distance !== null && distance >= 2 && distance <= 400;

      const ldrMax = num(raw.ldrMax) ?? LDR_ADC_MAX;
      const ldrValue = num(raw.ldr) ?? num(raw.light);
      const ldrAvailable =
        typeof raw.ldrAvailable === 'boolean'
          ? raw.ldrAvailable && ldrValue !== null
          : // No flag to trust. A reading pinned at exactly 0 or at the rail is
            // indistinguishable from an unread pin, so it is reported as
            // unavailable rather than presented as real darkness.
            ldrValue !== null && ldrValue > 0 && ldrValue < ldrMax;

      /*
       * Motion. A firmware without the PIR feature sends neither field, and
       * that is reported as unavailable rather than as "no motion" - the two
       * are not the same claim. `motion` is forced false when the feature is
       * unavailable, so nothing downstream acts on a value the board never
       * sent. Note this is a statement about the firmware, not about whether
       * a PIR is physically plugged in, which is undetectable.
       */
      const motionSensorAvailable = raw.motionSensorAvailable === true;
      const motion = motionSensorAvailable && raw.motion === true;

      const reading: SensorReading = {
        temperature: num(raw.temperature),
        humidity: num(raw.humidity),
        distance,
        distanceValid,
        ldr: ldrAvailable ? ldrValue : null,
        ldrAvailable,
        ldrMax,
        motion,
        motionSensorAvailable,
        receivedAt: Date.now(),
      };

      this.failures = 0;
      this.update({
        reading,
        channel: 'online',
        stale: false,
        lastError: null,
        lastUpdatedAt: reading.receivedAt,
      });
    } catch (error) {
      this.failures += 1;
      const message = error instanceof Error ? error.message : 'Request failed';
      // Tolerate a blip; only declare the channel down after repeated misses.
      if (this.failures >= SENSOR_FAILURES_BEFORE_OFFLINE) {
        this.update({ ...this.state, channel: 'offline', lastError: message });
      } else {
        this.update({ ...this.state, lastError: message });
      }
    } finally {
      window.clearTimeout(timeout);
      this.inFlight = null;
    }
  }

  private checkStale() {
    const { lastUpdatedAt, stale } = this.state;
    if (lastUpdatedAt === null) return;
    const isStale = Date.now() - lastUpdatedAt > SENSOR_STALE_AFTER_MS;
    if (isStale !== stale) this.update({ ...this.state, stale: isStale });
  }

  private update(next: SensorState) {
    this.state = next;
    this.listeners.forEach((cb) => cb(next));
  }

  public subscribe(cb: Listener) {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState() {
    return this.state;
  }
}

export const sensorService = new SensorService();
