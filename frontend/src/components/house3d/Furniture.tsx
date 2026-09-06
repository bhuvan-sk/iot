import React from 'react';
import { CadBox, CadPlate, CAD } from './Cad';

/**
 * Furniture, built to the density of design-ref.png.
 *
 * Every piece is composed from segmented boxes carrying an interior quad
 * wireframe, which is what gives the reference its CAD-mesh character. Sizes
 * are real: a 2.2m sofa, a 0.45m seat height, a 2.1m wardrobe. Nothing here is
 * a diagram symbol.
 */

const WOOD = '#d9cbb6';
const FABRIC = '#dfe1e6';
const DARK = '#5b6472';
const PLANT = '#cfd8cd';

/** 3-seat sofa: plinth, seat cushions, back, arms. */
export const Sofa: React.FC<{ p: [number, number]; ry?: number; w?: number }> = ({ p, ry = 0, w = 2.3 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.17, 0]} size={[w, 0.34, 0.95]} segments={[8, 2, 4]} mesh color={FABRIC} />
    {/* seat cushions */}
    <CadBox position={[-w / 4, 0.42, 0.04]} size={[w / 2 - 0.04, 0.16, 0.8]} segments={[4, 1, 3]} mesh color={FABRIC} />
    <CadBox position={[w / 4, 0.42, 0.04]} size={[w / 2 - 0.04, 0.16, 0.8]} segments={[4, 1, 3]} mesh color={FABRIC} />
    {/* back */}
    <CadBox position={[0, 0.52, -0.38]} size={[w, 0.7, 0.22]} segments={[8, 3, 1]} mesh color={FABRIC} />
    {/* arms */}
    <CadBox position={[-w / 2 + 0.11, 0.42, 0]} size={[0.22, 0.5, 0.95]} segments={[1, 2, 4]} mesh color={FABRIC} />
    <CadBox position={[w / 2 - 0.11, 0.42, 0]} size={[0.22, 0.5, 0.95]} segments={[1, 2, 4]} mesh color={FABRIC} />
  </group>
);

/** Armchair, the cropped one at the right edge of the reference. */
export const Armchair: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.2, 0]} size={[0.85, 0.4, 0.85]} segments={[4, 2, 4]} mesh color={FABRIC} />
    <CadBox position={[0, 0.45, 0.02]} size={[0.72, 0.14, 0.7]} segments={[3, 1, 3]} mesh color={FABRIC} />
    <CadBox position={[0, 0.6, -0.34]} size={[0.85, 0.72, 0.18]} segments={[4, 3, 1]} mesh color={FABRIC} />
    <CadBox position={[-0.36, 0.46, 0]} size={[0.14, 0.42, 0.85]} segments={[1, 2, 4]} mesh color={FABRIC} />
    <CadBox position={[0.36, 0.46, 0]} size={[0.14, 0.42, 0.85]} segments={[1, 2, 4]} mesh color={FABRIC} />
  </group>
);

/** Low glass coffee table: thin top on a wire frame, as in the reference. */
export const CoffeeTable: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.38, 0]} size={[1.15, 0.04, 0.65]} segments={[6, 1, 4]} mesh color="#e9edf1" opacity={0.55} />
    <CadBox position={[0, 0.18, 0]} size={[1.0, 0.03, 0.52]} segments={[5, 1, 3]} mesh color={WOOD} />
    {[[-0.53, -0.29], [0.53, -0.29], [-0.53, 0.29], [0.53, 0.29]].map(([x, z], i) => (
      <CadBox key={i} position={[x, 0.19, z]} size={[0.035, 0.38, 0.035]} color={DARK} />
    ))}
  </group>
);

/** Wall-hung shelving with books - the strong vertical element on the left. */
export const Shelving: React.FC<{ p: [number, number]; ry?: number; levels?: number }> = ({
  p,
  ry = 0,
  levels = 4,
}) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 1.25, 0]} size={[0.06, 2.3, 0.34]} segments={[1, 8, 1]} mesh color="#dfe3e9" />
    {Array.from({ length: levels }).map((_, i) => {
      const y = 0.55 + i * 0.52;
      return (
        <group key={i}>
          <CadBox position={[0.5, y, 0]} size={[1.0, 0.04, 0.32]} segments={[5, 1, 2]} mesh color={WOOD} />
          {/* stacked books, alternating so the shelves do not read as a pattern */}
          <CadBox
            position={[0.2 + (i % 2) * 0.28, y + 0.13, 0]}
            size={[0.34, 0.22, 0.22]}
            segments={[4, 3, 1]}
            mesh
            color={DARK}
          />
        </group>
      );
    })}
  </group>
);

/** Media console under the wall shelving. */
export const Console: React.FC<{ p: [number, number]; ry?: number; w?: number }> = ({ p, ry = 0, w = 1.9 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.24, 0]} size={[w, 0.44, 0.42]} segments={[8, 2, 2]} mesh color={WOOD} />
    <CadBox position={[0, 0.02, 0]} size={[w - 0.2, 0.04, 0.36]} color={DARK} />
  </group>
);

