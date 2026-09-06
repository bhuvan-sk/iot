import { useMemo, useState } from 'react';
import { EnvironmentGraph } from '../components/EnvironmentGraph';
import { HouseScene3D } from '../components/house3d/HouseScene3D';
import { ConsoleHeader } from '../components/console/ConsoleHeader';
import { SensorPanel } from '../components/console/SensorPanel';
import { RoomControl } from '../components/console/RoomControl';
import { LightingControl } from '../components/console/LightingControl';
import { GarageStatus } from '../components/console/GarageStatus';
import { Diagnostics } from '../components/console/Diagnostics';
import { Panel, PanelHeader, StatusPill } from '../components/console/Panel';

import { useESP32WebSocket } from '../hooks/useESP32WebSocket';
import { useDevices } from '../hooks/useDevices';
import { useHttpChannel, useGarageOccupied, useSensors } from '../hooks/useSensors';
import { useRoomAutomation } from '../hooks/useRoomAutomation';
import { ROOMS, roomById } from '../config/rooms';
import { esp32WS } from '../services/esp32WebSocket';
import { deviceStore } from '../services/deviceStore';

const useRealESP32 = import.meta.env.VITE_USE_REAL_ESP32 === 'true';

/**
 * The console.
 *
 * Reading order answers the operator's questions in priority order:
 *   1. Is the hardware alive?          -> sticky header
 *   2. What are the conditions?        -> telemetry rail
 *   3. What does the house look like?  -> digital twin (the centrepiece)
 *   4. What can I control?             -> room + lighting column
 *   5. What is the garage doing?       -> garage panel
 *   6. What is the trend?              -> environment graph
 *   7. What is under the hood?         -> diagnostics, collapsed
 */
export const Dashboard = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);

  const { latestMessage, connectionState } = useESP32WebSocket();
  const { devices, toggle } = useDevices();
  const httpChannel = useHttpChannel();
  const garageOccupied = useGarageOccupied();
  const sensors = useSensors();
  const { evaluations, setMode, setDarkness, setPresence } = useRoomAutomation();

  const dhtOnline = connectionState === 'connected';
  // Control needs the HTTP channel; in mock mode the Express backend stands in.
  const controlOnline = useRealESP32 ? httpChannel !== 'offline' : true;

  // "--" until a real reading arrives. Never a zero standing in for no data.
  const temperature = dhtOnline ? (latestMessage?.temperature?.toFixed(1) ?? null) : null;
  const humidity = dhtOnline ? (latestMessage?.humidity?.toFixed(0) ?? null) : null;

  const selectedRoom = roomById(selectedRoomId) ?? ROOMS[0];
  const selectedDevice = devices.find((d) => d.id === selectedRoom.id);
  const lightsOn = devices.filter((d) => d.state === 'ON').length;

  // The graph reads the shared WebSocket history; this keeps its prop stable.
  const graphSensors = useMemo(() => [], []);

  return (
    <div className="min-h-dvh bg-surface">
      <ConsoleHeader
        ws={connectionState}
        http={httpChannel}
        espIp={esp32WS.getEspIp()}
        stale={sensors.stale}
      />

      <main className="mx-auto max-w-[1680px] space-y-4 px-4 py-4 lg:px-6 lg:py-5">
        {/* 2. Conditions: one instrument rail across the full width. */}
        <SensorPanel temperature={temperature} humidity={humidity} dhtOnline={dhtOnline} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* 3 + 5. Twin and garage. */}
          <div className="order-1 min-w-0 space-y-4">
            <Panel raised className="overflow-hidden">
              <PanelHeader
                title="Digital twin"
                aside={
                  <div className="flex items-center gap-4">
                    <span className="readout text-micro font-semibold tracking-wider text-fg-muted uppercase">
                      {lightsOn} / {devices.length || ROOMS.length} lit
                    </span>
                    <StatusPill
                      tone={dhtOnline ? 'ok' : 'idle'}
                      label={dhtOnline ? 'Live' : 'No feed'}
                      pulse={dhtOnline}
                    />
                  </div>
                }
              />

              {/* Bounded height: the twin is the centrepiece, but it must fit
                  the viewport rather than pushing every control below the fold.
                  preserveAspectRatio letterboxes it inside this box. */}
              <div className="px-2 pt-1 pb-2 sm:px-4 sm:pb-3">
                <div className="h-[clamp(360px,58vh,660px)] w-full">
                  <HouseScene3D
                    devices={devices}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={setSelectedRoomId}
                    garageOccupied={garageOccupied}
                    garageOnline={httpChannel === 'online' && !sensors.stale}
                  />
                </div>
              </div>

              <p className="border-t border-line px-4 py-2 text-xs text-fg-dim">
                Drag to orbit, scroll to zoom. Click a room to select it — lit rooms show the state of the physical LED.
              </p>
            </Panel>

            <GarageStatus />
          </div>

          {/* 4 + 7. Control column. */}
          <div className="order-2 space-y-4">
            <RoomControl
              room={selectedRoom}
              device={selectedDevice}
              online={controlOnline}
              evaluation={evaluations[selectedRoom.id]}
              ldrRaw={sensors.reading?.ldr ?? null}
              ldrAvailable={sensors.reading?.ldrAvailable === true && httpChannel === 'online'}
              distanceCm={sensors.reading?.distance ?? null}
              distanceValid={sensors.reading?.distanceValid === true && httpChannel === 'online'}
              onToggle={() => toggle(selectedRoom.id)}
              onModeChange={(m) => setMode(selectedRoom.id, m)}
              onDarknessChange={(v) => setDarkness(selectedRoom.id, v)}
              onPresenceChange={(v) => setPresence(selectedRoom.id, v)}
            />

            <LightingControl
              devices={devices}
              online={controlOnline}
              selectedRoomId={selectedRoomId}
              evaluations={evaluations}
              onSelectRoom={setSelectedRoomId}
              onToggle={(id) => toggle(id)}
            />

            <Diagnostics
              espIp={esp32WS.getEspIp()}
              ws={connectionState}
              ledError={deviceStore.getLastError()}
            />
          </div>

          {/* 6. Trend, full width beneath both columns. */}
          <div className="order-3 xl:col-span-2">
            <div className="h-[320px]">
              <EnvironmentGraph sensors={graphSensors} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
