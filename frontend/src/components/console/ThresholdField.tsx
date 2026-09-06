import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';

/**
 * A numeric threshold the operator can actually tune.
 *
 * Slider for coarse movement plus a typed field for an exact value, because
 * calibrating against a real sensor needs both: drag until the status flips,
 * then type the number you settled on. A live marker shows where the current
 * reading sits relative to the threshold, so tuning is not guesswork.
 */
export const ThresholdField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Current sensor reading, drawn as a marker on the track. */
  current?: number | null;
  /** True when the current reading is on the "triggered" side. */
  triggered?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, unit, current, triggered, disabled, onChange }) => {
  const [draft, setDraft] = useState(String(value));
  const id = `threshold-${label.replace(/\s+/g, '-').toLowerCase()}`;

  // Keep the typed field in sync when the value changes elsewhere.
  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setDraft(String(value)); // reject junk, restore the last good value
      return;
    }
    const next = clamp(Math.round(n / step) * step);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const pct = ((value - min) / (max - min)) * 100;
  const currentPct =
    current === null || current === undefined
      ? null
      : ((clamp(current) - min) / (max - min)) * 100;

  return (
    <div className={clsx('space-y-2', disabled && 'opacity-50')}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            disabled={disabled || value <= min}
            onClick={() => onChange(clamp(value - step))}
            className="flex h-6 w-6 items-center justify-center border border-line text-fg-dim transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40"
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
          </button>

          <input
            id={id}
            type="number"
            inputMode="numeric"
            value={draft}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            // Select on focus: this is a calibration field people retype, and
            // appending to the old value silently clamps to the max instead.
            onFocus={(e) => e.target.select()}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="readout w-16 border border-line bg-panel px-2 py-1 text-right text-sm font-semibold text-fg [appearance:textfield] focus:border-line-strong [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {unit && <span className="w-6 text-xs text-fg-muted">{unit}</span>}

          <button
            type="button"
            aria-label={`Increase ${label}`}
            disabled={disabled || value >= max}
            onClick={() => onChange(clamp(value + step))}
            className="flex h-6 w-6 items-center justify-center border border-line text-fg-dim transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Track: threshold position, plus where the live reading currently sits */}
      <div className="relative">
        <input
          type="range"
          aria-label={`${label} slider`}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-bare relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
          style={{ WebkitAppearance: 'none' }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-line">
          <div className="h-full bg-line-strong" style={{ width: `${pct}%` }} />
        </div>
        {/* threshold handle */}
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-fg"
          style={{ left: `calc(${pct}% - 1px)` }}
          aria-hidden="true"
        />
        {/* live reading marker */}
        {currentPct !== null && (
          <div
            className={clsx(
              'pointer-events-none absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-500 ease-out',
              triggered ? 'bg-active' : 'bg-info',
            )}
            style={{ left: `${currentPct}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