/** Wall-mounted flat screen. */
export const Screen: React.FC<{ p: [number, number]; ry?: number; w?: number }> = ({ p, ry = 0, w = 1.3 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 1.35, 0]} size={[w, 0.75, 0.05]} segments={[8, 5, 1]} mesh color="#4d5765" />
  </group>
);

/** Potted tree. Two of these anchor the reference composition. */
export const Plant: React.FC<{ p: [number, number]; h?: number }> = ({ p, h = 1.5 }) => (
  <group position={[p[0], 0, p[1]]}>
    <CadBox position={[0, 0.19, 0]} size={[0.38, 0.38, 0.38]} segments={[3, 3, 3]} mesh color="#d8d2c6" />
    <CadBox position={[0, 0.42, 0]} size={[0.05, 0.42, 0.05]} color={DARK} />
    <CadBox position={[0, 0.42 + h * 0.36, 0]} size={[0.72, h * 0.62, 0.66]} segments={[5, 5, 5]} mesh color={PLANT} opacity={0.75} />
    <CadBox
      position={[0.12, 0.42 + h * 0.62, -0.06]}
      size={[0.52, h * 0.34, 0.48]}
      segments={[4, 4, 4]}
      mesh
      color={PLANT}
      opacity={0.7}
    />
  </group>
);

/** Linear pendant over the living area, hung from the ceiling. */
export const Pendant: React.FC<{ p: [number, number]; ceiling: number; on: boolean; w?: number }> = ({
  p,
  ceiling,
  on,
  w = 1.1,
}) => (
  <group position={[p[0], 0, p[1]]}>
    <CadBox position={[0, ceiling - 0.3, 0]} size={[0.015, 0.6, 0.015]} color={DARK} />
    <CadBox position={[0, ceiling - 0.62, 0]} size={[w, 0.08, 0.12]} segments={[8, 1, 1]} mesh color={DARK} />
    {/* The emissive underside is the only part that changes with LED state. */}
    <mesh position={[0, ceiling - 0.665, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w - 0.06, 0.09]} />
      <meshStandardMaterial
        color={on ? CAD.accent : '#9aa3af'}
        emissive={on ? CAD.accent : '#000000'}
        emissiveIntensity={on ? 2.2 : 0}
        toneMapped={false}
      />
    </mesh>
  </group>
);

/** Framed canvases leaning against the wall, as on the right of the reference. */
export const LeaningArt: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <group rotation={[0, 0, -0.07]}>
      <CadBox position={[0, 0.62, 0]} size={[0.9, 1.22, 0.04]} segments={[4, 6, 1]} mesh color="#e4e7ec" />
    </group>
    <group position={[0.34, 0, 0.1]} rotation={[0, 0, -0.1]}>
      <CadBox position={[0, 0.48, 0]} size={[0.7, 0.94, 0.04]} segments={[3, 5, 1]} mesh color="#dde1e7" />
    </group>
  </group>
);

/** Rug with the fine grid the reference draws underfoot. */
export const Rug: React.FC<{ p: [number, number]; size: [number, number] }> = ({ p, size }) => (
  <CadPlate
    position={[p[0], 0.008, p[1]]}
    size={size}
    color="#d5d9df"
    segments={[Math.round(size[0] * 5), Math.round(size[1] * 5)]}
    mesh
  />
);

/** Bed: base, mattress, duvet, pillows, headboard. */
export const Bed: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.17, 0]} size={[1.6, 0.34, 2.05]} segments={[6, 2, 8]} mesh color={WOOD} />
    <CadBox position={[0, 0.44, 0]} size={[1.55, 0.22, 2.0]} segments={[6, 1, 8]} mesh color="#eef0f3" />
    <CadBox position={[0, 0.57, 0.32]} size={[1.55, 0.06, 1.35]} segments={[6, 1, 6]} mesh color="#dfe3ea" />
    <CadBox position={[-0.38, 0.6, -0.78]} size={[0.62, 0.14, 0.36]} segments={[3, 1, 2]} mesh color="#f2f4f7" />
    <CadBox position={[0.38, 0.6, -0.78]} size={[0.62, 0.14, 0.36]} segments={[3, 1, 2]} mesh color="#f2f4f7" />
    <CadBox position={[0, 0.62, -1.06]} size={[1.7, 0.95, 0.1]} segments={[7, 4, 1]} mesh color={FABRIC} />
  </group>
);

export const Nightstand: React.FC<{ p: [number, number] }> = ({ p }) => (
  <group position={[p[0], 0, p[1]]}>
    <CadBox position={[0, 0.24, 0]} size={[0.44, 0.48, 0.4]} segments={[2, 2, 2]} mesh color={WOOD} />
    <CadBox position={[0, 0.58, 0]} size={[0.2, 0.2, 0.2]} segments={[2, 2, 2]} mesh color="#f0e6d2" />
  </group>
);

export const Wardrobe: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 1.05, 0]} size={[1.8, 2.1, 0.58]} segments={[6, 8, 2]} mesh color="#e2e6ec" />
  </group>
);

