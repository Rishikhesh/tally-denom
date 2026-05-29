import { ChevronLeft, Pencil } from "lucide-react";
import { useMemo } from "react";
import { DenomTally, Loader } from "@/components";
import { useAuth } from "@/hooks/useAuth";
import { useLedger, useLedgerEntries } from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate, formatTime } from "@/lib/date";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LedgerEntryDetailScreen() {
  const { loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const ledgerId =
    top && top.params
      ? (top.params.ledgerId as string | undefined) ?? null
      : null;
  const entryId =
    top && top.params
      ? (top.params.entryId as string | undefined) ?? null
      : null;

  const ledger = useLedger(ledgerId);
  const entries = useLedgerEntries(ledgerId);
  const entry = useMemo(
    () => entries.find((e) => e.id === entryId) ?? null,
    [entries, entryId],
  );

  function goBack() {
    useNavStore.getState().goBack();
  }
  function openEditor() {
    if (!ledgerId || !entryId) return;
    useNavStore
      .getState()
      .go({ name: "ledger-entry-editor", params: { ledgerId, entryId } });
  }

  if (loading || !ledgerId || !entryId || !entry) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const isIn = entry.kind === "in";

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
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="eyebrow">LEDGER ENTRY</div>
          <h1 className="truncate font-display text-lg">
            {entry.title || "(no title)"}
          </h1>
        </div>
        <button
          type="button"
          onClick={openEditor}
          aria-label="Edit entry"
          className="flex h-9 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text)] active:bg-[var(--color-surface)]"
        >
          <Pencil size={14} />
          Edit
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={
                isIn
                  ? "inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-ink)]"
                  : "inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text)]"
              }
            >
              {isIn ? "IN" : "OUT"}
            </span>
            <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
              {ledger?.name ?? "Ledger"}
            </span>
          </div>
          <span className="mt-1 break-words font-display text-[32px] font-medium leading-[1.05] tracking-tight tabular-nums text-[var(--color-text)]">
            ₹ {formatINR(entry.amount)}
          </span>
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
            {formatTime(entry.createdAt)} · {formatDate(entry.txDate)}
          </span>
        </div>

        {entry.note && (
          <div className="mt-4 flex flex-col gap-1">
            <span className="eyebrow">NOTE</span>
            <p className="text-sm text-[var(--color-text)]">{entry.note}</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <span className="eyebrow">DENOMINATIONS</span>
          <DenomTally counts={entry.denoms} />
        </div>
      </div>
    </div>
  );
}
