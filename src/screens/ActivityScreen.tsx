import { ChevronLeft, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ActivityRow,
  BottomSheet,
  DateRangeSheet,
  ExchangeDetailSheet,
  Loader,
} from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  type Activity,
  deleteExchange,
  type Exchange,
  useActivityPaged,
  useAllExchanges,
  useAllVouchers,
  useLedgers,
  useRoutes,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import type { ActivityType } from "@/lib/activity";
import { dateRangePresets, formatDate } from "@/lib/date";

type TypeKey = "voucher" | "spend" | "route" | "ledger" | "exchange";
const ALL_TYPE_KEYS: TypeKey[] = [
  "voucher",
  "spend",
  "ledger",
  "exchange",
  "route",
];
const TYPE_LABEL: Record<TypeKey, string> = {
  voucher: "Vouchers",
  spend: "Spends",
  ledger: "Ledger",
  exchange: "Exchange",
  route: "Routes",
};
type DateChipId = "all" | "today" | "yesterday" | "7d" | "30d" | "custom";

// Verify/unverify events are intentionally hidden from the visible feed —
// they still get logged for the audit trail (see useData.ts) but the user
// only ever cares about the underlying voucher state, surfaced via the
// row-level CTA on `voucher.create`.
const ALL_VOUCHER: ActivityType[] = [
  "voucher.create",
  "voucher.edit",
  "voucher.delete",
];
const ALL_SPEND: ActivityType[] = [
  "spend.create",
  "spend.edit",
  "spend.delete",
];
const ALL_ROUTE: ActivityType[] = ["route.create", "route.delete"];
const ALL_LEDGER: ActivityType[] = [
  "ledger.create",
  "ledger.delete",
  "ledger-entry.in",
  "ledger-entry.out",
  "ledger-entry.edit",
  "ledger-entry.delete",
];
const ALL_EXCHANGE: ActivityType[] = ["exchange.create", "exchange.delete"];

interface Range {
  from?: string;
  to?: string;
}

