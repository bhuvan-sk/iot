/**
 * THE single source of truth for the house: room geometry AND the Room ->
 * physical hardware mapping.
 *
 * HARDWARE
 * The ESP32 exposes exactly four controllable LEDs. These are the ONLY
 * controllable lights in the system - no hardware is invented here.
 *
 *   Living Room -> Red LED    -> GPIO 26
 *   Bedroom     -> Green LED  -> GPIO 17
 *   Kitchen     -> Yellow LED -> GPIO 25
 *   Garage      -> Blue LED   -> GPIO 19
 */

export type LedColor = 'red' | 'green' | 'yellow' | 'blue';

export interface RoomHardware {
  deviceName: string;
  description: string;
  color: LedColor;
  gpio: number;
}

export interface RoomSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  light: [number, number];
  floor: string;
  hardware?: RoomHardware;
}

// Total footprint: Living room + Kitchen = wide open space. 
// Bedroom private. Garage attached.
// Let's do a 12m x 10m footprint.
// Living Room: x:0, z:0, w:7, d:6
// Kitchen: x:7, z:0, w:5, d:6
// Bedroom: x:0, z:6, w:6, d:4
// Garage: x:6, z:6, w:6, d:6
export const HOUSE_ROOMS: RoomSpec[] = [
  {
    id: 'living',
    name: 'Living Room',
    x: 0,
    z: 0,
    w: 7.0,
    d: 6.0,
    light: [3.5, 3.0],
    floor: '#c2a67f',
    hardware: {
      deviceName: 'Red Light',
      description: 'Open-plan lounge',
      color: 'red',
      gpio: 26,
    },
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    x: 7.0,
    z: 0,
    w: 5.0,
    d: 6.0,
    light: [9.5, 3.0],
    floor: '#c6ccce',
    hardware: {
      deviceName: 'Yellow Light',
      description: 'Galley kitchen & island',
      color: 'yellow',
      gpio: 25,
    },
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    x: 0,
    z: 6.0,
    w: 6.0,
    d: 5.0,
    light: [3.0, 8.5],
    floor: '#cdb389',
    hardware: {
      deviceName: 'Green Light',
      description: 'Master bedroom',
      color: 'green',
      gpio: 17,
    },
  },
  {
    id: 'garage',
    name: 'Garage',
    x: 6.0,
    z: 6.0,
    w: 6.0,
    d: 6.0,
    light: [9.0, 9.0],
    floor: '#8f959e',
    hardware: {
      deviceName: 'Blue Light',
      description: 'Garage lighting',
      color: 'blue',
      gpio: 19,
    },
  },
];

const BY_ID = new Map(HOUSE_ROOMS.map((r) => [r.id, r]));

export const HOUSE_FOOTPRINT = {
  x: 0,
  z: 0,
  w: HOUSE_ROOMS.reduce((max, r) => Math.max(max, r.x + r.w), 0),
  d: HOUSE_ROOMS.reduce((max, r) => Math.max(max, r.z + r.d), 0),
};

export interface PlanRect {
  x: number;
  y: number;
  w: number;
  d: number;
}

const planOf = (r: RoomSpec): PlanRect => ({ x: r.x, y: r.z, w: r.w, d: r.d });

export interface RoomDef {
  id: string;
  name: string;
  deviceName: string;
  description: string;
  color: LedColor;
  gpio: number;
  plan: PlanRect;
  floor: string;
}

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

export interface GarageBay {
  id: number;
  sensed: boolean;
  x: number;
  y: number;
  w: number;
  d: number;
}

const BAY_INSET = 0.35;
const BAY_GAP = 0.3;
const cm = (v: number) => Math.round(v * 100) / 100;

export const GARAGE_BAYS: GarageBay[] = (() => {
  const g = BY_ID.get('garage')!;
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

export const GARAGE_SENSOR_MOUNT = {
  x: BY_ID.get('garage')!.x + 0.02,
  y: GARAGE_BAYS[0].y + GARAGE_BAYS[0].d / 2,
  z: 0.85,
};

export const roomByGpio = (gpio: number): RoomDef | undefined => ROOMS.find((r) => r.gpio === gpio);
export const roomById = (id: string): RoomDef | undefined => ROOMS.find((r) => r.id === id);
export const houseRoomById = (id: string): RoomSpec | undefined => BY_ID.get(id);
