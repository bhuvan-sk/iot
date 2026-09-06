import React from 'react';
import { clsx } from 'clsx';
import { Lightbulb, Sun, Radar, WifiOff, Info } from 'lucide-react';
import { Panel, PanelHeader, StatusPill } from './Panel';
import type { Tone } from './Panel';
import { LightSwitch } from './LightSwitch';
import { ThresholdField } from './ThresholdField';
import type { RoomDef } from '../../config/rooms';
import type { Device } from '../../types';
import type { RoomEvaluation } from '../../services/roomAutomation';
import { THRESHOLD_LIMITS, VERDICT_LABEL, LDR_ADC_MAX, brightness } from '../../config/automation';
import type { RoomMode } from '../../config/automation';

/**
 * Everything about the selected room in one place: what the light is doing,
 * who is deciding it, and the live sensor evidence behind that decision.
 *
 * The thresholds are editable here because calibration is per room - the same
 * shared LDR reading means "dark" in a hallway and "still bright" in a kitchen.
 */

const ModeToggle: React.FC<{
  mode: RoomMode;
  disabled?: boolean;
  onChange: (m: RoomMode) => void;
}> = ({ mode, disabled, onChange }) => (
  <div className="flex border border-line" role="group" aria-label="Control mode">
    {(['AUTO', 'MANUAL'] as const).map((m) => (
      <button
        key={m}
        type="button"
        disabled={disabled}
        aria-pressed={mode === m}
        onClick={() => onChange(m)}
        className={clsx(
          'px-3 py-1.5 text-micro font-semibold tracking-[0.1em] uppercase transition-colors',
          mode === m ? 'bg-panel-raised text-fg' : 'text-fg-dim hover:text-fg-muted',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {m}
      </button>
    ))}
  </div>
);

/** One sensor line: label, live value, derived state. */
const SensorLine: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | null;
  unit?: string;
  state: string;
  tone: Tone;
}> = ({ icon, label, value, unit, state, tone }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-2 text-xs text-fg-muted">
      <span className="text-fg-dim" aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
    <span className="flex items-baseline gap-2">
      <span className="readout text-sm font-semibold text-fg">
        {value ?? <span className="text-fg-dim">&mdash;</span>}
        {value && unit && <span className="ml-0.5 text-xs font-medium text-fg-muted">{unit}</span>}
      </span>
      <StatusPill tone={tone} label={state} />
    </span>
  </div>
);

interface RoomControlProps {
  room: RoomDef;
  device: Device | undefined;
  online: boolean;
  evaluation: RoomEvaluation | undefined;
  /** Shared sensor readings - one LDR and one HC-SR04 for the whole house. */
  ldrRaw: number | null;
  ldrAvailable: boolean;
  distanceCm: number | null;
  distanceValid: boolean;
  onToggle: () => void | Promise<unknown>;
  onModeChange: (mode: RoomMode) => void;
  onDarknessChange: (value: number) => void;
  onPresenceChange: (value: number) => void;
}

export const RoomControl: React.FC<RoomControlProps> = ({
  room,
  device,
  online,
  evaluation,
  ldrRaw,
  ldrAvailable,
  distanceCm,
  distanceValid,
  onToggle,
  onModeChange,
  onDarknessChange,
  onPresenceChange,
}) => {
  const on = device?.state === 'ON';
  const mode = evaluation?.mode ?? 'MANUAL';
  const isAuto = mode === 'AUTO';
  const verdict = evaluation?.verdict ?? 'manual';

  const verdictTone: Tone =
    verdict === 'on' ? 'active'
    : verdict === 'offline' ? 'danger'
    : verdict === 'no-ldr' || verdict === 'no-echo' ? 'warn'
    : verdict === 'manual' ? 'info'
    : 'idle';

  return (
    <Panel raised>
      <PanelHeader
        title="Selected room"
        aside={<ModeToggle mode={mode} disabled={!online} onChange={onModeChange} />}
      />

      <div className="space-y-4 px-4 py-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-fg">{room.name}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">{room.description}</p>
        </div>

        {/* ---- The light itself ------------------------------------------ */}
        <div
          className={clsx(
            'flex items-center justify-between gap-3 border px-3 py-3 transition-colors duration-200',
            on ? 'border-active/30 bg-active/[0.07]' : 'border-line bg-panel',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center transition-colors duration-200',
                on ? 'bg-active/15 text-active' : 'bg-panel-raised text-fg-dim',
              )}
            >
              <Lightbulb className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">Main light</span>
              <span className={clsx('block text-xs font-medium', on ? 'text-active' : 'text-fg-muted')}>
                {on ? 'On' : 'Off'}
                {isAuto && evaluation?.settling && <span className="text-fg-dim"> · settling</span>}
              </span>
            </span>
          </div>

          <LightSwitch
            on={on}
            label={`${room.name} main light`}
            disabled={!online || !device || isAuto}
            disabledReason={
              !online ? 'ESP32 offline' : isAuto ? 'Switch to MANUAL to control by hand' : undefined
            }
            onToggle={onToggle}
          />
        </div>

        {/* ---- Why the light is in that state ---------------------------- */}
        <div className="flex items-center justify-between gap-3 border-l-2 border-line-strong pl-3">
          <span className="text-xs text-fg-muted">Automation</span>
          <StatusPill tone={verdictTone} label={VERDICT_LABEL[verdict]} pulse={verdict === 'on'} />
        </div>

        {/* ---- Live sensor evidence -------------------------------------- */}
        <div className="space-y-3 border-t border-line pt-4">
          <SensorLine
            icon={<Sun className="h-3.5 w-3.5" />}
            label="Ambient light"
            value={ldrAvailable && ldrRaw !== null ? String(ldrRaw) : null}
            state={
              !online ? 'Offline'
              : !ldrAvailable ? 'No reading'
              : evaluation?.dark ? 'Dark'
              : 'Bright'
            }
            tone={!online || !ldrAvailable ? 'idle' : evaluation?.dark ? 'active' : 'ok'}
          />

          <ThresholdField
            label="Darkness threshold"
            value={evaluation?.darknessThreshold ?? 1200}
            min={THRESHOLD_LIMITS.darkness.min}
            max={THRESHOLD_LIMITS.darkness.max}
            step={THRESHOLD_LIMITS.darkness.step}
            current={ldrAvailable && ldrRaw !== null ? brightness(ldrRaw) : null}
            triggered={evaluation?.dark === true}
            disabled={!online}
            onChange={onDarknessChange}
          />

          <div className="pt-1">
            <SensorLine
              icon={<Radar className="h-3.5 w-3.5" />}
              label="Presence distance"
              value={distanceValid && distanceCm !== null ? distanceCm.toFixed(1) : null}
              unit="cm"
              state={
                !online ? 'Offline'
                : !distanceValid ? 'No echo'
                : evaluation?.presence ? 'Detected'
                : 'Clear'
              }
              tone={!online || !distanceValid ? 'idle' : evaluation?.presence ? 'active' : 'ok'}
            />
          </div>

          <ThresholdField
            label="Presence threshold"
            value={evaluation?.presenceThresholdCm ?? 100}
            min={THRESHOLD_LIMITS.presence.min}
            max={THRESHOLD_LIMITS.presence.max}
            step={THRESHOLD_LIMITS.presence.step}
            unit="cm"
            current={distanceValid ? distanceCm : null}
            triggered={evaluation?.presence === true}
            disabled={!online}
            onChange={onPresenceChange}
          />
        </div>

        {/* ---- Honest note about the physical hardware -------------------- */}
        <p className="flex items-start gap-2 border-t border-line pt-3 text-xs text-fg-dim">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          One LDR and one ultrasonic sensor serve the whole board. These thresholds set how that
          shared reading is interpreted for {room.name} — they are not separate per-room sensors.
        </p>

        {!online && (
          <p className="flex items-start gap-2 text-xs text-danger">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ESP32 unreachable — controls and automation are paused.
          </p>
        )}
      </div>
    </Panel>
  );
};

export { LDR_ADC_MAX };
