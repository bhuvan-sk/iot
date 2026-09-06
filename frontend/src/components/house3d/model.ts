/**
 * The building, in metres.
 *
 * Coordinate system is Three.js convention: X runs east, Z runs south, Y is up.
 *
 * ROOM GEOMETRY IS NOT DEFINED HERE. config/rooms.ts owns the one table of
 * rooms - position, size, light position and the LED behind each one - and
 * `ROOM_VOLUMES` below is a projection of it. This file owns only what is
 * genuinely architectural and has no meaning outside the 3D view: wall runs,
 * openings, thicknesses and ceiling height.
 *
 * Architectural direction is taken from design-ref.png: a CAD hidden-line
 * interior. White massing, black edges, dense wireframe on furniture, real
 * ceiling heights, full-height glazing with louvres, exposed structure you can
 * see through. Proportions are real building dimensions, not diagram units.
 */

import { HOUSE_ROOMS, HOUSE_FOOTPRINT } from '../../config/rooms';

export const CEILING_H = 2.8;
export const SLAB_T = 0.28;
export const WALL_T_EXT = 0.24;
export const WALL_T_INT = 0.11;

/** An opening punched through a wall: window, door or pass-through. */
export interface Opening {
  /** Distance along the wall from its start point, to the opening's start. */
  at: number;
  width: number;
  /** Height of the sill above the floor. 0 for a doorway. */
  sill: number;
  /** Height of the head above the floor. */
  head: number;
  kind: 'window' | 'door' | 'pass';
}

/**
 * A wall is a line on plan plus a thickness. Openings are cut by splitting the
 * run into solid pieces around them - no CSG, which keeps geometry cheap and
 * the edge lines clean.
 */
export interface WallSpec {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  t: number;
  h?: number;
  openings?: Opening[];
  /** Interior partitions read lighter than the exterior envelope. */
  interior?: boolean;
}

export interface RoomVolume {
  /** Matches HOUSE_ROOMS[].id in config/rooms.ts. */
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Where the ceiling fixture hangs and the room light sits. */
  light: [number, number];
  /** Rooms with a controllable LED. Bath and garage have none. */
  controllable: boolean;
}

// ---------------------------------------------------------------- Rooms ----

/**
 * The scene's view of the room table. Purely a projection of HOUSE_ROOMS -
 * every coordinate here comes from config/rooms.ts, none is authored twice.
 * `controllable` is simply "this room has an LED behind it".
 */
export const ROOM_VOLUMES: RoomVolume[] = HOUSE_ROOMS.map((r) => ({
  id: r.id,
  name: r.name,
  x: r.x,
  z: r.z,
  w: r.w,
  d: r.d,
  light: r.light,
  controllable: r.hardware !== undefined,
}));

export const FOOTPRINT = HOUSE_FOOTPRINT;

// ---------------------------------------------------------------- Walls ----

/**
 * Exterior envelope plus interior partitions. Openings follow the reference:
 * a dominant full-height glazed wall in the living room, generous windows
 * elsewhere, and real doorways rather than gaps.
 */
