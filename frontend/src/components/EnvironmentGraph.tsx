import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Pause, Play } from 'lucide-react';
import { clsx } from 'clsx';
import type { Sensor } from '../types';
import { getSensorHistory } from '../services/api';
import { useESP32WebSocket } from '../hooks/useESP32WebSocket';
import { Panel, PanelHeader, StatusPill } from './console/Panel';

interface EnvironmentGraphProps {
  /** Mock-mode only: the Express sensor whose history is fetched. */
  sensors?: Sensor[];
}

// Temperature borrows the "active/warm" hue, humidity the passive info hue, so
// the chart uses the same semantic palette as the rest of the console.
const TEMP_COLOR = '#f2b13d';
const HUM_COLOR = '#6aa9d8';

type View = 'Temperature' | 'Humidity' | 'Both';

export const EnvironmentGraph: React.FC<EnvironmentGraphProps> = ({ sensors = [] }) => {
  const [restData, setRestData] = useState<Record<string, unknown>[]>([]);
  const [view, setView] = useState<View>('Both');
  const [paused, setPaused] = useState(false);
  const frozen = useRef<Record<string, unknown>[]>([]);

  const { history, connectionState } = useESP32WebSocket();
  const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

  // Unchanged data path: real mode consumes the shared WebSocket history, mock
  // mode keeps polling the Express history endpoint.
  useEffect(() => {
    if (useRealESP32 || sensors.length === 0) return;

    const fetchHistory = async () => {
      try {
        const hist = await getSensorHistory(sensors[0].id);
        setRestData(
          hist.map((h) => ({
            time: new Date(h.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            temperature: h.temperature,
            humidity: h.humidity,
          })),
        );
      } catch (e) {
        console.error(e);
      }
    };

    void fetchHistory();
    const interval = setInterval(() => void fetchHistory(), 5000);
    return () => clearInterval(interval);
  }, [sensors, useRealESP32]);

  const live = useRealESP32 ? (history as unknown as Record<string, unknown>[]) : restData;

  // Pause freezes the series so a value can actually be read off a moving
  // chart. The underlying feed keeps running; only the render is held.
  if (!paused) frozen.current = live;
  const data = paused ? frozen.current : live;

  const latest = data.length ? data[data.length - 1] : null;
  const summary = useMemo(() => {
    if (!latest) return 'No readings yet.';
    return `Latest reading ${latest.temperature ?? '--'} degrees Celsius and ${latest.humidity ?? '--'} percent relative humidity, from ${data.length} samples.`;
  }, [latest, data.length]);

  const waiting = data.length === 0;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Environment trend"
        aside={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusPill
              tone={connectionState === 'connected' ? 'ok' : 'idle'}
              label={connectionState === 'connected' ? 'Live' : 'No feed'}
              pulse={connectionState === 'connected' && !paused}
            />

            {/* Streaming charts need a pause control; also satisfies the
                reduced-motion expectation for continuously moving content. */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="flex items-center gap-1.5 border border-line px-2 py-1 text-micro font-semibold tracking-wider text-fg-muted uppercase transition-colors hover:border-line-strong hover:text-fg"
            >
              {paused ? <Play className="h-3 w-3" aria-hidden="true" /> : <Pause className="h-3 w-3" aria-hidden="true" />}
              {paused ? 'Resume' : 'Pause'}
            </button>

            <div className="flex border border-line" role="group" aria-label="Series filter">
              {(['Temperature', 'Humidity', 'Both'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  aria-pressed={view === option}
                  className={clsx(
                    'px-2.5 py-1 text-micro font-semibold tracking-wider uppercase transition-colors',
                    view === option ? 'bg-panel-raised text-fg' : 'text-fg-dim hover:text-fg-muted',
                  )}
                >
                  {option === 'Temperature' ? 'Temp' : option === 'Humidity' ? 'Hum' : 'Both'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="relative min-h-0 flex-1 p-2">
        {/* Text alternative: a chart alone is not screen-reader friendly. */}
        <p className="sr-only" role="status">
          {summary}
        </p>

        {waiting && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-xs text-fg-dim">
              {useRealESP32 ? 'Waiting for the first reading from the ESP32…' : 'No history available.'}
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEMP_COLOR} stopOpacity={0.22} />
                <stop offset="100%" stopColor={TEMP_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gHum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HUM_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={HUM_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Low-contrast grid so it never competes with the data. */}
            <CartesianGrid strokeDasharray="2 4" stroke="#1d2532" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#5a6779"
              fontSize={10}
              tickMargin={8}
              tickLine={false}
              axisLine={{ stroke: '#1d2532' }}
              minTickGap={40}
            />
            <YAxis
              yAxisId="left"
              stroke="#5a6779"
              fontSize={10}
              width={38}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}°`}
              hide={view === 'Humidity'}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#5a6779"
              fontSize={10}
              width={38}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              hide={view === 'Temperature'}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#10161f',
                border: '1px solid #2b3644',
                borderRadius: 0,
                fontSize: 12,
                padding: '6px 10px',
              }}
              labelStyle={{ color: '#8a99ad', fontSize: 11, marginBottom: 2 }}
              itemStyle={{ color: '#e9eef6', padding: 0 }}
              cursor={{ stroke: '#2b3644', strokeWidth: 1 }}
            />

            {(view === 'Temperature' || view === 'Both') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke={TEMP_COLOR}
                strokeWidth={1.75}
                fill="url(#gTemp)"
                isAnimationActive={false}
                dot={false}
              />
            )}
            {(view === 'Humidity' || view === 'Both') && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                name="Humidity (%)"
                stroke={HUM_COLOR}
                strokeWidth={1.75}
                strokeDasharray="4 3"
                fill="url(#gHum)"
                isAnimationActive={false}
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Direct labelling instead of a detached legend, and a dash pattern on
          humidity so the two series are separable without relying on colour. */}
      <div className="flex items-center gap-4 border-t border-line px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <span className="h-0.5 w-4" style={{ backgroundColor: TEMP_COLOR }} aria-hidden="true" />
          Temperature °C
        </span>
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <span
            className="h-0.5 w-4"
            style={{ backgroundImage: `repeating-linear-gradient(90deg, ${HUM_COLOR} 0 4px, transparent 4px 7px)` }}
            aria-hidden="true"
          />
          Humidity %
        </span>
        <span className="readout ml-auto text-xs text-fg-dim">{data.length} samples</span>
      </div>
    </Panel>
  );
};
