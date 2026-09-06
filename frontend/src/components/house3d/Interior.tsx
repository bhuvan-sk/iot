import React from 'react';
import { CadBox, CadPlate, CAD } from './Cad';
import { WALL_GEOMETRY, ROOM_VOLUMES, CEILING_H, SLAB_T, FOOTPRINT } from './model';
import { CadGlazing } from './Cad';
import {
  Sofa,
  Armchair,
  CoffeeTable,
  Shelving,
  Console,
  Screen,
  Plant,
  LeaningArt,
  Rug,
  Bed,
  Nightstand,
  Wardrobe,
  KitchenRun,
  Island,
  Fridge,
  Bathroom,
  HallSet,
} from './Furniture';

/**
 * Assembly: slab, walls, glazing, ceilings, and the fit-out of every room.
 *
 * Split out from the Canvas so it can be memoised wholesale - none of this
 * geometry depends on sensor state, and it must not be rebuilt when a reading
 * arrives at 1 Hz.
 */

/** Ground slab plus the plinth edge the building sits on. */
const Slab: React.FC = () => (
  <group>
    <CadBox
      position={[FOOTPRINT.w / 2, -SLAB_T / 2, FOOTPRINT.d / 2]}
      size={[FOOTPRINT.w + 0.9, SLAB_T, FOOTPRINT.d + 0.9]}
      color="#c8ced6"
    />
    <CadPlate position={[FOOTPRINT.w / 2, 0.002, FOOTPRINT.d / 2]} size={[FOOTPRINT.w, FOOTPRINT.d]} color={CAD.floor} />
  </group>
);

/** Every wall piece, with its glazing. */
const Walls: React.FC = () => (
  <group>
    {WALL_GEOMETRY.map(({ spec, pieces, glazing }) => (
      <group key={spec.id}>
        {pieces.map((p, i) => {
          // Outward normal in the wall's local frame is +Z; the ghosting pass
          // rotates it into world space.
          return (
            <CadBox
              key={`${spec.id}-p${i}`}
              position={p.p}
              size={p.s}
              rotationY={p.ry}
              color={spec.interior ? '#e9ecf1' : CAD.surface}
              ghost
              normal={[0, 0, 1]}
            />
          );
        })}
        {glazing.map((g, i) => (
          <CadGlazing
            key={`${spec.id}-g${i}`}
            position={g.p}
            size={g.s}
            rotationY={g.ry}
            louvres={g.kind === 'window'}
          />
        ))}
      </group>
    ))}
  </group>
);

/**
 * Ceilings, one per room. With the camera above these always face it, so the
 * ghosting pass renders them as line work and you look straight through into
 * the rooms - the reference's exposed structure, made to work from above.
 */
const Ceilings: React.FC = () => (
  <group>
    {ROOM_VOLUMES.filter((r) => r.id !== 'garage').map((r) => (
      <CadBox
        key={`ceil-${r.id}`}
        position={[r.x + r.w / 2, CEILING_H + 0.06, r.z + r.d / 2]}
        size={[r.w, 0.12, r.d]}
        color="#eef1f5"
        ghost
        castShadow={false}
        normal={[0, 1, 0]}
      />
    ))}
    {/* Dropped soffit over the living area, as in the reference. */}
    <CadBox
      position={[3.3, CEILING_H - 0.16, 1.5]}
      size={[5.4, 0.22, 0.5]}
      color="#e7ebf0"
      ghost
      castShadow={false}
      normal={[0, 1, 0]}
    />
  </group>
);

/** Living room fit-out - the room the reference actually depicts. */
const LivingRoom: React.FC = () => (
  <group>
    <Rug p={[3.0, 2.9]} size={[3.4, 2.4]} />
    <Sofa p={[3.3, 4.35]} ry={Math.PI} w={2.4} />
    <Armchair p={[5.6, 2.5]} ry={-Math.PI / 2} />
    <CoffeeTable p={[3.1, 2.9]} />
    <Console p={[3.2, 0.42]} w={2.2} />
    <Screen p={[3.2, 0.2]} w={1.4} />
    <Shelving p={[0.35, 2.4]} ry={Math.PI / 2} levels={4} />
    <Plant p={[1.15, 1.05]} h={1.6} />
    <Plant p={[5.9, 1.0]} h={1.3} />
    <LeaningArt p={[6.25, 4.3]} ry={-Math.PI / 2} />
  </group>
);

const Kitchen: React.FC = () => (
  <group>
    <KitchenRun p={[9.5, 0.45]} w={3.4} />
    <Fridge p={[7.15, 0.5]} />
    <Island p={[9.4, 2.9]} />
    <Plant p={[11.4, 4.7]} h={1.1} />
  </group>
);

const Hallway: React.FC = () => (
  <group>
    <HallSet p={[0.42, 6.6]} />
    <Rug p={[1.8, 7.4]} size={[1.2, 2.6]} />
    <Plant p={[3.15, 5.95]} h={1.2} />
  </group>
);

const Bedroom: React.FC = () => (
  <group>
    <Rug p={[6.0, 7.3]} size={[3.2, 2.4]} />
    <Bed p={[5.9, 6.9]} />
    <Nightstand p={[4.85, 5.85]} />
    <Nightstand p={[6.95, 5.85]} />
    <Wardrobe p={[8.45, 7.4]} ry={-Math.PI / 2} />
  </group>
);

/** Garage floor, bay markings and the ultrasonic housing. */
const Garage: React.FC = () => {
  const g = ROOM_VOLUMES.find((r) => r.id === 'garage')!;
  return (
    <group>
      <CadPlate position={[g.x + g.w / 2, 0.004, g.z + g.d / 2]} size={[g.w, g.d]} color="#cdd3da" />
      {[3.9, 7.0].map((z, i) => (
        <CadPlate
          key={i}
          position={[g.x + g.w / 2, 0.01, z]}
          size={[5.6, 2.7]}
          color="#c6ccd4"
          segments={[10, 5]}
          mesh
        />
      ))}
      {/* Sensor housing on the house-side wall of bay 1 */}
      <CadBox position={[12.42, 0.95, 3.9]} size={[0.12, 0.16, 0.36]} segments={[1, 2, 2]} mesh color="#4b535e" />
    </group>
  );
};

export const Interior = React.memo(function Interior() {
  return (
    <group>
      <Slab />
      <Walls />
      <Ceilings />
      <LivingRoom />
      <Kitchen />
      <Hallway />
      <Bedroom />
      <Bathroom p={[9.15, 5.55]} />
      <Garage />
    </group>
  );
});
