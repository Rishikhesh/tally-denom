import { Check, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { DenomLine } from "@/components/DenomLine";
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
  onEdit?: () => void;
  /** Only meaningful on unverified rows. Verification is one-way. */
  onToggleVerify?: () => void;
  onDelete?: () => void;
  /**
   * Hide all mutation controls. Verified vouchers are immutable everywhere
   * (auto-locked) regardless of this prop; `readOnly` additionally locks
   * unverified rows (e.g. when shown inside a route detail view).
   */
  readOnly?: boolean;
  /**
   * Tap-on-body handler. When supplied, the title/code/total area becomes a
   * button that fires this callback (typically push the voucher editor).
   * Action buttons stop-propagate so they still work.
   */
  onRowTap?: () => void;
  /**
   * Optional "add spend" action. Renders an inline ` + Spend ` button so the
   * user can attach a spend directly from the voucher list row.
   */
  onAddSpend?: () => void;
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
  readOnly = false,
  onRowTap,
  onAddSpend,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // `readOnly` is now the sole gate for hiding mutation controls. The
  // verified-ness of a voucher is conveyed via the pill / badge instead —
  // verified vouchers can still receive spends and be opened in the editor.
  const verified = voucher.verified;
  const showActions = !readOnly && (onEdit || onDelete);
  // Lock icon only when the caller explicitly marks the row read-only.
  const showLockIcon = readOnly;

  return (
    <div className="border border-[var(--color-border-strong)] bg-[var(--color-bg)]">
      {/* Header — 3 columns: identity (code + date) · amount (vertically
          centered) · action(s). Tap-on-body wraps identity + amount so the
          whole tappable region opens the voucher; action buttons live in
          their own column and stop-propagate. */}
      <div className="flex items-stretch">
        {onRowTap ? (
          <button
            type="button"
            onClick={onRowTap}
            aria-label={`Open voucher ${voucher.code}`}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left active:bg-[var(--color-surface)]"
          >
            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
              <span className="min-w-0 truncate font-display text-base font-medium text-[var(--color-text)]">
                VCH #{voucher.code}
              </span>
              <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                {formatDate(voucher.txDate)}
              </span>
            </div>
            <span className="shrink-0 self-center font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹{formatINR(voucher.total)}
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
              <span className="min-w-0 truncate font-display text-base font-medium text-[var(--color-text)]">
                VCH #{voucher.code}
              </span>
              <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
                {formatDate(voucher.txDate)}
              </span>
            </div>
            <span className="shrink-0 self-center font-mono text-sm tabular-nums text-[var(--color-text)]">
              ₹{formatINR(voucher.total)}
            </span>
          </div>
        )}

        {showActions || onAddSpend || showLockIcon ? (
          <div className="flex shrink-0 items-stretch border-l border-[var(--color-border-strong)]">
            {showActions && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit voucher ${voucher.code}`}
                className="flex h-full min-h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
              >
                <Pencil size={16} />
              </button>
            )}
            {showActions && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label={`Delete voucher ${voucher.code}`}
                className="flex h-full min-h-10 w-10 items-center justify-center border-l border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-destructive)] active:bg-[var(--color-surface)]"
              >
                <Trash2 size={16} />
              </button>
            )}
            {!showActions && showLockIcon && (
              <div
                className="flex shrink-0 items-center justify-center px-3 text-[var(--color-text-muted)]"
                aria-label="Locked (verified)"
                title="Verified records are read-only"
              >
                <Lock size={14} />
              </div>
            )}
            {onAddSpend && (
              <button
                type="button"
                onClick={onAddSpend}
                aria-label={`Add spend to voucher ${voucher.code}`}
                title="Add spend"
                className={
                  showActions || showLockIcon
                    ? "flex h-full min-h-10 flex-col items-center justify-center border-l border-[var(--color-border-strong)] bg-[var(--color-accent)] px-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-ink)] active:opacity-80"
                    : "flex h-full min-h-10 flex-col items-center justify-center bg-[var(--color-accent)] px-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-ink)] active:opacity-80"
                }
              >
                <Plus size={14} aria-hidden />
                <span>Spend</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Status + denoms. Single dedicated line: badge on the left, denom
          breakdown scrolls horizontally if it overflows. Spend / actions stay
          in the top-right column so this row reads cleanly. */}
      <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-2">
        {verified ? (
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
            aria-label={`Voucher ${voucher.code} is verified`}
            title="Verified"
          >
            <Check size={12} />
          </span>
        ) : onToggleVerify && !readOnly ? (
          <button
            type="button"
            onClick={onToggleVerify}
            aria-label={`Verify voucher ${voucher.code}`}
            className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)] active:opacity-80"
          >
            <span>
              UNVERIFIED
              <span className="ml-1 normal-case italic tracking-normal text-[var(--color-text-muted)]">
                · tap to verify
              </span>
            </span>
          </button>
        ) : (
          <span
            className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]"
            aria-label={`Voucher ${voucher.code} is unverified`}
          >
            UNVERIFIED
          </span>
        )}

        <div className="min-w-0 flex-1">
          <DenomLine counts={voucher.denoms} />
        </div>
      </div>

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
                onDelete?.();
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
