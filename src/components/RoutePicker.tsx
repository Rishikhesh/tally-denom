import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "./BottomSheet";

interface Route {
  id: string;
  name: string;
}

interface Props {
  routes: Route[];
  value: string | null;
  onChange: (routeId: string | null) => void;
  onCreate: (name: string) => Promise<string>;
}

export function RoutePicker({ routes, value, onChange, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = routes.find((r) => r.id === value) ?? null;

  function close() {
    setOpen(false);
    setCreating(false);
    setDraft("");
    setError(null);
    setBusy(false);
  }

  function pick(id: string) {
    onChange(id);
    close();
  }

  function startCreate() {
    setError(null);
    setDraft("");
    setCreating(true);
  }

  function cancelCreate() {
    setCreating(false);
    setDraft("");
    setError(null);
  }

  async function submitCreate() {
    const name = draft.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    if (name.length > 60) {
      setError("Name must be 60 characters or fewer");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await onCreate(name);
      onChange(id);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create route");
      setBusy(false);
    }
  }

  return (
    <>
      {/* Trigger — looks like the old select, opens the sheet on tap. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Select route"
        className="flex h-11 w-full items-center justify-between gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm font-medium text-[var(--color-text)] active:bg-[var(--color-surface)]"
      >
        <span
          className={
            selected
              ? "truncate text-[var(--color-text)]"
              : "truncate text-[var(--color-text-muted)]"
          }
        >
          {selected ? selected.name : "Pick a route…"}
        </span>
        <ChevronDown size={16} className="shrink-0 opacity-60" aria-hidden />
      </button>

      {open && (
        <BottomSheet onClose={close}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <div className="eyebrow">ROUTE</div>
                <div className="mt-1 font-display text-xl">Pick a route</div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <X size={14} />
              </button>
            </div>

            {/* Existing routes */}
            <div className="flex-1 overflow-y-auto">
              {routes.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8">
                  <div className="eyebrow">00 / EMPTY</div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No routes yet. Create your first below.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {routes.map((r) => {
                    const isActive = r.id === value;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => pick(r.id)}
                          aria-pressed={isActive}
                          className={
                            isActive
                              ? "flex w-full items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-accent)] px-5 py-3 text-left text-[var(--color-accent-ink)]"
                              : "flex w-full items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-3 text-left text-[var(--color-text)] active:bg-[var(--color-surface)]"
                          }
                        >
                          <span className="min-w-0 truncate font-medium">
                            {r.name}
                          </span>
                          {isActive && (
                            <Check size={16} aria-hidden className="shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer — create new */}
            <div
              className="shrink-0 border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-3"
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
              }}
            >
              {!creating ? (
                <button
                  type="button"
                  onClick={startCreate}
                  className="flex h-11 w-full items-center justify-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] active:translate-y-px"
                >
                  <Plus size={16} />
                  Create new route
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-stretch gap-0">
                    <Input
                      autoFocus
                      type="text"
                      maxLength={60}
                      value={draft}
                      placeholder="Route name"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitCreate();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelCreate();
                        }
                      }}
                      disabled={busy}
                      aria-label="New route name"
                      className="h-11 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] shadow-none focus-visible:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => void submitCreate()}
                      disabled={busy || draft.trim().length === 0}
                      aria-label="Create route"
                      className="flex h-11 w-11 items-center justify-center border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] disabled:opacity-40"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelCreate}
                      disabled={busy}
                      aria-label="Cancel create route"
                      className="flex h-11 w-11 items-center justify-center border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {error && (
                    <span className="font-mono text-xs text-[var(--color-destructive)]">
                      {error}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
