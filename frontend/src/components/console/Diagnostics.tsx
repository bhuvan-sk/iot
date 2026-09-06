import React, { useState } from 'react';
import { ChevronDown, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { Panel } from './Panel';
import { ROOMS } from '../../config/rooms';
import { useSensors } from '../../hooks/useSensors';
import type { WSConnectionState } from '../../services/esp32WebSocket';

/**
 * Developer detail, deliberately collapsed by default.
 *
 * GPIO numbers, endpoint paths and transport errors belong here and nowhere
 * else - the control surface above stays in the language of rooms and lights.
 */
export const Diagnostics: React.FC<{
  espIp: string;
  ws: WSConnectionState;
  ledError: string | null;
}> = ({ espIp, ws, ledError }) => {
  const [open, setOpen] = useState(false);
  const sensors = useSensors();

  const rows: [string, string][] = [
    ['ESP32 address', espIp],
    ['WebSocket', `ws://${espIp}:81/ — ${ws}`],
    ['Sensor endpoint', `http://${espIp}/sensors — ${sensors.channel}`],
    ['Last sensor poll', sensors.lastUpdatedAt ? new Date(sensors.lastUpdatedAt).toLocaleTimeString() : 'never'],
    ['Sensor error', sensors.lastError ?? 'none'],
    ['LED command error', ledError ?? 'none'],
    ['Ultrasonic echo', sensors.reading?.distanceValid ? 'valid' : 'no echo / unavailable'],
    ['LDR detected (GPIO 34)', sensors.reading?.ldrAvailable ? 'yes' : 'no'],
  ];

  return (
    <Panel>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-fg-dim" aria-hidden="true" />
          <span className="eyebrow">Diagnostics</span>
        </span>
        <ChevronDown
          className={clsx('h-4 w-4 text-fg-dim transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-line">
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 px-4 py-2">
                <dt className="shrink-0 text-xs text-fg-dim">{k}</dt>
                <dd className="readout min-w-0 truncate text-right font-mono text-xs text-fg-muted">{v}</dd>
              </div>
            ))}
          </dl>

          {/* The GPIO map lives here only. */}
          <div className="border-t border-line px-4 py-3">
            <p className="eyebrow mb-2">Hardware map</p>
            <ul className="space-y-1">
              {ROOMS.map((room) => (
                <li key={room.id} className="flex items-center justify-between text-xs">
                  <span className="text-fg-muted">{room.name}</span>
                  <span className="readout font-mono text-fg-dim">
                    GPIO {room.gpio} &middot; /{room.color}/&lt;on|off&gt;
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between text-xs">
                <span className="text-fg-muted">DHT11</span>
                <span className="readout font-mono text-fg-dim">GPIO 5 &middot; ws :81</span>
              </li>
              <li className="flex items-center justify-between text-xs">
                <span className="text-fg-muted">Ultrasonic</span>
                <span className="readout font-mono text-fg-dim">TRIG 18 / ECHO 16</span>
              </li>
              <li className="flex items-center justify-between text-xs">
                <span className="text-fg-muted">LDR</span>
                <span className="readout font-mono text-fg-dim">GPIO 34 (ADC1)</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
};
