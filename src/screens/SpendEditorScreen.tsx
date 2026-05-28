import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { DatePickerSheet, DenomRow, Loader } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  createSpend,
  editSpend,
  useAllSpends,
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

  const allSpends = useAllSpends();
  const existing = spendId
    ? allSpends.find((s) => s.id === spendId) ?? null
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

  const amountNumeric = sumDenoms(denoms);
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);

  const canSave =
    !!user &&
    note.trim().length > 0 &&
    amountNumeric > 0 &&
    denomsOk &&
    dateValid &&
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
  }

  async function handleSave() {
    if (!canSave || !user) return;
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
