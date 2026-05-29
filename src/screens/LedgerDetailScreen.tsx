import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DenomLine, Loader } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteLedger,
  deleteLedgerEntry,
  type LedgerEntry,
  useLedger,
  useLedgerEntries,
} from "@/hooks/useData";
import { useNavStore } from "@/hooks/useNavStore";
import { formatDate } from "@/lib/date";
import { DENOMS, type DenomCounts, emptyDenoms } from "@/lib/denoms";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface RowProps {
  entry: LedgerEntry;
  onOpen: () => void;
  onDelete: () => void;
}

function EntryRow({ entry, onOpen, onDelete }: RowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isIn = entry.kind === "in";

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg)]">
      <div className="flex items-stretch">
        {/* Body tap → read-only detail (edit from there). */}
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left active:bg-[var(--color-surface)]"
        >
          <span
            className={
              isIn
                ? "inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-ink)]"
                : "inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]"
            }
          >
            {isIn ? "IN" : "OUT"}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-[var(--color-text)]">
              {entry.title || "(no title)"}
            </span>
            <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
              {formatDate(entry.txDate)}
              {entry.note ? ` · ${entry.note}` : ""}
            </span>
          </div>
          <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--color-text)]">
            ₹{formatINR(entry.amount)}
          </span>
        </button>

        <div className="flex shrink-0 items-stretch border-l border-[var(--color-border-strong)]">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete entry"
            className="flex h-full min-h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-destructive)] active:bg-[var(--color-surface)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-3 py-2">
        <DenomLine counts={entry.denoms} />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete entry?</DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              {entry.kind.toUpperCase()} · ₹{formatINR(entry.amount)}. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                onDelete();
              }}
              className="h-10 border border-[var(--color-destructive)] bg-[var(--color-destructive)] px-4 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LedgerDetailScreen() {
  const { user, loading } = useAuth();
  const top = useNavStore((s) => s.stack[s.stack.length - 1]);
  const ledgerId =
    top && top.params
      ? (top.params.ledgerId as string | undefined) ?? null
      : null;

  const ledger = useLedger(ledgerId);
  const entries = useLedgerEntries(ledgerId);

  const { inTotal, outTotal, net, inDenoms, outDenoms, netDenoms } = useMemo(() => {
    let i = 0;
    let o = 0;
    const ind: DenomCounts = emptyDenoms();
    const outd: DenomCounts = emptyDenoms();
    for (const e of entries) {
      if (e.kind === "in") {
        i += e.amount;
        for (const d of DENOMS) ind[d] += e.denoms[d];
      } else {
        o += e.amount;
        for (const d of DENOMS) outd[d] += e.denoms[d];
      }
    }
    const netd: DenomCounts = emptyDenoms();
    for (const d of DENOMS) netd[d] = ind[d] - outd[d];
    return { inTotal: i, outTotal: o, net: i - o, inDenoms: ind, outDenoms: outd, netDenoms: netd };
  }, [entries]);

  function goBack() {
    useNavStore.getState().goBack();
  }

  function openEditor() {
    if (!ledgerId) return;
    useNavStore
      .getState()
      .go({ name: "ledger-entry-editor", params: { ledgerId } });
  }
  function openDetail(entryId: string) {
    if (!ledgerId) return;
    useNavStore
      .getState()
      .go({ name: "ledger-entry-detail", params: { ledgerId, entryId } });
  }

  function onDelete(entryId: string) {
    if (!user) return;
    void deleteLedgerEntry(user.uid, entryId);
  }

  const [confirmLedgerDelete, setConfirmLedgerDelete] = useState(false);
  async function handleDeleteLedger() {
    if (!user || !ledgerId) return;
    try {
      await deleteLedger(user.uid, ledgerId);
      useNavStore.getState().goBack();
    } catch (e) {
      // Surface the error so the user knows why the delete was rejected.
      console.error(e);
    }
  }

  if (loading || !ledgerId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );
  }

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
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate font-display text-lg">
            {ledger?.name ?? "Ledger"}
          </h1>
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </span>
        </div>
        {/* Delete ledger — enabled only when ledger net = 0 (close-out). */}
        <button
          type="button"
          onClick={() => setConfirmLedgerDelete(true)}
          disabled={net !== 0}
          aria-label="Delete ledger"
          title={
            net === 0
              ? "Delete ledger"
              : "Close out the ledger (net must be 0) to delete"
          }
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-destructive)] active:bg-[var(--color-surface)] disabled:opacity-30"
        >
          <Trash2 size={16} />
        </button>
      </header>

      <Dialog open={confirmLedgerDelete} onOpenChange={setConfirmLedgerDelete}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete ledger?</DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              "{ledger?.name ?? "Ledger"}" net is ₹0 ·{" "}
              {entries.length} entr{entries.length === 1 ? "y" : "ies"} will be
              removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmLedgerDelete(false)}
              className="h-10 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 text-sm font-semibold text-[var(--color-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmLedgerDelete(false);
                void handleDeleteLedger();
              }}
              className="h-10 border border-[var(--color-destructive)] bg-[var(--color-destructive)] px-4 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed top: totals as 3 stacked rows + per-row denom breakdown. */}
      <div className="flex flex-col border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex flex-col gap-1 border-b border-[var(--color-border)] py-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow shrink-0">IN</span>
            <span className="min-w-0 truncate text-right font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹ {formatINR(inTotal)}
            </span>
          </div>
          <DenomLine counts={inDenoms} />
        </div>
        <div className="flex flex-col gap-1 border-b border-[var(--color-border)] py-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow shrink-0">OUT</span>
            <span className="min-w-0 truncate text-right font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹ {formatINR(outTotal)}
            </span>
          </div>
          <DenomLine counts={outDenoms} />
        </div>
        <div className="flex flex-col gap-1 border-t border-[var(--color-border-strong)] pt-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow shrink-0">NET</span>
            <span className="min-w-0 truncate text-right font-mono text-base font-semibold tabular-nums text-[var(--color-text)]">
              ₹ {formatINR(net)}
            </span>
          </div>
          <DenomLine counts={netDenoms} emphasis="destructive" />
        </div>
      </div>

      {/* Scrollable entries */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div className="eyebrow mb-2">02 / ENTRIES</div>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <div className="eyebrow">00 / EMPTY</div>
            <p className="text-sm text-[var(--color-text-muted)]">
              No entries yet. Tap + to add one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-20">
            {entries.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onOpen={() => openDetail(e.id)}
                onDelete={() => onDelete(e.id)}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openEditor()}
        aria-label="Add entry"
        className="absolute bottom-4 right-4 z-20 flex h-12 items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-4 text-sm font-bold uppercase tracking-[0.14em] text-[var(--color-accent-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.28)] active:translate-y-px"
      >
        <Plus size={18} />
        <span>Entry</span>
      </button>
    </div>
  );
}
