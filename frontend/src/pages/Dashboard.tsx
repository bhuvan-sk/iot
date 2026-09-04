import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { EnvironmentGraph } from '../components/EnvironmentGraph';
import { SensorCard } from '../components/SensorCard';
import { HouseScene } from '../components/house/HouseScene';
import { RoomPanel } from '../components/house/RoomPanel';
import { getSensors, getAutomations, getAlerts } from '../services/api';
import type { Sensor, Automation, Alert } from '../types';
import { AlertTriangle, Info, Thermometer, Droplets, Lightbulb, Cpu } from 'lucide-react';
import { clsx } from 'clsx';

import { useESP32WebSocket } from '../hooks/useESP32WebSocket';
import { useDevices } from '../hooks/useDevices';
import { ROOMS, roomById } from '../config/rooms';

const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

const Metric = ({
  icon,
  label,
  value,
  unit,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: 'default' | 'on' | 'off';
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
    <span
      className={clsx(
        'shrink-0',
        tone === 'on' && 'text-emerald-400',
        tone === 'off' && 'text-rose-400',
        tone === 'default' && 'text-slate-400',
      )}
    >
      {icon}
    </span>
    <div className="leading-tight">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">
        {value}
        {unit && <span className="text-slate-400 font-medium ml-0.5">{unit}</span>}
      </p>
    </div>
  </div>
);

export const Dashboard = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);

  const { latestMessage, connectionState } = useESP32WebSocket();
  const { devices, toggle } = useDevices();

  // The Express backend is only ever contacted in mock mode. In real-ESP32
  // mode nothing here touches localhost, which is what allows the production
  // build to run standalone from the ESP32's LittleFS.
  useEffect(() => {
    if (useRealESP32) return;

    const fetchData = async () => {
      try {
        const [fetchedSensors, fetchedAutomations, fetchedAlerts] = await Promise.all([
          getSensors(),
          getAutomations(),
          getAlerts(),
        ]);
        setSensors(fetchedSensors);
        setAutomations(fetchedAutomations);
        setAlerts(fetchedAlerts);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      }
    };

    void fetchData();
    const interval = setInterval(() => void fetchData(), 5000);
    return () => clearInterval(interval);
  }, []);

  // Whole-house environment. One DHT11 on GPIO 5 measures the whole dwelling,
  // so no per-room values are invented. "--" until the first real reading.
  const temperature = useRealESP32
    ? (latestMessage?.temperature?.toFixed(1) ?? '--')
    : sensors.length
      ? (sensors.reduce((acc, s) => acc + (s.lastReading?.temperature || 0), 0) / sensors.length).toFixed(1)
      : '--';

  const humidity = useRealESP32
    ? (latestMessage?.humidity?.toFixed(0) ?? '--')
    : sensors.length
      ? (sensors.reduce((acc, s) => acc + (s.lastReading?.humidity || 0), 0) / sensors.length).toFixed(0)
      : '--';

  const isOnline = connectionState === 'connected';
  const lightsOn = devices.filter((d) => d.state === 'ON').length;
  const selectedRoom = roomById(selectedRoomId) ?? ROOMS[0];
  const selectedDevice = devices.find((d) => d.id === selectedRoom.id);

  const displaySensors = useMemo<Sensor[]>(() => {
    if (!useRealESP32) return sensors;
    return [
      {
        id: 'live-dht11',
        name: 'DHT11 on GPIO 5',
        location: 'Whole House',
        status: isOnline ? 'Normal' : 'Offline',
        connected: isOnline,
        lastReading: latestMessage
          ? {
              id: 'live-reading',
              timestamp: new Date().toISOString(),
              temperature: latestMessage.temperature || 0,
              humidity: latestMessage.humidity || 0,
            }
          : undefined,
      },
    ];
  }, [sensors, latestMessage, isOnline]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ------------------------------------------------ The centrepiece -- */}
        <div className="xl:col-span-2 bg-slate-800/20 border border-slate-700/40 rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-slate-800/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">House</h3>
                <p className="text-xs text-slate-500">
                  Select a room to control its light
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Metric
                  icon={<Thermometer className="w-4 h-4" />}
                  label="Whole house"
                  value={temperature}
                  unit="°C"
                />
                <Metric
                  icon={<Droplets className="w-4 h-4" />}
                  label="Humidity"
                  value={humidity}
                  unit="%"
                />
                <Metric
                  icon={<Lightbulb className="w-4 h-4" />}
                  label="Lights"
                  value={`${lightsOn} / ${devices.length || ROOMS.length}`}
                  unit=" ON"
                />
                <Metric
                  icon={<Cpu className="w-4 h-4" />}
                  label="ESP32"
                  value={isOnline ? 'ONLINE' : 'OFFLINE'}
                  tone={isOnline ? 'on' : 'off'}
                />
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-2 bg-[radial-gradient(ellipse_at_50%_45%,rgba(51,65,85,0.35),transparent_70%)]">
            <HouseScene
              devices={devices}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
          </div>
        </div>

        {/* --------------------------------------------------- Room details -- */}
        <div className="space-y-6">
          <RoomPanel
            room={selectedRoom}
            device={selectedDevice}
            onToggle={() => toggle(selectedRoom.id)}
            temperature={temperature}
            humidity={humidity}
            connectionState={connectionState}
            useRealESP32={useRealESP32}
          />
        </div>
      </div>

      {/* ------------------------------------------------ Environment trends -- */}
      <div className="h-[420px]">
        <EnvironmentGraph sensors={displaySensors} />
      </div>

      {/* Mock-mode extras from the Express backend stay exactly as they were. */}
      {!useRealESP32 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4">Sensors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displaySensors.map((sensor) => (
                <SensorCard key={sensor.id} sensor={sensor} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Automations</h3>
              <div className="space-y-3">
                {automations.map((auto) => (
                  <div
                    key={auto.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">{auto.name}</p>
                      <p className="text-xs text-slate-400">
                        {auto.trigger} &rarr; {auto.action}
                      </p>
                    </div>
                    <div
                      className={clsx(
                        'px-2 py-1 rounded text-[10px] font-bold tracking-wider',
                        auto.enabled
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-400',
                      )}
                    >
                      {auto.enabled ? 'ON' : 'OFF'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  Alerts
                </h3>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={clsx(
                        'flex gap-3 p-3 rounded-xl border',
                        alert.type === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'bg-blue-500/10 border-blue-500/20',
                      )}
                    >
                      {alert.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p
                          className={clsx(
                            'text-sm font-medium',
                            alert.type === 'warning' ? 'text-amber-200' : 'text-blue-200',
                          )}
                        >
                          {alert.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