export default function ActivityScreen() {
  const { user, loading } = useAuth();
  const routes = useRoutes();
  const vouchers = useAllVouchers();
  const ledgers = useLedgers();
  const exchanges = useAllExchanges();
  const [activeExchange, setActiveExchange] = useState<Exchange | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<TypeKey>>(new Set());
  const [dateChip, setDateChip] = useState<DateChipId>("all");
  const [range, setRange] = useState<Range>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);

  // Lookup maps for activity-row context labels.
  const routeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) m.set(r.id, r.name);
    return m;
  }, [routes]);
  const voucherCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vouchers) m.set(v.id, v.actualCode ?? v.code);
    return m;
  }, [vouchers]);
  const ledgerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of ledgers) m.set(l.id, l.name);
    return m;
  }, [ledgers]);

  const voucherDisplayMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vouchers) m.set(v.id, v.actualCode ?? v.code);
    return m;
  }, [vouchers]);
  function titleOverrideFor(a: Activity): string | undefined {
    if (!a.type.startsWith("voucher.")) return undefined;
    const code = voucherDisplayMap.get(a.refId);
    return code ? `VCH #${code}` : undefined;
  }

  function contextLabelFor(a: Activity): string | undefined {
    if (a.type.startsWith("voucher.") || a.type.startsWith("route.")) {
      return a.routeId ? routeNameMap.get(a.routeId) : undefined;
    }
    if (a.type.startsWith("spend.")) {
      const vid =
        typeof a.meta?.voucherId === "string"
          ? (a.meta.voucherId as string)
          : null;
      const code = vid ? voucherCodeMap.get(vid) : undefined;
      const route = a.routeId ? routeNameMap.get(a.routeId) : undefined;
      const parts = [code ? `VCH #${code}` : null, route].filter(
        (x): x is string => !!x,
      );
      return parts.length ? parts.join(" · ") : undefined;
    }
    if (a.type.startsWith("ledger")) {
      const lid =
        typeof a.meta?.ledgerId === "string"
          ? (a.meta.ledgerId as string)
          : null;
      return lid ? ledgerNameMap.get(lid) : undefined;
    }
    return undefined;
  }

  const types = useMemo<ActivityType[] | undefined>(() => {
    if (selectedTypes.size === 0) return undefined;
    const out: ActivityType[] = [];
    if (selectedTypes.has("voucher")) out.push(...ALL_VOUCHER);
    if (selectedTypes.has("spend")) out.push(...ALL_SPEND);
    if (selectedTypes.has("route")) out.push(...ALL_ROUTE);
    if (selectedTypes.has("ledger")) out.push(...ALL_LEDGER);
    if (selectedTypes.has("exchange")) out.push(...ALL_EXCHANGE);
    return out;
  }, [selectedTypes]);

  function toggleType(key: TypeKey) {
    setSelectedTypes((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function clearAllFilters() {
    setSelectedTypes(new Set());
    setDateChip("all");
    setRange({});
  }

  const activeFilterCount =
    selectedTypes.size + (dateChip !== "all" ? 1 : 0);

  const {
    rows: rawActivity,
    hasMore,
    loadMore,
  } = useActivityPaged({
    pageSize: 50,
    types,
    from: range.from,
    to: range.to,
  });

  // Verify events stay (they carry the excess/shortage reconciliation).
  // Unverify + inflow events are hidden.
  const activity = useMemo(
    () =>
      rawActivity.filter(
        (a) =>
          a.type !== "voucher.unverify" &&
          a.type !== "voucher.cash-unverify" &&
          !a.type.startsWith("fund."),
      ),
    [rawActivity],
  );

  function applyDateChip(next: DateChipId) {
    setDateChip(next);
    if (next === "all") {
      setRange({});
      return;
    }
    if (next === "custom") {
      setRangeSheetOpen(true);
      return;
    }
    const p = dateRangePresets();
    if (next === "today") setRange({ from: p.today.from, to: p.today.to });
    else if (next === "yesterday")
      setRange({ from: p.yesterday.from, to: p.yesterday.to });
    else if (next === "7d") setRange({ from: p.last7.from, to: p.last7.to });
    else if (next === "30d")
      setRange({ from: p.last30.from, to: p.last30.to });
  }

  function clearRange() {
    setDateChip("all");
    setRange({});
  }

  function onTap(a: Activity) {
    // Stay on the Activity tab; just push the target screen so the back
    // arrow returns to this feed instead of unwinding through Entry.
    const nav = useNavStore.getState();
    if (a.type.startsWith("voucher.") && a.routeId) {
      nav.go({
        name: "voucher-detail",
        params: { routeId: a.routeId, voucherId: a.refId },
      });
      return;
    }
    if (a.type.startsWith("spend.")) {
      // Spends live inside their voucher — open the voucher detail (read).
      const vid =
        typeof a.meta?.voucherId === "string"
          ? (a.meta.voucherId as string)
          : null;
      if (vid && a.routeId) {
        nav.go({
          name: "voucher-detail",
          params: { routeId: a.routeId, voucherId: vid },
        });
      }
      return;
    }
    if (a.type.startsWith("route.") && a.routeId) {
      nav.go({ name: "route", params: { routeId: a.routeId } });
      return;
    }
    if (a.type === "ledger.create" || a.type === "ledger.delete") {
      const ledgerId =
        a.type === "ledger.create" ? a.refId : null;
      if (ledgerId) {
        nav.go({ name: "ledger-detail", params: { ledgerId } });
      }
      return;
    }
    if (a.type.startsWith("ledger-entry.")) {
      const ledgerId =
        typeof a.meta?.ledgerId === "string"
          ? (a.meta.ledgerId as string)
          : null;
      if (ledgerId) {
        nav.go({
          name: "ledger-entry-detail",
          params: { ledgerId, entryId: a.refId },
        });
      }
      return;
    }
    if (a.type === "exchange.create") {
      const ex = exchanges.find((x) => x.id === a.refId) ?? null;
      if (ex) setActiveExchange(ex);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const dateChips: Array<{ id: DateChipId; label: string }> = [
    { id: "all", label: "All" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
    { id: "custom", label: "Custom…" },
  ];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
        <button
          type="button"
          onClick={() => useNavStore.getState().goBack()}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col">
          <div className="eyebrow">02 / ACTIVITY</div>
          <h1 className="font-display text-lg">Activity</h1>
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label="Filters"
          className="relative ml-auto flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] font-mono text-[9px] font-bold tabular-nums text-[var(--color-accent-ink)]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </header>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-5 py-2">
          {Array.from(selectedTypes).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]"
            >
              {TYPE_LABEL[t]}
              <button
                type="button"
                onClick={() => toggleType(t)}
                aria-label={`Remove ${TYPE_LABEL[t]} filter`}
                className="flex h-4 w-4 items-center justify-center text-[var(--color-text-muted)]"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {dateChip !== "all" && (
            <span className="inline-flex items-center gap-1 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]">
              {range.from ? formatDate(range.from) : "—"} →{" "}
              {range.to ? formatDate(range.to) : "—"}
              <button
                type="button"
                onClick={clearRange}
                aria-label="Clear date range"
                className="flex h-4 w-4 items-center justify-center text-[var(--color-text-muted)]"
              >
                <X size={10} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] active:text-[var(--color-text)]"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col gap-2 px-5 py-3 pb-6">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No activity in this range.
            </p>
          </div>
        ) : (
          <>
            {activity.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                onTap={() => onTap(a)}
                contextLabel={contextLabelFor(a)}
                titleOverride={titleOverrideFor(a)}
              />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="mt-2 h-11 border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                Load more
              </button>
            )}
          </>
        )}
      </section>
      </div>

      {filterOpen && (
        <BottomSheet onClose={() => setFilterOpen(false)}>
          <div className="flex flex-col">
            <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <div className="eyebrow">FILTERS</div>
                <div className="mt-1 font-display text-xl">Activity</div>
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">TYPE — MULTI-SELECT</span>
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPE_KEYS.map((key) => {
                    const active = selectedTypes.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleType(key)}
                        className={
                          active
                            ? "border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
                            : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text)]"
                        }
                      >
                        {TYPE_LABEL[key]}
                      </button>
                    );
                  })}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  Empty = show all
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="eyebrow">DATE — SINGLE-SELECT</span>
                <div className="flex flex-wrap gap-2">
                  {dateChips.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyDateChip(c.id)}
                      className={
                        dateChip === c.id
                          ? "border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
                          : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text)]"
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {(range.from || range.to) && (
                  <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                    {range.from ? formatDate(range.from) : "—"} →{" "}
                    {range.to ? formatDate(range.to) : "—"}
                  </span>
                )}
              </div>
            </div>

            <div
              className="shrink-0 flex gap-2 border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-3"
              style={{
                paddingBottom:
                  "max(env(safe-area-inset-bottom, 0px), 12px)",
              }}
            >
              <button
                type="button"
                onClick={clearAllFilters}
                className="h-10 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="h-10 flex-1 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
              >
                Done
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {rangeSheetOpen && (
        <DateRangeSheet
          value={range}
          onChange={(next) => {
            setRange(next);
            setDateChip(next.from || next.to ? "custom" : "all");
          }}
          onClose={() => setRangeSheetOpen(false)}
        />
      )}

      {activeExchange && (
        <ExchangeDetailSheet
          exchange={activeExchange}
          onClose={() => setActiveExchange(null)}
          onDelete={
            user
              ? () => {
                  void deleteExchange(user.uid, activeExchange.id);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
