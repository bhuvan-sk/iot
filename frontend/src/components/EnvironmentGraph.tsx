import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Sensor } from '../types';
import { getSensorHistory } from '../services/api';
import { useESP32WebSocket } from '../hooks/useESP32WebSocket';

interface EnvironmentGraphProps {
  sensors: Sensor[];
}

const TEMP_COLOR = '#f0a04b';
const HUM_COLOR = '#5eb0c4';

export const EnvironmentGraph: React.FC<EnvironmentGraphProps> = ({ sensors }) => {
  const [data, setData] = useState<any[]>([]);
  const [view, setView] = useState<'Temperature' | 'Humidity' | 'Both'>('Both');
  const { history, connectionState } = useESP32WebSocket();
  const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

  // Unchanged: real mode consumes the live WebSocket history, mock mode keeps
  // polling the Express history endpoint.
  useEffect(() => {
    if (useRealESP32) {
      setData(history);
      return;
    }

    const fetchHistory = async () => {
      if (sensors.length > 0) {
        try {
          const hist = await getSensorHistory(sensors[0].id);
          const formatted = hist.map((h) => ({
            time: new Date(h.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            temperature: h.temperature,
            humidity: h.humidity,
          }));
          setData(formatted);
        } catch (e) {
          console.error(e);
        }
      }
    };

    void fetchHistory();
    const interval = setInterval(() => void fetchHistory(), 5000);
    return () => clearInterval(interval);
  }, [sensors, history, useRealESP32]);

  const waiting = useRealESP32 && data.length === 0;

  return (
    <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Environment Trends</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {useRealESP32 ? 'Live DHT11 feed on GPIO 5' : 'Simulated sensor history'}
            {useRealESP32 && (
              <span
                className={
                  connectionState === 'connected'
                    ? 'text-emerald-400 ml-2'
                    : 'text-slate-500 ml-2'
                }
              >
                &bull; {connectionState}
              </span>
            )}
          </p>
        </div>
        <div className="flex bg-slate-900/70 rounded-lg p-1 border border-slate-800">
          {(['Temperature', 'Humidity', 'Both'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === option
                  ? 'bg-slate-700/80 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[280px] relative">
        {waiting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <p className="text-sm text-slate-500">
              Waiting for the first reading from the ESP32&hellip;
            </p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TEMP_COLOR} stopOpacity={0.32} />
                <stop offset="95%" stopColor={TEMP_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={HUM_COLOR} stopOpacity={0.28} />
                <stop offset="95%" stopColor={HUM_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#293548" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickMargin={10}
              tickLine={false}
              axisLine={{ stroke: '#293548' }}
              minTickGap={28}
            />
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}°`}
              hide={view === 'Humidity'}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}%`}
              hide={view === 'Temperature'}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: 8 }}
            />
            {(view === 'Temperature' || view === 'Both') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                name="Temperature (°C)"
                stroke={TEMP_COLOR}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTemp)"
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
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHum)"
                isAnimationActive={false}
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
