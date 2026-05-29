import Fuse from "fuse.js";
import { Check, ChevronRight, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Loader } from "@/components";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { createLedger, useAllLedgerEntries, useLedgers } from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate, formatTime } from "@/lib/date";

const NAME_MAX = 60;
const RECENT_LIMIT = 30;

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LedgerScreen() {
  const { user, loading } = useAuth();
  const ledgers = useLedgers();
  const allEntries = useAllLedgerEntries();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(
        ledgers.map((l) => ({ item: l, name: l.name })),
        { keys: ["name"], threshold: 0.4, ignoreLocation: true },
      ),
    [ledgers],
  );
  const q = query.trim();
  const filtered = useMemo(() => {
    if (!q) return ledgers;
    return fuse.search(q).map((r) => r.item.item);
  }, [q, ledgers, fuse]);

  const ledgerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of ledgers) m.set(l.id, l.name);
    return m;
  }, [ledgers]);

  // Most recent entries across all ledgers (by recorded time).
  const recentEntries = useMemo(
    () =>
      [...allEntries]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, RECENT_LIMIT),
    [allEntries],
  );

  function startCreate() {
    setError(null);
    setDraft("");
    setCreating(true);
  }
  function cancelCreate() {
    setCreating(false);
    setDraft("");
    setError(null);
    setBusy(false);
  }
  async function submitCreate() {
    if (!user) return;
    const name = draft.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    if (name.length > NAME_MAX) {
      setError(`Name must be ${NAME_MAX} characters or fewer`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createLedger(user.uid, { name });
      setDraft("");
      setCreating(false);
      useNavStore
        .getState()
        .go({ name: "ledger-detail", params: { ledgerId: id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create ledger");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <div className="flex flex-col">
          <div className="eyebrow">02 / LEDGER</div>
          <h1 className="font-display text-xl">Ledger</h1>
        </div>
        <button
          type="button"
          onClick={startCreate}
          aria-label="Add ledger"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] active:translate-y-px"
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="border-b border-[var(--color-border)] px-5 py-3">
        {creating && (
          <div className="mb-3 flex flex-col gap-1">
            <div className="flex items-stretch gap-0">
              <Input
                autoFocus
                type="text"
                maxLength={NAME_MAX}
                value={draft}
                placeholder="Ledger name"
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
                aria-label="New ledger name"
                className="h-11 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={busy || draft.trim().length === 0}
                aria-label="Save ledger"
                className="flex h-11 w-11 items-center justify-center border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] disabled:opacity-40"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={cancelCreate}
                disabled={busy}
                aria-label="Cancel"
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

        <div className="flex h-10 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3">
          <Search
            size={14}
            aria-hidden
            className="shrink-0 text-[var(--color-text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ledgers"
            aria-label="Search ledgers"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Two independently-scrollable halves: ledgers (top) + recent entries
          (bottom). `min-h-0` lets each child shrink so its own overflow works
          instead of the whole page scrolling. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 flex-1 flex-col border-b border-[var(--color-border-strong)]">
          <div className="eyebrow shrink-0 px-5 pb-2 pt-3">01 / LEDGERS</div>
          <div className="flex-1 overflow-y-auto px-5 pb-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8">
                <div className="eyebrow">00 / EMPTY</div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {q
                    ? "No ledgers match the search."
                    : "No ledgers yet. Tap + to create one."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      useNavStore.getState().go({
                        name: "ledger-detail",
                        params: { ledgerId: l.id },
                      })
                    }
                    className="flex items-center gap-3 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3 text-left active:bg-[var(--color-surface)]"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="min-w-0 truncate font-display text-base font-medium text-[var(--color-text)]">
                        {l.name}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                        {l.entryCount} entr{l.entryCount === 1 ? "y" : "ies"}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-[var(--color-text-muted)]"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="eyebrow shrink-0 px-5 pb-2 pt-3">
            02 / RECENT ENTRIES
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {recentEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8">
                <div className="eyebrow">00 / EMPTY</div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  No entries yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentEntries.map((e) => {
                  const isIn = e.kind === "in";
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() =>
                        useNavStore.getState().go({
                          name: "ledger-entry-editor",
                          params: { ledgerId: e.ledgerId, entryId: e.id },
                        })
                      }
                      className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left active:bg-[var(--color-surface)]"
                    >
                      <span
                        className={
                          isIn
                            ? "inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-ink)]"
                            : "inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text)]"
                        }
                      >
                        {isIn ? "IN" : "OUT"}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">
                            {e.title || "(no title)"}
                          </span>
                          <span className="shrink-0 font-normal text-[var(--color-text-muted)]">
                            · {ledgerNameMap.get(e.ledgerId) ?? "Ledger"}
                          </span>
                        </span>
                        <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                          {formatTime(e.createdAt)} · {formatDate(e.txDate)} · ₹
                          {formatINR(e.amount)}
                        </span>
                      </div>
                      <ChevronRight
                        size={16}
                        aria-hidden
                        className="shrink-0 text-[var(--color-text-muted)]"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
