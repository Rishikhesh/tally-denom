import { Check, Pencil, Trash2, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { DenomTally } from "./DenomTally";

interface Voucher {
  id: string;
  code: string;
  total: number;
  denoms: DenomCounts;
  verified: boolean;
  txDate: string;
}

interface Props {
  voucher: Voucher;
  onEdit: () => void;
  onToggleVerify: () => void;
  onDelete: () => void;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function VoucherRow({
  voucher,
  onEdit,
  onToggleVerify,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg)]">
      <div className="flex items-stretch">
        {/* Body (tap toggles expand) */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-col items-stretch gap-1 px-3 py-2 text-left"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate font-display text-base font-medium text-[var(--color-text)]">
              VCH #{voucher.code}
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹{formatINR(voucher.total)}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex shrink-0 items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                voucher.verified
                  ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]",
              )}
            >
              {voucher.verified ? "Verified" : "Unverified"}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
              {formatDate(voucher.txDate)}
            </span>
          </div>
        </button>

        {/* Icon actions */}
        <div className="flex shrink-0 items-stretch border-l border-[var(--color-border-strong)]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit voucher ${voucher.code}`}
            className="flex h-full min-h-10 w-10 items-center justify-center border-l border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] first:border-l-0 active:bg-[var(--color-surface)]"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVerify();
            }}
            aria-label={
              voucher.verified
                ? `Unverify voucher ${voucher.code}`
                : `Verify voucher ${voucher.code}`
            }
            className="flex h-full min-h-10 w-10 items-center justify-center border-l border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
          >
            {voucher.verified ? <X size={16} /> : <Check size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            aria-label={`Delete voucher ${voucher.code}`}
            className="flex h-full min-h-10 w-10 items-center justify-center border-l border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-destructive)] active:bg-[var(--color-surface)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          <DenomTally counts={voucher.denoms} />
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete voucher?</DialogTitle>
            <DialogDescription className="text-[var(--color-text-muted)]">
              VCH #{voucher.code} · ₹{formatINR(voucher.total)}. This cannot be
              undone.
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
