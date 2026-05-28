import { ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DatePickerSheet,
  DenomLine,
  DenomRow,
  Loader,
  SegControl,
} from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  createLedgerEntry,
  editLedgerEntry,
  useAllExchanges,
  useAllFunds,
  useAllLedgerEntries,
  useAllSpends,
  useAllVouchers,
  useLedgerEntries,
} from "@/hooks/useData";
import { denomInventory } from "@/lib/balances";
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

export default function LedgerEntryEditorScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const ledgerId =
    top && top.params
      ? (top.params.ledgerId as string | undefined) ?? null
      : null;
  const entryId =
    top && top.params
      ? (top.params.entryId as string | undefined) ?? null
      : null;

  // Same render-time hydrate-from-list pattern as the other editors.
  const entries = useLedgerEntries(ledgerId);
  const existing = entryId
    ? entries.find((e) => e.id === entryId) ?? null
    : null;

  const [hydratedId, setHydratedId] = useState<string | null>(
    entryId ? null : "__new__",
  );

  const [kind, setKind] = useState<"in" | "out">("in");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [denoms, setDenoms] = useState<DenomCounts>(emptyDenoms());
  const [txDate, setTxDate] = useState<string>(todayInputDate());
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (entryId && existing && hydratedId !== entryId) {
    setKind(existing.kind);
    setTitle(existing.title);
    setNote(existing.note ?? "");
    setDenoms({ ...existing.denoms });
    setTxDate(existing.txDate || todayInputDate());
    setHydratedId(entryId);
  }
  const hydrated = hydratedId !== null;
  const isEditing = !!entryId;

  const amountNumeric = sumDenoms(denoms);
  const dateValid = ISO_RE.test(txDate);
  const denomsOk = isValidCounts(denoms);

  // OUT cap: available = main NET denom inventory (cash drawer). When editing
  // an existing OUT entry, add its denoms back so the user can re-allocate
  // without phantom debt.
  const allVouchers = useAllVouchers();
  const allSpends = useAllSpends();
  const allFunds = useAllFunds();
  const allLedgerEntries = useAllLedgerEntries();
  const allExchanges = useAllExchanges();
  const editingOut = !!existing && existing.kind === "out";
  const availableForOut = useMemo<DenomCounts>(() => {
    const inv = denomInventory(
      allVouchers,
      allSpends,
      allFunds,
      allLedgerEntries,
      allExchanges,
    );
    if (editingOut && existing) {
      for (const d of DENOMS) inv[d] += existing.denoms[d];
    }
    return inv;
  }, [
    allVouchers,
    allSpends,
    allFunds,
    allLedgerEntries,
    allExchanges,
    editingOut,
    existing,
  ]);
  const isOut = kind === "out";
  const overCap = isOut
    ? DENOMS.some((d) => denoms[d] > Math.max(0, availableForOut[d]))
    : false;

  const canSave =
    !!user &&
    !!ledgerId &&
    title.trim().length > 0 &&
    amountNumeric > 0 &&
    denomsOk &&
    dateValid &&
    !overCap &&
    !saving &&
    (!entryId || hydrated);

  let disabledReason: string | null = null;
  if (!saving) {
    if (!title.trim()) disabledReason = "Enter a title to save";
    else if (amountNumeric <= 0)
      disabledReason = "Add at least one note or coin";
    else if (!denomsOk)
      disabledReason = "Denomination counts must be whole numbers ≥ 0";
    else if (!dateValid) disabledReason = "Pick a valid date";
    else if (overCap) disabledReason = "Out cannot exceed cash on hand";
  }

  async function handleSave() {
    if (!canSave || !user || !ledgerId) return;
    setSaving(true);
    setError(null);
    try {
      const noteValue = note.trim().length > 0 ? note.trim() : null;
      if (entryId) {
        await editLedgerEntry(user.uid, entryId, {
          kind,
          title: title.trim(),
          amount: amountNumeric,
          denoms,
          note: noteValue,
          txDate,
        });
      } else {
        await createLedgerEntry(user.uid, {
          ledgerId,
          kind,
          title: title.trim(),
          amount: amountNumeric,
          denoms,
          note: noteValue,
          txDate,
        });
      }
      useNavStore.getState().goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entry");
      setSaving(false);
    }
  }

  function goBack() {
    useNavStore.getState().goBack();
  }

  if (loading || !ledgerId || (entryId && !hydrated)) {
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
          <div className="eyebrow">03 / LEDGER ENTRY</div>
          <h1 className="font-display text-lg">
            {isEditing ? "Edit entry" : "Add entry"}
          </h1>
        </div>
      </header>

      {/* Fixed top: KIND + NOTE + DATE + AMOUNT */}
      <div className="border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">KIND</span>
            <SegControl
              options={[
                { id: "in", label: "In" },
                { id: "out", label: "Out" },
              ]}
              value={kind}
              onChange={(v) => setKind(v === "out" ? "out" : "in")}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="le-title" className="eyebrow">
              TITLE
            </Label>
            <Input
              id="le-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Salary, Rent"
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="le-note" className="eyebrow">
              NOTE
            </Label>
            <Input
              id="le-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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

      {/* Scrollable denominations */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="eyebrow mb-2">04 / DENOMINATIONS</div>
        {isOut && (
          <div className="mb-2 flex flex-col gap-1 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              AVAILABLE ON HAND
            </span>
            <DenomLine counts={availableForOut} emphasis="destructive" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Red = drawer over-spent on that denom · use exchange to balance
            </span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {DENOMS.map((d) => (
            <DenomRow
              key={d}
              denom={d}
              count={denoms[d]}
              max={isOut ? Math.max(0, availableForOut[d]) : undefined}
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
          {saving ? "Saving…" : isEditing ? "Update entry" : "Save entry"}
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
          eyebrow="Entry date"
          title="Pick date"
        />
      )}
    </div>
  );
}
