import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { clsx } from 'clsx';
import type { Device } from '../../types';
import { ROOM_VOLUMES, CEILING_H } from './model';
import { GhostingGroup, CAD } from './Cad';
import { Interior } from './Interior';
import { Pendant, Car } from './Furniture';

/**
 * The digital twin.
 *
 * Architecture follows design-ref.png: a CAD hidden-line building with real
 * ceiling heights and a dense furniture mesh, drawn in white with black edges.
 * Surfaces that would occlude the interior ghost to line work as the camera
 * moves, so the structure stays exposed from any angle.
 *
 * Everything that changes at runtime is deliberately narrow: the room lights,
 * the selection ring, and whether a car is drawn. The building itself is
 * memoised and never rebuilt by a sensor tick.
 */

interface HouseScene3DProps {
  devices: Device[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  garageOccupied: boolean;
  garageOnline: boolean;
}

/** Warm interior light for a room whose physical LED is on. */
const RoomLight: React.FC<{ x: number; z: number; on: boolean }> = ({ x, z, on }) => {
  const ref = useRef<THREE.PointLight>(null);
  // Eased so a light switching does not pop; motion here means state change.
  useFrame((_, dt) => {
    const l = ref.current;
    if (!l) return;
    const target = on ? 7.5 : 0;
    if (Math.abs(l.intensity - target) > 0.01) {
      l.intensity = THREE.MathUtils.damp(l.intensity, target, 6, dt);
    }
  });
  return (
    <pointLight
      ref={ref}
      position={[x, CEILING_H - 0.75, z]}
      color="#ffc98a"
      intensity={0}
      distance={7.5}
      decay={2}
    />
  );
};

/** Invisible click volume + selection outline for one room. */
const RoomZone: React.FC<{
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  selected: boolean;
  lit: boolean;
  controllable: boolean;
  onSelect: (id: string) => void;
}> = ({ id, name, x, z, w, d, selected, lit, controllable, onSelect }) => {
  const [hover, setHover] = useState(false);
  const cx = x + w / 2;
  const cz = z + d / 2;

  const ring = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x + 0.05, 0.02, z + 0.05),
      new THREE.Vector3(x + w - 0.05, 0.02, z + 0.05),
      new THREE.Vector3(x + w - 0.05, 0.02, z + d - 0.05),
      new THREE.Vector3(x + 0.05, 0.02, z + d - 0.05),
      new THREE.Vector3(x + 0.05, 0.02, z + 0.05),
    ]);
    return g;
  }, [x, z, w, d]);

  return (
    <group>
      {/* Hit volume. Invisible but pickable, kept below head height so it
          never swallows clicks meant for the camera controls. */}
      <mesh
        position={[cx, 0.9, cz]}
        onClick={(e) => {
          e.stopPropagation();
          if (controllable) onSelect(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (controllable) setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        visible={false}
      >
        <boxGeometry args={[w, 1.8, d]} />
      </mesh>

      {/* Warm pool on the floor when the physical LED is on. */}
      {lit && (
        <mesh position={[cx, 0.014, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.1, d - 0.1]} />
          <meshBasicMaterial color={CAD.accent} transparent opacity={0.13} depthWrite={false} />
        </mesh>
      )}

      {(selected || hover) && (
        <lineLoop geometry={ring}>
          <lineBasicMaterial color={selected ? '#3ddc97' : '#8fa3bb'} linewidth={2} transparent opacity={selected ? 0.95 : 0.5} />
        </lineLoop>
      )}

      {/* Label. Rooms with hardware get a state dot; the others are annotated
          but never given a state they cannot measure. */}
      <Html position={[cx, 3.55, cz]} center distanceFactor={17} zIndexRange={[10, 0]} pointerEvents="none">
        <div
          className={clsx(
            'flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase backdrop-blur-sm select-none',
            selected
              ? 'border-ok/70 bg-surface/90 text-fg'
              : 'border-line-strong/60 bg-surface/75 text-fg-muted',
          )}
        >
          {controllable && (
            <span
              className={clsx('h-1.5 w-1.5 rounded-full', lit ? 'bg-active' : 'bg-idle')}
              aria-hidden="true"
            />
          )}
          {name}
        </div>
      </Html>
    </group>
  );
};

/**
 * Eases the camera target toward the selected room. Spatial continuity: the
 * view follows the selection instead of teleporting.
 */
const CameraFocus: React.FC<{ target: THREE.Vector3; controls: React.RefObject<any> }> = ({ target, controls }) => {
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (c.target.distanceToSquared(target) > 0.0004) {
      c.target.lerp(target, 1 - Math.exp(-4 * dt));
      c.update();
    }
  });
  return null;
};

