import React from 'react';
import { clsx } from 'clsx';
import { StatusDot } from './Panel';
import type { Tone } from './Panel';
import type { WSConnectionState } from '../../services/esp32WebSocket';
import type { HttpChannel } from '../../services/sensorService';

/**
 * The single most important thing on the page: is the hardware there?
 *
 * Rolls the two independent transports into one headline verdict, with the
 * per-channel detail available underneath rather than shouted. The two really
 * are independent - the WebSocket can drop while HTTP still answers - so the
 * headline degrades to PARTIAL instead of lying in either direction.
 */

export type SystemState = 'online' | 'partial' | 'connecting' | 'offline';

export function deriveSystemState(ws: WSConnectionState, http: HttpChannel): SystemState {
  const wsUp = ws === 'connected';
  const httpUp = http === 'online';
  if (wsUp && httpUp) return 'online';
  if (wsUp || httpUp) return 'partial';
  if (ws === 'connecting' || http === 'connecting') return 'connecting';
  return 'offline';
}

const SYSTEM_LABEL: Record<SystemState, string> = {
  online: 'ESP32 Online',
  partial: 'ESP32 Degraded',
  connecting: 'Connecting',
  offline: 'ESP32 Offline',
};

const SYSTEM_TONE: Record<SystemState, Tone> = {
  online: 'ok',
  partial: 'warn',
  connecting: 'warn',
  offline: 'danger',
};

const SYSTEM_TEXT: Record<SystemState, string> = {
  online: 'text-ok',
  partial: 'text-warn',
  connecting: 'text-warn',
  offline: 'text-danger',
};

const Channel: React.FC<{ name: string; up: boolean; detail: string }> = ({ name, up, detail }) => (
  <div className="flex items-center gap-2">
    <StatusDot tone={up ? 'ok' : 'idle'} />
    <span className="text-micro font-semibold tracking-[0.1em] text-fg-muted uppercase">{name}</span>
    <span className="text-micro text-fg-dim">{detail}</span>
  </div>
);

interface ConnectionStatusProps {
  ws: WSConnectionState;
  http: HttpChannel;
  espIp: string;
  stale: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ ws, http, espIp, stale }) => {
  const system = deriveSystemState(ws, http);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-2.5">
        <StatusDot tone={SYSTEM_TONE[system]} pulse={system === 'online'} className="h-2 w-2" />
        <span
          className={clsx('text-sm font-semibold tracking-tight', SYSTEM_TEXT[system])}
          // One atomic status phrase, announced without moving focus.
          role="status"
          aria-atomic="true"
        >
          {SYSTEM_LABEL[system]}
        </span>
        <span className="readout text-xs text-fg-dim">{espIp}</span>
        {stale && system !== 'offline' && (
          <span className="text-micro font-semibold tracking-wider text-warn uppercase">Stale</span>
        )}
      </div>

      {/* Per-channel detail: present but subordinate, not shouted. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <Channel name="WebSocket" up={ws === 'connected'} detail=":81 sensors" />
        <Channel name="HTTP" up={http === 'online'} detail=":80 control" />
      </div>
    </div>
  );
};
