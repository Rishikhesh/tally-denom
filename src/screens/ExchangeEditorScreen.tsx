import { ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { DatePickerSheet, DenomLine, DenomRow, Loader } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  createExchange,
  useAllExchanges,
  useAllFunds,
  useAllLedgerEntries,
  useAllSpends,
  useAllVouchers,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { denomInventory } from "@/lib/balances";
import { formatDate, todayInputDate } from "@/lib/date";
import {
  DENOMS,
  type DenomCounts,
  emptyDenoms,
  isValidCounts,
  sumDenoms,
} from "@/lib/denoms";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ExchangeEditorScreen() {
  const { user, loading } = useAuth();

  // Cash drawer (main NET) inventory — caps the FROM denoms so the user
  // can't exchange more than they currently hold of each denomination.
  const vouchers = useAllVouchers();
  const spends = useAllSpends();
  const funds = useAllFunds();
  const ledgerEntries = useAllLedgerEntries();
  const exchanges = useAllExchanges();
  const available = useMemo(
    () => denomInventory(vouchers, spends, funds, ledgerEntries, exchanges),
    [vouchers, spends, funds, ledgerEntries, exchanges],
  );

  const [fromDenoms, setFromDenoms] = useState<DenomCounts>(emptyDenoms());
  const [toDenoms, setToDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromTotal = sumDenoms(fromDenoms);
  const toTotal = sumDenoms(toDenoms);
  const delta = toTotal - fromTotal;
  const dateValid = ISO_RE.test(txDate);
  const fromOk = isValidCounts(fromDenoms);
  const toOk = isValidCounts(toDenoms);
  const matched = fromTotal === toTotal;

  const canSave =
    !!user &&
    fromTotal > 0 &&
    toTotal > 0 &&
    matched &&
    fromOk &&
    toOk &&
    dateValid &&
    !saving;

  let disabledReason: string | null = null;
  if (!saving) {
    if (fromTotal <= 0) disabledReason = "Add denominations to the FROM side";
    else if (toTotal <= 0) disabledReason = "Add denominations to the TO side";
    else if (!matched)
      disabledReason = `Sides must match (off by ₹${formatINR(Math.abs(delta))})`;
    else if (!fromOk || !toOk)
      disabledReason = "Denomination counts must be whole numbers ≥ 0";
    else if (!dateValid) disabledReason = "Pick a valid date";
  }

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    try {
      await createExchange(user.uid, {
        amount: fromTotal,
        fromDenoms,
        toDenoms,
        note: null,
        txDate,
      });
      useNavStore.getState().goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save exchange");
      setSaving(false);
    }
  }

  function goBack() {
    useNavStore.getState().goBack();
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
      <header className="flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col">
          <div className="eyebrow">03 / EXCHANGE</div>
          <h1 className="font-display text-lg">Exchange</h1>
        </div>
      </header>

      {/* Fixed top: DATE */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">DATE</span>
          <button
            type="button"
            onClick={() => setDateSheetOpen(true)}
            className="flex h-10 items-center justify-between border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-sm font-mono tabular-nums text-[var(--color-text)]"
          >
            {dateValid ? formatDate(txDate) : "—"}
            <span className="text-xs text-[var(--color-text-muted)]">▾</span>
          </button>
        </div>
      </div>

      {/* Scrollable: FROM + TO sections + DELTA */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="eyebrow">01 / FROM</div>
            <span className="font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹{formatINR(fromTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-1 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              ON HAND
            </span>
            <DenomLine counts={available} emphasis="destructive" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Red = drawer over-spent on that denom
            </span>
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            {DENOMS.map((d) => (
              <DenomRow
                key={`from-${d}`}
                denom={d}
                count={fromDenoms[d]}
                max={Math.max(0, available[d])}
                onChange={(next) =>
                  setFromDenoms({ ...fromDenoms, [d]: next })
                }
              />
            ))}
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <div className="eyebrow">02 / TO</div>
            <span className="font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹{formatINR(toTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {DENOMS.map((d) => (
              <DenomRow
                key={`to-${d}`}
                denom={d}
                count={toDenoms[d]}
                onChange={(next) => setToDenoms({ ...toDenoms, [d]: next })}
              />
            ))}
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border-strong)] pt-3">
          <div className="eyebrow">02 / DELTA</div>
          <div className="flex flex-col gap-1 font-mono text-sm tabular-nums">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">FROM</span>
              <span className="text-[var(--color-text)]">
                ₹{formatINR(fromTotal)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">TO</span>
              <span className="text-[var(--color-text)]">
                ₹{formatINR(toTotal)}
              </span>
            </div>
            <div
              className={
                matched && fromTotal > 0
                  ? "mt-1 flex items-baseline justify-between border-t border-[var(--color-border)] pt-2 text-[var(--color-text)]"
                  : "mt-1 flex items-baseline justify-between border-t border-[var(--color-border)] pt-2 text-[var(--color-destructive)]"
              }
            >
              <span className="eyebrow">STATUS</span>
              <span>
                {fromTotal === 0 && toTotal === 0
                  ? "—"
                  : matched
                    ? "✓ matched"
                    : `✗ mismatch by ₹${formatINR(Math.abs(delta))}`}
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-3 font-mono text-xs text-[var(--color-destructive)]">
            {error}
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
      >
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void handleSave()}
          className="h-12 w-full border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save exchange"}
        </button>
        {!canSave && disabledReason && (
          <div className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {disabledReason}
          </div>
        )}
      </div>

      {dateSheetOpen && (
        <DatePickerSheet
          value={txDate}
          onChange={(next) => {
            setTxDate(next);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
          eyebrow="Exchange date"
          title="Pick date"
        />
      )}
    </div>
  );
}
