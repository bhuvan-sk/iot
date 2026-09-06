import React from 'react';
import { clsx } from 'clsx';

/**
 * The single surface primitive. Every panel in the console is this component,
 * so depth, borders and section headers stay identical everywhere instead of
 * drifting into a page of mismatched cards.
 */
export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Slightly raised variant for the primary (digital twin) surface. */
  raised?: boolean;
}> = ({ children, className, raised }) => (
  <section
    className={clsx(
      'border border-line',
      raised ? 'bg-panel-raised' : 'bg-panel',
      className,
    )}
  >
    {children}
  </section>
);

/** Section header: eyebrow label on the left, optional status on the right. */
export const PanelHeader: React.FC<{
  title: string;
  aside?: React.ReactNode;
  className?: string;
}> = ({ title, aside, className }) => (
  <header
    className={clsx(
      'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-2.5',
      className,
    )}
  >
    <h2 className="eyebrow">{title}</h2>
    {aside}
  </header>
);

export type Tone = 'ok' | 'active' | 'warn' | 'danger' | 'idle' | 'info';

const DOT_TONE: Record<Tone, string> = {
  ok: 'bg-ok',
  active: 'bg-active',
  warn: 'bg-warn',
  danger: 'bg-danger',
  idle: 'bg-idle',
  info: 'bg-info',
};

/**
 * Status dot. Always rendered beside a text label - colour alone never carries
 * the meaning, per the accessibility rules.
 */
export const StatusDot: React.FC<{ tone: Tone; pulse?: boolean; className?: string }> = ({
  tone,
  pulse,
  className,
}) => (
  <span
    aria-hidden="true"
    className={clsx('inline-block h-1.5 w-1.5 shrink-0 rounded-full', DOT_TONE[tone], pulse && 'live-dot', className)}
  />
);

const TEXT_TONE: Record<Tone, string> = {
  ok: 'text-ok',
  active: 'text-active',
  warn: 'text-warn',
  danger: 'text-danger',
  idle: 'text-fg-dim',
  info: 'text-info',
};

/** Compact status pill: dot + word. Used for every state in the console. */
export const StatusPill: React.FC<{ tone: Tone; label: string; pulse?: boolean }> = ({
  tone,
  label,
  pulse,
}) => (
  <span className="inline-flex items-center gap-1.5">
    <StatusDot tone={tone} pulse={pulse} />
    <span className={clsx('text-micro font-semibold tracking-[0.1em] uppercase', TEXT_TONE[tone])}>
      {label}
    </span>
  </span>
);
