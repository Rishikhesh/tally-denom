import Fuse from "fuse.js";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomSheet, Loader, SettingsDialog } from "@/components";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  createRoute,
  useAllSpends,
  useAllVouchers,
  useRoutes,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { spentByVoucher } from "@/lib/balances";
import { formatDate, formatTime } from "@/lib/date";

const NAME_MAX = 60;
const RECENT_LIMIT = 40;

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function EntryScreen() {
  const { user, loading } = useAuth();
  const routes = useRoutes();
  const vouchers = useAllVouchers();
  const allSpends = useAllSpends();
  const spentMap = useMemo(() => spentByVoucher(allSpends), [allSpends]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const routeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) m.set(r.id, r.name);
    return m;
  }, [routes]);

  const sortedRoutes = useMemo(
    () => [...routes].sort((a, b) => b.updatedAt - a.updatedAt),
    [routes],
  );

  const fuse = useMemo(
    () =>
      new Fuse(
        sortedRoutes.map((r) => ({ item: r, name: r.name })),
        { keys: ["name"], threshold: 0.4, ignoreLocation: true },
      ),
    [sortedRoutes],
  );
  const q = query.trim();
  const filteredRoutes = useMemo(() => {
    if (!q) return sortedRoutes;
    return fuse.search(q).map((r) => r.item.item);
  }, [q, sortedRoutes, fuse]);

  const voucherCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vouchers) m.set(v.id, v.actualCode ?? v.code);
    return m;
  }, [vouchers]);

  // Combined history — vouchers + spends across all routes, newest first.
  type HistItem =
    | { kind: "voucher"; id: string; createdAt: number; v: (typeof vouchers)[number] }
    | { kind: "spend"; id: string; createdAt: number; s: (typeof allSpends)[number] };
  const recentItems = useMemo<HistItem[]>(() => {
    const items: HistItem[] = [
      ...vouchers.map((v) => ({
        kind: "voucher" as const,
        id: v.id,
        createdAt: v.createdAt,
        v,
      })),
      ...allSpends.map((s) => ({
        kind: "spend" as const,
        id: s.id,
        createdAt: s.createdAt,
        s,
      })),
    ];
    return items
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, RECENT_LIMIT);
  }, [vouchers, allSpends]);

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
  function openRoute(routeId: string) {
    closeSheet();
    useNavStore.getState().go({ name: "route", params: { routeId } });
  }
  function openVoucher(v: (typeof vouchers)[number]) {
    useNavStore.getState().go({
      name: "voucher-detail",
      params: { routeId: v.routeId, voucherId: v.id, source: "entry" },
    });
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
      const id = await createRoute(user.uid, { name });
      closeSheet();
      useNavStore.getState().go({ name: "route", params: { routeId: id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create route");
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
    <div className="relative flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <h1 className="font-display text-xl">Entry</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <Settings size={16} />
        </button>
      </header>

      {/* Route dropdown — opens a bottom sheet with search + create + list. */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <button
          type="button"
          onClick={openSheet}
          aria-label="Select a route"
          className="flex h-11 w-full items-center justify-between gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm font-medium text-[var(--color-text-muted)] active:bg-[var(--color-surface)]"
        >
          <span className="flex items-center gap-2">
            <Search size={14} aria-hidden />
            Select or search a route…
          </span>
          <ChevronDown size={16} className="shrink-0 opacity-60" aria-hidden />
        </button>
      </div>

      {/* Recent history — vouchers + spends. */}
      <div className="flex-1 overflow-y-auto px-5 py-3 pb-6">
        <div className="eyebrow mb-2">RECENT</div>
        {recentItems.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Nothing yet. Pick a route to add a voucher.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentItems.map((it) =>
              it.kind === "voucher" ? (
                <button
                  key={`v-${it.id}`}
                  type="button"
                  onClick={() => openVoucher(it.v)}
                  className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left active:bg-[var(--color-surface)]"
                >
                  <span
                    className={
                      it.v.verified
                        ? "inline-flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                        : "inline-flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text-muted)]"
                    }
                    title={it.v.verified ? "Verified" : "Unverified"}
                  >
                    {it.v.verified ? (
                      <Check size={12} />
                    ) : (
                      <span className="text-[10px]">•</span>
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="min-w-0 truncate font-display text-base font-medium text-[var(--color-text)]">
                        VCH #{it.v.actualCode ?? it.v.code}
                      </span>
                      <span className="shrink-0 font-normal text-[var(--color-text-muted)]">
                        · {routeNameMap.get(it.v.routeId) ?? "Route"}
                      </span>
                    </span>
                    <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                      {formatTime(it.v.createdAt)} · {formatDate(it.v.txDate)} · ₹
                      {formatINR(
                        it.v.total - (spentMap.get(it.v.id)?.amount ?? 0),
                      )}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    aria-hidden
                    className="shrink-0 text-[var(--color-text-muted)]"
                  />
                </button>
              ) : (
                <button
                  key={`s-${it.id}`}
                  type="button"
                  onClick={() =>
                    useNavStore.getState().go({
                      name: "voucher-detail",
                      params: { routeId: it.s.routeId, voucherId: it.s.voucherId },
                    })
                  }
                  className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left active:bg-[var(--color-surface)]"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]">
                    <Wallet size={12} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">
                        {it.s.note || "(no note)"}
                      </span>
                      <span className="shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        SPEND
                      </span>
                    </span>
                    <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                      {formatTime(it.s.createdAt)} · {formatDate(it.s.txDate)} · ₹
                      {formatINR(it.s.amount)}
                      {voucherCodeMap.get(it.s.voucherId)
                        ? ` · VCH #${voucherCodeMap.get(it.s.voucherId)}`
                        : ""}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    aria-hidden
                    className="shrink-0 text-[var(--color-text-muted)]"
                  />
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {sheetOpen && (
        <BottomSheet onClose={closeSheet}>
          <div className="flex max-h-[80vh] flex-col">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <div className="eyebrow">ROUTE</div>
                <div className="mt-1 font-display text-xl">Pick a route</div>
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
                      placeholder="Route name"
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
                      placeholder="Search routes"
                      aria-label="Search routes"
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
                    aria-label="Create route"
                    className="flex h-10 w-10 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] active:translate-y-px"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {filteredRoutes.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8">
                  <div className="eyebrow">00 / EMPTY</div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {q ? "No routes match." : "No routes yet. Tap + to create."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredRoutes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openRoute(r.id)}
                      className="flex w-full items-center gap-3 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3 text-left active:bg-[var(--color-surface)]"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-display text-base font-medium text-[var(--color-text)]">
                          {r.name}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                          {r.voucherCount} voucher
                          {r.voucherCount === 1 ? "" : "s"}
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

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
