/**
 * THE single source of truth for the house: room geometry AND the Room ->
 * physical hardware mapping.
 *
 * Until now the same six rooms were declared twice - here as `ROOMS` (plan
 * rectangles, x/y) and again in components/house3d/model.ts as `ROOM_VOLUMES`
 * (x/z) - which meant every coordinate existed in two places under two axis
 * conventions and had to be kept in step by hand. `HOUSE_ROOMS` below is now
 * the only table of coordinates in the codebase. Everything else in this file,
 * and `ROOM_VOLUMES` in the 3D layer, is DERIVED from it:
 *
 *   HOUSE_ROOMS  ->  ROOMS / BATHROOM / GARAGE / GARAGE_BAYS   (this file)
 *                ->  ROOM_VOLUMES                              (house3d/model)
 *
 * Add or move a room in one place and the digital twin, room selection, room
 * controls and automation all follow.
 *
 * HARDWARE
 * The ESP32 exposes exactly four controllable LEDs. These are the ONLY
 * controllable lights in the system - no hardware is invented here.
 *
 *   Living Room -> Red LED    -> GPIO 26
 *   Bedroom     -> Green LED  -> GPIO 17
 *   Kitchen     -> Yellow LED -> GPIO 25
 *   Hallway     -> Blue LED   -> GPIO 19
 *
 * `color` is the ESP32 HTTP route segment (/red/on, /green/off, ...) and is a
 * hardware implementation detail only. The UI must NOT be coloured red/green/
 * yellow/blue because of it.
 *
 * COORDINATES
 * Metres, Three.js convention: X runs east, Z runs south, Y is up. The origin
 * is the north-west corner of the house. Footprint is 18.9 x 9 m including the
 * garage wing.
 */

export type LedColor = 'red' | 'green' | 'yellow' | 'blue';

/** The LED behind a room. Absent for rooms with no controllable hardware. */
export interface RoomHardware {
  /** Device name used by the mock backend. */
  deviceName: string;
  /** Short descriptor shown in the room detail panel. */
  description: string;
  /** ESP32 HTTP route segment. Hardware detail - never used as a UI colour. */
  color: LedColor;
  /** Physical GPIO pin. Also the join key against backend devices. */
  gpio: number;
}

/** One room: where it is, what it is called, and what hardware it has. */
export interface RoomSpec {
  id: string;
  /** Architectural room name shown in the UI. */
  name: string;
  /** North-west corner, metres. */
  x: number;
  z: number;
  /** Extent east (w) and south (d), metres. */
  w: number;
  d: number;
  /** Where the ceiling fixture hangs and the room light sits: [x, z]. */
  light: [number, number];
  /** Floor material tint. */
  floor: string;
  /** Only rooms with a real LED behind them carry this. */
  hardware?: RoomHardware;
}

/**
 * Every room in the building, in one table.
 *
 * Bath and garage have no controllable hardware. They exist so the plan reads
 * as a believable dwelling - they are never presented as controllable devices.
 */
export const HOUSE_ROOMS: RoomSpec[] = [
  {
    id: 'dev-red-light',
    name: 'Living Room',
    x: 0,
    z: 0,
    w: 6.6,
    d: 5.4,
    light: [3.0, 2.4],
    floor: '#c2a67f',
    hardware: {
      deviceName: 'Red Light',
      description: 'Open-plan lounge',
      color: 'red',
      gpio: 26,
    },
  },
  {
    id: 'dev-yellow-light',
    name: 'Kitchen',
    x: 6.6,
    z: 0,
    w: 5.4,
    d: 5.4,
    light: [9.3, 2.6],
    floor: '#c6ccce',
    hardware: {
      deviceName: 'Yellow Light',
      description: 'Galley kitchen & island',
      color: 'yellow',
      gpio: 25,
    },
  },
  {
    id: 'dev-blue-light',
    name: 'Hallway',
    x: 0,
    z: 5.4,
    w: 3.6,
    d: 3.6,
    light: [1.8, 7.2],
    floor: '#bab3a6',
    hardware: {
      deviceName: 'Blue Light',
      description: 'Entrance & circulation',
      color: 'blue',
      gpio: 19,
    },
  },
  {
    id: 'dev-green-light',
    name: 'Bedroom',
    x: 3.6,
    z: 5.4,
    w: 5.4,
    d: 3.6,
    light: [6.0, 7.0],
    floor: '#cdb389',
    hardware: {
      deviceName: 'Green Light',
      description: 'Master bedroom',
      color: 'green',
      gpio: 17,
    },
  },
  {
    id: 'bath',
    name: 'Bath',
    x: 9,
    z: 5.4,
    w: 3,
    d: 3.6,
    light: [10.5, 7.2],
    floor: '#c3c8c6',
  },
  {
    /**
     * The garage wing. Attached flush to the house's x=12 exterior wall so it
     * reads as part of the same building, not a detached prop.
     *
     * It holds two parking bays, but only ONE has a sensor: a single HC-SR04
     * is mounted on the inner wall of bay 1. Bay 2 is drawn and labelled as
     * unmonitored rather than being given an invented state - the UI must not
     * imply the hardware can watch two bays at once.
     */
    id: 'garage',
    name: 'Garage',
    x: 12.3,
    z: 2.4,
    w: 6.6,
    d: 6.6,
    light: [15.6, 5.7],
    floor: '#8f959e',
  },
];

