import { HOUSE_ROOMS } from '../../config/rooms';

export const CEILING_H = 3.2;

export interface RoomVolume {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  light: [number, number];
  controllable: boolean;
  floor: string;
}

export const ROOM_VOLUMES: RoomVolume[] = HOUSE_ROOMS.map((r) => ({
  id: r.id,
  name: r.name,
  x: r.x,
  z: r.z,
  w: r.w,
  d: r.d,
  light: r.light,
  controllable: r.hardware !== undefined,
  floor: r.floor,
}));
