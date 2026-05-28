import { Check, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { DatePickerSheet, DenomRow, Loader } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  createVoucher,
  editVoucher,
  useAllVouchers,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate, todayInputDate } from "@/lib/date";
import {
  DENOMS,
  type DenomCounts,
  emptyDenoms,
  isValidCounts,
  reconcile,
} from "@/lib/denoms";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function VoucherEditorScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const routeId =
    top && top.params ? (top.params.routeId as string | undefined) ?? null : null;
  const voucherId =
    top && top.params
      ? (top.params.voucherId as string | undefined) ?? null
      : null;

  const allVouchers = useAllVouchers();
  const existing = voucherId
    ? allVouchers.find((v) => v.id === voucherId) ?? null
    : null;

  // Hydration pattern: render-time setState driven by a comparator.
  // When editing, we wait for `existing` to be present, then initialise the
  // form once. The "last hydrated id" state guards against re-running.
  const [hydratedId, setHydratedId] = useState<string | null>(
    voucherId ? null : "__new__",
  );

  const [code, setCode] = useState("");
  const [total, setTotal] = useState("");
  const [denoms, setDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (voucherId && existing && hydratedId !== voucherId) {
    setCode(existing.code);
    setTotal(String(existing.total));
    setDenoms({ ...existing.denoms });
    setTxDate(existing.txDate || todayInputDate());
    setHydratedId(voucherId);
  }
  const hydrated = hydratedId !== null;

  const totalNumeric = (() => {
    if (total === "") return NaN;
    const n = Number(total);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return NaN;
    return n;
  })();

  const remaining = Number.isFinite(totalNumeric)
    ? reconcile(denoms, totalNumeric)
    : 0;
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);

  const canSave =
    !!user &&
    !!routeId &&
    code.trim().length > 0 &&
    Number.isFinite(totalNumeric) &&
    remaining === 0 &&
    denomsOk &&
    dateValid &&
    !saving &&
    (!voucherId || hydrated);

  async function handleSave() {
    if (!canSave || !user || !routeId) return;
    setSaving(true);
    setError(null);
    try {
      if (voucherId) {
        await editVoucher(user.uid, voucherId, {
          code: code.trim(),
          total: totalNumeric,
          denoms,
          txDate,
        });
      } else {
        await createVoucher(user.uid, {
          routeId,
          code: code.trim(),
          total: totalNumeric,
          denoms,
          txDate,
        });
      }
      useNavStore.getState().back();
      if (typeof window !== "undefined") window.history.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save voucher");
      setSaving(false);
    }
  }

  function goBack() {
    useNavStore.getState().back();
    if (typeof window !== "undefined") window.history.back();
  }

  if (loading || !routeId || (voucherId && !hydrated)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  const remainingClass =
    remaining === 0
      ? "text-[var(--color-text)]"
      : remaining > 0
        ? "text-[var(--color-text-muted)]"
        : "text-[var(--color-destructive)]";

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{ paddingBottom: "calc(var(--tab-bar-height) + var(--tab-safe-bottom) + 72px)" }}
    >
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col">
          <div className="eyebrow">03 / VOUCHER</div>
          <h1 className="font-display text-lg">
            {voucherId ? "Edit voucher" : "Add voucher"}
          </h1>
        </div>
      </header>

      <section className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="vch-code" className="eyebrow">
            CODE
          </Label>
          <Input
            id="vch-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="A123"
            className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="vch-total" className="eyebrow">
            TOTAL
          </Label>
          <Input
            id="vch-total"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="1000"
            className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base font-mono tabular-nums text-[var(--color-text)] shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="eyebrow">DATE</span>
          <button
            type="button"
            onClick={() => setDateSheetOpen(true)}
            className="flex h-10 items-center justify-between border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base font-mono tabular-nums text-[var(--color-text)]"
          >
            {dateValid ? formatDate(txDate) : "—"}
            <span className="text-xs text-[var(--color-text-muted)]">▾</span>
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 px-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="eyebrow">04 / DENOMINATIONS</span>
            {Number.isFinite(totalNumeric) && remaining === 0 && (
              <Check
                size={14}
                aria-hidden
                className="text-[var(--color-success,#1f7a3a)]"
              />
            )}
          </div>
          <span className={`font-mono text-sm tabular-nums ${remainingClass}`}>
            REMAINING ₹{Number.isFinite(totalNumeric) ? remaining : 0}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {DENOMS.map((d) => (
            <DenomRow
              key={d}
              denom={d}
              count={denoms[d]}
              onChange={(next) => setDenoms({ ...denoms, [d]: next })}
            />
          ))}
        </div>
      </section>

      {error && (
        <div className="px-5 pb-3 text-xs font-mono text-[var(--color-destructive)]">
          {error}
        </div>
      )}

      <div
        className="sticky z-20 border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-3"
        style={{ bottom: "calc(var(--tab-bar-height) + var(--tab-safe-bottom))" }}
      >
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-accent-ink)] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {dateSheetOpen && (
        <DatePickerSheet
          value={txDate}
          onChange={(next) => {
            setTxDate(next);
            setDateSheetOpen(false);
          }}
          onClose={() => setDateSheetOpen(false)}
          eyebrow="Voucher date"
          title="Pick date"
        />
      )}
    </div>
  );
}