/** The room table, keyed. Lookups below go through this. */
const BY_ID = new Map(HOUSE_ROOMS.map((r) => [r.id, r]));

function spec(id: string): RoomSpec {
  const room = BY_ID.get(id);
  if (!room) throw new Error(`Unknown room id "${id}" - not in HOUSE_ROOMS`);
  return room;
}

/** Overall building extent, derived rather than restated. */
export const HOUSE_FOOTPRINT = {
  x: 0,
  z: 0,
  w: HOUSE_ROOMS.reduce((max, r) => Math.max(max, r.x + r.w), 0),
  d: HOUSE_ROOMS.reduce((max, r) => Math.max(max, r.z + r.d), 0),
};

// ------------------------------------------------- Derived: plan rectangles --

/**
 * Plan rectangle in the legacy x/y naming. `y` here is the same axis as `z`
 * in HOUSE_ROOMS - it is a plan depth, not a height.
 */
export interface PlanRect {
  x: number;
  y: number;
  w: number;
  d: number;
}

const planOf = (r: RoomSpec): PlanRect => ({ x: r.x, y: r.z, w: r.w, d: r.d });

export interface RoomDef {
  /** Matches the Express mock backend device id so both modes share one shape. */
  id: string;
  /** Architectural room name shown in the UI. */
  name: string;
  /** Device name used by the mock backend. */
  deviceName: string;
  /** Short descriptor shown in the room detail panel. */
  description: string;
  /** ESP32 HTTP route segment. Hardware detail - never used as a UI colour. */
  color: LedColor;
  /** Physical GPIO pin. Also the join key against backend devices. */
  gpio: number;
  /** Floor-plan rectangle, derived from the room's geometry. */
  plan: PlanRect;
  /** Floor material tint. */
  floor: string;
}

/**
 * The four controllable rooms, derived from HOUSE_ROOMS. Order follows the
 * table, so this stays [Living, Kitchen, Hallway, Bedroom].
 */
export const ROOMS: RoomDef[] = HOUSE_ROOMS.filter((r) => r.hardware !== undefined).map((r) => {
  const hw = r.hardware as RoomHardware;
  return {
    id: r.id,
    name: r.name,
    deviceName: hw.deviceName,
    description: hw.description,
    color: hw.color,
    gpio: hw.gpio,
    plan: planOf(r),
    floor: r.floor,
  };
});

/** Bathroom. No controllable hardware - never presented as a device. */
export const BATHROOM: PlanRect & { name: string; floor: string } = {
  name: spec('bath').name,
  ...planOf(spec('bath')),
  floor: spec('bath').floor,
};

/** Garage wing. No controllable hardware; one HC-SR04 watches bay 1 only. */
export const GARAGE: PlanRect & { name: string; floor: string } = {
  name: spec('garage').name,
  ...planOf(spec('garage')),
  floor: spec('garage').floor,
};

// ------------------------------------------------------ Derived: garage bays --

export interface GarageBay {
  id: number;
  /** True only for the bay the ultrasonic sensor actually faces. */
  sensed: boolean;
  x: number;
  y: number;
  w: number;
  d: number;
}

/** Margin from the garage walls to a bay, and the gap between the two bays. */
const BAY_INSET = 0.35;
const BAY_GAP = 0.3;

/** Building dimensions are drawn to the centimetre; float dust is not. */
const cm = (v: number) => Math.round(v * 100) / 100;

/** Both bays, laid out inside the garage rectangle rather than restated. */
export const GARAGE_BAYS: GarageBay[] = (() => {
  const g = spec('garage');
  const w = cm(g.w - BAY_INSET * 2);
  const d = cm((g.d - BAY_INSET * 2 - BAY_GAP) / 2);
  return [0, 1].map((i) => ({
    id: i + 1,
    sensed: i === 0,
    x: cm(g.x + BAY_INSET),
    y: cm(g.z + BAY_INSET + i * (d + BAY_GAP)),
    w,
    d,
  }));
})();

/** Where the HC-SR04 is mounted, on the house-side wall of bay 1. */
export const GARAGE_SENSOR_MOUNT = {
  x: spec('garage').x + 0.02,
  y: GARAGE_BAYS[0].y + GARAGE_BAYS[0].d / 2,
  z: 0.85,
};

// ------------------------------------------------------------------ Lookups --

export const roomByGpio = (gpio: number): RoomDef | undefined =>
  ROOMS.find((r) => r.gpio === gpio);

export const roomById = (id: string): RoomDef | undefined =>
  ROOMS.find((r) => r.id === id);

/** Any room, controllable or not, by id. Undefined rather than throwing. */
export const houseRoomById = (id: string): RoomSpec | undefined => BY_ID.get(id);
