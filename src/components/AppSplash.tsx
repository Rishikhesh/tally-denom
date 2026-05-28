import { useEffect, useState } from "react";

interface AppSplashProps {
  onDone: () => void;
}

/**
 * First-paint splash. Brutalist black "=" logo mark, centered on the
 * canvas background. Fades in briefly then fades out and signals `onDone`.
 */
export function AppSplash({ onDone }: AppSplashProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      aria-label="Tally is starting"
      role="status"
      className="absolute inset-0 z-[200] flex items-center justify-center bg-[var(--color-bg)] transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
      onTransitionEnd={(event) => {
        if (event.currentTarget !== event.target) return;
        if (event.propertyName !== "opacity") return;
        if (leaving) onDone();
      }}
    >
      <span
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-[14px] border border-[var(--color-border-strong)] bg-[#0a0a0a] font-display text-4xl leading-none text-white animate-fade-up"
      >
        =
      </span>
    </div>
  );
}
