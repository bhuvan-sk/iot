/**
 * Room automation: the single place every tunable number lives.
 *
 * THE CORE RULE
 *   lightOn = darkEnough && presenceDetected
 *
 * PHYSICAL REALITY, STATED PLAINLY
 *   There is ONE LDR (GPIO 34) and ONE HC-SR04 (TRIG 18 / ECHO 16) on the
 *   whole board. There is not a sensor per room and the UI never pretends
 *   otherwise. What is per-room is the *interpretation*: each room owns its
 *   own darkness and presence thresholds, so the same shared reading can mean
 *   "dark enough" for the hallway and "still bright" for the kitchen.
 */

/** ESP32 ADC is 12-bit. Raw counts, deliberately not lux - never calibrated. */
export const LDR_ADC_MAX = 4095;

/**
 * Wiring direction. With the usual divider (LDR to 3V3, fixed resistor to
 * GND) a higher count means more light. Flip this single flag if your divider
 * is the other way round and Bright/Dark read backwards - nothing else needs
 * to change.
 */
export const LIGHT_HIGHER_IS_BRIGHTER = true;

/** Normalises a raw count so larger always means brighter. */
export function brightness(raw: number): number {
  return LIGHT_HIGHER_IS_BRIGHTER ? raw : LDR_ADC_MAX - raw;
}

// ------------------------------------------------------------- Timing -----

/** Matches the /sensors poll; automation re-evaluates on each new reading. */
export const AUTOMATION_EVAL_INTERVAL_MS = 1000;

/**
 * A desired state must hold this long before a command goes out. Combined
 * with the hysteresis below, this is what stops ON/OFF/ON/OFF chatter when a
 * reading sits on a threshold.
 */
export const AUTOMATION_DEBOUNCE_MS = 1500;

/** Never resend the same command faster than this, even if state flaps. */
export const AUTOMATION_MIN_COMMAND_GAP_MS = 2000;

// --------------------------------------------------------- Hysteresis -----

/**
 * Once a room is judged dark it stays dark until brightness rises past
 * threshold + this margin. Same idea for presence, in centimetres.
 */
export const LDR_HYSTERESIS = 120;
export const PRESENCE_HYSTERESIS_CM = 10;

// ------------------------------------------------------- Room defaults ----

export type RoomMode = 'AUTO' | 'MANUAL';

export interface RoomAutomationConfig {
  mode: RoomMode;
  /** Brightness below this counts as dark, in raw ADC counts. */
  darknessThreshold: number;
  /** Distance at or below this counts as presence, in cm. */
  presenceThresholdCm: number;
}

export const THRESHOLD_LIMITS = {
  darkness: { min: 0, max: LDR_ADC_MAX, step: 50 },
  presence: { min: 5, max: 400, step: 5 },
} as const;

/**
 * Starting defaults only - every one is editable from the room panel and
 * persisted per room.
 *
 * Rooms default to MANUAL. Automation that starts driving real LEDs the
 * first time the page loads would be a surprise, not a feature; the operator
 * opts in per room.
 */
export const DEFAULT_ROOM_AUTOMATION: Record<string, RoomAutomationConfig> = {
  // Living Room - red, GPIO 26
  'dev-red-light': { mode: 'MANUAL', darknessThreshold: 1200, presenceThresholdCm: 100 },
  // Bedroom - green, GPIO 17
  'dev-green-light': { mode: 'MANUAL', darknessThreshold: 1000, presenceThresholdCm: 80 },
  // Kitchen - yellow, GPIO 25
  'dev-yellow-light': { mode: 'MANUAL', darknessThreshold: 1400, presenceThresholdCm: 120 },
  // Hallway - blue, GPIO 19
  'dev-blue-light': { mode: 'MANUAL', darknessThreshold: 800, presenceThresholdCm: 100 },
};

export const AUTOMATION_STORAGE_KEY = 'smarthome.roomAutomation.v1';

// --------------------------------------------------------- Vocabulary ----

/** Why a room's automation is or isn't driving the light right now. */
export type AutomationVerdict =
  | 'manual'          // operator holds control
  | 'offline'         // ESP32 unreachable
  | 'no-ldr'          // ambient sensor unavailable
  | 'no-echo'         // ultrasonic gave no usable reading
  | 'on'              // dark AND presence -> light held on
  | 'bright'          // room is bright enough, so off
  | 'no-presence';    // dark, but nobody there

export const VERDICT_LABEL: Record<AutomationVerdict, string> = {
  manual: 'Manual control',
  offline: 'ESP32 offline',
  'no-ldr': 'Ambient sensor unavailable',
  'no-echo': 'No ultrasonic echo',
  on: 'Dark + presence — light on',
  bright: 'Bright enough — light off',
  'no-presence': 'No presence — light off',
};
