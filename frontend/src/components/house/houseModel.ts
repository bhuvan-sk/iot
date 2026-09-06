import type { Box } from './isometric';

/**
 * The architectural model: a compact 12 x 9 unit single-storey dwelling,
 * described as axis-aligned solids for the isometric renderer.
 *
 * Section convention (standard architectural cutaway):
 *   - the two far exterior walls stay full height as a backdrop
 *   - every other wall is cut at 0.72 units so all interiors stay visible
 *   - no roof, so the plan reads like a physical presentation model
 */

export interface Solid extends Box {
  color: string;
  /** Room id (from ROOMS) this solid belongs to, for the lighting pass. */
  room?: string;
  opacity?: number;
}

export interface Rug {
  x: number;
  y: number;
  w: number;
  d: number;
  color: string;
  room: string;
}

export interface WindowPane {
  /** "y" lies in the back wall plane, "x" in the left wall plane. */
  axis: 'x' | 'y';
  a: number;
  b: number;
  at: number;
  z0: number;
  z1: number;
}

const WALL = '#dcd7cf';
const WALL_TALL_H = 2.5;
const WALL_CUT_H = 0.72;

const WOOD_DARK = '#6f5134';
const WOOD_MID = '#9a7550';
const FABRIC = '#7b8393';
const FABRIC_LIGHT = '#959cab';
const WHITE = '#ecebe6';
const OFFWHITE = '#cdc9c1';
const DARK = '#3a3e45';
const STONE = '#a8a49c';
const METAL = '#9aa0a6';
const PLANT = '#5d7a5a';
const POT = '#a8927a';
const SHADE_LAMP = '#e8dcc4';

export const BASE_SLAB: Box = { x: -0.55, y: -0.55, w: 13.1, d: 10.1, h: 0.4, z: -0.4 };

export const WALLS: Solid[] = [
  // Far exterior walls: full height, act as the backdrop
  { x: -0.3, y: -0.3, w: 12.6, d: 0.3, h: WALL_TALL_H, color: WALL },
  { x: -0.3, y: 0, w: 0.3, d: 9.3, h: WALL_TALL_H, color: WALL },

  // Near exterior walls: cut at section height
  { x: 12, y: -0.3, w: 0.3, d: 9.6, h: WALL_CUT_H, color: WALL },
  { x: -0.3, y: 9, w: 1.6, d: 0.3, h: WALL_CUT_H, color: WALL },
  { x: 2.6, y: 9, w: 9.7, d: 0.3, h: WALL_CUT_H, color: WALL }, // entrance opening 1.3 to 2.6

  // Interior partitions, with door openings
  // Living to Kitchen, passage at y 3.3 to 4.6
  { x: 6.6, y: 0, w: 0.16, d: 3.3, h: WALL_CUT_H, color: WALL },
  { x: 6.6, y: 4.6, w: 0.16, d: 0.8, h: WALL_CUT_H, color: WALL },
  // Front band to rear band, opening into the hallway at x 1.4 to 2.8
  { x: 0, y: 5.4, w: 1.4, d: 0.16, h: WALL_CUT_H, color: WALL },
  { x: 2.8, y: 5.4, w: 9.2, d: 0.16, h: WALL_CUT_H, color: WALL },
  // Hallway to Bedroom, door at y 6.5 to 7.5
  { x: 3.6, y: 5.4, w: 0.16, d: 1.1, h: WALL_CUT_H, color: WALL },
  { x: 3.6, y: 7.5, w: 0.16, d: 1.5, h: WALL_CUT_H, color: WALL },
  // Bedroom to Bathroom, ensuite door at y 5.9 to 6.8
  { x: 9, y: 5.4, w: 0.16, d: 0.5, h: WALL_CUT_H, color: WALL },
  { x: 9, y: 6.8, w: 0.16, d: 2.2, h: WALL_CUT_H, color: WALL },
];

