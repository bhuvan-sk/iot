import React from 'react';

const Sofa: React.FC<{ position: [number, number, number]; rotation?: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    {/* Base */}
    <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.5, 0.4, 1.0]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
    </mesh>
    {/* Backrest */}
    <mesh position={[0, 0.6, -0.4]} castShadow receiveShadow>
      <boxGeometry args={[2.5, 0.6, 0.2]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
    </mesh>
    {/* Armrests */}
    <mesh position={[-1.15, 0.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.2, 0.4, 0.8]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
    </mesh>
    <mesh position={[1.15, 0.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.2, 0.4, 0.8]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
    </mesh>
  </group>
);

const TVWall: React.FC<{ position: [number, number, number]; rotation?: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    {/* Console */}
    <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.0, 0.6, 0.5]} />
      <meshStandardMaterial color="#1f1f1f" />
    </mesh>
    {/* Screen */}
    <mesh position={[0, 1.5, -0.2]} castShadow>
      <boxGeometry args={[2.4, 1.3, 0.05]} />
      <meshStandardMaterial color="#000" />
    </mesh>
  </group>
);

const CoffeeTable: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <mesh position={position} castShadow receiveShadow>
    <cylinderGeometry args={[0.5, 0.5, 0.4, 32]} />
    <meshStandardMaterial color="#8b5a2b" />
  </mesh>
);

const KitchenIsland: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.0, 0.9, 1.2]} />
      <meshStandardMaterial color="#2c2c2c" />
    </mesh>
    <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.2, 0.05, 1.4]} />
      <meshStandardMaterial color="#ffffff" roughness={0.1} />
    </mesh>
  </group>
);

const KitchenStool: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <mesh position={position} castShadow>
    <cylinderGeometry args={[0.2, 0.2, 0.7, 16]} />
    <meshStandardMaterial color="#1a1a1a" />
  </mesh>
);

const Bed: React.FC<{ position: [number, number, number]; rotation?: [number, number, number] }> = ({ position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.0, 0.6, 2.2]} />
      <meshStandardMaterial color="#dcdcdc" />
    </mesh>
    <mesh position={[0, 0.8, -1.0]} castShadow receiveShadow>
      <boxGeometry args={[2.2, 1.0, 0.2]} />
      <meshStandardMaterial color="#8b5a2b" />
    </mesh>
  </group>
);

const Wardrobe: React.FC<{ position: [number, number, number]; rotation?: [number, number, number] }> = ({ position, rotation }) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={[2.5, 2.4, 0.6]} />
    <meshStandardMaterial color="#ffffff" />
  </mesh>
);

export const Car: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    {/* Body */}
    <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.0, 0.8, 4.5]} />
      <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.8} />
    </mesh>
    {/* Cabin */}
    <mesh position={[0, 1.2, -0.2]} castShadow receiveShadow>
      <boxGeometry args={[1.8, 0.6, 2.0]} />
      <meshStandardMaterial color="#111827" />
    </mesh>
    {/* Wheels */}
    {[-1.0, 1.0].map((x) =>
      [-1.5, 1.5].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      ))
    )}
  </group>
);

export const Pendant: React.FC<{ p: [number, number]; ceiling: number; on: boolean; onClick?: () => void }> = ({ p, ceiling, on, onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
  <group position={[p[0], ceiling, p[1]]}>
    {/* Cord */}
    <mesh position={[0, -0.5, 0]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 1.0]} />
      <meshStandardMaterial color="#111" />
    </mesh>
    {/* Shade / Bulb */}
    <mesh 
      position={[0, -1.0, 0]} 
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
    >
      <sphereGeometry args={[hover ? 0.18 : 0.15, 32, 32]} />
      <meshStandardMaterial 
        color={on ? "#ffffff" : "#444444"} 
        emissive={on ? "#ffc98a" : (hover ? "#333333" : "#000000")} 
        emissiveIntensity={on ? 2 : (hover ? 0.5 : 0)} 
      />
    </mesh>
  </group>
  );
};

export const AllFurniture: React.FC = () => {
  return (
    <group>
      {/* Living Room */}
      <Sofa position={[3.5, 0, 3.5]} rotation={[0, Math.PI, 0]} />
      <CoffeeTable position={[3.5, 0, 2.2]} />
      <TVWall position={[3.5, 0, 0.5]} />

      {/* Kitchen */}
      <KitchenIsland position={[9.5, 0, 3.0]} />
      <KitchenStool position={[8.5, 0, 3.8]} />
      <KitchenStool position={[9.5, 0, 3.8]} />
      <KitchenStool position={[10.5, 0, 3.8]} />

      {/* Bedroom */}
      <Bed position={[3.0, 0, 8.5]} />
      <Wardrobe position={[0.5, 1.2, 8.5]} rotation={[0, Math.PI / 2, 0]} />

      {/* Garage */}
      <Car position={[7.5, 0, 8.5]} />
      <Car position={[10.5, 0, 8.5]} />
    </group>
  );
};
