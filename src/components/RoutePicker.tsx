import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const CREATE_SENTINEL = "__create__";

export function RoutePicker({ routes, value, onChange, onCreate }: Props) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setCreating(false);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create route");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={value ?? undefined}
        onValueChange={(v) => {
          if (v === CREATE_SENTINEL) {
            startCreate();
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger
          aria-label="Select route"
          className="h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm font-medium text-[var(--color-text)] shadow-none"
        >
          <SelectValue placeholder="Pick a route…" />
        </SelectTrigger>
        <SelectContent className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-none">
          {routes.length === 0 && (
            <div className="px-2 py-2 text-xs text-[var(--color-text-muted)]">
              No routes yet.
            </div>
          )}
          {routes.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
          {routes.length > 0 && <SelectSeparator />}
          <SelectItem
            value={CREATE_SENTINEL}
            className="text-[var(--color-text)]"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={14} />
              Create new…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {creating && (
        <div className="flex flex-col gap-1">
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
              className="h-10 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => void submitCreate()}
              disabled={busy || draft.trim().length === 0}
              aria-label="Create route"
              className="flex h-10 w-10 items-center justify-center border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] disabled:opacity-40"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={cancelCreate}
              disabled={busy}
              aria-label="Cancel create route"
              className="flex h-10 w-10 items-center justify-center border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
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
  );
}
