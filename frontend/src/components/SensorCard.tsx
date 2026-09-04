import React from 'react';
import { Thermometer, Droplets, Activity } from 'lucide-react';
import type { Sensor } from '../types';
import { clsx } from 'clsx';

export const SensorCard: React.FC<{ sensor: Sensor }> = ({ sensor }) => {
  const isWarning = sensor.status === 'Warning';
  const isCritical = sensor.status === 'Critical';
  const isNormal = sensor.status === 'Normal';

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-colors backdrop-blur-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">{sensor.location}</h3>
          <p className="text-sm text-slate-400">{sensor.name}</p>
        </div>
        <div className={clsx(
          "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
          isNormal && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          isWarning && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          isCritical && "bg-red-500/10 text-red-400 border border-red-500/20",
          sensor.status === 'Offline' && "bg-slate-500/10 text-slate-400 border border-slate-500/20"
        )}>
          <Activity className="w-3 h-3" />
          {sensor.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Thermometer className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium">Temperature</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-white">
              {sensor.lastReading?.temperature?.toFixed(1) || '--'}
            </span>
            <span className="text-slate-400 font-medium mb-1">°C</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium">Humidity</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-white">
              {sensor.lastReading?.humidity?.toFixed(1) || '--'}
            </span>
            <span className="text-slate-400 font-medium mb-1">% RH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
