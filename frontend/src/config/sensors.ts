/**
 * Every tunable number for the sensor layer lives here.
 *
 * Thresholds are deliberately not scattered through components: the garage
 * occupancy distance and the ambient-light bands are physical calibration
 * values that depend on where the hardware is mounted, so they need one
 * obvious place to change.
 */

// ---------------------------------------------------------------- Polling --

/** /sensors is polled about once a second, per the hardware brief. */
export const SENSOR_POLL_INTERVAL_MS = 1000;

/** Abort a poll that hangs so a slow board cannot stack up requests. */
export const SENSOR_REQUEST_TIMEOUT_MS = 2500;

/**
 * How long a successful reading stays trustworthy. Past this the UI marks the
 * HTTP channel stale rather than continuing to present the last number as if
 * it were current.
 */
export const SENSOR_STALE_AFTER_MS = 5000;

/** Consecutive failed polls before the HTTP channel is declared offline. */
export const SENSOR_FAILURES_BEFORE_OFFLINE = 3;

// ----------------------------------------------------- Garage occupancy ---

/**
 * One HC-SR04 is mounted in the garage. It measures distance to whatever is
 * in front of it - it cannot identify a car, and it cannot watch two bays at
 * once. The UI is built around that limit: only the sensed bay reports a
 * measured state, the other is explicitly "not sensed".
 */
export const GARAGE_SENSED_BAY = 1;

/** Below this, something substantial is parked in front of the sensor. */
export const GARAGE_OCCUPIED_BELOW_CM = 60;

/** Between occupied and this, something is in range but not parked. */
export const GARAGE_APPROACHING_BELOW_CM = 120;

export type GarageState = 'occupied' | 'approaching' | 'clear' | 'no-echo';

export function classifyGarage(distanceCm: number | null): GarageState {
  if (distanceCm === null || Number.isNaN(distanceCm)) return 'no-echo';
  if (distanceCm < GARAGE_OCCUPIED_BELOW_CM) return 'occupied';
  if (distanceCm < GARAGE_APPROACHING_BELOW_CM) return 'approaching';
  return 'clear';
}

export const GARAGE_STATE_LABEL: Record<GarageState, string> = {
  occupied: 'Vehicle detected',
  approaching: 'Object in range',
  clear: 'Bay clear',
  'no-echo': 'No echo',
};

// -------------------------------------------------------- Ambient light ---

/*
 * Raw-ADC scale and wiring direction now live in config/automation.ts, so the
 * automation engine and the display bands cannot drift apart.
 */
import { LDR_ADC_MAX, LIGHT_HIGHER_IS_BRIGHTER } from './automation';

export const LIGHT_ADC_MAX = LDR_ADC_MAX;

export type LightBand = 'dark' | 'dim' | 'normal' | 'bright';

/** Upper bound of each band, ascending. Tune to your room and divider. */
export const LIGHT_BAND_THRESHOLDS: { band: LightBand; upTo: number }[] = [
  { band: 'dark', upTo: 800 },
  { band: 'dim', upTo: 1800 },
  { band: 'normal', upTo: 3000 },
  { band: 'bright', upTo: LIGHT_ADC_MAX },
];

export function classifyLight(raw: number | null): LightBand | null {
  if (raw === null || Number.isNaN(raw)) return null;
  const value = LIGHT_HIGHER_IS_BRIGHTER ? raw : LIGHT_ADC_MAX - raw;
  for (const { band, upTo } of LIGHT_BAND_THRESHOLDS) {
    if (value <= upTo) return band;
  }
  return 'bright';
}

export const LIGHT_BAND_LABEL: Record<LightBand, string> = {
  dark: 'Dark',
  dim: 'Dim',
  normal: 'Normal',
  bright: 'Bright',
};
