import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { DenomCounts } from "@/lib/denoms";
import { cn } from "@/lib/utils";
import { DenomTally } from "./DenomTally";

interface Props {
  verified: number;
  unverified: number;
  spent: number;
  net: number;
  verifiedDenoms: DenomCounts;
  unverifiedDenoms: DenomCounts;
  spentDenoms: DenomCounts;
  netDenoms: DenomCounts;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ExpandableRowProps {
  label: string;
  value: number;
  counts: DenomCounts;
  expanded: boolean;
  onToggle: () => void;
}

function ExpandableRow({
  label,
  value,
  counts,
  expanded,
  onToggle,
}: ExpandableRowProps) {
  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left active:opacity-80"
      >
        <span className="eyebrow shrink-0">{label}</span>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 truncate text-right font-mono text-base tabular-nums text-[var(--color-text)]">
            ₹ {formatINR(value)}
          </span>
          <ChevronDown
            size={14}
            aria-hidden
            className={cn(
              "shrink-0 self-center text-[var(--color-text-muted)] transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>
      {expanded && (
        <div className="pb-3">
          <DenomTally counts={counts} />
        </div>
      )}
    </div>
  );
}

export function BalanceHero({
  verified,
  unverified,
  spent,
  net,
  verifiedDenoms,
  unverifiedDenoms,
  spentDenoms,
  netDenoms,
}: Props) {
  const [open, setOpen] = useState({
    verified: false,
    unverified: false,
    spent: false,
  });

  return (
    <section className="flex flex-col gap-4 px-5 py-5">
      <div className="eyebrow">01 / BALANCE</div>

      {/* Hero NET — full-width, scales with any number length. */}
      <div className="flex flex-col gap-1 border-b-2 border-[var(--color-border-strong)] pb-4">
        <span className="eyebrow">NET</span>
        <span className="break-words font-display text-[44px] font-medium leading-[1.05] tracking-tight tabular-nums text-[var(--color-text)]">
          ₹ {formatINR(net)}
        </span>
      </div>

      {/* On-hand denom breakdown — always visible. */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow">NOTES &amp; COINS ON HAND</span>
        <DenomTally counts={netDenoms} />
      </div>

      {/* Breakdown — expandable rows, each reveals its denom tally. */}
      <div className="flex flex-col">
        <ExpandableRow
          label="VERIFIED"
          value={verified}
          counts={verifiedDenoms}
          expanded={open.verified}
          onToggle={() => setOpen((o) => ({ ...o, verified: !o.verified }))}
        />
        <ExpandableRow
          label="UNVERIFIED"
          value={unverified}
          counts={unverifiedDenoms}
          expanded={open.unverified}
          onToggle={() => setOpen((o) => ({ ...o, unverified: !o.unverified }))}
        />
        <ExpandableRow
          label="SPENT"
          value={spent}
          counts={spentDenoms}
          expanded={open.spent}
          onToggle={() => setOpen((o) => ({ ...o, spent: !o.spent }))}
        />
      </div>
    </section>
  );
}
