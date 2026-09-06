import React from 'react';
import { clsx } from 'clsx';
import { Lightbulb } from 'lucide-react';
import { Panel, PanelHeader } from './Panel';
import { LightSwitch } from './LightSwitch';
import { ROOMS } from '../../config/rooms';
import type { Device } from '../../types';
import type { RoomEvaluation } from '../../services/roomAutomation';

/**
 * Every light in one list.
 *
 * Each row shows its own AUTO/MANUAL mode, because mode is now per room. The
 * switch is disabled on AUTO rooms - the engine owns them, and letting a tap
 * fight the automation loop would be the flickering behaviour we designed out.
 * Select the room to change its mode.
 *
 * No GPIO numbers here. A person switching on the hallway light should not
 * need to know it is pin 19; that lives in Diagnostics.
 */
export const LightingControl: React.FC<{
  devices: Device[];
  online: boolean;
  selectedRoomId: string;
  evaluations: Record<string, RoomEvaluation>;
  onSelectRoom: (id: string) => void;
  onToggle: (id: string) => void | Promise<unknown>;
}> = ({ devices, online, selectedRoomId, evaluations, onSelectRoom, onToggle }) => {
  const onCount = devices.filter((d) => d.state === 'ON').length;
  const autoCount = ROOMS.filter((r) => evaluations[r.id]?.mode === 'AUTO').length;

  return (
    <Panel>
      <PanelHeader
        title="Lighting"
        aside={
          <div className="flex items-center gap-3">
            <span className="readout text-micro font-semibold tracking-wider text-fg-muted uppercase">
              {onCount} / {devices.length || ROOMS.length} on
            </span>
            <span className="text-micro font-semibold tracking-wider text-fg-dim uppercase">
              {autoCount} auto
            </span>
          </div>
        }
      />

      <ul className="divide-y divide-line">
        {ROOMS.map((room) => {
          const device = devices.find((d) => d.id === room.id);
          const on = device?.state === 'ON';
          const isSelected = selectedRoomId === room.id;
          const evaluation = evaluations[room.id];
          const isAuto = evaluation?.mode === 'AUTO';

          return (
            <li key={room.id}>
              <div
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 transition-colors duration-150',
                  isSelected ? 'bg-panel-raised' : 'hover:bg-panel-raised/60',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Lightbulb
                    className={clsx(
                      'h-4 w-4 shrink-0 transition-colors duration-200',
                      on ? 'text-active' : 'text-fg-dim',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{room.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {on ? 'On' : 'Off'}
                      <span className={clsx('ml-1', isAuto ? 'text-info' : 'text-fg-dim')}>
                        &middot; {isAuto ? 'auto' : 'manual'}
                      </span>
                    </span>
                  </span>
                </button>

                <LightSwitch
                  on={on}
                  label={`${room.name} main light`}
                  disabled={!online || !device || isAuto}
                  disabledReason={
                    !online ? 'ESP32 offline' : isAuto ? 'On AUTO — select the room to switch to MANUAL' : undefined
                  }
                  onToggle={() => onToggle(room.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
