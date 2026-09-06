import React from 'react';
import { clsx } from 'clsx';
import { Thermometer, Droplets, Sun, Ruler } from 'lucide-react';
import { Panel, PanelHeader, StatusPill } from './Panel';
import type { Tone } from './Panel';
import { useAmbientLight, useGarage } from '../../hooks/useSensors';
import { LIGHT_BAND_LABEL, GARAGE_STATE_LABEL } from '../../config/sensors';

/**
 * The live telemetry rail.
 *
 * One shared row shape for every reading, so this reads as a single instrument
 * cluster rather than four unrelated cards. Each row is:
 *
 *   icon | label            value unit
 *        | qualifier                     state
 *
 * A reading that is missing shows why it is missing. It never shows a zero, a
 * dash pretending to be data, or a stale number presented as current.
 */

interface ReadingRowProps {
  icon: React.ReactNode;
  label: string;
  /** Formatted value, or null when there is genuinely nothing to show. */
  value: string | null;
  unit?: string;
  /** Secondary line: classification, raw count, or the reason for no value. */
  qualifier?: string | null;
  tone?: Tone;
  state?: string;
  /** Dims the row when the source is unavailable. */
  muted?: boolean;
}

const ReadingRow: React.FC<ReadingRowProps> = ({
  icon,
  label,
  value,
  unit,
  qualifier,
  tone = 'idle',
  state,
  muted,
}) => (
  <div
    className={clsx(
      'flex items-start gap-3 px-4 py-3 transition-opacity duration-200',
      muted && 'opacity-55',
    )}
  >
    <span className="mt-0.5 text-fg-dim" aria-hidden="true">
      {icon}
    </span>

    <div className="min-w-0 flex-1">
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 flex items-baseline gap-1">
        {value === null ? (
          <span className="text-base font-medium text-fg-dim">&mdash;</span>
        ) : (
          <>
            <span className="text-2xl font-semibold text-fg">{value}</span>
            {unit && <span className="text-xs font-medium text-fg-muted">{unit}</span>}
          </>
        )}
      </p>
      {qualifier && <p className="mt-0.5 text-xs text-fg-muted">{qualifier}</p>}
    </div>

    {state && (
      <div className="shrink-0 pt-4">
        <StatusPill tone={tone} label={state} />
      </div>
    )}
  </div>
);

interface SensorPanelProps {
  /** Live DHT values from the WebSocket, already formatted. */
  temperature: string | null;
  humidity: string | null;
  dhtOnline: boolean;
}

export const SensorPanel: React.FC<SensorPanelProps> = ({ temperature, humidity, dhtOnline }) => {
  const light = useAmbientLight();
  const garage = useGarage();

  // Ambient light: three distinct states, never a fabricated value.
  const lightUnavailable = !light.available;
  const lightQualifier = !light.online
    ? 'ESP32 offline'
    : lightUnavailable
      ? 'Sensor not connected'
      : `${light.raw} / ${light.max} raw ADC`;

  const garageValue = garage.distanceCm !== null ? garage.distanceCm.toFixed(1) : null;
  const garageTone: Tone =
    !garage.online ? 'idle' : garage.state === 'occupied' ? 'active' : garage.state === 'no-echo' ? 'idle' : 'ok';

  return (
    <Panel>
      <PanelHeader
        title="Live telemetry"
        aside={
          <span className="text-micro font-medium tracking-wider text-fg-dim uppercase">
            DHT 2s &middot; HTTP 1s
          </span>
        }
      />

      {/* One rail, four instruments. Stacks to 1 / 2 / 4 across so the group
          still reads as one cluster on a phone. */}
      <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
        <div className="sm:border-b sm:border-line xl:border-b-0 xl:border-r xl:border-line">
        <ReadingRow
          icon={<Thermometer className="h-4 w-4" />}
          label="Temperature"
          value={temperature}
          unit="°C"
          qualifier={dhtOnline ? 'DHT11 · whole house' : 'WebSocket disconnected'}
          muted={!dhtOnline}
        />
        </div>

        <div className="sm:border-b sm:border-line xl:border-b-0 xl:border-r xl:border-line">

        <ReadingRow
          icon={<Droplets className="h-4 w-4" />}
          label="Humidity"
          value={humidity}
          unit="%"
          qualifier={dhtOnline ? 'DHT11 · relative' : 'WebSocket disconnected'}
          muted={!dhtOnline}
        />
        </div>

        <div className="xl:border-r xl:border-line">

        <ReadingRow
          icon={<Sun className="h-4 w-4" />}
          label="Ambient light"
          // Raw ADC count, deliberately not labelled as lux: the hardware has
          // never been calibrated against a photometric reference.
          value={light.available && light.raw !== null ? String(light.raw) : null}
          qualifier={lightQualifier}
          tone={light.available ? 'ok' : 'idle'}
          state={light.available && light.band ? LIGHT_BAND_LABEL[light.band] : 'Unavailable'}
          muted={lightUnavailable}
        />
        </div>

        <div>

        <ReadingRow
          icon={<Ruler className="h-4 w-4" />}
          label="Garage distance"
          value={garageValue}
          unit="cm"
          qualifier={
            !garage.online
              ? 'ESP32 offline'
              : garage.state === 'no-echo'
                ? 'No echo returned'
                : `HC-SR04 · bay ${garage.sensedBay}`
          }
          tone={garageTone}
          state={GARAGE_STATE_LABEL[garage.state]}
          muted={!garage.online}
        />
        </div>
      </div>
    </Panel>
  );
};