export const WALLS: WallSpec[] = [
  // ---- Exterior, north (z = 0) -------------------------------------------
  {
    id: 'ext-n',
    x1: 0, z1: 0, x2: 12, z2: 0, t: WALL_T_EXT,
    openings: [
      // The hero window: full-height glazing to the living room.
      { at: 1.0, width: 3.6, sill: 0.15, head: 2.45, kind: 'window' },
      { at: 7.6, width: 2.0, sill: 0.95, head: 2.3, kind: 'window' },
    ],
  },
  // ---- Exterior, west (x = 0) --------------------------------------------
  {
    id: 'ext-w',
    x1: 0, z1: 0, x2: 0, z2: 9, t: WALL_T_EXT,
    openings: [
      { at: 1.4, width: 2.4, sill: 0.15, head: 2.45, kind: 'window' },
      { at: 6.2, width: 1.4, sill: 0.95, head: 2.3, kind: 'window' },
    ],
  },
  // ---- Exterior, south (z = 9) : entrance ---------------------------------
  {
    id: 'ext-s',
    x1: 0, z1: 9, x2: 12, z2: 9, t: WALL_T_EXT,
    openings: [
      { at: 1.3, width: 1.1, sill: 0, head: 2.15, kind: 'door' },
      { at: 4.4, width: 2.2, sill: 0.5, head: 2.3, kind: 'window' },
      { at: 9.6, width: 1.0, sill: 1.3, head: 2.3, kind: 'window' },
    ],
  },
  // ---- Exterior, east of the house (x = 12), shared with the garage -------
  {
    id: 'ext-e',
    x1: 12, z1: 0, x2: 12, z2: 9, t: WALL_T_EXT,
    openings: [{ at: 4.6, width: 1.0, sill: 0, head: 2.15, kind: 'door' }],
  },

  // ---- Interior partitions ------------------------------------------------
  {
    id: 'int-living-kitchen',
    x1: 6.6, z1: 0, x2: 6.6, z2: 5.4, t: WALL_T_INT, interior: true,
    openings: [{ at: 3.3, width: 1.6, sill: 0, head: 2.3, kind: 'pass' }],
  },
  {
    id: 'int-front-rear',
    x1: 0, z1: 5.4, x2: 12, z2: 5.4, t: WALL_T_INT, interior: true,
    openings: [
      { at: 1.4, width: 1.4, sill: 0, head: 2.15, kind: 'pass' },
      { at: 5.0, width: 0.95, sill: 0, head: 2.15, kind: 'door' },
    ],
  },
  {
    id: 'int-hall-bed',
    x1: 3.6, z1: 5.4, x2: 3.6, z2: 9, t: WALL_T_INT, interior: true,
    openings: [{ at: 1.1, width: 0.95, sill: 0, head: 2.15, kind: 'door' }],
  },
  {
    id: 'int-bed-bath',
    x1: 9, z1: 5.4, x2: 9, z2: 9, t: WALL_T_INT, interior: true,
    openings: [{ at: 0.5, width: 0.85, sill: 0, head: 2.15, kind: 'door' }],
  },

  // ---- Garage envelope ----------------------------------------------------
  { id: 'gar-n', x1: 12.3, z1: 2.4, x2: 18.9, z2: 2.4, t: WALL_T_EXT },
  {
    id: 'gar-e',
    x1: 18.9, z1: 2.4, x2: 18.9, z2: 9, t: WALL_T_EXT,
    // The garage door: a wide opening, head high enough for a vehicle.
    openings: [{ at: 0.6, width: 5.2, sill: 0, head: 2.35, kind: 'pass' }],
  },
  { id: 'gar-s', x1: 12.3, z1: 9, x2: 18.9, z2: 9, t: WALL_T_EXT },
];

// ------------------------------------------------------------ Wall maths ---

export interface WallPiece {
  /** Centre position. */
  p: [number, number, number];
  /** Full size before rotation. */
  s: [number, number, number];
  /** Y rotation in radians. */
  ry: number;
}

export interface GlazingPanel {
  p: [number, number, number];
  /** width (along wall) x height */
  s: [number, number];
  ry: number;
  kind: 'window' | 'door' | 'pass';
}

/**
 * Splits a wall into the solid pieces that remain once its openings are cut,
 * and returns the glazing rectangles that fill the window holes.
 */
export function buildWall(w: WallSpec): { pieces: WallPiece[]; glazing: GlazingPanel[] } {
  const dx = w.x2 - w.x1;
  const dz = w.z2 - w.z1;
  const len = Math.hypot(dx, dz);
  // Rotating a box by ry about Y maps its local +X to (cos ry, 0, -sin ry).
  // To lay local +X along the wall direction (ux, uz) we need cos ry = ux and
  // sin ry = -uz, hence atan2(-dz, dx). The wall's thickness then runs along
  // local Z, so its outward normal is (0, 0, 1) before rotation.
  const ry = Math.atan2(-dz, dx);
  const h = w.h ?? CEILING_H;

  // Position a piece that spans [a,b] along the wall, between y0 and y1.
  const place = (a: number, b: number, y0: number, y1: number): WallPiece => {
    const mid = (a + b) / 2;
    const ux = dx / len;
    const uz = dz / len;
    return {
      p: [w.x1 + ux * mid, (y0 + y1) / 2, w.z1 + uz * mid],
      s: [b - a, y1 - y0, w.t],
      ry,
    };
  };

  const openings = [...(w.openings ?? [])].sort((a, b) => a.at - b.at);
  const pieces: WallPiece[] = [];
  const glazing: GlazingPanel[] = [];

  let cursor = 0;
  for (const o of openings) {
    if (o.at > cursor) pieces.push(place(cursor, o.at, 0, h));
    if (o.sill > 0) pieces.push(place(o.at, o.at + o.width, 0, o.sill));
    if (o.head < h) pieces.push(place(o.at, o.at + o.width, o.head, h));

    if (o.kind !== 'pass') {
      const mid = o.at + o.width / 2;
      const ux = dx / len;
      const uz = dz / len;
      glazing.push({
        p: [w.x1 + ux * mid, (o.sill + o.head) / 2, w.z1 + uz * mid],
        s: [o.width, o.head - o.sill],
        ry,
        kind: o.kind,
      });
    }
    cursor = o.at + o.width;
  }
  if (cursor < len) pieces.push(place(cursor, len, 0, h));

  return { pieces, glazing };
}

/** Every wall piece and glazing panel in the building, precomputed once. */
export const WALL_GEOMETRY = WALLS.map((w) => ({ spec: w, ...buildWall(w) }));
