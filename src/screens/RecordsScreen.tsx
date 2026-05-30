import Fuse from "fuse.js";
import { ArrowLeftRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ExchangeDetailSheet,
  Loader,
  SegControl,
  SpendRow,
  VoucherRow,
} from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteExchange,
  deleteSpend,
  type Exchange,
  useAllExchanges,
  useAllSpends,
  useAllVouchers,
  useRoutes,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { spentByVoucher } from "@/lib/balances";
import { formatDate } from "@/lib/date";
import { verifyStatusOf } from "@/lib/voucher";

type SegId = "verified" | "unverified" | "spends" | "exchanges";

// Module-level so the chosen segment survives RecordsScreen unmount/remount
// (e.g. drilling into a record and pressing back). Resets only on reload.
let lastSeg: SegId = "unverified";
// Reset stale persisted segment if the inflow tab was last selected.
if ((lastSeg as string) === "funds") lastSeg = "unverified";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RecordsScreen() {
  const { user, loading } = useAuth();
  const vouchers = useAllVouchers();
  const spends = useAllSpends();
  const exchanges = useAllExchanges();
  const routes = useRoutes();
  // (Inflow feature removed — funds no longer surfaced here.)
  // Restore the last-viewed segment so back navigation lands where the user
  // left off.
  const [seg, setSegState] = useState<SegId>(lastSeg);
  const setSeg = (next: SegId) => {
    lastSeg = next;
    setSegState(next);
  };
  const [query, setQuery] = useState("");
  // Verified sub-filter by reconciliation status.
  const [vFilter, setVFilter] = useState<
    "all" | "tallied" | "excess" | "shortage"
  >("all");

  // Lookups so each spend can show its parent voucher + route.
  const voucherCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vouchers) m.set(v.id, v.actualCode ?? v.code);
    return m;
  }, [vouchers]);
  const routeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routes) m.set(r.id, r.name);
    return m;
  }, [routes]);
  const spentMap = useMemo(() => spentByVoucher(spends), [spends]);
  function spendContext(voucherId: string, routeId: string): string | undefined {
    const code = voucherCodeMap.get(voucherId);
    const route = routeNameMap.get(routeId);
    const parts = [code ? `VCH #${code}` : null, route].filter(
      (x): x is string => !!x,
    );
    return parts.length ? parts.join(" · ") : undefined;
  }
  const [activeExchange, setActiveExchange] = useState<Exchange | null>(null);

  const { verified, unverified } = useMemo(() => {
    const v = [] as typeof vouchers;
    const u = [] as typeof vouchers;
    for (const row of vouchers) {
      if (row.verified) v.push(row);
      else u.push(row);
    }
    return { verified: v, unverified: u };
  }, [vouchers]);

  // One Fuse instance per dataset — rebuilt only when the underlying list
  // changes. `total` is searched as a string to allow "5000" matches against
  // ₹5,000.00 rows. Threshold 0.4 = forgiving but not noise.
  const fuseVerified = useMemo(
    () =>
      new Fuse(
        verified.map((v) => ({
          item: v,
          code: v.code,
          date: formatDate(v.txDate),
          total: String(v.total),
        })),
        { keys: ["code", "date", "total"], threshold: 0.4, ignoreLocation: true },
      ),
    [verified],
  );
  const fuseUnverified = useMemo(
    () =>
      new Fuse(
        unverified.map((v) => ({
          item: v,
          code: v.code,
          date: formatDate(v.txDate),
          total: String(v.total),
        })),
        { keys: ["code", "date", "total"], threshold: 0.4, ignoreLocation: true },
      ),
    [unverified],
  );
  const fuseSpends = useMemo(
    () =>
      new Fuse(
        spends.map((s) => ({
          item: s,
          note: s.note,
          date: formatDate(s.txDate),
          amount: String(s.amount),
        })),
        { keys: ["note", "date", "amount"], threshold: 0.4, ignoreLocation: true },
      ),
    [spends],
  );
  const q = query.trim();

  const filteredVerified = useMemo(() => {
    if (!q) return verified;
    return fuseVerified.search(q).map((r) => r.item.item);
  }, [q, verified, fuseVerified]);
  const filteredUnverified = useMemo(() => {
    if (!q) return unverified;
    return fuseUnverified.search(q).map((r) => r.item.item);
  }, [q, unverified, fuseUnverified]);
  const filteredSpends = useMemo(() => {
    if (!q) return spends;
    return fuseSpends.search(q).map((r) => r.item.item);
  }, [q, spends, fuseSpends]);

  const fuseExchanges = useMemo(
    () =>
      new Fuse(
        exchanges.map((x) => ({
          item: x,
          date: formatDate(x.txDate),
          amount: String(x.amount),
        })),
        { keys: ["date", "amount"], threshold: 0.4, ignoreLocation: true },
      ),
    [exchanges],
  );
  const filteredExchanges = useMemo(() => {
    if (!q) return exchanges;
    return fuseExchanges.search(q).map((r) => r.item.item);
  }, [q, exchanges, fuseExchanges]);

  const spendsTotal = useMemo(
    () => filteredSpends.reduce((a, s) => a + s.amount, 0),
    [filteredSpends],
  );
  const exchangesTotal = useMemo(
    () => filteredExchanges.reduce((a, x) => a + x.amount, 0),
    [filteredExchanges],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const placeholder =
    seg === "spends"
      ? "Search note, date, amount"
      : seg === "exchanges"
        ? "Search date, amount"
        : "Search code, date, total";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-4">
        <div className="eyebrow">02 / RECORDS</div>
        <h1 className="font-display text-xl">Records</h1>
      </header>

      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <SegControl
          options={[
            { id: "unverified", label: "Unverified" },
            { id: "verified", label: "Verified" },
            { id: "spends", label: "Spends" },
            { id: "exchanges", label: "Exchange" },
          ]}
          value={seg}
          onChange={(v) => {
            setSeg(v as SegId);
            // Search is scoped to each section — clear when the user
            // switches segments so stale text doesn't filter the next list.
            setQuery("");
          }}
        />

        <div className="mt-3 flex h-10 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3">
          <Search
            size={14}
            aria-hidden
            className="shrink-0 text-[var(--color-text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search records"
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

      <div className="flex-1 overflow-y-auto px-5 py-3 pb-6">
        {seg === "spends" ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-2">
              <span className="font-mono text-xs uppercase tracking-[0.16em] tabular-nums text-[var(--color-text-muted)]">
                {filteredSpends.length} spend
                {filteredSpends.length === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                ₹{formatINR(spendsTotal)} spent
              </span>
            </div>

            {filteredSpends.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8">
                <div className="eyebrow">00 / EMPTY</div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {q ? "No spends match." : "No spends yet."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredSpends.map((s) => (
                  <SpendRow
                    key={s.id}
                    spend={s}
                    contextLabel={spendContext(s.voucherId, s.routeId)}
                    onEdit={() =>
                      useNavStore.getState().go({
                        name: "spend-editor",
                        params: {
                          spendId: s.id,
                          voucherId: s.voucherId,
                          routeId: s.routeId,
                        },
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
        ) : seg === "exchanges" ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-2">
              <span className="font-mono text-xs uppercase tracking-[0.16em] tabular-nums text-[var(--color-text-muted)]">
                {filteredExchanges.length} exchange
                {filteredExchanges.length === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                ₹{formatINR(exchangesTotal)} swapped
              </span>
            </div>

            {filteredExchanges.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8">
                <div className="eyebrow">00 / EMPTY</div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {q ? "No exchanges match." : "No exchanges yet."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredExchanges.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setActiveExchange(x)}
                    className="flex items-center gap-3 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-left active:bg-[var(--color-surface)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]">
                      <ArrowLeftRight size={16} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-display text-base font-medium text-[var(--color-text)]">
                        ₹{formatINR(x.amount)} exchanged
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                        {formatDate(x.txDate)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          (() => {
            const baseList =
              seg === "verified" ? filteredVerified : filteredUnverified;
            const list =
              seg === "verified" && vFilter !== "all"
                ? baseList.filter(
                    (v) => verifyStatusOf(v.verifyAmount, v.total) === vFilter,
                  )
                : baseList;
            const total = list.reduce((a, v) => a + v.total, 0);
            const noun = seg === "verified" ? "verified" : "unverified";
            return (
              <section className="flex flex-col gap-3">
                {seg === "verified" && (
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "tallied", label: "Tallied" },
                        { id: "excess", label: "Excess" },
                        { id: "shortage", label: "Shortage" },
                      ] as const
                    ).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setVFilter(c.id)}
                        className={
                          vFilter === c.id
                            ? "border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
                            : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text)]"
                        }
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] tabular-nums text-[var(--color-text-muted)]">
                    {list.length} {noun}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                    ₹{formatINR(total)} collected
                  </span>
                </div>

                {list.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 py-8">
                    <div className="eyebrow">00 / EMPTY</div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {q
                        ? `No ${noun} vouchers match.`
                        : `No ${noun} vouchers yet.`}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {list.map((v) => (
                      <VoucherRow
                        key={v.id}
                        voucher={v}
                        spentAmount={spentMap.get(v.id)?.amount ?? 0}
                        spentDenoms={spentMap.get(v.id)?.denoms}
                        onRowTap={() =>
                          useNavStore.getState().go({
                            name: "voucher-detail",
                            params: { routeId: v.routeId, voucherId: v.id },
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })()
        )}
      </div>

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
