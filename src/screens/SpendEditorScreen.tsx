import { Check, ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
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
  reconcile,
} from "@/lib/denoms";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function SpendEditorScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const spendId =
    top && top.params ? (top.params.spendId as string | undefined) ?? null : null;

  const allSpends = useAllSpends();
  const existing = spendId
    ? allSpends.find((s) => s.id === spendId) ?? null
    : null;

  // Hydration via render-time comparator (see VoucherEditorScreen).
  const [hydratedId, setHydratedId] = useState<string | null>(
    spendId ? null : "__new__",
  );

  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [denoms, setDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (spendId && existing && hydratedId !== spendId) {
    setNote(existing.note);
    setCategory(existing.category ?? "");
    setAmount(String(existing.amount));
    setDenoms({ ...existing.denoms });
    setTxDate(existing.txDate || todayInputDate());
    setHydratedId(spendId);
  }
  const hydrated = hydratedId !== null;
  const isEditing = !!spendId;

  // Distinct categories from history (pure-client).
  const categorySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSpends) {
      if (s.category && s.category.trim()) set.add(s.category);
    }
    return Array.from(set).slice(0, 8);
  }, [allSpends]);

  const amountNumeric = (() => {
    if (amount === "") return NaN;
    const n = Number(amount);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return NaN;
    return n;
  })();

  const remaining = Number.isFinite(amountNumeric)
    ? reconcile(denoms, amountNumeric)
    : 0;
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);

  const canSave =
    !!user &&
    note.trim().length > 0 &&
    Number.isFinite(amountNumeric) &&
    remaining === 0 &&
    denomsOk &&
    dateValid &&
    !saving &&
    (!spendId || hydrated);

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    try {
      const cat = category.trim() || null;
      if (spendId) {
        await editSpend(user.uid, spendId, {
          note: note.trim(),
          category: cat,
          amount: amountNumeric,
          denoms,
          txDate,
        });
      } else {
        await createSpend(user.uid, {
          note: note.trim(),
          category: cat,
          amount: amountNumeric,
          denoms,
          txDate,
        });
      }
      if (typeof window !== "undefined") window.history.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save spend");
      setSaving(false);
    }
  }

  function goBack() {
    // Only call history.back(). The popstate listener inside useNavStore
    // pops the in-app stack — calling both would double-pop.
    if (typeof window !== "undefined") window.history.back();
  }

  if (loading || (spendId && !hydrated)) {
    return (
      <div className="flex h-full items-center justify-center">
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

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col gap-3 px-5 py-4">
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="sp-cat" className="eyebrow">
              CATEGORY
            </Label>
            <Input
              id="sp-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Optional"
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
            />
            {categorySuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categorySuggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={
                      category === c
                        ? "border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent-ink)]"
                        : "border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text)]"
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="sp-amount" className="eyebrow">
              AMOUNT
            </Label>
            <Input
              id="sp-amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="450"
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

        <section className="flex flex-col gap-3 px-5 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="eyebrow">04 / DENOMINATIONS</span>
              {Number.isFinite(amountNumeric) && remaining === 0 && (
                <Check
                  size={14}
                  aria-hidden
                  className="text-[var(--color-success,#1f7a3a)]"
                />
              )}
            </div>
            <span className={`font-mono text-sm tabular-nums ${remainingClass}`}>
              REMAINING ₹{Number.isFinite(amountNumeric) ? remaining : 0}
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
