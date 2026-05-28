import { X } from "lucide-react";
import { DenomLine } from "./DenomLine";
import { BottomSheet } from "./BottomSheet";
import { formatDate, formatTime } from "@/lib/date";
import type { DenomCounts } from "@/lib/denoms";

interface ExchangeLike {
  amount: number;
  fromDenoms: DenomCounts;
  toDenoms: DenomCounts;
  txDate: string;
  createdAt: number;
}

interface Props {
  exchange: ExchangeLike;
  onClose: () => void;
  /** Optional secondary action (e.g. delete). */
  onDelete?: () => void;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Bottom sheet showing what was exchanged: FROM/TO denom lines, amount, and
 * the date + time. Used from Activity feed taps on exchange.* rows and from
 * the Records → Exchange list.
 */
export function ExchangeDetailSheet({ exchange, onClose, onDelete }: Props) {
  const time = formatTime(exchange.createdAt);

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <div className="eyebrow">EXCHANGE</div>
            <div className="mt-1 font-display text-xl">
              {formatDate(exchange.txDate)} ·{" "}
              <span className="font-mono">{time}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <span className="eyebrow">AMOUNT</span>
            <span className="font-mono text-base tabular-nums text-[var(--color-text)]">
              ₹{formatINR(exchange.amount)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">FROM</span>
            <DenomLine counts={exchange.fromDenoms} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">TO</span>
            <DenomLine counts={exchange.toDenoms} />
          </div>
        </div>

        {onDelete && (
          <div
            className="shrink-0 border-t border-[var(--color-border-strong)] bg-[var(--color-bg)] px-5 py-3"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="h-10 w-full border border-[var(--color-destructive)] bg-[var(--color-destructive)] px-4 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            >
              Delete exchange
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