/** Kitchen run: base units, worktop, splashback, wall units, appliances. */
export const KitchenRun: React.FC<{ p: [number, number]; ry?: number; w?: number }> = ({ p, ry = 0, w = 3.6 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.44, 0]} size={[w, 0.88, 0.62]} segments={[Math.round(w * 2), 3, 2]} mesh color="#e6e9ee" />
    <CadBox position={[0, 0.91, 0]} size={[w + 0.06, 0.05, 0.66]} segments={[Math.round(w * 2), 1, 2]} mesh color="#cfd4da" />
    <CadBox position={[0, 1.78, -0.16]} size={[w * 0.62, 0.68, 0.34]} segments={[6, 3, 1]} mesh color="#eaedf1" />
    {/* hob + sink cut into the worktop */}
    <CadBox position={[-w * 0.22, 0.945, 0]} size={[0.58, 0.02, 0.42]} segments={[3, 1, 2]} mesh color={DARK} />
    <CadBox position={[w * 0.2, 0.945, 0]} size={[0.5, 0.02, 0.38]} segments={[3, 1, 2]} mesh color="#c3c9d1" />
  </group>
);

export const Island: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.43, 0]} size={[2.4, 0.86, 0.95]} segments={[8, 3, 3]} mesh color="#e6e9ee" />
    <CadBox position={[0, 0.89, 0]} size={[2.55, 0.05, 1.1]} segments={[8, 1, 3]} mesh color="#cfd4da" />
    {[-0.75, 0, 0.75].map((x, i) => (
      <group key={i} position={[x, 0, 0.85]}>
        <CadBox position={[0, 0.62, 0]} size={[0.34, 0.05, 0.34]} segments={[2, 1, 2]} mesh color={WOOD} />
        <CadBox position={[0, 0.3, 0]} size={[0.05, 0.6, 0.05]} color={DARK} />
      </group>
    ))}
  </group>
);

export const Fridge: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.9, 0]} size={[0.72, 1.8, 0.66]} segments={[3, 7, 2]} mesh color="#dfe4ea" />
  </group>
);

/** Bathroom: vanity, basin, WC, shower tray with a glass screen. */
export const Bathroom: React.FC<{ p: [number, number] }> = ({ p }) => (
  <group position={[p[0], 0, p[1]]}>
    <CadBox position={[0.35, 0.42, 0.3]} size={[1.15, 0.84, 0.5]} segments={[5, 3, 2]} mesh color={WOOD} />
    <CadBox position={[0.35, 0.87, 0.3]} size={[1.2, 0.06, 0.54]} segments={[5, 1, 2]} mesh color="#eef1f4" />
    <CadBox position={[0.35, 0.94, 0.3]} size={[0.44, 0.1, 0.3]} segments={[3, 1, 2]} mesh color="#f4f6f8" />
    <CadBox position={[1.85, 0.2, 0.34]} size={[0.38, 0.4, 0.6]} segments={[2, 2, 3]} mesh color="#f2f4f7" />
    <CadBox position={[1.85, 0.55, 0.08]} size={[0.38, 0.7, 0.16]} segments={[2, 3, 1]} mesh color="#f2f4f7" />
    <CadPlate position={[0.9, 0.02, 2.3]} size={[1.5, 1.3]} color="#d3d8de" segments={[8, 7]} mesh />
    <CadBox position={[1.66, 0.95, 2.3]} size={[0.03, 1.9, 1.3]} segments={[1, 6, 5]} mesh color="#cfe0e8" opacity={0.18} />
  </group>
);

/** Hallway console, mirror and bench. */
export const HallSet: React.FC<{ p: [number, number] }> = ({ p }) => (
  <group position={[p[0], 0, p[1]]}>
    <CadBox position={[0, 0.4, 0]} size={[0.4, 0.8, 1.3]} segments={[2, 3, 5]} mesh color={WOOD} />
    <CadBox position={[-0.14, 1.55, 0]} size={[0.05, 1.1, 0.7]} segments={[1, 4, 3]} mesh color="#e9edf1" />
    <CadBox position={[1.9, 0.22, 1.5]} size={[0.9, 0.44, 0.4]} segments={[4, 2, 2]} mesh color={WOOD} />
  </group>
);

/** Car, only drawn when the ultrasonic actually reports a vehicle. */
export const Car: React.FC<{ p: [number, number]; ry?: number }> = ({ p, ry = 0 }) => (
  <group position={[p[0], 0, p[1]]} rotation={[0, ry, 0]}>
    <CadBox position={[0, 0.52, 0]} size={[4.3, 0.6, 1.82]} segments={[10, 2, 5]} mesh color="#c9d0d9" />
    <CadBox position={[-0.2, 0.98, 0]} size={[2.1, 0.5, 1.6]} segments={[6, 2, 4]} mesh color="#aeb8c4" opacity={0.75} />
    {[[-1.45, -0.86], [1.35, -0.86], [-1.45, 0.86], [1.35, 0.86]].map(([x, z], i) => (
      <CadBox key={i} position={[x, 0.32, z]} size={[0.66, 0.62, 0.2]} segments={[4, 4, 1]} mesh color={DARK} />
    ))}
  </group>
);
