import { useEffect, useState, type ReactNode } from 'react';
import { formatTabularNumber } from '../domain/formatters';

export const RAVFINA_MOTION = {
  durationFastMs: 160,
  durationBaseMs: 240,
  durationEmphasisMs: 380,
  staggerStepMs: 55,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

interface TransitionProps {
  transitionKey: string | number;
  children: ReactNode;
  className?: string;
}

export function RouteTransitionShell({
  transitionKey,
  children,
  className = '',
}: TransitionProps) {
  return (
    <div key={transitionKey} className={`animate-ravfina-panel-enter ${className}`}>
      {children}
    </div>
  );
}

export function PanelStateTransition({
  transitionKey,
  children,
  className = '',
}: TransitionProps) {
  return (
    <div key={transitionKey} className={`animate-ravfina-panel-enter ${className}`}>
      {children}
    </div>
  );
}

export function PageReveal({
  children,
  delayMs = 0,
  className = '',
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-ravfina-fade-in ${className}`.trim()}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function StaggerGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({
  index,
  children,
  className = '',
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`animate-ravfina-fade-in ${className}`.trim()}
      style={{ animationDelay: `${Math.min(index, 8) * RAVFINA_MOTION.staggerStepMs}ms` }}
    >
      {children}
    </div>
  );
}

export function CountingNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 520,
  className = '',
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState<number>(value);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplay(value);
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const startVal = display;
    const diff = value - startVal;
    if (Math.abs(diff) < 0.001) {
      setDisplay(value);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startVal + diff * eased);
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      } else {
        setDisplay(value);
      }
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <span className={`font-mono tabular-nums ${className}`.trim()}>
      {prefix}
      {formatTabularNumber(display, decimals)}
      {suffix}
    </span>
  );
}

export function ViewStateShell({
  loading,
  error,
  empty,
  emptyTitle = 'No records available',
  emptyDescription = 'Adjust your filters or create a new record to populate this view.',
  onRetry,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="animate-ravfina-panel-enter space-y-4 rounded-xl border border-zinc-300 bg-white p-6 dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-[#1d1d1f]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-[#161618]" />
          <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-[#161618]" />
          <div className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-[#161618]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="animate-ravfina-panel-enter rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200"
      >
        <div className="font-display font-semibold">Unable to load view data</div>
        <p className="mt-1 text-xs opacity-90">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center rounded-lg border border-red-400 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-500/50 dark:bg-[#111112] dark:text-red-200"
          >
            Retry Request
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="animate-ravfina-panel-enter rounded-xl border border-zinc-300 bg-white p-8 text-center dark:border-[#1d1d1f] dark:bg-[#111112]">
        <div className="font-display text-base font-semibold text-zinc-950 dark:text-white">
          {emptyTitle}
        </div>
        <p className="mt-1.5 text-xs text-zinc-600 dark:text-[#88888b]">{emptyDescription}</p>
      </div>
    );
  }

  return <>{children}</>;
}

interface SlideOverDrawerProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

export function SlideOverDrawer({
  open,
  onClose,
  ariaLabel,
  children,
}: SlideOverDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="animate-ravfina-backdrop-fade fixed inset-0 z-50 flex justify-end bg-black/50 dark:bg-black/75 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="animate-ravfina-drawer-slide flex h-full w-full max-w-2xl flex-col border-l border-zinc-300 bg-white text-zinc-950 dark:border-[#1d1d1f] dark:bg-[#111112] dark:text-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}
