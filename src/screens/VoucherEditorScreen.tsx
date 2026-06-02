import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { DatePickerSheet, DenomRow, Loader } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import {
  createVoucher,
  editVoucher,
  useAllVouchers,
  useRoute,
} from "@/hooks/useData";
import { genVoucherRef } from "@/lib/voucher";
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
  const route = useRoute(routeId);

  const [hydratedId, setHydratedId] = useState<string | null>(
    voucherId ? null : "__new__",
  );

  // Dummy auto-number assigned at creation, prefixed with the route name. The
  // real number is captured when the voucher is verified (actualCode).
  const [code, setCode] = useState<string>("");
  const [denoms, setDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (voucherId && existing && hydratedId !== voucherId) {
    setCode(existing.code);
    setDenoms({ ...existing.denoms });
    setTxDate(existing.txDate || todayInputDate());
    setHydratedId(voucherId);
  }
  // New voucher: generate the dummy ref once the route name is loaded.
  if (!voucherId && route && !code) {
    setCode(genVoucherRef(route.name));
  }
  const hydrated = hydratedId !== null;
  const isEditing = !!voucherId;

  const totalNumeric = sumDenoms(denoms);
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);

  const canSave =
    !!user &&
    !!routeId &&
    code.trim().length > 0 &&
    totalNumeric > 0 &&
    denomsOk &&
    dateValid &&
    !saving &&
    (!voucherId || hydrated);

  // Specific reason shown next to the disabled save button — never leave the
  // user guessing why the CTA is grey.
  let disabledReason: string | null = null;
  if (!saving) {
    if (totalNumeric <= 0) disabledReason = "Add at least one note or coin";
    else if (!denomsOk)
      disabledReason = "Denomination counts must be whole numbers ≥ 0";
    else if (!dateValid) disabledReason = "Pick a valid date";
  }

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
      useNavStore.getState().goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save voucher");
      setSaving(false);
    }
  }

  function goBack() {
    useNavStore.getState().goBack();
  }

  if (loading || !routeId || (voucherId && !hydrated)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Cash-verified vouchers are locked — never editable. If we somehow land
  // here with one, show the read-only locked notice.
  if (existing?.cashVerified) {
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
            <div className="eyebrow">03 / VOUCHER</div>
            <h1 className="font-display text-lg">VCH #{existing.code}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="eyebrow">LOCKED</div>
          <p className="text-sm text-[var(--color-text-muted)]">
            This voucher is cash-verified and view-only. Open it from Records
            to view, or cash-unverify it to edit.
          </p>
          <button
            type="button"
            onClick={() =>
              useNavStore.getState().go({
                name: "voucher-detail",
                params: { routeId, voucherId },
              })
            }
            className="mt-2 h-10 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-accent-ink)]"
          >
            View voucher
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
          <div className="eyebrow">03 / VOUCHER</div>
          <h1 className="font-display text-lg">
            {isEditing ? "Edit voucher" : "Add voucher"}
          </h1>
        </div>
      </header>

      {/* Fixed top: REF (auto dummy) + DATE + TOTAL. Always visible while the
          user scrolls denominations. The real voucher number is entered at
          verification time. */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">REF #</span>
            <div className="flex h-10 items-center border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-sm text-[var(--color-text-muted)]">
              {code}
            </div>
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
          <span className="eyebrow">TOTAL</span>
          <span className="min-w-0 truncate text-right font-display text-2xl tabular-nums text-[var(--color-text)]">
            ₹ {formatINR(totalNumeric)}
          </span>
        </div>
      </div>

      {/* Scrollable denominations list — the only thing that scrolls. */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="eyebrow mb-2">04 / DENOMINATIONS</div>
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
          {saving ? "Saving…" : isEditing ? "Update voucher" : "Save voucher"}
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
          eyebrow="Voucher date"
          title="Pick date"
        />
      )}
    </div>
  );
}
