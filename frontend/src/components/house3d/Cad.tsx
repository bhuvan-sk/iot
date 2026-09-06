import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The drawing language, taken from design-ref.png.
 *
 * Every solid is a white surface with a black edge line. Furniture carries a
 * denser quad wireframe, the way a CAD mesh reads. The one addition the
 * reference does not need but a digital twin does: any surface whose face
 * turns toward the camera GHOSTS - it drops to near-transparent and its edges
 * brighten, so the structure stays legible as line work and you can see into
 * the building from any orbit angle. That is the "exposed structure" of the
 * reference, made to hold up while the camera moves.
 */

export const CAD = {
  surface: '#f4f6f9',      // walls: the lightest thing in the model
  surfaceWarm: '#efe9df',
  edge: '#0b0e13',
  ghostEdge: '#93a7c0',
  floor: '#d2d8e0',        // a step below the walls, without going murky
  glass: '#9fc4d8',
  accent: '#f2b13d',
} as const;

/** Marks a mesh as ghostable and records the outward normal to test against. */
export interface GhostData {
  ghostable: true;
  normal: THREE.Vector3;
  baseOpacity: number;
}

const _camDir = new THREE.Vector3();
const _worldNormal = new THREE.Vector3();
const _meshPos = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/**
 * Centre of the building. Which side of a wall counts as "outward" is derived
 * from this rather than authored per wall - hand-labelling normals gets half
 * of them backwards, which ghosts the far walls that should stay solid.
 */
const BUILDING_CENTRE = new THREE.Vector3(9.45, 1.3, 4.5);

/**
 * Walks a subtree once per frame and fades any surface that faces the camera.
 * Materials are mutated directly rather than through React state - this must
 * never cause a re-render of the scene graph.
 */
export const GhostingGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const group = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    camera.getWorldDirection(_camDir);

    g.traverse((obj) => {
      const data = obj.userData as Partial<GhostData>;
      if (!data.ghostable || !data.normal) return;

      // Normal in world space, then flipped so it always points away from the
      // building centre. That makes "outward" correct for every wall without
      // authoring a normal per wall.
      obj.getWorldQuaternion(_quat);
      _worldNormal.copy(data.normal).applyQuaternion(_quat).normalize();
      obj.getWorldPosition(_meshPos).sub(BUILDING_CENTRE);
      if (_worldNormal.dot(_meshPos) < 0) _worldNormal.negate();

      // An outward face that points back at the camera has a NEGATIVE dot with
      // the view direction - that is the one standing between us and the
      // interior, so it is the one that ghosts.
      const facing = -_worldNormal.dot(_camDir);
      const ghost = THREE.MathUtils.smoothstep(facing, 0.05, 0.45);

      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.opacity = THREE.MathUtils.lerp(data.baseOpacity ?? 1, 0.04, ghost);
        // A ghosted face must stop writing depth, otherwise it stays invisible
        // but still occludes everything behind it.
        m.depthWrite = ghost < 0.5;
      }
      const line = obj as THREE.LineSegments;
      if (line.isLineSegments) {
        const m = line.material as THREE.LineBasicMaterial;
        m.opacity = THREE.MathUtils.lerp(0.95, 0.62, ghost);
        m.color.set(ghost > 0.5 ? CAD.ghostEdge : CAD.edge);
      }
    });
  });

  return <group ref={group}>{children}</group>;
};

interface CadBoxProps {
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  color?: string;
  /** Segment counts, which drive how dense the wireframe reads. */
  segments?: [number, number, number];
  /** Draw the interior quad wireframe as well as the silhouette edges. */
  mesh?: boolean;
  /** Participate in camera-facing ghosting (walls, ceilings). */
  ghost?: boolean;
  /** Outward normal in local space, needed for ghosting. */
  normal?: [number, number, number];
  opacity?: number;
  edgeOpacity?: number;
  renderOrder?: number;
  /** Ceilings are seen through, so they must not cast a hard shadow. */
  castShadow?: boolean;
}

/**
 * One box drawn in the CAD language: shaded surface + crisp silhouette edges,
 * with an optional interior mesh for furniture.
 */
