import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, Lightbulb, GitBranch, Bell, Settings, Cpu } from 'lucide-react';
import { clsx } from 'clsx';
import type { ESP32Status } from '../types';

interface SidebarProps {
  esp32Status: ESP32Status | null;
}

const navItems = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Sensors', icon: Activity, path: '/sensors' },
  { name: 'Devices', icon: Lightbulb, path: '/devices' },
  { name: 'Automations', icon: GitBranch, path: '/automations' },
  { name: 'Alerts', icon: Bell, path: '/alerts' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ esp32Status }) => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
          <Cpu className="w-6 h-6" />
          Smart Home
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => clsx(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
              isActive ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            {React.createElement(item.icon, { className: "w-5 h-5" })}
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">ESP32 Main</p>
            <p className="text-xs text-slate-500">Controller</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx(
              "w-2 h-2 rounded-full",
              esp32Status?.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'
            )}></span>
            <span className="text-xs font-medium text-slate-300">{esp32Status?.status || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
