import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { clsx } from 'clsx';
import type { Device } from '../../types';
import { ROOM_VOLUMES, CEILING_H } from './model';
import { Architecture } from './Architecture';
import { AllFurniture, Pendant } from './Furniture';
import { useDevices } from '../../hooks/useDevices';
import { useDoors, type DoorState } from '../../hooks/useDoors';
import { esp32WS } from '../../services/esp32WebSocket';
import type { WSMessage } from '../../services/esp32WebSocket';

// First-person camera height
const EYE_LEVEL = 1.6;


const isInBounds = (x: number, z: number, doors: Record<string, DoorState>) => {
  // Living (0-7, 0-6)
  if (x > 0.2 && x < 6.8 && z > 0.2 && z < 5.8) return true;
  // Kitchen (7-12, 0-6)
  if (x > 7.2 && x < 11.8 && z > 0.2 && z < 5.8) return true;
  // Bedroom (0-6, 6-11)
  if (x > 0.2 && x < 5.8 && z > 6.2 && z < 10.8) return true;
  // Garage (6-12, 6-12)
  if (x > 6.2 && x < 11.8 && z > 6.2 && z < 10.8) return true;

  // Doorway Living-Kitchen (x: 6.8-7.2, z: 1.0-2.2) (Cased Opening)
  if (x >= 6.8 && x <= 7.2 && z > 1.0 && z < 2.2) return true;
  
  // Doorway Living-Bedroom (x: 2.0-3.2, z: 5.8-6.2)
  if (x > 2.0 && x < 3.2 && z >= 5.8 && z <= 6.2) {
    if (!doors['bedroom']?.isOpen) return false;
    return true;
  }
  
  // Doorway Kitchen-Garage (x: 7.0-8.2, z: 5.8-6.2)
  if (x > 7.0 && x < 8.2 && z >= 5.8 && z <= 6.2) {
    if (!doors['garage']?.isOpen) return false;
    return true;
  }

  return false;
};

const FirstPersonCamera: React.FC<{ active: boolean; onLocationChange: (loc: string | null) => void }> = ({ active, onLocationChange }) => {
  const { camera } = useThree();
  const direction = useRef(new THREE.Vector3());
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const sprint = useRef(false);


  useEffect(() => {
    if (active) {
      camera.position.set(3.5, EYE_LEVEL, 3.0);
      camera.lookAt(3.5, EYE_LEVEL, 0); // Face North towards the TV/Kitchen
    }
  }, [active, camera]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'KeyW': moveForward.current = true; break;
        case 'KeyA': moveLeft.current = true; break;
        case 'KeyS': moveBackward.current = true; break;
        case 'KeyD': moveRight.current = true; break;
        case 'ShiftLeft': case 'ShiftRight': sprint.current = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveForward.current = false; break;
        case 'KeyA': moveLeft.current = false; break;
        case 'KeyS': moveBackward.current = false; break;
        case 'KeyD': moveRight.current = false; break;
        case 'ShiftLeft': case 'ShiftRight': sprint.current = false; break;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      moveForward.current = false;
      moveBackward.current = false;
      moveLeft.current = false;
      moveRight.current = false;
      sprint.current = false;
    };
  }, [active]);

  useFrame((state, delta) => {
    if (!active) return;
    // Cap delta to prevent huge jumps if tab was inactive
    const dt = Math.min(delta, 0.1);
    const speed = sprint.current ? 6.0 : 2.5;
    
    const z = Number(moveForward.current) - Number(moveBackward.current);
    const x = Number(moveRight.current) - Number(moveLeft.current);

    direction.current.set(x, 0, z);
    if (direction.current.lengthSq() > 0) {
      direction.current.normalize();
    }

    // Get camera's forward direction on the XZ plane
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    camForward.y = 0;
    if (camForward.lengthSq() > 0) camForward.normalize();

    // Get camera's right direction on the XZ plane
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    camRight.y = 0;
    if (camRight.lengthSq() > 0) camRight.normalize();

    // Calculate actual movement vector
    const moveVec = new THREE.Vector3();
    moveVec.addScaledVector(camForward, direction.current.z);
    moveVec.addScaledVector(camRight, direction.current.x);

    if (moveVec.lengthSq() > 0) {
      moveVec.normalize();
    }

    const moveZ = moveVec.z * speed * dt;
    const moveX = moveVec.x * speed * dt;

    const oldX = camera.position.x;
    const oldZ = camera.position.z;

    camera.position.x += moveX;
    camera.position.z += moveZ;

    // Collision check
    const doors = useDoors.getState().doors;
    if (!isInBounds(camera.position.x, camera.position.z, doors)) {
      camera.position.x = oldX;
      camera.position.z = oldZ;
    }

    camera.position.y = EYE_LEVEL;

    // Force R3F raycaster to the center of the screen in first-person mode
    // so hover and click interactions fire exactly where the player is looking
    state.pointer.set(0, 0);

    // Room detection
    let found = null;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const r of ROOM_VOLUMES) {
      if (cx > r.x && cx < r.x + r.w && cz > r.z && cz < r.z + r.d) {
        found = r.name;
        break;
      }
    }
    onLocationChange(found);
  });

  return active ? <PointerLockControls /> : null;
};