export const CadBox: React.FC<CadBoxProps> = ({
  position,
  size,
  rotationY = 0,
  color = CAD.surface,
  segments = [1, 1, 1],
  mesh = false,
  ghost = false,
  normal = [0, 0, 1],
  opacity = 1,
  edgeOpacity = 0.92,
  renderOrder,
  castShadow = true,
}) => {
  const geo = useMemo(
    () => new THREE.BoxGeometry(size[0], size[1], size[2], segments[0], segments[1], segments[2]),
    [size, segments],
  );
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 12), [geo]);
  const wire = useMemo(() => (mesh ? new THREE.WireframeGeometry(geo) : null), [geo, mesh]);
  const n = useMemo(() => new THREE.Vector3(...normal), [normal]);

  const ghostData: Partial<GhostData> = ghost
    ? { ghostable: true, normal: n, baseOpacity: opacity }
    : {};

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geo} userData={ghostData} renderOrder={renderOrder} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.92}
          metalness={0}
          transparent
          opacity={opacity}
          depthWrite
          shadowSide={THREE.FrontSide}
        />
      </mesh>

      {/* Silhouette. Always drawn, so ghosted volumes still read as structure. */}
      <lineSegments geometry={edges} userData={ghost ? { ghostable: true, normal: n } : {}} renderOrder={2}>
        <lineBasicMaterial color={CAD.edge} transparent opacity={edgeOpacity} depthTest />
      </lineSegments>

      {/* Interior quad mesh: the dense CAD look on furniture. */}
      {wire && (
        <lineSegments geometry={wire} renderOrder={1}>
          <lineBasicMaterial color={CAD.edge} transparent opacity={0.22} depthTest />
        </lineSegments>
      )}
    </group>
  );
};

/** A flat horizontal plate: floor slabs, rugs, counters, shower trays. */
export const CadPlate: React.FC<{
  position: [number, number, number];
  size: [number, number];
  color?: string;
  opacity?: number;
  segments?: [number, number];
  mesh?: boolean;
  edge?: boolean;
}> = ({ position, size, color = CAD.floor, opacity = 1, segments = [1, 1], mesh = false, edge = true }) => {
  const geo = useMemo(
    () => new THREE.PlaneGeometry(size[0], size[1], segments[0], segments[1]),
    [size, segments],
  );
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const wire = useMemo(() => (mesh ? new THREE.WireframeGeometry(geo) : null), [geo, mesh]);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color={color} roughness={0.95} transparent opacity={opacity} />
      </mesh>
      {edge && (
        <lineSegments geometry={edges} renderOrder={2}>
          <lineBasicMaterial color={CAD.edge} transparent opacity={0.5} />
        </lineSegments>
      )}
      {wire && (
        <lineSegments geometry={wire} renderOrder={1}>
          <lineBasicMaterial color={CAD.edge} transparent opacity={0.14} />
        </lineSegments>
      )}
    </group>
  );
};

/**
 * Glazing. In the reference the windows are the strongest drawing in the
 * frame: a fine mullion grid with horizontal louvres behind it.
 */
export const CadGlazing: React.FC<{
  position: [number, number, number];
  size: [number, number];
  rotationY: number;
  louvres?: boolean;
}> = ({ position, size, rotationY, louvres = true }) => {
  const [w, h] = size;
  const cols = Math.max(2, Math.round(w / 0.9));
  const rows = louvres ? Math.max(6, Math.round(h / 0.16)) : 2;

  const geo = useMemo(() => new THREE.PlaneGeometry(w, h, cols, rows), [w, h, cols, rows]);
  const wire = useMemo(() => new THREE.WireframeGeometry(geo), [geo]);
  const frame = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), [w, h]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={CAD.glass}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Louvre / mullion grid */}
      <lineSegments geometry={wire} renderOrder={2}>
        <lineBasicMaterial color={CAD.edge} transparent opacity={0.3} />
      </lineSegments>
      {/* Heavier outer frame */}
      <lineSegments geometry={frame} renderOrder={3}>
        <lineBasicMaterial color={CAD.edge} transparent opacity={0.9} />
      </lineSegments>
    </group>
  );
};
