import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { getEsp32Status } from './services/api';
import type { ESP32Status } from './types';
import { useESP32WebSocket } from './hooks/useESP32WebSocket';
import { esp32WS } from './services/esp32WebSocket';

const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-slate-300 mb-2">{title}</h2>
      <p className="text-slate-500">This section is under construction.</p>
    </div>
  </div>
);

function App() {
  const [espStatus, setEspStatus] = useState<ESP32Status | null>(null);
  const { connectionState } = useESP32WebSocket();

  // Mock mode only. With a real ESP32 the online state comes solely from the
  // WebSocket, so production never needs the Express backend.
  useEffect(() => {
    if (useRealESP32) return;

    const fetchStatus = async () => {
      try {
        const status = await getEsp32Status();
        setEspStatus(status);
      } catch (error) {
        console.error('Failed to fetch ESP32 status', error);
        setEspStatus({
          status: 'Offline' as const,
          ipAddress: '',
          wifiSignal: 0,
          uptime: '',
          firmware: '',
          lastHeartbeat: '',
        });
      }
    };

    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 5000);
    return () => clearInterval(interval);
  }, []);

  const effectiveStatus: ESP32Status | null = useRealESP32
    ? {
        status: connectionState === 'connected' ? 'Online' : 'Offline',
        ipAddress: esp32WS.getEspIp(),
        wifiSignal: 0,
        uptime: '',
        firmware: '',
        lastHeartbeat: '',
      }
    : espStatus;

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <Sidebar esp32Status={effectiveStatus} />

        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          <TopBar esp32Status={effectiveStatus} />

          <main className="flex-1 text-white">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sensors" element={<PlaceholderPage title="Sensors" />} />
              <Route path="/devices" element={<PlaceholderPage title="Devices" />} />
              <Route path="/automations" element={<PlaceholderPage title="Automations" />} />
              <Route path="/alerts" element={<PlaceholderPage title="Alerts" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