/** Glazing on the two full-height walls. */
export const WINDOWS: WindowPane[] = [
  { axis: 'y', a: 1.2, b: 3.4, at: 0, z0: 0.85, z1: 2.05 }, // living, back wall
  { axis: 'y', a: 9.9, b: 11.4, at: 0, z0: 1.15, z1: 2.05 }, // kitchen, back wall
  { axis: 'x', a: 1.2, b: 3.2, at: 0, z0: 0.85, z1: 2.05 }, // living, left wall
  { axis: 'x', a: 7.2, b: 8.6, at: 0, z0: 0.85, z1: 2.05 }, // hallway, left wall
];

const LIVING = 'dev-red-light';
const KITCHEN = 'dev-yellow-light';
const HALL = 'dev-blue-light';
const BED = 'dev-green-light';
const BATH = 'bath';

export const RUGS: Rug[] = [
  { x: 1.1, y: 1.5, w: 3.9, d: 2.4, color: '#b09a7e', room: LIVING },
  { x: 4.2, y: 6.45, w: 3.4, d: 2.2, color: '#b3a184', room: BED },
  { x: 1.15, y: 5.9, w: 1.3, d: 2.5, color: '#a99a86', room: HALL },
  { x: 1.35, y: 8.5, w: 1.2, d: 0.42, color: '#8c8579', room: HALL }, // doormat
  { x: 9.4, y: 7.3, w: 1.5, d: 1.4, color: '#b6bcbb', room: BATH }, // shower tray
];

