/**
 * Minimal true-isometric projection helpers.
 *
 * Deliberately dependency-free: the production bundle has to live in the
 * ESP32's LittleFS partition, so a WebGL/three.js runtime is not an option.
 * Everything here emits plain SVG polygon point strings, which the browser
 * rasterises cheaply on desktop and mobile alike.
 *
 * Axes: +x runs right-and-down on screen, +y runs left-and-down, +z is up.
 * The camera therefore sits over the (max x, max y) corner of the plan.
 */

/** Pixels per plan unit. */
export const S = 30;

const KX = 0.8660254 * S; // cos(30deg)
const KY = 0.5 * S; // sin(30deg)
const KZ = S;

export type P3 = [number, number, number];

export function project(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * KX, (x + y) * KY - z * KZ];
}

export function pts(points: P3[]): string {
  return points
    .map(([x, y, z]) => {
      const [sx, sy] = project(x, y, z);
      return `${sx.toFixed(2)},${sy.toFixed(2)}`;
    })
    .join(' ');
}

export interface Box {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  z?: number;
}

export interface BoxFaces {
  top: string;
  right: string;
  left: string;
}

/**
 * The three faces of an axis-aligned box that face the camera:
 * the top (z = z1), the right face (x = x1) and the left face (y = y1).
 */
export function boxFaces(b: Box): BoxFaces {
  const z0 = b.z ?? 0;
  const z1 = z0 + b.h;
  const x0 = b.x;
  const x1 = b.x + b.w;
  const y0 = b.y;
  const y1 = b.y + b.d;

  return {
    top: pts([
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ]),
    right: pts([
      [x1, y0, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x1, y0, z0],
    ]),
    left: pts([
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
    ]),
  };
}

/** A flat horizontal rectangle (floor, rug, shower tray). */
export function slab(x: number, y: number, w: number, d: number, z = 0): string {
  return pts([
    [x, y, z],
    [x + w, y, z],
    [x + w, y + d, z],
    [x, y + d, z],
  ]);
}

/** A vertical rectangle lying in a y-plane (used for back-wall windows). */
export function faceY(x0: number, x1: number, y: number, z0: number, z1: number): string {
  return pts([
    [x0, y, z1],
    [x1, y, z1],
    [x1, y, z0],
    [x0, y, z0],
  ]);
}

/** A vertical rectangle lying in an x-plane (used for side-wall windows). */
export function faceX(x: number, y0: number, y1: number, z0: number, z1: number): string {
  return pts([
    [x, y0, z1],
    [x, y1, z1],
    [x, y1, z0],
    [x, y0, z0],
  ]);
}

/**
 * Painter's-algorithm sort key. For non-overlapping axis-aligned boxes seen
 * from the (+x, +y, +z) corner, drawing in ascending (x + y) puts far geometry
 * down first; z breaks ties for stacked items (duvet on bed, wall cabinets
 * over a counter).
 */
export function depthKey(b: Box): number {
  return (b.x + b.y) * 100 + (b.z ?? 0);
}

/** Multiply a hex colour towards black (amt < 0) or white (amt > 0). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Linear blend between two hex colours. t=0 returns a, t=1 returns b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = [16, 8, 0].map((sh) => {
    const ca = (pa >> sh) & 255;
    const cb = (pb >> sh) & 255;
    return Math.round(ca + (cb - ca) * t);
  });
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
