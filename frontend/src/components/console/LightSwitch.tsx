import React, { useState } from 'react';
import { clsx } from 'clsx';

/**
 * The one switch used for every light in the console.
 *
 * - role="switch" + aria-checked, so it announces its state properly.
 * - 44px minimum hit area even though the visual track is shorter.
 * - Disabled with a reason when the board is unreachable, rather than
 *   accepting a press that silently goes nowhere.
 * - The visual state only changes after the caller resolves, because the
 *   store only commits after the ESP32 confirms. A failed command must not
 *   leave the switch showing ON.
 */
export const LightSwitch: React.FC<{
  on: boolean;
  disabled?: boolean;
  disabledReason?: string;
  label: string;
  size?: 'sm' | 'md';
  onToggle: () => void | Promise<unknown>;
}> = ({ on, disabled, disabledReason, label, size = 'md', onToggle }) => {
  const [busy, setBusy] = useState(false);
  const blocked = disabled || busy;

  const handle = async () => {
    if (blocked) return;
    setBusy(true);
    try {
      await onToggle();
    } finally {
      setBusy(false);
    }
  };

  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5';
  const travel = size === 'sm' ? (on ? 'translate-x-4' : 'translate-x-0.5') : (on ? 'translate-x-5' : 'translate-x-1');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={disabled ? disabledReason : undefined}
      disabled={blocked}
      onClick={handle}
      // Padding gives the 44px target the visual track does not have.
      className={clsx(
        'group relative -m-3 inline-flex items-center p-3',
        blocked ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span
        className={clsx(
          'relative inline-flex items-center rounded-full border transition-colors duration-200',
          track,
          on ? 'border-active/50 bg-active/85' : 'border-line-strong bg-panel-raised',
          blocked && 'opacity-40',
        )}
      >
        <span
          className={clsx(
            'inline-block rounded-full transition-transform duration-200 ease-out',
            knob,
            travel,
            on ? 'bg-surface' : 'bg-fg-dim',
          )}
        />
      </span>
    </button>
  );
};
