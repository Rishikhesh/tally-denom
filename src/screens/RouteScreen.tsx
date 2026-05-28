import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DateRangeSheet,
  DenomTally,
  Loader,
  SpendRow,
  VoucherRow,
} from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteSpend,
  deleteVoucher,
  unverifyVoucher,
  useAllSpends,
  useRoute,
  useVouchersByRoute,
  verifyVoucher,
} from "@/hooks/useData";
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

export default function RouteScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const routeId =
    top && top.name === "route"
      ? (top.params?.routeId as string | undefined) ?? null
      : null;

  const [chip, setChip] = useState<ChipId>("all");
  const [range, setRange] = useState<Range>({});
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
  const [spendsOpen, setSpendsOpen] = useState(true);

  const route = useRoute(routeId);
  const vouchers = useVouchersByRoute(routeId, range);
  const spends = useAllSpends(range);

  const totals = useMemo(() => {
    if (!routeId) {
      return { verified: 0, unverified: 0, total: 0 };
    }
    const stub = vouchers.map((v) => ({
      total: v.total,
      denoms: v.denoms,
      verified: v.verified,
      routeId: v.routeId,
    }));
    return routeTotals(stub, routeId);
  }, [vouchers, routeId]);

  const spentInRange = useMemo(
    () => spends.reduce((acc, s) => acc + s.amount, 0),
    [spends],
  );

  const inventory = useMemo(() => {
    const vStubs = vouchers.map((v) => ({
      total: v.total,
      denoms: v.denoms,
      verified: v.verified,
      routeId: v.routeId,
    }));
    const sStubs = spends.map((s) => ({ amount: s.amount, denoms: s.denoms }));
    return denomInventory(vStubs, sStubs);
  }, [vouchers, spends]);

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
    useNavStore.getState().back();
    if (typeof window !== "undefined") window.history.back();
  }

  if (loading || !routeId) {
    return (
      <div className="flex flex-1 items-center justify-center">
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
    <div className="flex flex-col">
      {/* App's outer wrapper is the scroll container; this screen just stacks
          its sections. The Add bar at the bottom uses position: sticky against
          the App wrapper so it pins to the top of the TabBar regardless of
          how short the content is. */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
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

      <section className="flex flex-col gap-3 px-5 py-4">
        <div className="eyebrow">01 / FILTER</div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => applyChip(c.id)}
              className={
                chip === c.id
                  ? "border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
                  : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text)]"
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
      </section>

      <section className="flex flex-col gap-3 px-5 pb-4">
        <div className="eyebrow">02 / TOTALS</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 border border-[var(--color-border)] px-3 py-2">
            <span className="eyebrow">VERIFIED</span>
            <span className="font-mono text-base tabular-nums">
              ₹{formatINR(totals.verified)}
            </span>
          </div>
          <div className="flex flex-col gap-1 border border-[var(--color-border)] px-3 py-2">
            <span className="eyebrow">UNVERIFIED</span>
            <span className="font-mono text-base tabular-nums">
              ₹{formatINR(totals.unverified)}
            </span>
          </div>
          <div className="flex flex-col gap-1 border border-[var(--color-border)] px-3 py-2">
            <span className="eyebrow">SPENT (RANGE)</span>
            <span className="font-mono text-base tabular-nums">
              ₹{formatINR(spentInRange)}
            </span>
          </div>
          <div className="flex flex-col gap-1 border border-[var(--color-border-strong)] px-3 py-2">
            <span className="eyebrow">NET (RANGE)</span>
            <span className="font-mono text-base font-semibold tabular-nums">
              ₹{formatINR(totals.total - spentInRange)}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 px-5 pb-4">
        <div className="eyebrow">03 / DENOM TALLY</div>
        <DenomTally
          counts={inventory}
          emphasis={anyNegative ? "destructive" : "default"}
        />
      </section>

      <section className="flex flex-col gap-3 px-5 pb-4">
        <div className="eyebrow">04 / VOUCHERS</div>
        {vouchers.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No vouchers in this range. Tap + Add voucher.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {vouchers.map((v) => (
              <VoucherRow
                key={v.id}
                voucher={v}
                onEdit={() =>
                  useNavStore
                    .getState()
                    .go({
                      name: "voucher-editor",
                      params: { routeId, voucherId: v.id },
                    })
                }
                onToggleVerify={() => {
                  if (!user) return;
                  if (v.verified) void unverifyVoucher(user.uid, v.id);
                  else void verifyVoucher(user.uid, v.id);
                }}
                onDelete={() => {
                  if (!user) return;
                  void deleteVoucher(user.uid, v.id);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {spends.length > 0 && (
        <section className="flex flex-col gap-3 px-5 pb-4">
          <button
            type="button"
            onClick={() => setSpendsOpen((v) => !v)}
            className="flex items-center justify-between border-b border-[var(--color-border)] py-1"
          >
            <span className="eyebrow">05 / SPENDS IN RANGE</span>
            <ChevronRight
              size={14}
              aria-hidden
              className={
                spendsOpen
                  ? "rotate-90 text-[var(--color-text-muted)] transition-transform"
                  : "text-[var(--color-text-muted)] transition-transform"
              }
            />
          </button>
          {spendsOpen && (
            <div className="flex flex-col gap-2">
              {spends.map((s) => (
                <SpendRow
                  key={s.id}
                  spend={s}
                  onEdit={() =>
                    useNavStore
                      .getState()
                      .go({
                        name: "spend-editor",
                        params: { spendId: s.id },
                      })
                  }
                  onDelete={() => {
                    if (!user) return;
                    void deleteSpend(user.uid, s.id);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="sticky bottom-0 z-20 flex gap-2 border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-3">
        <button
          type="button"
          onClick={() =>
            useNavStore
              .getState()
              .go({ name: "voucher-editor", params: { routeId } })
          }
          className="flex h-11 flex-1 items-center justify-center gap-1 border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)] active:opacity-80"
        >
          <Plus size={14} />
          Add voucher
        </button>
        <button
          type="button"
          onClick={() =>
            useNavStore.getState().go({ name: "spend-editor", params: {} })
          }
          className="flex h-11 flex-1 items-center justify-center gap-1 border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <Plus size={14} />
          Add spend
        </button>
      </div>

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
