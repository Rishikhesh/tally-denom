import Fuse from "fuse.js";
import { ChevronLeft, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DateRangeSheet, DenomTally, Loader, VoucherRow } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { useRoute, useVouchersByRoute } from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { denomInventory, routeTotals } from "@/lib/balances";
import { dateRangePresets, formatDate } from "@/lib/date";
import { DENOMS } from "@/lib/denoms";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type ChipId = "all" | "today" | "7d" | "30d" | "custom";

interface Range {
  from?: string;
  to?: string;
}

interface TotalRowProps {
  label: string;
  value: number;
  emphasis?: boolean;
}

function TotalRow({ label, value, emphasis = false }: TotalRowProps) {
  return (
    <div
      className={
        emphasis
          ? "flex items-baseline justify-between gap-3 border-t border-[var(--color-border-strong)] pt-2"
          : "flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0"
      }
    >
      <span className="eyebrow shrink-0">{label}</span>
      <span
        className={
          emphasis
            ? "min-w-0 truncate text-right font-mono text-base font-semibold tabular-nums text-[var(--color-text)]"
            : "min-w-0 truncate text-right font-mono text-sm tabular-nums text-[var(--color-text)]"
        }
      >
        ₹ {formatINR(value)}
      </span>
    </div>
  );
}

export default function RouteScreen() {
  const { loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const routeId =
    top && top.name === "route"
      ? (top.params?.routeId as string | undefined) ?? null
      : null;

  const [chip, setChip] = useState<ChipId>("all");
  const [range, setRange] = useState<Range>({});
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
  const [query, setQuery] = useState("");

  const route = useRoute(routeId);
  const allVouchersInRoute = useVouchersByRoute(routeId, range);

  // Fuzzy search across code + date + total. Threshold 0.4 = forgiving but
  // not noise. Rebuilt only when the underlying voucher list changes.
  const fuse = useMemo(
    () =>
      new Fuse(
        allVouchersInRoute.map((v) => ({
          item: v,
          code: v.code,
          date: formatDate(v.txDate),
          total: String(v.total),
        })),
        { keys: ["code", "date", "total"], threshold: 0.4, ignoreLocation: true },
      ),
    [allVouchersInRoute],
  );
  const q = query.trim();
  const vouchers = useMemo(() => {
    if (!q) return allVouchersInRoute;
    return fuse.search(q).map((r) => r.item.item);
  }, [q, allVouchersInRoute, fuse]);

  // Totals + inventory reflect the date-filtered route (not the search) so
  // the hero numbers don't lurch when the user types.
  const totals = useMemo(() => {
    if (!routeId) {
      return { verified: 0, unverified: 0, total: 0 };
    }
    const stub = allVouchersInRoute.map((v) => ({
      total: v.total,
      denoms: v.denoms,
      verified: v.verified,
      routeId: v.routeId,
    }));
    return routeTotals(stub, routeId);
  }, [allVouchersInRoute, routeId]);

  // Voucher-only inventory. Spends are global, not subtracted at the route
  // level.
  const inventory = useMemo(() => {
    const vStubs = allVouchersInRoute.map((v) => ({
      total: v.total,
      denoms: v.denoms,
      verified: v.verified,
      routeId: v.routeId,
    }));
    return denomInventory(vStubs, [], []);
  }, [allVouchersInRoute]);

  const anyNegative = DENOMS.some((d) => inventory[d] < 0);

  function applyChip(next: ChipId) {
    setChip(next);
    if (next === "all") {
      setRange({});
      return;
    }
    const p = dateRangePresets();
    if (next === "today") setRange({ from: p.today.from, to: p.today.to });
    else if (next === "7d") setRange({ from: p.last7.from, to: p.last7.to });
    else if (next === "30d") setRange({ from: p.last30.from, to: p.last30.to });
    else if (next === "custom") setRangeSheetOpen(true);
  }

  function clearRange() {
    setChip("all");
    setRange({});
  }

  function goBack() {
    // Store's goBack pops the in-app stack AND rewinds history, with a
    // skip-flag so the popstate handler doesn't double-pop.
    useNavStore.getState().goBack();
  }

  if (loading || !routeId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const chips: Array<{ id: ChipId; label: string }> = [
    { id: "all", label: "All" },
    { id: "today", label: "Today" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
    { id: "custom", label: "Custom…" },
  ];

  return (
    <div className="relative flex h-full flex-col">
      {/* Header — fixed */}
      <header className="flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-lg">
            {route?.name ?? "Route"}
          </h1>
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
            {route?.voucherCount ?? 0} voucher
            {(route?.voucherCount ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {/* Fixed top stack: filter + totals + denom tally. Does NOT scroll. */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-3">
          <div className="eyebrow">01 / FILTER</div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => applyChip(c.id)}
                className={
                  chip === c.id
                    ? "border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
                    : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text)]"
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          {(range.from || range.to) && (
            <div className="flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs">
              <span className="font-mono tabular-nums text-[var(--color-text)]">
                {range.from ? formatDate(range.from) : "—"} →{" "}
                {range.to ? formatDate(range.to) : "—"}
              </span>
              <button
                type="button"
                onClick={clearRange}
                aria-label="Clear range"
                className="ml-auto flex h-6 w-6 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col">
          <div className="eyebrow mb-2">02 / TOTALS</div>
          <TotalRow label="VERIFIED" value={totals.verified} />
          <TotalRow label="UNVERIFIED" value={totals.unverified} />
          <TotalRow label="TOTAL" value={totals.total} emphasis />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="eyebrow">03 / DENOM TALLY</div>
          <DenomTally
            counts={inventory}
            emphasis={anyNegative ? "destructive" : "default"}
          />
        </div>
      </div>

      {/* Vouchers — the ONLY scrollable region in the route detail. */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="mb-3 flex h-10 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3">
          <Search
            size={14}
            aria-hidden
            className="shrink-0 text-[var(--color-text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, date, total"
            aria-label="Search vouchers"
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
        <div className="eyebrow mb-2">04 / VOUCHERS</div>
        {vouchers.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {q
                ? "No vouchers match the search."
                : "No vouchers in this range. Tap + to add one."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-20">
            {/* Route view is read-only — edit / delete / verify live in the
                Records tab (Unverified segment). Tapping the body opens the
                voucher detail screen so spends can be added/viewed. */}
            {vouchers.map((v) => (
              <VoucherRow
                key={v.id}
                voucher={v}
                onRowTap={() =>
                  useNavStore.getState().go({
                    name: "voucher-editor",
                    params: { routeId, voucherId: v.id },
                  })
                }
                onAddSpend={() =>
                  useNavStore.getState().go({
                    name: "spend-editor",
                    params: { routeId, voucherId: v.id },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          useNavStore
            .getState()
            .go({ name: "voucher-editor", params: { routeId } })
        }
        aria-label="Add voucher"
        className="absolute bottom-4 right-4 z-20 flex h-12 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] active:translate-y-px"
      >
        <Plus size={18} />
        <span>Voucher</span>
      </button>

      {rangeSheetOpen && (
        <DateRangeSheet
          value={range}
          onChange={(next) => {
            setRange(next);
            setChip(next.from || next.to ? "custom" : "all");
          }}
          onClose={() => setRangeSheetOpen(false)}
        />
      )}
    </div>
  );
}