export const FURNITURE: Solid[] = [
  // Living room
  { x: 2.1, y: 0.35, w: 2.7, d: 0.5, h: 0.48, color: WOOD_DARK, room: LIVING },
  { x: 2.6, y: 0.5, w: 1.7, d: 0.07, h: 0.92, z: 0.48, color: DARK, room: LIVING },
  { x: 2.5, y: 2.05, w: 1.5, d: 0.8, h: 0.34, color: WOOD_MID, room: LIVING },
  { x: 1.5, y: 3.15, w: 3.2, d: 0.95, h: 0.38, color: FABRIC, room: LIVING },
  { x: 1.62, y: 3.25, w: 2.96, d: 0.78, h: 0.1, z: 0.38, color: FABRIC_LIGHT, room: LIVING },
  { x: 1.5, y: 3.15, w: 0.28, d: 0.95, h: 0.6, color: FABRIC, room: LIVING },
  { x: 4.42, y: 3.15, w: 0.28, d: 0.95, h: 0.6, color: FABRIC, room: LIVING },
  { x: 1.5, y: 3.8, w: 3.2, d: 0.3, h: 0.78, color: FABRIC, room: LIVING },
  { x: 5.5, y: 1.5, w: 0.5, d: 0.5, h: 0.5, color: WOOD_MID, room: LIVING },
  { x: 5.35, y: 2.5, w: 0.85, d: 0.85, h: 0.38, color: FABRIC, room: LIVING },
  { x: 5.35, y: 3.15, w: 0.85, d: 0.2, h: 0.72, color: FABRIC, room: LIVING },
  { x: 0.55, y: 2.9, w: 0.08, d: 0.08, h: 1.4, color: METAL, room: LIVING },
  { x: 0.35, y: 2.78, w: 0.48, d: 0.32, h: 0.3, z: 1.4, color: SHADE_LAMP, room: LIVING },
  { x: 6.0, y: 4.6, w: 0.42, d: 0.42, h: 0.42, color: POT, room: LIVING },
  { x: 5.92, y: 4.52, w: 0.58, d: 0.58, h: 0.62, z: 0.42, color: PLANT, room: LIVING },

  // Kitchen
  { x: 6.9, y: 0.3, w: 0.75, d: 0.68, h: 1.85, color: '#c6cad0', room: KITCHEN },
  { x: 7.75, y: 0.3, w: 3.75, d: 0.65, h: 0.88, color: OFFWHITE, room: KITCHEN },
  { x: 7.7, y: 0.25, w: 3.85, d: 0.72, h: 0.06, z: 0.88, color: STONE, room: KITCHEN },
  { x: 8.3, y: 0.4, w: 0.7, d: 0.45, h: 0.03, z: 0.94, color: METAL, room: KITCHEN },
  { x: 9.4, y: 0.4, w: 0.65, d: 0.45, h: 0.03, z: 0.94, color: DARK, room: KITCHEN },
  { x: 7.9, y: 0.3, w: 1.7, d: 0.36, h: 0.72, z: 1.45, color: WHITE, room: KITCHEN },
  { x: 7.9, y: 2.3, w: 2.9, d: 1.0, h: 0.86, color: OFFWHITE, room: KITCHEN },
  { x: 7.8, y: 2.2, w: 3.1, d: 1.2, h: 0.06, z: 0.86, color: STONE, room: KITCHEN },
  { x: 8.35, y: 3.62, w: 0.32, d: 0.32, h: 0.62, color: WOOD_DARK, room: KITCHEN },
  { x: 9.2, y: 3.62, w: 0.32, d: 0.32, h: 0.62, color: WOOD_DARK, room: KITCHEN },
  { x: 10.05, y: 3.62, w: 0.32, d: 0.32, h: 0.62, color: WOOD_DARK, room: KITCHEN },

  // Hallway
  { x: 0.3, y: 6.1, w: 0.45, d: 1.4, h: 0.78, color: WOOD_MID, room: HALL },
  { x: 0.42, y: 6.6, w: 0.28, d: 0.28, h: 0.12, z: 0.78, color: STONE, room: HALL },
  { x: 0.25, y: 7.9, w: 0.08, d: 0.7, h: 1.45, color: DARK, room: HALL },
  { x: 2.55, y: 7.9, w: 0.9, d: 0.42, h: 0.42, color: WOOD_MID, room: HALL },
  { x: 3.05, y: 5.85, w: 0.4, d: 0.4, h: 0.4, color: POT, room: HALL },
  { x: 2.97, y: 5.77, w: 0.56, d: 0.56, h: 0.6, z: 0.4, color: PLANT, room: HALL },

  // Bedroom
  { x: 4.62, y: 5.6, w: 2.1, d: 0.14, h: 0.95, color: FABRIC, room: BED },
  { x: 4.7, y: 5.75, w: 1.95, d: 2.2, h: 0.34, color: WOOD_DARK, room: BED },
  { x: 4.62, y: 5.7, w: 2.1, d: 2.3, h: 0.28, z: 0.34, color: WHITE, room: BED },
  { x: 4.78, y: 5.85, w: 0.85, d: 0.45, h: 0.16, z: 0.62, color: WHITE, room: BED },
  { x: 5.72, y: 5.85, w: 0.85, d: 0.45, h: 0.16, z: 0.62, color: WHITE, room: BED },
  { x: 4.62, y: 6.55, w: 2.1, d: 1.45, h: 0.12, z: 0.62, color: '#b6bec9', room: BED },
  { x: 4.1, y: 5.75, w: 0.46, d: 0.46, h: 0.5, color: WOOD_MID, room: BED },
  { x: 4.22, y: 5.87, w: 0.22, d: 0.22, h: 0.3, z: 0.5, color: SHADE_LAMP, room: BED },
  { x: 6.8, y: 5.75, w: 0.46, d: 0.46, h: 0.5, color: WOOD_MID, room: BED },
  { x: 6.92, y: 5.87, w: 0.22, d: 0.22, h: 0.3, z: 0.5, color: SHADE_LAMP, room: BED },
  { x: 4.9, y: 8.15, w: 1.7, d: 0.45, h: 0.42, color: FABRIC_LIGHT, room: BED },
  { x: 8.15, y: 6.3, w: 0.58, d: 1.9, h: 1.7, color: '#a98c66', room: BED },

  // Bathroom
  { x: 9.35, y: 5.7, w: 1.25, d: 0.55, h: 0.82, color: WOOD_MID, room: BATH },
  { x: 9.3, y: 5.65, w: 1.35, d: 0.62, h: 0.06, z: 0.82, color: WHITE, room: BATH },
  { x: 9.72, y: 5.78, w: 0.5, d: 0.36, h: 0.14, z: 0.88, color: WHITE, room: BATH },
  { x: 11.1, y: 5.7, w: 0.42, d: 0.2, h: 0.78, color: WHITE, room: BATH },
  { x: 11.1, y: 5.86, w: 0.42, d: 0.58, h: 0.42, color: WHITE, room: BATH },
  { x: 10.88, y: 7.3, w: 0.06, d: 1.4, h: 1.35, color: '#cfe2e8', opacity: 0.4, room: BATH },
];

