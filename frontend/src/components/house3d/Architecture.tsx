import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ROOM_VOLUMES, CEILING_H } from './model';
import { useDoors } from '../../hooks/useDoors';

const WALL_THICKNESS = 0.2;
const DOOR_WIDTH = 1.2;
const DOOR_HEIGHT = 2.4;

const Wall: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
}> = ({ position, args }) => (
  <mesh position={position} receiveShadow castShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color="#f4f4f4" roughness={0.9} />
  </mesh>
);

const Floor: React.FC<{
  position: [number, number, number];
  args: [number, number, number];
  color: string;
}> = ({ position, args, color }) => (
  <mesh position={position} receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>
);

const AnimatedDoor: React.FC<{ id: string; jambW: number; invertHinge?: boolean }> = ({ id, jambW, invertHinge }) => {
  const isOpen = useDoors((s) => s.doors[id]?.isOpen);
  const toggleDoor = useDoors((s) => s.toggleDoor);
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const targetAngle = isOpen ? (invertHinge ? -Math.PI / 2.2 : Math.PI / 2.2) : 0;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, targetAngle, 8, delta);
  });

  useEffect(() => {
    if (!hovered) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') toggleDoor(id);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hovered, id, toggleDoor]);

  return (
    <group ref={ref} position={[-DOOR_WIDTH / 2 + jambW / 2, DOOR_HEIGHT / 2, 0]}>
      <mesh 
        position={[(DOOR_WIDTH - jambW * 2) / 2, 0, 0]}
        castShadow 
        receiveShadow
        onClick={(e) => { e.stopPropagation(); toggleDoor(id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[DOOR_WIDTH - jambW * 2, DOOR_HEIGHT - jambW, 0.04]} />
        <meshStandardMaterial color="#e0d7cc" emissive={hovered ? "#333" : "#000"} />
      </mesh>
      
      {hovered && (
        <Html position={[(DOOR_WIDTH - jambW * 2) / 2, 0, 0]} center zIndexRange={[100, 0]}>
          <div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur whitespace-nowrap border border-white/20 pointer-events-none uppercase">
            {id} Door<br/>
            <span className="text-emerald-400">E — {isOpen ? 'Close' : 'Open'}</span>
          </div>
        </Html>
      )}
    </group>
  );
};

const DoorFrame: React.FC<{ id?: string; position: [number, number, number]; rotation?: [number, number, number]; noSlab?: boolean; invertHinge?: boolean }> = ({ id, position, rotation, noSlab, invertHinge }) => {
  const jambW = 0.05;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[-DOOR_WIDTH / 2 + jambW / 2, DOOR_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[jambW, DOOR_HEIGHT, WALL_THICKNESS + 0.02]} />
        <meshStandardMaterial color="#b5a695" />
      </mesh>
      <mesh position={[DOOR_WIDTH / 2 - jambW / 2, DOOR_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[jambW, DOOR_HEIGHT, WALL_THICKNESS + 0.02]} />
        <meshStandardMaterial color="#b5a695" />
      </mesh>
      <mesh position={[0, DOOR_HEIGHT - jambW / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_WIDTH, jambW, WALL_THICKNESS + 0.02]} />
        <meshStandardMaterial color="#b5a695" />
      </mesh>
      
      {!noSlab && id && <AnimatedDoor id={id} jambW={jambW} invertHinge={invertHinge} />}
    </group>
  );
};

export const Architecture: React.FC = () => {
  return (
    <group>
      {/* Floors */}
      {ROOM_VOLUMES.map((r) => (
        <Floor
          key={`floor-${r.id}`}
          position={[r.x + r.w / 2, -0.05, r.z + r.d / 2]}
          args={[r.w, 0.1, r.d]}
          color={r.floor}
        />
      ))}

      {/* Exterior Walls */}
      {/* North Wall */}
      <Wall position={[6, CEILING_H / 2, -WALL_THICKNESS / 2]} args={[12, CEILING_H, WALL_THICKNESS]} />
      {/* South Wall (Bedroom section) */}
      <Wall position={[3, CEILING_H / 2, 11 + WALL_THICKNESS / 2]} args={[6, CEILING_H, WALL_THICKNESS]} />
      {/* Garage Door on South Wall (x=6.5 to x=11.5) */}
      <mesh position={[9, DOOR_HEIGHT / 2, 11 + WALL_THICKNESS / 2]}>
        <boxGeometry args={[5, DOOR_HEIGHT, WALL_THICKNESS + 0.1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <Wall position={[9, DOOR_HEIGHT + (CEILING_H - DOOR_HEIGHT) / 2, 11 + WALL_THICKNESS / 2]} args={[5, CEILING_H - DOOR_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[11.75, CEILING_H / 2, 11 + WALL_THICKNESS / 2]} args={[0.5, CEILING_H, WALL_THICKNESS]} />

      {/* West Wall */}
      <Wall position={[-WALL_THICKNESS / 2, CEILING_H / 2, 5.5]} args={[WALL_THICKNESS, CEILING_H, 11]} />
      {/* East Wall */}
      <Wall position={[12 + WALL_THICKNESS / 2, CEILING_H / 2, 5.5]} args={[WALL_THICKNESS, CEILING_H, 11]} />

      {/* Interior Walls & Doorways */}
      {/* Between Living and Kitchen */}
      <Wall position={[7, CEILING_H / 2, 0.5]} args={[WALL_THICKNESS, CEILING_H, 1]} />
      <DoorFrame position={[7, 0, 1.6]} rotation={[0, Math.PI / 2, 0]} noSlab />
      <Wall position={[7, DOOR_HEIGHT + (CEILING_H - DOOR_HEIGHT) / 2, 1.6]} args={[WALL_THICKNESS, CEILING_H - DOOR_HEIGHT, DOOR_WIDTH]} />
      <Wall position={[7, CEILING_H / 2, 4.1]} args={[WALL_THICKNESS, CEILING_H, 3.8]} />
      
      {/* Between Living/Kitchen and Bedroom/Garage */}
      <Wall position={[1, CEILING_H / 2, 6]} args={[2, CEILING_H, WALL_THICKNESS]} />
      
      {/* Doorway Bedroom */}
      <DoorFrame id="bedroom" position={[2.6, 0, 6]} />
      <Wall position={[2.6, DOOR_HEIGHT + (CEILING_H - DOOR_HEIGHT) / 2, 6]} args={[DOOR_WIDTH, CEILING_H - DOOR_HEIGHT, WALL_THICKNESS]} />
      
      <Wall position={[4.6, CEILING_H / 2, 6]} args={[2.8, CEILING_H, WALL_THICKNESS]} />
      
      {/* Between Bedroom and Garage */}
      <Wall position={[6, CEILING_H / 2, 8.5]} args={[WALL_THICKNESS, CEILING_H, 5]} />
      
      {/* Doorway Garage */}
      <Wall position={[6.5, CEILING_H / 2, 6]} args={[1, CEILING_H, WALL_THICKNESS]} />
      <DoorFrame id="garage" position={[7.6, 0, 6]} />
      <Wall position={[7.6, DOOR_HEIGHT + (CEILING_H - DOOR_HEIGHT) / 2, 6]} args={[DOOR_WIDTH, CEILING_H - DOOR_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[10.1, CEILING_H / 2, 6]} args={[3.8, CEILING_H, WALL_THICKNESS]} />
      
    </group>
  );
};
