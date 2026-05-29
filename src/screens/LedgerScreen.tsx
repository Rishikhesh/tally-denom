import Fuse from "fuse.js";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet, Loader } from "@/components";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { createLedger, useAllLedgerEntries, useLedgers } from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate, formatTime } from "@/lib/date";

const NAME_MAX = 60;
const RECENT_LIMIT = 40;

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLInputElement>(null);

  // Focus with preventScroll so opening the sheet doesn't yank the page.
  useEffect(() => {
    if (sheetOpen && !creating) searchRef.current?.focus({ preventScroll: true });
  }, [sheetOpen, creating]);
  useEffect(() => {
    if (sheetOpen && creating) createRef.current?.focus({ preventScroll: true });
  }, [sheetOpen, creating]);

  const ledgerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of ledgers) m.set(l.id, l.name);
    return m;
  }, [ledgers]);

  const fuse = useMemo(
    () =>
      new Fuse(
        ledgers.map((l) => ({ item: l, name: l.name })),
        { keys: ["name"], threshold: 0.4, ignoreLocation: true },
      ),
    [ledgers],
  );
  const q = query.trim();
  const filteredLedgers = useMemo(() => {
    if (!q) return ledgers;
    return fuse.search(q).map((r) => r.item.item);
  }, [q, ledgers, fuse]);

  const recentEntries = useMemo(
    () =>
      [...allEntries]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, RECENT_LIMIT),
    [allEntries],
  );

  function openSheet() {
    setQuery("");
    setCreating(false);
    setDraft("");
    setError(null);
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
  }
  function openLedger(ledgerId: string) {
    closeSheet();
    useNavStore.getState().go({ name: "ledger-detail", params: { ledgerId } });
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
      closeSheet();
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
      <header className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <h1 className="font-display text-xl">Ledger</h1>
      </header>

      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <button
          type="button"
          onClick={openSheet}
          aria-label="Select a ledger"
          className="flex h-11 w-full items-center justify-between gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm font-medium text-[var(--color-text-muted)] active:bg-[var(--color-surface)]"
        >
          <span className="flex items-center gap-2">
            <Search size={14} aria-hidden />
            Select or search a ledger…
          </span>
          <ChevronDown size={16} className="shrink-0 opacity-60" aria-hidden />
        </button>
      </div>

      {/* Recent entries — full page history. */}
      <div className="flex-1 overflow-y-auto px-5 py-3 pb-6">
        <div className="eyebrow mb-2">RECENT ENTRIES</div>
        {recentEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No entries yet. Pick a ledger to add one.
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
                      name: "ledger-entry-detail",
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

      {sheetOpen && (
        <BottomSheet onClose={closeSheet}>
          <div className="flex max-h-[80vh] flex-col">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <div className="eyebrow">LEDGER</div>
                <div className="mt-1 font-display text-xl">Pick a ledger</div>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-5 py-3">
              {creating ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-stretch gap-0">
                    <Input
                      ref={createRef}
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
                          setCreating(false);
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
                      aria-label="Create ledger"
                      className="flex h-11 w-11 items-center justify-center border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] disabled:opacity-40"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
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
              ) : (
                <div className="flex items-stretch gap-2">
                  <div className="flex h-10 flex-1 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3">
                    <Search
                      size={14}
                      aria-hidden
                      className="shrink-0 text-[var(--color-text-muted)]"
                    />
                    <input
                      ref={searchRef}
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
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDraft("");
                      setCreating(true);
                    }}
                    aria-label="Create ledger"
                    className="flex h-10 w-10 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] active:translate-y-px"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {filteredLedgers.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8">
                  <div className="eyebrow">00 / EMPTY</div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {q
                      ? "No ledgers match."
                      : "No ledgers yet. Tap + to create."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredLedgers.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => openLedger(l.id)}
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
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
