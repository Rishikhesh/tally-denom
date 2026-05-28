import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/date";
import type { DenomCounts } from "@/lib/denoms";
import { DenomTally } from "./DenomTally";

interface Fund {
  id: string;
  title: string;
  remark: string | null;
  amount: number;
  denoms: DenomCounts;
  txDate: string;
}

interface Props {
  fund: Fund;
  onEdit: () => void;
  onDelete: () => void;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FundRow({ fund, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg)]">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-col items-stretch gap-1 px-3 py-2 text-left"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate text-base font-medium text-[var(--color-text)]">
              {fund.title || "(untitled)"}
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹{formatINR(fund.amount)}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
              {formatDate(fund.txDate)}
            </span>
          </div>
        </button>

        <div className="flex shrink-0 items-stretch border-l border-[var(--color-border-strong)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit fund ${fund.title}`}
            className="flex h-full min-h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            aria-label={`Delete fund ${fund.title}`}
            className="flex h-full min-h-10 w-10 items-center justify-center border-l border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-destructive)] active:bg-[var(--color-surface)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 border-t border-[var(--color-border)] px-3 py-2">
          {fund.remark && (
            <p className="text-xs text-[var(--color-text-muted)]">
              {fund.remark}
            </p>
          )}
          <DenomTally counts={fund.denoms} />
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete fund?</DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              {fund.title || "(untitled)"} · ₹{formatINR(fund.amount)}. This
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
