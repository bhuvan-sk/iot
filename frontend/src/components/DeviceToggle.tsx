import React, { useState } from 'react';
import type { Device } from '../types';
import { clsx } from 'clsx';
import { Power, Lightbulb } from 'lucide-react';

import { useESP32WebSocket } from '../hooks/useESP32WebSocket';

interface DeviceToggleProps {
  device: Device;
  /** Supplied by the caller and backed by deviceStore, which owns the one
   *  ESP32 HTTP implementation (real mode) or the Express call (mock mode). */
  onToggle: () => void | Promise<void>;
}

export const DeviceToggle: React.FC<DeviceToggleProps> = ({ device, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const { connectionState } = useESP32WebSocket();
  const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

  const isOn = device.state === 'ON';
  // Preserved behaviour: with a real ESP32, refuse to send while disconnected.
  const blocked = useRealESP32 && connectionState !== 'connected';

  const handleToggle = async () => {
    if (blocked) {
      console.warn('ESP32 Offline - Cannot toggle device');
      return;
    }
    setLoading(true);
    try {
      await onToggle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={clsx(
        'rounded-2xl p-5 flex items-center justify-between border transition-colors backdrop-blur-sm',
        isOn
          ? 'bg-amber-500/[0.07] border-amber-500/25'
          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60',
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500',
          )}
        >
          <Lightbulb className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-white font-medium">{device.location}</h4>
          <p className="text-xs text-slate-400">
            {isOn ? 'Light on' : 'Light off'} &middot; GPIO {device.gpio}
          </p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading || blocked}
        aria-pressed={isOn}
        aria-label={`Toggle ${device.location} light`}
        title={blocked ? 'ESP32 offline' : undefined}
        className={clsx(
          'relative w-14 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900',
          isOn ? 'bg-amber-500' : 'bg-slate-700',
          (loading || blocked) && 'opacity-40 cursor-not-allowed',
        )}
      >
        <div
          className={clsx(
            'absolute top-1 w-6 h-6 rounded-full bg-white transition-transform flex items-center justify-center',
            isOn ? 'left-7' : 'left-1',
          )}
        >
          <Power className={clsx('w-3 h-3', isOn ? 'text-amber-500' : 'text-slate-400')} />
        </div>
      </button>
    </div>
  );
};
