import { useEffect, useState } from "react";

interface LoaderProps {
  /** Show only after this delay — prevents flash on fast queries. */
  delayMs?: number;
  /** Controls if loader is shown at all (caller passes isLoading). */
  show?: boolean;
  size?: number;
  label?: string;
  inline?: boolean;
}

export function Loader({
  show = true,
  delayMs = 200,
  size = 18,
  label,
  inline,
}: LoaderProps) {
  const [visible, setVisible] = useState(delayMs === 0);
  useEffect(() => {
    if (!show) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on show toggling off so the next on-cycle re-applies delayMs
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [show, delayMs]);

  if (!show || !visible) return null;

  const dotSize = Math.max(4, Math.round(size * 0.34));
  const mark = (
    <span
      aria-label="Loading"
      role="status"
      className="inline-flex items-center justify-center gap-1 border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
      style={{
        minWidth: Math.max(size * 2.4, 34),
        height: Math.max(size * 1.45, 22),
      }}
    >
      <span
        className="animate-bounce bg-[var(--color-accent)]"
        style={{ width: dotSize, height: dotSize }}
      />
      <span
        className="animate-bounce bg-[var(--color-accent)] [animation-delay:120ms]"
        style={{ width: dotSize, height: dotSize }}
      />
      <span
        className="animate-bounce bg-[var(--color-accent)] [animation-delay:240ms]"
        style={{ width: dotSize, height: dotSize }}
      />
    </span>
  );

  if (inline)
    return (
      <>
        {mark}
        {label && (
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] ml-2">
            {label}
          </span>
        )}
      </>
    );

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {mark}
      {label && (
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
          {label}
        </span>
      )}
    </div>
  );
}

/** Full-screen loader — used as a placeholder while a route's data loads. */
export function ScreenLoader({ label }: { label?: string } = {}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader size={28} delayMs={0} />
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {label ?? "Syncing"}
        </div>
      </div>
    </div>
  );
}
