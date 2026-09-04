/**
 * Single source of truth for the Room -> physical hardware mapping.
 *
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
 * `plan` is the architectural floor-plan rectangle in plan units, consumed by
 * the isometric renderer. Footprint is 12 x 9 units.
 */

export type LedColor = 'red' | 'green' | 'yellow' | 'blue';

export interface PlanRect {
  x: number;
  y: number;
  w: number;
  d: number;
}

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
  /** Floor-plan rectangle for the isometric renderer. */
  plan: PlanRect;
  /** Floor material tint for the isometric renderer. */
  floor: string;
}

export const ROOMS: RoomDef[] = [
  {
    id: 'dev-red-light',
    name: 'Living Room',
    deviceName: 'Red Light',
    description: 'Open-plan lounge',
    color: 'red',
    gpio: 26,
    plan: { x: 0, y: 0, w: 6.6, d: 5.4 },
    floor: '#c2a67f',
  },
  {
    id: 'dev-yellow-light',
    name: 'Kitchen',
    deviceName: 'Yellow Light',
    description: 'Galley kitchen & island',
    color: 'yellow',
    gpio: 25,
    plan: { x: 6.6, y: 0, w: 5.4, d: 5.4 },
    floor: '#c6ccce',
  },
  {
    id: 'dev-blue-light',
    name: 'Hallway',
    deviceName: 'Blue Light',
    description: 'Entrance & circulation',
    color: 'blue',
    gpio: 19,
    plan: { x: 0, y: 5.4, w: 3.6, d: 3.6 },
    floor: '#bab3a6',
  },
  {
    id: 'dev-green-light',
    name: 'Bedroom',
    deviceName: 'Green Light',
    description: 'Master bedroom',
    color: 'green',
    gpio: 17,
    plan: { x: 3.6, y: 5.4, w: 5.4, d: 3.6 },
    floor: '#cdb389',
  },
];

/**
 * Bathroom has no controllable hardware. It exists purely so the plan reads as
 * a believable dwelling - it is never presented as a controllable device.
 */
export const BATHROOM: PlanRect & { name: string; floor: string } = {
  name: 'Bath',
  x: 9,
  y: 5.4,
  w: 3,
  d: 3.6,
  floor: '#c3c8c6',
};

export const HOUSE_FOOTPRINT = { w: 12, d: 9 };

export const roomByGpio = (gpio: number): RoomDef | undefined =>
  ROOMS.find((r) => r.gpio === gpio);

export const roomById = (id: string): RoomDef | undefined =>
  ROOMS.find((r) => r.id === id);
