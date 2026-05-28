import { ChevronLeft, Lock, Plus } from "lucide-react";
import { useMemo } from "react";
import { DenomTally, Loader, SpendRow } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteSpend,
  useAllVouchers,
  useSpendsByVoucher,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate } from "@/lib/date";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VoucherDetailScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const routeId =
    top && top.params
      ? (top.params.routeId as string | undefined) ?? null
      : null;
  const voucherId =
    top && top.params
      ? (top.params.voucherId as string | undefined) ?? null
      : null;

  const vouchers = useAllVouchers();
  const voucher = useMemo(
    () => vouchers.find((v) => v.id === voucherId) ?? null,
    [vouchers, voucherId],
  );
  const spends = useSpendsByVoucher(voucherId);

  const spentTotal = useMemo(
    () => spends.reduce((a, s) => a + s.amount, 0),
    [spends],
  );
  const remaining = voucher ? voucher.total - spentTotal : 0;

  function goBack() {
    useNavStore.getState().goBack();
  }

  function openSpendEditor(spendId?: string) {
    if (!routeId || !voucherId) return;
    useNavStore.getState().go({
      name: "spend-editor",
      params: {
        routeId,
        voucherId,
        ...(spendId ? { spendId } : {}),
      },
    });
  }

  function onDeleteSpend(id: string) {
    if (!user) return;
    void deleteSpend(user.uid, id);
  }

  if (loading || !voucherId || !routeId || !voucher) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const verified = voucher.verified;

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate font-display text-lg">
            VCH #{voucher.code}
          </h1>
          {verified && (
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              aria-label="Verified (locked)"
              title="Verified records are read-only"
            >
              <Lock size={12} />
            </span>
          )}
        </div>
      </header>

      {/* Hero block */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">VOUCHER TOTAL</span>
          <span className="break-words font-display text-[32px] font-medium leading-[1.05] tracking-tight tabular-nums text-[var(--color-text)]">
            ₹ {formatINR(voucher.total)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {verified ? (
            <span className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-ink)]">
              VERIFIED
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]">
              UNVERIFIED
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
            {formatDate(voucher.txDate)}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <DenomTally counts={voucher.denoms} />
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[var(--color-border-strong)] pt-3">
          <span className="eyebrow">REMAINING</span>
          <span
            className={
              remaining < 0
                ? "min-w-0 truncate text-right font-mono text-lg font-semibold tabular-nums text-[var(--color-destructive)]"
                : "min-w-0 truncate text-right font-mono text-lg font-semibold tabular-nums text-[var(--color-text)]"
            }
          >
            ₹ {formatINR(remaining)}
          </span>
        </div>
      </div>

      {/* Scrollable: spends */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="eyebrow mb-2">02 / SPENDS</div>
        {spends.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No spends for this voucher yet. Tap + to add one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-20">
            {spends.map((s) => (
              <SpendRow
                key={s.id}
                spend={s}
                onEdit={() => openSpendEditor(s.id)}
                onDelete={() => onDeleteSpend(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openSpendEditor()}
        aria-label="Add spend"
        className="absolute bottom-4 right-4 z-20 flex h-12 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] active:translate-y-px"
      >
        <Plus size={18} />
        <span>Spend</span>
      </button>
    </div>
  );
}