const RoomLight: React.FC<{ x: number; z: number; on: boolean }> = ({ x, z, on }) => {
  const ref = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    const l = ref.current;
    if (!l) return;
    const target = on ? 8.0 : 0;
    if (Math.abs(l.intensity - target) > 0.01) {
      l.intensity = THREE.MathUtils.damp(l.intensity, target, 6, dt);
    }
  });
  return <pointLight ref={ref} position={[x, CEILING_H - 0.75, z]} color="#ffc98a" intensity={0} distance={10} decay={2} />;
};

const RoomZone: React.FC<{
  id: string; name: string; x: number; z: number; w: number; d: number;
  selected: boolean; lit: boolean; controllable: boolean;
  onSelect: (id: string) => void;
}> = ({ id, name, x, z, w, d, selected, lit, controllable, onSelect }) => {
  const [hover, setHover] = useState(false);
  const cx = x + w / 2;
  const cz = z + d / 2;

  return (
    <group>
      <mesh
        position={[cx, 0.9, cz]}
        onClick={(e) => { e.stopPropagation(); if (controllable) onSelect(id); }}
        onPointerOver={(e) => { e.stopPropagation(); if (controllable) { setHover(true); document.body.style.cursor = 'pointer'; } }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
        visible={false}
      >
        <boxGeometry args={[w, 1.8, d]} />
      </mesh>
      {lit && (
        <mesh position={[cx, 0.06, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.1, d - 0.1]} />
          <meshBasicMaterial color="#ffc98a" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      )}
      {(selected) && (
        <mesh position={[cx, 0.07, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.2, d - 0.2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} wireframe />
        </mesh>
      )}
      {(hover && !selected) && (
        <mesh position={[cx, 0.07, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.2, d - 0.2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
        </mesh>
      )}
      {hover && controllable && (
        <Html position={[cx, 0.1, cz]} center pointerEvents="none">
          <div className="text-[10px] font-bold tracking-widest text-white/80 uppercase drop-shadow-md">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
};

export const HouseScene3D: React.FC<{
  devices: Device[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  globalMode: 'NORMAL' | 'NIGHT' | 'ENTERTAINMENT' | 'SECURITY';
  ambientLightBand: string | null;
  gesturesEnabled: boolean;
}> = ({ devices, selectedRoomId, onSelectRoom, globalMode, ambientLightBand, gesturesEnabled }) => {
  const [fpMode, setFpMode] = useState(false);
  const [currentLoc, setCurrentLoc] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const { toggle } = useDevices();

  const litRooms = useMemo(() => {
    const s = new Set<string>();
    devices.forEach((d) => { if (d.state === 'ON') s.add(d.id); });
    return s;
  }, [devices]);

  useEffect(() => {
    const onChange = () => setIsLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  const handleLocChange = useCallback((loc: string | null) => {
    setCurrentLoc((prev) => (prev !== loc ? loc : prev));
  }, []);

  const UltrasonicViz = ({ enabled }: { enabled: boolean }) => {
    const [dist, setDist] = useState<number | null>(null);
    useEffect(() => {
      if (!enabled) return;
      const unsub = esp32WS.onMessage((msg: WSMessage) => {
        if (msg.distanceValid && msg.distance !== undefined) {
          setDist(msg.distance);
        } else {
          setDist(null);
        }
      });
      return () => { unsub(); };
    }, [enabled]);

    if (!enabled) return null;

    return (
      <Html position={[9.5, 2.0, 9.0]} center pointerEvents="none" zIndexRange={[100, 0]}>
        <div className="bg-black/60 border border-white/20 backdrop-blur-md px-3 py-2 rounded-lg flex flex-col items-center shadow-lg transition-opacity duration-300">
          <span className="text-[9px] font-bold tracking-widest text-white/50 mb-1">HC-SR04</span>
          {dist !== null && dist <= 30 ? (
            <>
              <span className="text-xs text-emerald-400 font-semibold mb-0.5 animate-pulse">Hand detected</span>
              <span className="text-[10px] text-white/80 font-mono">{dist.toFixed(1)} cm</span>
            </>
          ) : (
            <span className="text-[10px] text-white/40">Searching...</span>
          )}
        </div>
      </Html>
    );
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute bottom-6 left-6 z-10 flex gap-2">
        <button 
          className={clsx("px-3 py-1.5 text-xs font-semibold rounded backdrop-blur-md border transition-colors", !fpMode ? "bg-white text-black border-white" : "bg-black/50 text-white border-white/20 hover:bg-black/80")}
          onClick={() => {
            setFpMode(false);
            if (document.pointerLockElement) document.exitPointerLock();
          }}
        >
          Overview
        </button>
        <button 
          className={clsx("px-3 py-1.5 text-xs font-semibold rounded backdrop-blur-md border transition-colors", fpMode ? "bg-white text-black border-white" : "bg-black/50 text-white border-white/20 hover:bg-black/80")}
          onClick={() => setFpMode(true)}
        >
          Walkthrough
        </button>
      </div>

      {fpMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none">
          {currentLoc && (
            <div className="bg-black/60 border border-white/10 text-white/90 text-[10px] font-bold tracking-[0.2em] px-4 py-1.5 rounded-full backdrop-blur uppercase">
              CURRENT ROOM: {currentLoc}
            </div>
          )}
          <div className="bg-black/60 border border-white/10 text-white/70 text-xs px-4 py-2 rounded-full backdrop-blur">
            {isLocked ? (
              <span className="text-emerald-400 font-medium">MOUSE LOOK ACTIVE (ESC to release)</span>
            ) : (
              <span>Click canvas to look • WASD to move</span>
            )}
          </div>
        </div>
      )}

      {fpMode && isLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/80 rounded-full z-20 mix-blend-difference pointer-events-none" />
      )}

      <Canvas shadows frameloop="always" dpr={[1, 2]} gl={{ antialias: true }} 
        camera={fpMode ? { position: [3.5, EYE_LEVEL, 3.0], fov: 60 } : { position: [6, 12, 18], fov: 45 }}>
        
        <hemisphereLight 
          args={[
            globalMode === 'NIGHT' || ambientLightBand === 'dark' ? '#0a0a1a' : globalMode === 'SECURITY' ? '#1a0505' : '#ffffff', 
            globalMode === 'NIGHT' || ambientLightBand === 'dark' ? '#05050a' : '#444444', 
            globalMode === 'NIGHT' ? 0.1 : globalMode === 'ENTERTAINMENT' ? 0.2 : ambientLightBand === 'dark' ? 0.15 : ambientLightBand === 'dim' ? 0.3 : 0.6
          ]} 
        />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={
            globalMode === 'NIGHT' ? 0.05 : 
            globalMode === 'ENTERTAINMENT' ? 0.3 : 
            ambientLightBand === 'dark' ? 0.1 : 
            ambientLightBand === 'dim' ? 0.4 : 
            ambientLightBand === 'bright' ? 1.5 : 
            1.2
          } 
          color={globalMode === 'SECURITY' ? '#ff3333' : globalMode === 'ENTERTAINMENT' ? '#9933ff' : '#ffffff'}
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />

        <Architecture />
        <AllFurniture />
        <UltrasonicViz enabled={gesturesEnabled} />

        {ROOM_VOLUMES.filter((r) => r.controllable).map((r) => (
          <Pendant key={`pd-${r.id}`} p={r.light} ceiling={CEILING_H} on={litRooms.has(r.id)} 
            onClick={() => toggle(r.id)} />
        ))}

        {ROOM_VOLUMES.filter((r) => r.controllable).map((r) => (
          <RoomLight key={`rl-${r.id}`} x={r.light[0]} z={r.light[1]} on={litRooms.has(r.id)} />
        ))}

        {ROOM_VOLUMES.map((r) => (
          <RoomZone key={`rz-${r.id}`} {...r} selected={selectedRoomId === r.id} lit={litRooms.has(r.id)} onSelect={onSelectRoom} />
        ))}

        {!fpMode && <OrbitControls makeDefault minDistance={5} maxDistance={30} maxPolarAngle={Math.PI / 2.1} target={[6, 0, 6]} />}
        <FirstPersonCamera active={fpMode} onLocationChange={handleLocChange} />
      </Canvas>
    </div>
  );
};
