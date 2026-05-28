import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { ActivityRow, Loader, SegControl } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  type Activity,
  useActivityPaged,
  useAllVouchers,
  verifyVoucher,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import type { ActivityType } from "@/lib/activity";
import { dateRangePresets, formatDate } from "@/lib/date";

type TypeFilterId = "all" | "voucher" | "spend" | "route";
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

interface Range {
  from?: string;
  to?: string;
}

export default function ActivityScreen() {
  const { user, loading } = useAuth();
  const vouchers = useAllVouchers();
  const [typeFilter, setTypeFilter] = useState<TypeFilterId>("all");
  const [dateChip, setDateChip] = useState<DateChipId>("all");
  const [range, setRange] = useState<Range>({});

  // Map voucher id → verified flag for the row-level VERIFY CTA.
  const voucherVerifiedMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const v of vouchers) m.set(v.id, v.verified);
    return m;
  }, [vouchers]);

  const types = useMemo<ActivityType[] | undefined>(() => {
    if (typeFilter === "all") return undefined;
    if (typeFilter === "voucher") return ALL_VOUCHER;
    if (typeFilter === "spend") return ALL_SPEND;
    if (typeFilter === "route") return ALL_ROUTE;
    return undefined;
  }, [typeFilter]);

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

  // Hide voucher.verify / voucher.unverify from the visible feed — they're
  // logged for audit but the user only needs the underlying state, surfaced
  // via the row-level VERIFY CTA on `voucher.create`.
  const activity = useMemo(
    () =>
      rawActivity.filter(
        (a) => a.type !== "voucher.verify" && a.type !== "voucher.unverify",
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
      // No DateRangeSheet wiring for the activity screen v1 — fall back to 30d.
      const p = dateRangePresets();
      setRange({ from: p.last30.from, to: p.last30.to });
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
        name: "voucher-editor",
        params: { routeId: a.routeId, voucherId: a.refId },
      });
      return;
    }
    if (a.type.startsWith("spend.")) {
      nav.go({ name: "spend-editor", params: { spendId: a.refId } });
      return;
    }
    if (a.type.startsWith("route.") && a.routeId) {
      nav.go({ name: "route", params: { routeId: a.routeId } });
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
      <header className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <div className="eyebrow">02 / ACTIVITY</div>
        <h1 className="font-display text-xl">Activity</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col gap-2 px-5 py-3">
        <span className="eyebrow">TYPE</span>
        <SegControl
          options={[
            { id: "all", label: "All" },
            { id: "voucher", label: "Vouchers" },
            { id: "spend", label: "Spends" },
            { id: "route", label: "Routes" },
          ]}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilterId)}
        />
      </section>

      <section className="flex flex-col gap-2 px-5 pb-3">
        <span className="eyebrow">DATE</span>
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

      <section className="flex flex-col gap-2 px-5 pb-6">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No activity in this range.
            </p>
          </div>
        ) : (
          <>
            {activity.map((a) => {
              const isCreate = a.type === "voucher.create";
              const isUnverified =
                isCreate &&
                voucherVerifiedMap.has(a.refId) &&
                voucherVerifiedMap.get(a.refId) === false;
              return (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  onTap={() => onTap(a)}
                  unverified={isUnverified || undefined}
                  onVerify={
                    isUnverified && user
                      ? () => void verifyVoucher(user.uid, a.refId)
                      : undefined
                  }
                />
              );
            })}
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
    </div>
  );
}