// ---------------------------------------------------------------- Garage ---
//
// The garage wing uses exactly the same box vocabulary and section-cut height
// as the house, so it reads as one continuous building rather than a widget
// bolted onto the side.

const GARAGE_WALL = '#d3cec6';
const CAR_BODY = '#586274';
const CAR_GLASS = '#39414f';
const TYRE = '#23262b';
const SENSOR_BODY = '#2f353d';

/** Extends the plinth under the garage wing. */
export const GARAGE_SLAB: Box = { x: 12.0, y: 2.15, w: 7.15, d: 7.1, h: 0.4, z: -0.4 };

export const GARAGE_WALLS: Solid[] = [
  // Far wall (small y) - full height, continues the house backdrop line.
  { x: 12.3, y: 2.1, w: 6.6, d: 0.3, h: WALL_TALL_H, color: GARAGE_WALL },
  // Outer wall (max x) is the door side: cut low so both bays stay visible.
  { x: 18.9, y: 2.1, w: 0.3, d: 7.2, h: WALL_CUT_H, color: GARAGE_WALL },
  // Near wall (max y), cut at section height like the rest of the model.
  { x: 12.3, y: 9.0, w: 6.9, d: 0.3, h: WALL_CUT_H, color: GARAGE_WALL },
  // Kerb between the two bays - a low divider, not a full wall.
  { x: 12.65, y: 5.63, w: 5.9, d: 0.12, h: 0.14, color: '#7c828b' },
];

/** Painted bay outlines, drawn flat on the garage floor. */
export const GARAGE_BAY_MARKINGS = [
  { x: 12.65, y: 2.75, w: 5.9, d: 2.8 },
  { x: 12.65, y: 5.85, w: 5.9, d: 2.8 },
];

/**
 * A car, expressed in the same box language as the furniture.
 * Built at a bay origin so both bays can reuse it.
 */
export function carSolids(bayX: number, bayY: number): Solid[] {
  return [
    // lower body
    { x: bayX + 0.5, y: bayY + 0.55, w: 4.3, d: 1.75, h: 0.5, z: 0.18, color: CAR_BODY },
    // cabin, inset and set back
    { x: bayX + 1.45, y: bayY + 0.7, w: 2.0, d: 1.45, h: 0.42, z: 0.68, color: CAR_GLASS },
    // wheels
    { x: bayX + 1.0, y: bayY + 0.42, w: 0.72, d: 0.22, h: 0.36, color: TYRE },
    { x: bayX + 3.45, y: bayY + 0.42, w: 0.72, d: 0.22, h: 0.36, color: TYRE },
    { x: bayX + 1.0, y: bayY + 1.96, w: 0.72, d: 0.22, h: 0.36, color: TYRE },
    { x: bayX + 3.45, y: bayY + 1.96, w: 0.72, d: 0.22, h: 0.36, color: TYRE },
  ];
}

/** The HC-SR04 housing on the inner wall of bay 1. */
export const GARAGE_SENSOR: Solid = {
  x: 12.34,
  y: 3.85,
  w: 0.16,
  d: 0.42,
  h: 0.2,
  z: 0.8,
  color: SENSOR_BODY,
};
