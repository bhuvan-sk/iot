import React from 'react';
import { clsx } from 'clsx';
import { Car, Radar } from 'lucide-react';
import { Panel, PanelHeader, StatusPill } from './Panel';
import type { Tone } from './Panel';
import { useGarage } from '../../hooks/useSensors';
import { GARAGE_BAYS } from '../../config/rooms';
import {
  GARAGE_STATE_LABEL,
  GARAGE_OCCUPIED_BELOW_CM,
  GARAGE_APPROACHING_BELOW_CM,
} from '../../config/sensors';

/**
 * Garage occupancy, presented honestly.
 *
 * There is exactly ONE ultrasonic sensor. It measures distance to whatever is
 * in front of it - it cannot identify a vehicle and it cannot watch the second
 * bay. So bay 1 reports a derived state from a real measurement, and bay 2 is
 * explicitly labelled unmonitored. No invented second reading.
 */
export const GarageStatus: React.FC = () => {
  const garage = useGarage();

  const tone: Tone = !garage.online
    ? 'idle'
    : garage.state === 'occupied'
      ? 'active'
      : garage.state === 'approaching'
        ? 'warn'
        : garage.state === 'clear'
          ? 'ok'
          : 'idle';

  // Range meter: how close the reflector is, clamped to the useful window.
  const pct =
    garage.distanceCm === null
      ? 0
      : Math.max(0, Math.min(100, (1 - garage.distanceCm / (GARAGE_APPROACHING_BELOW_CM * 2)) * 100));

  return (
    <Panel>
      <PanelHeader
        title="Garage"
        aside={<StatusPill tone={tone} label={garage.online ? GARAGE_STATE_LABEL[garage.state] : 'Offline'} />}
      />

      <div className="grid grid-cols-2 gap-px bg-line">
        {GARAGE_BAYS.map((bay) => {
          const sensed = bay.sensed;
          const occupied = sensed && garage.online && garage.state === 'occupied';
          const unknown = sensed && !garage.online;

          return (
            <div key={bay.id} className="bg-panel px-4 py-3">
              <p className="eyebrow">Bay {bay.id}</p>

              <div className="mt-2 flex items-center gap-2">
                <Car
                  className={clsx('h-5 w-5 transition-colors duration-300', occupied ? 'text-active' : 'text-fg-dim/50')}
                  aria-hidden="true"
                />
                <span
                  className={clsx(
                    'text-xs font-semibold',
                    occupied ? 'text-active' : unknown || !sensed ? 'text-fg-dim' : 'text-fg-muted',
                  )}
                >
                  {!sensed ? 'Not monitored' : unknown ? 'Unknown' : occupied ? 'Occupied' : 'Empty'}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-fg-dim">
                {sensed ? 'HC-SR04 monitored' : 'No sensor fitted'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Raw sensor evidence behind the derived state. */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Radar className="h-3.5 w-3.5 text-fg-dim" aria-hidden="true" />
            Occupancy sensor
          </span>
          <span className="readout text-sm font-semibold text-fg">
            {garage.distanceCm !== null ? (
              <>
                {garage.distanceCm.toFixed(1)}
                <span className="ml-0.5 text-xs font-medium text-fg-muted">cm</span>
              </>
            ) : (
              <span className="text-fg-dim">&mdash;</span>
            )}
          </span>
        </div>

        {/* Proximity meter. Not a percentage of anything real - purely a
            visual aid, so it is labelled by the numbers around it. */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className={clsx(
              'h-full rounded-full transition-[width,background-color] duration-500 ease-out',
              garage.state === 'occupied' ? 'bg-active' : 'bg-fg-dim',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-fg-dim">
          {garage.online
            ? `Vehicle threshold ${GARAGE_OCCUPIED_BELOW_CM} cm · in-range ${GARAGE_APPROACHING_BELOW_CM} cm`
            : 'ESP32 offline — last reading not shown'}
        </p>
      </div>
    </Panel>
  );
};
