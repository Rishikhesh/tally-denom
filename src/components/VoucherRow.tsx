import { Banknote, Check } from "lucide-react";
import { DenomLine } from "@/components/DenomLine";
import { formatDate } from "@/lib/date";
import { DENOMS, type DenomCounts } from "@/lib/denoms";
import { cn } from "@/lib/utils";
import { verifyStatusOf, verifyTone, voucherDisplayCode } from "@/lib/voucher";

interface Voucher {
  id: string;
  code: string;
  actualCode?: string | null;
  total: number;
  denoms: DenomCounts;
  cashVerified?: boolean;
  verified: boolean;
  verifyAmount?: number | null;
  txDate: string;
  createdByName?: string | null;
}

interface Props {
  voucher: Voucher;
  /** Tap the row → open the read-only detail (all actions live there). */
  onRowTap?: () => void;
  /** Amount spent against this voucher — display shows the net (total − spent). */
  spentAmount?: number;
  /** Denoms spent against this voucher — denom line shows the net remainder. */
  spentDenoms?: DenomCounts;
  /** Records-only: show a "Voucher pending" badge on cash-verified rows. */
  showVoucherPending?: boolean;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function VoucherRow({
  voucher,
  onRowTap,
  spentAmount = 0,
  spentDenoms,
  showVoucherPending = false,
}: Props) {
  // Net balance = collected total − spent against this voucher.
  const netAmount = voucher.total - spentAmount;
  const netDenoms = spentDenoms
    ? (Object.fromEntries(
        DENOMS.map((d) => [d, voucher.denoms[d] - spentDenoms[d]]),
      ) as DenomCounts)
    : voucher.denoms;
  const verified = voucher.verified;
  const cashVerified = voucher.cashVerified === true;
  const vStatus = verifyStatusOf(voucher.verifyAmount, voucher.total);
  const vTone = verifyTone(vStatus);

  const Wrapper = onRowTap ? "button" : "div";

  return (
    <Wrapper
      {...(onRowTap
        ? {
            type: "button" as const,
            onClick: onRowTap,
            "aria-label": `Open voucher ${voucher.code}`,
          }
        : {})}
      className="flex w-full flex-col border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-left active:bg-[var(--color-surface)]"
    >
      {/* Identity · net amount */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="min-w-0 truncate font-display text-base font-medium text-[var(--color-text)]">
            VCH #{voucherDisplayCode(voucher)}
          </span>
          <span className="font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
            {formatDate(voucher.txDate)}
            {voucher.createdByName ? ` · by ${voucher.createdByName}` : ""}
          </span>
        </div>
        <span className="shrink-0 self-center font-mono text-sm tabular-nums text-[var(--color-text)]">
          ₹{formatINR(netAmount)}
        </span>
      </div>

      {/* Status + net denoms */}
      <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-2">
        {verified ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[var(--color-accent-ink)]"
            aria-label={`Voucher ${voucher.code} is verified`}
          >
            <Check size={12} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
              Voucher ✓
            </span>
          </span>
        ) : cashVerified ? (
          <>
            <span
              className="inline-flex shrink-0 items-center gap-1 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[var(--color-accent-ink)]"
              aria-label={`Voucher ${voucher.code} is cash verified`}
            >
              <Banknote size={12} />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Cash ✓
              </span>
            </span>
            {showVoucherPending && (
              <span
                className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]"
                aria-label={`Voucher ${voucher.code} voucher pending`}
              >
                Voucher pending
              </span>
            )}
          </>
        ) : (
          <span
            className="inline-flex shrink-0 items-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text)]"
            aria-label={`Voucher ${voucher.code} cash pending`}
          >
            Cash pending
          </span>
        )}

        {vStatus && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center border bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em]",
              vTone === "success" &&
                "border-[var(--color-success)] text-[var(--color-success)]",
              vTone === "destructive" &&
                "border-[var(--color-destructive)] text-[var(--color-destructive)]",
              vTone === "neutral" &&
                "border-[var(--color-border-strong)] text-[var(--color-text-muted)]",
            )}
          >
            {vStatus}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <DenomLine counts={netDenoms} emphasis="destructive" />
        </div>
      </div>
    </Wrapper>
  );
}
