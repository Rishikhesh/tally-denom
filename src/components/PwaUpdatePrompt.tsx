import { dismissPwaUpdatePrompt, updateServiceWorker } from "@/pwa";

export function PwaUpdatePrompt() {
  function handleReload() {
    void updateServiceWorker(true);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-x-3 top-3 z-[140] flex items-center justify-between gap-3 border border-[var(--color-border-strong)] bg-[var(--color-bg)] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] max-[360px]:flex-col max-[360px]:items-stretch"
    >
      <div>
        <div className="eyebrow">UPDATE</div>
        <div className="mt-1 text-sm font-semibold leading-tight">
          New version available.
        </div>
      </div>
      <div className="flex flex-none gap-2 max-[360px]:flex-row">
        <button
          type="button"
          onClick={dismissPwaUpdatePrompt}
          className="h-9 min-w-16 whitespace-nowrap border border-[var(--color-border)] px-3 text-[13px] font-semibold text-[var(--color-text-muted)] max-[360px]:flex-1"
        >
          Later
        </button>
        <button
          type="button"
          onClick={handleReload}
          className="h-9 min-w-16 whitespace-nowrap bg-[var(--color-accent)] px-3 text-[13px] font-bold text-[var(--color-accent-ink)] max-[360px]:flex-1"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
