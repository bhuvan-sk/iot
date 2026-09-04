import React, { useMemo, useState } from 'react';
import type { Device } from '../../types';
import { ROOMS, BATHROOM } from '../../config/rooms';
import { BASE_SLAB, WALLS, WINDOWS, RUGS, FURNITURE } from './houseModel';
import type { Solid } from './houseModel';
import { boxFaces, slab, faceX, faceY, project, depthKey, shade, mix } from './isometric';

interface HouseSceneProps {
  devices: Device[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

/** Warm interior light. Kept low so it reads as architectural, not neon. */
const LIGHT_TINT = '#ffc98a';
const FLOOR_TINT = '#ffb861';

const TOP = 0;
const RIGHT = -0.13;
const LEFT = -0.28;

const BoxSolid: React.FC<{ solid: Solid; lit: boolean }> = ({ solid, lit }) => {
  const base = lit ? mix(solid.color, LIGHT_TINT, 0.2) : solid.color;
  const faces = boxFaces(solid);
  return (
    <g opacity={solid.opacity ?? 1}>
      <polygon points={faces.left} fill={shade(base, LEFT)} />
      <polygon points={faces.right} fill={shade(base, RIGHT)} />
      <polygon points={faces.top} fill={shade(base, TOP)} />
    </g>
  );
};

export const HouseScene: React.FC<HouseSceneProps> = ({ devices, selectedRoomId, onSelectRoom }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const litRooms = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => {
      if (d.state === 'ON') set.add(d.id);
    });
    return set;
  }, [devices]);

  // Tall backdrop walls are drawn first so the glazing can sit straight on top
  // of them; everything else goes through the painter's-algorithm sort.
  const tallWalls = WALLS.filter((w) => w.h > 1);
  const cutSolids = useMemo(
    () => [...WALLS.filter((w) => w.h <= 1), ...FURNITURE].sort((a, b) => depthKey(a) - depthKey(b)),
    [],
  );

  const [shadowX, shadowY] = project(6, 4.5, -0.4);
  const slabFaces = boxFaces(BASE_SLAB);

  return (
    <svg
      viewBox="-272 -96 616 452"
      className="w-full h-auto select-none"
      role="img"
      aria-label="Isometric plan of the house with light controls for each room"
    >
      <defs>
        <radialGradient id="roomGlow" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#ffca86" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffb861" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffb861" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#b9d3dd" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7f9aa6" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Contact shadow so the model sits on the dark canvas */}
      <ellipse cx={shadowX} cy={shadowY + 20} rx={300} ry={146} fill="url(#groundShadow)" />

      {/* Plinth */}
      <polygon points={slabFaces.left} fill="#151b26" />
      <polygon points={slabFaces.right} fill="#1b2230" />
      <polygon points={slabFaces.top} fill="#2b3444" />

      {/* Room floors, tinted warm when the room light is on */}
      {[...ROOMS.map((r) => ({ ...r.plan, floor: r.floor, id: r.id })), { ...BATHROOM, id: 'bath', floor: BATHROOM.floor }].map(
        (room) => {
          const lit = litRooms.has(room.id);
          return (
            <polygon
              key={`floor-${room.id}`}
              points={slab(room.x, room.y, room.w, room.d)}
              fill={lit ? mix(room.floor, FLOOR_TINT, 0.22) : room.floor}
              stroke={shade(room.floor, -0.22)}
              strokeWidth={0.7}
            />
          );
        },
      )}

      {/* Rugs, tray and doormat */}
      {RUGS.map((rug, i) => (
        <polygon
          key={`rug-${i}`}
          points={slab(rug.x, rug.y, rug.w, rug.d, 0.01)}
          fill={litRooms.has(rug.room) ? mix(rug.color, FLOOR_TINT, 0.18) : rug.color}
        />
      ))}

      {/* Pool of light on the floor of every room whose light is on */}
      {ROOMS.filter((r) => litRooms.has(r.id)).map((r) => (
        <polygon
          key={`glow-${r.id}`}
          points={slab(r.plan.x, r.plan.y, r.plan.w, r.plan.d, 0.02)}
          fill="url(#roomGlow)"
        />
      ))}

      {/* Selection / hover tint, under the furniture so nothing is washed out */}
      {ROOMS.map((r) => {
        const isSelected = selectedRoomId === r.id;
        const isHovered = hovered === r.id;
        if (!isSelected && !isHovered) return null;
        return (
          <polygon
            key={`tint-${r.id}`}
            points={slab(r.plan.x, r.plan.y, r.plan.w, r.plan.d, 0.03)}
            fill={isSelected ? 'rgba(52,211,153,0.13)' : 'rgba(226,232,240,0.07)'}
            pointerEvents="none"
          />
        );
      })}

      {/* Full-height backdrop walls */}
      {tallWalls.map((w, i) => (
        <BoxSolid key={`tall-${i}`} solid={w} lit={false} />
      ))}

      {/* Glazing on the backdrop walls */}
      {WINDOWS.map((win, i) => {
        const outer =
          win.axis === 'y'
            ? faceY(win.a - 0.08, win.b + 0.08, win.at, win.z0 - 0.07, win.z1 + 0.07)
            : faceX(win.at, win.a - 0.08, win.b + 0.08, win.z0 - 0.07, win.z1 + 0.07);
        const glass =
          win.axis === 'y'
            ? faceY(win.a, win.b, win.at, win.z0, win.z1)
            : faceX(win.at, win.a, win.b, win.z0, win.z1);
        return (
          <g key={`win-${i}`}>
            <polygon points={outer} fill="#cbc6bd" />
            <polygon points={glass} fill="url(#glass)" />
          </g>
        );
      })}

      {/* Section walls and furniture, far to near */}
      {cutSolids.map((s, i) => (
        <BoxSolid key={`solid-${i}`} solid={s} lit={s.room ? litRooms.has(s.room) : false} />
      ))}

      {/* Selection and hover outlines sit above the model */}
      {ROOMS.map((r) => {
        const isSelected = selectedRoomId === r.id;
        const isHovered = hovered === r.id;
        if (!isSelected && !isHovered) return null;
        return (
          <polygon
            key={`outline-${r.id}`}
            points={slab(r.plan.x, r.plan.y, r.plan.w, r.plan.d, 0.03)}
            fill="none"
            stroke={isSelected ? '#34d399' : '#94a3b8'}
            strokeWidth={isSelected ? 1.8 : 1.2}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        );
      })}

      {/* Bathroom is decorative only: it has no controllable hardware */}
      {(() => {
        const [bx, by] = project(BATHROOM.x + BATHROOM.w / 2, BATHROOM.y + BATHROOM.d / 2, 0);
        return (
          <text
            x={bx}
            y={by}
            textAnchor="middle"
            fontSize={9}
            fill="#64748b"
            letterSpacing="0.08em"
            pointerEvents="none"
          >
            BATH
          </text>
        );
      })()}

      {/* Room pins: name plus a small active indicator */}
      {ROOMS.map((r) => {
        const [ax, ay] = project(r.plan.x + r.plan.w / 2, r.plan.y + r.plan.d / 2, 0);
        const lit = litRooms.has(r.id);
        const isSelected = selectedRoomId === r.id;
        const chipW = r.name.length * 5.9 + 30;
        const chipY = ay - 60;
        return (
          <g
            key={`pin-${r.id}`}
            onClick={() => onSelectRoom(r.id)}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            <line x1={ax} y1={ay} x2={ax} y2={chipY + 20} stroke="#64748b" strokeWidth={0.8} />
            <circle cx={ax} cy={ay} r={2.4} fill={lit ? '#f5b544' : '#64748b'} />
            <rect
              x={ax - chipW / 2}
              y={chipY}
              width={chipW}
              height={20}
              rx={10}
              fill={isSelected ? '#0b1220' : '#0f172a'}
              fillOpacity={0.94}
              stroke={isSelected ? '#34d399' : lit ? '#f5b544' : '#334155'}
              strokeWidth={isSelected ? 1.3 : 0.9}
            />
            <circle cx={ax - chipW / 2 + 12} cy={chipY + 10} r={3} fill={lit ? '#f5b544' : '#475569'} />
            <text
              x={ax - chipW / 2 + 20}
              y={chipY + 13.5}
              fontSize={10}
              fill={lit ? '#f8fafc' : '#cbd5e1'}
              fontWeight={600}
            >
              {r.name}
            </text>
          </g>
        );
      })}

      {/* Click targets: the whole room footprint selects the room */}
      {ROOMS.map((r) => (
        <polygon
          key={`hit-${r.id}`}
          points={slab(r.plan.x, r.plan.y, r.plan.w, r.plan.d, 0.04)}
          fill="transparent"
          style={{ cursor: 'pointer', outline: 'none' }}
          tabIndex={0}
          role="button"
          aria-label={`${r.name} light, GPIO ${r.gpio}`}
          onClick={() => onSelectRoom(r.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectRoom(r.id);
            }
          }}
          onMouseEnter={() => setHovered(r.id)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
    </svg>
  );
};
