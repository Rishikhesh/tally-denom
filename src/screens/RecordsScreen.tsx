import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Loader, SegControl, SpendRow, VoucherRow } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteSpend,
  deleteVoucher,
  unverifyVoucher,
  useAllSpends,
  useAllVouchers,
  verifyVoucher,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate } from "@/lib/date";

type SegId = "verified" | "unverified" | "spends";

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
  const [seg, setSeg] = useState<SegId>("verified");
  const [query, setQuery] = useState("");

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

  const verifiedTotal = useMemo(
    () => filteredVerified.reduce((a, v) => a + v.total, 0),
    [filteredVerified],
  );
  const unverifiedTotal = useMemo(
    () => filteredUnverified.reduce((a, v) => a + v.total, 0),
    [filteredUnverified],
  );
  const spendsTotal = useMemo(
    () => filteredSpends.reduce((a, s) => a + s.amount, 0),
    [filteredSpends],
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
            { id: "verified", label: "Verified" },
            { id: "unverified", label: "Unverified" },
            { id: "spends", label: "Spends" },
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
                    onEdit={() =>
                      useNavStore.getState().go({
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
        ) : (
          (() => {
            const list =
              seg === "verified" ? filteredVerified : filteredUnverified;
            const total =
              seg === "verified" ? verifiedTotal : unverifiedTotal;
            const noun = seg === "verified" ? "verified" : "unverified";
            return (
              <section className="flex flex-col gap-3">
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
                        onEdit={() =>
                          useNavStore.getState().go({
                            name: "voucher-editor",
                            params: { routeId: v.routeId, voucherId: v.id },
                          })
                        }
                        onToggleVerify={() => {
                          if (!user) return;
                          if (v.verified)
                            void unverifyVoucher(user.uid, v.id);
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
            );
          })()
        )}
      </div>
    </div>
  );
}
