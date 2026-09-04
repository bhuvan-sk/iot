import React from 'react';
import { Thermometer, Droplets, Cpu, WifiOff } from 'lucide-react';
import type { Device } from '../../types';
import type { RoomDef } from '../../config/rooms';
import type { WSConnectionState } from '../../services/esp32WebSocket';
import { DeviceToggle } from '../DeviceToggle';

interface RoomPanelProps {
  room: RoomDef;
  device: Device | undefined;
  onToggle: () => void | Promise<void>;
  /** Whole-house readings from the single DHT11 on GPIO 5. */
  temperature: string;
  humidity: string;
  connectionState: WSConnectionState;
  useRealESP32: boolean;
}

export const RoomPanel: React.FC<RoomPanelProps> = ({
  room,
  device,
  onToggle,
  temperature,
  humidity,
  connectionState,
  useRealESP32,
}) => {
  const offline = useRealESP32 && connectionState !== 'connected';

  return (
    <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
          Selected room
        </p>
        <h3 className="text-xl font-bold text-white mt-1">{room.name}</h3>
        <p className="text-sm text-slate-400">{room.description}</p>
      </div>

      {device ? (
        <DeviceToggle device={device} onToggle={onToggle} />
      ) : (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 text-sm text-slate-400">
          No controllable light mapped to this room.
        </div>
      )}

      {offline && (
        <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          ESP32 offline &mdash; controls are disabled until it reconnects.
        </div>
      )}

      {/* Hardware mapping - the physical LED colour is an implementation
          detail and is only surfaced here, never used as a UI colour. */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase">Hardware</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">GPIO</span>
          <span className="text-slate-200 font-medium tabular-nums">{room.gpio}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Endpoint</span>
          <span className="text-slate-200 font-mono text-xs">
            /{room.color}/{device?.state === 'ON' ? 'off' : 'on'}
          </span>
        </div>
      </div>

      {/* One DHT11 on GPIO 5 measures the whole dwelling, so it is reported as
          a whole-house figure rather than faked per room. */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase mb-3">
          Whole house environment
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Thermometer className="w-4 h-4 text-amber-400/80" />
              <span className="text-xs font-medium">Temp</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-white tabular-nums">{temperature}</span>
              <span className="text-slate-400 text-sm mb-1">&deg;C</span>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Droplets className="w-4 h-4 text-cyan-400/80" />
              <span className="text-xs font-medium">Humidity</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-white tabular-nums">{humidity}</span>
              <span className="text-slate-400 text-sm mb-1">%</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] mt-3 text-slate-500">
          Single DHT11 on GPIO 5 &middot; whole-house reading
        </p>
      </div>
    </div>
  );
};
