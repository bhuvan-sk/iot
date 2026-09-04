import React from 'react';
import { Bell } from 'lucide-react';
import type { ESP32Status } from '../types';
import { clsx } from 'clsx';

export const TopBar: React.FC<{ esp32Status: ESP32Status | null }> = ({ esp32Status }) => {
  const isOnline = esp32Status?.status === 'Online';

  return (
    <header className="h-20 px-8 flex items-center justify-between bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">ESP32:</span>
            <span className={clsx(
              "text-sm font-semibold",
              isOnline ? "text-emerald-400" : "text-red-400"
            )}>
              {esp32Status?.status || 'Loading...'}
            </span>
          </div>
          {isOnline && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          )}
        </div>

        <button className="p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
          US
        </div>
      </div>
    </header>
  );
};
