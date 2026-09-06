import { useState } from 'react';
import { clsx } from 'clsx';
import { HouseScene3D } from '../components/house3d/HouseScene3D';

import { useESP32WebSocket } from '../hooks/useESP32WebSocket';
import { useDevices } from '../hooks/useDevices';
import { useHttpChannel, useGarage, useAmbientLight, useSensors } from '../hooks/useSensors';
import { useRoomAutomation } from '../hooks/useRoomAutomation';
import { roomById } from '../config/rooms';
import { esp32WS } from '../services/esp32WebSocket';
import { useGestures } from '../hooks/useGestures';
import { Settings, X, Moon, Sun, MonitorPlay, Shield } from 'lucide-react';

export const Dashboard = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [globalMode, setGlobalMode] = useState<'NORMAL' | 'NIGHT' | 'ENTERTAINMENT' | 'SECURITY'>('NORMAL');

  const { latestMessage, connectionState } = useESP32WebSocket();
  const { devices, toggle } = useDevices();
  const httpChannel = useHttpChannel();
  const garageInfo = useGarage();
  const ambientLight = useAmbientLight();
  const gestures = useGestures();
  const sensors = useSensors();
  const { evaluations, setMode } = useRoomAutomation();

  const dhtOnline = connectionState === 'connected';
  const controlOnline = import.meta.env.VITE_USE_REAL_ESP32 === 'true' ? httpChannel !== 'offline' : true;

  const temperature = dhtOnline ? (latestMessage?.temperature?.toFixed(1) ?? null) : null;
  const humidity = dhtOnline ? (latestMessage?.humidity?.toFixed(0) ?? null) : null;

  const selectedRoom = selectedRoomId ? roomById(selectedRoomId) : null;
  const selectedDevice = selectedRoom ? devices.find((d) => d.id === selectedRoom.id) : undefined;
  
  const isGarageSelected = selectedRoomId === 'garage';

  const panelOpen = Boolean(selectedRoomId || showDiagnostics);

  return (
    <div className={clsx(
      "flex w-screen h-screen overflow-hidden text-white transition-colors duration-1000",
      globalMode === 'NIGHT' ? "bg-black" : 
      globalMode === 'ENTERTAINMENT' ? "bg-indigo-950/20" : 
      globalMode === 'SECURITY' ? "bg-red-950/10" : "bg-neutral-950"
    )}>
      
      {/* ======================================================== */}
      {/* 3D HOUSE AREA (Flex 1 - Takes remaining space)            */}
      {/* ======================================================== */}
      <div className="relative flex-1 min-w-0 transition-all duration-500">
        
        {/* The House Canvas */}
        <div className="absolute inset-0">
          <HouseScene3D
            devices={devices}
            selectedRoomId={selectedRoomId}
            onSelectRoom={(id) => {
              if (id === selectedRoomId) {
                setSelectedRoomId(null);
              } else {
                setSelectedRoomId(id);
                setShowDiagnostics(false);
              }
            }}
            globalMode={globalMode}
            ambientLightBand={ambientLight.band}
          />
        </div>

        {/* Minimal Top Bar Overlay */}
        <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-lg">
              <div className={clsx("w-2 h-2 rounded-full", controlOnline ? "bg-emerald-400" : "bg-red-500 animate-pulse")} />
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/90">SMART HOME DIGITAL TWIN</span>
            </div>
            
            {temperature && humidity && (
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 text-xs font-medium tracking-wide text-white/80 shadow-lg flex gap-3">
                <span>{temperature}°C</span>
                <span className="text-white/40">|</span>
                <span>{humidity}% RH</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1 flex items-center shadow-lg">
              {(['NORMAL', 'NIGHT', 'ENTERTAINMENT', 'SECURITY'] as const).map(mode => (
                <button 
                  key={mode} 
                  onClick={() => setGlobalMode(mode)}
                  className={clsx(
                    "p-2 rounded-full transition-all duration-300", 
                    globalMode === mode ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70"
                  )}
                  title={`${mode} MODE`}
                >
                  {mode === 'NORMAL' && <Sun size={14} />}
                  {mode === 'NIGHT' && <Moon size={14} />}
                  {mode === 'ENTERTAINMENT' && <MonitorPlay size={14} />}
                  {mode === 'SECURITY' && <Shield size={14} />}
                </button>
              ))}
            </div>

            <button 
              onClick={() => {
                setShowDiagnostics(!showDiagnostics);
                if (!showDiagnostics) setSelectedRoomId(null);
              }}
              className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-2.5 text-white/60 hover:text-white transition-colors shadow-lg"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Gesture Context Overlay */}
        {gestures.lastCommand && gestures.lastCommand !== 'CANCEL' && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 flex flex-col items-center shadow-2xl">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 mb-1">GESTURE DETECTED</span>
              <span className="text-sm font-semibold tracking-wider text-white">
                {gestures.lastCommand.replace('_', ' ')} {gestures.spatialZone ? `— ${gestures.spatialZone}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Subtle Motion Indicator Overlay */}
        {sensors.reading?.motion && (
          <div className="absolute bottom-6 right-6 z-10 pointer-events-none animate-in fade-in duration-300">
             <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-full px-4 py-1.5 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
               <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400/90 uppercase">Motion Detected</span>
             </div>
          </div>
        )}

        {/* Subtle Hint when no room is selected */}
        {!panelOpen && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-50 font-medium tracking-[0.2em] text-[10px] uppercase">
            Select a room or click a light
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* RIGHT CONTEXT PANEL AREA (Fixed width when open)          */}
      {/* ======================================================== */}
      <div 
        className={clsx(
          "h-full bg-[#0a0a0a] border-l border-white/10 transition-all duration-500 ease-in-out overflow-y-auto flex-shrink-0 z-20",
          panelOpen ? "w-full md:w-[360px] opacity-100" : "w-0 opacity-0 border-transparent"
        )}
      >
        <div className="p-6 h-full flex flex-col min-w-[360px]">
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">
              {showDiagnostics ? 'System Diagnostics' : isGarageSelected ? 'Garage' : selectedRoom?.name}
            </h2>
            <button 
              onClick={() => { setSelectedRoomId(null); setShowDiagnostics(false); }}
              className="p-2 -mr-2 text-white/40 hover:text-white transition-colors rounded-full"
            >
              <X size={16} />
            </button>
          </div>

          {/* ----- DIAGNOSTICS VIEW ----- */}
          {showDiagnostics && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-12">
              
              <div className="border border-white/10 rounded-xl p-5 bg-white/5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 block mb-4 uppercase">ESP32 Core</span>
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">Status</span>
                    <span className={clsx("text-xs font-bold", controlOnline ? "text-emerald-400" : "text-red-400")}>{controlOnline ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">IP Address</span>
                    <span className="text-xs font-medium text-white/80">{esp32WS.getEspIp()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">WebSocket</span>
                    <span className={clsx("text-xs font-bold", connectionState === 'connected' ? "text-emerald-400" : "text-amber-400")}>{connectionState.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">HTTP Channel</span>
                    <span className={clsx("text-xs font-bold", httpChannel === 'online' ? "text-emerald-400" : "text-amber-400")}>{httpChannel.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 rounded-xl p-5 bg-white/5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 block mb-4 uppercase">Environment</span>
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">Temperature</span>
                    <span className="text-sm font-medium text-white/90">{temperature ?? '--'}°C</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">Humidity</span>
                    <span className="text-sm font-medium text-white/90">{humidity ?? '--'}%</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">Ambient Light (LDR)</span>
                    <div className="flex justify-between items-center pr-4">
                      <span className="text-sm font-bold text-white/90">{ambientLight.band ? ambientLight.band.toUpperCase() : 'UNKNOWN'}</span>
                      <span className="text-xs text-white/50">{sensors.reading?.ldr ?? '---'} raw</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 rounded-xl p-5 bg-white/5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 block mb-4 uppercase">Presence & Motion</span>
                <div className="grid grid-cols-2 gap-y-4">
                  <div className="col-span-2">
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">Ultrasonic (HC-SR04)</span>
                    <span className="text-sm font-medium text-white/90">{garageInfo.distanceCm ? `${garageInfo.distanceCm} cm` : '---'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-white/40 block mb-1 uppercase">PIR Sensor</span>
                    <span className={clsx("text-sm font-bold", sensors.reading?.motion ? "text-emerald-400" : "text-white/70")}>{sensors.reading?.motion ? 'MOTION DETECTED' : 'CLEAR'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 rounded-xl p-5 bg-white/5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 block mb-4 uppercase">Hardware Mappings</span>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-white/70">
                  <div>DHT11<br/><span className="text-white mt-1 block">GPIO 5</span></div>
                  <div>LDR<br/><span className="text-white mt-1 block">GPIO 34</span></div>
                  <div>HC-SR04<br/><span className="text-white mt-1 block">TRIG 18 / ECHO 16</span></div>
                  <div>PIR<br/><span className="text-white mt-1 block">GPIO 27</span></div>
                  <div className="col-span-2">LEDs (Liv / Bed / Kit / Gar)<br/><span className="text-white mt-1 block">26 / 17 / 25 / 19</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ----- ROOM VIEW ----- */}
          {selectedRoom && !isGarageSelected && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-500 h-full">
              
              {/* Modes */}
              <div className="flex bg-white/5 p-1 rounded-lg">
                <button 
                  onClick={() => setMode(selectedRoom.id, 'AUTO')}
                  className={clsx("flex-1 text-[10px] font-bold tracking-[0.15em] py-2.5 rounded-md transition-colors", evaluations[selectedRoom.id]?.mode === 'AUTO' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80")}
                >AUTO</button>
                <button 
                  onClick={() => setMode(selectedRoom.id, 'MANUAL')}
                  className={clsx("flex-1 text-[10px] font-bold tracking-[0.15em] py-2.5 rounded-md transition-colors", evaluations[selectedRoom.id]?.mode !== 'AUTO' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80")}
                >MANUAL</button>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 block mb-1 uppercase">Light</span>
                  <span className={clsx("text-xl font-bold tracking-tight", selectedDevice?.state === 'ON' ? "text-amber-300" : "text-white")}>
                    {selectedDevice?.state === 'ON' ? 'ON' : 'OFF'}
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 block mb-1 uppercase">Ambient</span>
                  <span className="text-xl font-bold tracking-tight text-white">{ambientLight.band ? ambientLight.band.toUpperCase() : '--'}</span>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 block mb-1 uppercase">Temp</span>
                  <span className="text-xl font-bold tracking-tight text-white">{temperature ?? '--'}°C</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 block mb-1 uppercase">Humidity</span>
                  <span className="text-xl font-bold tracking-tight text-white">{humidity ?? '--'}%</span>
                </div>

                <div className="col-span-2 border-t border-white/10 pt-6">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 block mb-1 uppercase">Presence</span>
                  <span className={clsx("text-lg font-bold tracking-tight", evaluations[selectedRoom.id]?.presence ? "text-emerald-400" : "text-white")}>
                    {evaluations[selectedRoom.id]?.presence ? 'DETECTED' : 'CLEAR'}
                  </span>
                </div>
              </div>

              <div className="mt-auto">
                {/* Automation Hint */}
                {evaluations[selectedRoom.id]?.mode === 'AUTO' && (
                  <div className="text-[10px] font-medium tracking-[0.1em] text-white/50 mb-3 text-center uppercase">
                    {evaluations[selectedRoom.id]?.verdict === 'on' ? 'Triggered: Low Light + Presence' : 'Auto mode actively managing light'}
                  </div>
                )}
                
                <button 
                  onClick={() => toggle(selectedRoom.id)}
                  disabled={!controlOnline || evaluations[selectedRoom.id]?.mode === 'AUTO'}
                  className="w-full py-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed uppercase"
                >
                  {selectedDevice?.state === 'ON' ? 'Turn Off Light' : 'Turn On Light'}
                </button>
              </div>

            </div>
          )}

          {/* ----- GARAGE VIEW ----- */}
          {isGarageSelected && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-full">
              
              <div className="border border-white/10 rounded-xl p-5 bg-white/5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 block mb-1 uppercase">BAY 01</span>
                  <span className={clsx("text-lg font-bold tracking-tight", garageInfo.state === 'occupied' ? "text-amber-400" : "text-white")}>
                    {garageInfo.state === 'occupied' ? 'OCCUPIED' : 'CLEAR'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/50 block mb-1 uppercase">HC-SR04</span>
                  <span className="text-lg font-bold tracking-tight text-white">{garageInfo.distanceCm ? `${garageInfo.distanceCm} cm` : '---'}</span>
                </div>
              </div>

              <div className="border border-white/5 rounded-xl p-5 bg-white/[0.02]">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 block mb-1 uppercase">BAY 02</span>
                <span className="text-sm font-bold tracking-tight text-white/30">NOT MONITORED</span>
              </div>
              
              <div className="mt-auto">
                <button 
                  onClick={() => toggle('garage')}
                  disabled={!controlOnline || evaluations['garage']?.mode === 'AUTO'}
                  className="w-full py-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed uppercase"
                >
                  {devices.find(d => d.id === 'garage')?.state === 'ON' ? 'Turn Off Light' : 'Turn On Light'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
