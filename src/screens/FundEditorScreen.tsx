import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { DatePickerSheet, DenomRow, Loader } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { createFund, editFund, useAllFunds } from "@/hooks/useData";
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
const TITLE_MAX = 60;

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FundEditorScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const fundId =
    top && top.params ? (top.params.fundId as string | undefined) ?? null : null;

  const allFunds = useAllFunds();
  const existing = fundId
    ? allFunds.find((f) => f.id === fundId) ?? null
    : null;

  const [hydratedId, setHydratedId] = useState<string | null>(
    fundId ? null : "__new__",
  );

  const [title, setTitle] = useState("");
  const [remark, setRemark] = useState("");
  const [denoms, setDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (fundId && existing && hydratedId !== fundId) {
    setTitle(existing.title);
    setRemark(existing.remark ?? "");
    setDenoms({ ...existing.denoms });
    setTxDate(existing.txDate || todayInputDate());
    setHydratedId(fundId);
  }
  const hydrated = hydratedId !== null;
  const isEditing = !!fundId;

  const amountNumeric = sumDenoms(denoms);
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);
  const titleTrimmed = title.trim();
  const titleOk = titleTrimmed.length > 0 && titleTrimmed.length <= TITLE_MAX;

  const canSave =
    !!user &&
    titleOk &&
    amountNumeric > 0 &&
    denomsOk &&
    dateValid &&
    !saving &&
    (!fundId || hydrated);

  let disabledReason: string | null = null;
  if (!saving) {
    if (!titleTrimmed) disabledReason = "Enter a title to save";
    else if (titleTrimmed.length > TITLE_MAX)
      disabledReason = `Title must be ≤ ${TITLE_MAX} characters`;
    else if (amountNumeric <= 0)
      disabledReason = "Add at least one note or coin";
    else if (!denomsOk)
      disabledReason = "Denomination counts must be whole numbers ≥ 0";
    else if (!dateValid) disabledReason = "Pick a valid date";
  }

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    try {
      const remarkTrimmed = remark.trim();
      const remarkValue = remarkTrimmed.length > 0 ? remarkTrimmed : null;
      if (fundId) {
        await editFund(user.uid, fundId, {
          title: titleTrimmed,
          remark: remarkValue,
          amount: amountNumeric,
          denoms,
          txDate,
        });
      } else {
        await createFund(user.uid, {
          title: titleTrimmed,
          remark: remarkValue,
          amount: amountNumeric,
          denoms,
          txDate,
        });
      }
      useNavStore.getState().goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save inflow");
      setSaving(false);
    }
  }

  function goBack() {
    useNavStore.getState().goBack();
  }

  if (loading || (fundId && !hydrated)) {
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
          <div className="eyebrow">03 / INFLOW</div>
          <h1 className="font-display text-lg">
            {isEditing ? "Edit inflow" : "Add inflow"}
          </h1>
        </div>
      </header>

      {/* Fixed top: TITLE + REMARK + DATE + AMOUNT. Stays visible while the
          user scrolls denominations. */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="fd-title" className="eyebrow">
              TITLE
            </Label>
            <Input
              id="fd-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ATM withdrawal"
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="fd-remark" className="eyebrow">
              REMARK
            </Label>
            <Input
              id="fd-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional"
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
          {saving ? "Saving…" : isEditing ? "Update inflow" : "Save inflow"}
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
          eyebrow="Inflow date"
          title="Pick date"
        />
      )}
    </div>
  );
}
