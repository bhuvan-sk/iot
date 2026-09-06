import React from 'react';
import { Cpu } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import type { WSConnectionState } from '../../services/esp32WebSocket';
import type { HttpChannel } from '../../services/sensorService';

/**
 * Console header. Identity on the left, hardware health on the right.
 *
 * Sticky, because "is the board alive?" is the question that matters most and
 * it must stay answerable while scrolling.
 */
export const ConsoleHeader: React.FC<{
  ws: WSConnectionState;
  http: HttpChannel;
  espIp: string;
  stale: boolean;
}> = ({ ws, http, espIp, stale }) => (
  <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
    <div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-line-strong bg-panel text-ok"
          aria-hidden="true"
        >
          <Cpu className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight text-fg">Smart Home Digital Twin</h1>
          <p className="text-micro tracking-[0.1em] text-fg-dim uppercase">
            ESP32 &middot; Live sensor &amp; lighting console
          </p>
        </div>
      </div>

      <ConnectionStatus ws={ws} http={http} espIp={espIp} stale={stale} />
    </div>
  </header>
);
