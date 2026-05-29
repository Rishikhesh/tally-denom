import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DatePickerSheet, DenomLine, DenomRow, Loader } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  createSpend,
  editSpend,
  useAllSpends,
  useAllVouchers,
  useSpendsByVoucher,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
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

export default function SpendEditorScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const spendId =
    top && top.params ? (top.params.spendId as string | undefined) ?? null : null;
  const navVoucherId =
    top && top.params
      ? (top.params.voucherId as string | undefined) ?? null
      : null;
  const navRouteId =
    top && top.params
      ? (top.params.routeId as string | undefined) ?? null
      : null;

  // Prefer scoped lookup when we have a voucherId in nav params; fall back
  // to the global list (e.g. when editing from RecordsScreen which doesn't
  // pass routeId/voucherId yet).
  const spendsForVoucher = useSpendsByVoucher(navVoucherId);
  const allSpends = useAllSpends();
  const existing = spendId
    ? (navVoucherId
        ? spendsForVoucher.find((s) => s.id === spendId)
        : allSpends.find((s) => s.id === spendId)) ?? null
    : null;

  const [hydratedId, setHydratedId] = useState<string | null>(
    spendId ? null : "__new__",
  );

  const [note, setNote] = useState("");
  const [denoms, setDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (spendId && existing && hydratedId !== spendId) {
    setNote(existing.note);
    setDenoms({ ...existing.denoms });
    setTxDate(existing.txDate || todayInputDate());
    setHydratedId(spendId);
  }
  const hydrated = hydratedId !== null;
  const isEditing = !!spendId;

  // Defensive bail: a fresh spend MUST have voucherId+routeId in nav params.
  // Older callers (which shouldn't exist anymore) would land here without
  // them — pop back rather than create an orphaned spend.
  useEffect(() => {
    if (!loading && !spendId && (!navVoucherId || !navRouteId)) {
      useNavStore.getState().goBack();
    }
  }, [loading, spendId, navVoucherId, navRouteId]);

  // For edit-mode the existing doc already carries routeId/voucherId — use
  // those as the source of truth if nav params are missing.
  const effectiveVoucherId = navVoucherId ?? existing?.voucherId ?? null;
  const effectiveRouteId = navRouteId ?? existing?.routeId ?? null;

  // Cap each denom by what the parent voucher still has after subtracting
  // other (non-self) spends already tied to it. Voucher denoms — sum(other
  // spends' denoms). Bail to zero cap if voucher missing.
  const allVouchers = useAllVouchers();
  const voucher = effectiveVoucherId
    ? allVouchers.find((v) => v.id === effectiveVoucherId) ?? null
    : null;
  const availableInVoucher = useMemo<DenomCounts>(() => {
    const out: DenomCounts = emptyDenoms();
    if (!voucher) return out;
    for (const d of DENOMS) out[d] = voucher.denoms[d];
    for (const s of spendsForVoucher) {
      if (spendId && s.id === spendId) continue; // exclude self
      for (const d of DENOMS) out[d] -= s.denoms[d];
    }
    return out;
  }, [voucher, spendsForVoucher, spendId]);
  const overCap = DENOMS.some((d) => denoms[d] > Math.max(0, availableInVoucher[d]));

  const amountNumeric = sumDenoms(denoms);
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);

  const canSave =
    !!user &&
    !!effectiveVoucherId &&
    !!effectiveRouteId &&
    note.trim().length > 0 &&
    amountNumeric > 0 &&
    denomsOk &&
    dateValid &&
    !overCap &&
    !saving &&
    (!spendId || hydrated);

  let disabledReason: string | null = null;
  if (!saving) {
    if (!note.trim()) disabledReason = "Enter a note to save";
    else if (amountNumeric <= 0)
      disabledReason = "Add at least one note or coin";
    else if (!denomsOk)
      disabledReason = "Denomination counts must be whole numbers ≥ 0";
    else if (!dateValid) disabledReason = "Pick a valid date";
    else if (overCap) disabledReason = "Spend cannot exceed voucher denoms";
    else if (!effectiveVoucherId || !effectiveRouteId)
      disabledReason = "Spend must be attached to a voucher";
  }

  async function handleSave() {
    if (!canSave || !user || !effectiveVoucherId || !effectiveRouteId) return;
    setSaving(true);
    setError(null);
    try {
      if (spendId) {
        await editSpend(user.uid, spendId, {
          note: note.trim(),
          category: null,
          amount: amountNumeric,
          denoms,
          txDate,
        });
      } else {
        await createSpend(user.uid, {
          voucherId: effectiveVoucherId,
          routeId: effectiveRouteId,
          note: note.trim(),
          category: null,
          amount: amountNumeric,
          denoms,
          txDate,
        });
      }
      useNavStore.getState().goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save spend");
      setSaving(false);
    }
  }

  function goBack() {
    useNavStore.getState().goBack();
  }

  if (loading || (spendId && !hydrated)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Verified vouchers are view-only — no spends can be added or edited.
  if (voucher?.verified) {
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
            <div className="eyebrow">03 / SPEND</div>
            <h1 className="font-display text-lg">Locked</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="eyebrow">LOCKED</div>
          <p className="text-sm text-[var(--color-text-muted)]">
            This voucher is verified and view-only. Spends can't be added or
            edited. Mark it unverified first if you need to change it.
          </p>
          <button
            type="button"
            onClick={goBack}
            className="mt-2 h-10 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
          >
            Back
          </button>
        </div>
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
          <div className="eyebrow">03 / SPEND</div>
          <h1 className="font-display text-lg">
            {isEditing ? "Edit spend" : "Add spend"}
          </h1>
        </div>
      </header>

      {/* Fixed top: NOTE + DATE + AMOUNT. Stays visible while user scrolls
          the denominations. */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="sp-note" className="eyebrow">
              NOTE
            </Label>
            <Input
              id="sp-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Petrol"
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
            />
          </div>

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

        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[var(--color-border-strong)] pt-3">
          <span className="eyebrow">AMOUNT</span>
          <span className="min-w-0 truncate text-right font-display text-2xl tabular-nums text-[var(--color-text)]">
            ₹ {formatINR(amountNumeric)}
          </span>
        </div>
      </div>

      {/* Scrollable denominations list — the only thing that scrolls. */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="eyebrow mb-2">04 / DENOMINATIONS</div>
        {voucher && (
          <div className="mb-2 flex flex-col gap-1 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              AVAILABLE IN VOUCHER
            </span>
            <DenomLine counts={availableInVoucher} emphasis="destructive" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Red = no more of that denom remains
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {DENOMS.map((d) => (
            <DenomRow
              key={d}
              denom={d}
              count={denoms[d]}
              max={Math.max(0, availableInVoucher[d])}
              onChange={(next) => setDenoms({ ...denoms, [d]: next })}
            />
          ))}
        </div>

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
          {saving ? "Saving…" : isEditing ? "Update spend" : "Save spend"}
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
          eyebrow="Spend date"
          title="Pick date"
        />
      )}
    </div>
  );
}