/** Keeps rendering on demand while anything is still easing. */
const Invalidator: React.FC<{ deps: unknown }> = ({ deps }) => {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // Pump frames for a moment so damped lights and camera settle.
    let raf = 0;
    const until = performance.now() + 1400;
    const tick = () => {
      invalidate();
      if (performance.now() < until) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [deps, invalidate]);
  return null;
};

const Scene: React.FC<HouseScene3DProps> = ({
  devices,
  selectedRoomId,
  onSelectRoom,
  garageOccupied,
  garageOnline,
}) => {
  const controls = useRef<any>(null);

  const litRooms = useMemo(() => {
    const s = new Set<string>();
    devices.forEach((d) => {
      if (d.state === 'ON') s.add(d.id);
    });
    return s;
  }, [devices]);

  /**
   * Selection biases the view toward the room rather than centring on it.
   * Fully recentring on a 5m room while zoomed out to see an 19m building
   * throws the rest of the plan off-frame; a partial lean reads as "the view
   * followed me" while keeping the whole twin composed.
   */
  const focus = useMemo(() => {
    const centre = new THREE.Vector3(9.45, 1.0, 4.5);
    const r = ROOM_VOLUMES.find((v) => v.id === selectedRoomId);
    if (!r) return centre;
    const room = new THREE.Vector3(r.x + r.w / 2, 1.0, r.z + r.d / 2);
    return centre.lerp(room, 0.38);
  }, [selectedRoomId]);

  return (
    <>
      {/* Daylight: a low warm key through the glazed wall plus soft fill, so
          the white massing reads with real depth rather than flat shading. */}
      <hemisphereLight args={['#e6edf7', '#59606b', 1.0]} />
      {/* Sun. Casts the shadows that give the white massing its depth; the
          frustum is sized to the 19 x 9 footprint so the map stays sharp. */}
      <directionalLight
        position={[-14, 20, -10]}
        intensity={1.7}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[18, 9, 16]} intensity={0.38} color="#cfe0f5" />

      <GhostingGroup>
        <Interior />
      </GhostingGroup>

      {/* Pendants: one per controllable room, emissive when the LED is on. */}
      {ROOM_VOLUMES.filter((r) => r.controllable).map((r) => (
        <Pendant key={`pd-${r.id}`} p={r.light} ceiling={CEILING_H} on={litRooms.has(r.id)} />
      ))}

      {ROOM_VOLUMES.filter((r) => r.controllable).map((r) => (
        <RoomLight key={`rl-${r.id}`} x={r.light[0]} z={r.light[1]} on={litRooms.has(r.id)} />
      ))}

      {ROOM_VOLUMES.map((r) => (
        <RoomZone
          key={`rz-${r.id}`}
          id={r.id}
          name={r.name}
          x={r.x}
          z={r.z}
          w={r.w}
          d={r.d}
          selected={selectedRoomId === r.id}
          lit={litRooms.has(r.id)}
          controllable={r.controllable}
          onSelect={onSelectRoom}
        />
      ))}

      {/* A vehicle is drawn only when the ultrasonic actually reports one. */}
      {garageOnline && garageOccupied && <Car p={[15.6, 3.9]} />}

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={13}
        maxDistance={42}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.35}
        enableDamping
        dampingFactor={0.08}
        target={[9.45, 1, 4.5]}
      />
      <CameraFocus target={focus} controls={controls} />
      <Invalidator deps={`${selectedRoomId}|${[...litRooms].sort().join()}|${garageOccupied}`} />
    </>
  );
};

export const HouseScene3D = React.memo(function HouseScene3D(props: HouseScene3DProps) {
  return (
    <Canvas
      // Render on demand: a dashboard polling at 1 Hz must not spin the GPU.
      // OrbitControls and the Invalidator request frames when needed.
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [-7.5, 16.5, 24], fov: 34, near: 0.1, far: 250 }}
      style={{ touchAction: 'none' }}
      aria-label="Interactive 3D digital twin of the house. Click a room to select it."
    >
      <Scene {...props} />
    </Canvas>
  );
});
