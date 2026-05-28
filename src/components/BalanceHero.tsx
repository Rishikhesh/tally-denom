interface Props {
  verified: number;
  unverified: number;
  spent: number;
  net: number;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface RowProps {
  label: string;
  value: number;
}

function BreakdownRow({ label, value }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] py-2.5 last:border-b-0">
      <span className="eyebrow shrink-0">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-base tabular-nums text-[var(--color-text)]">
        ₹ {formatINR(value)}
      </span>
    </div>
  );
}

export function BalanceHero({ verified, unverified, spent, net }: Props) {
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

      {/* Breakdown — full-width rows, label left, number right. */}
      <div className="flex flex-col">
        <BreakdownRow label="VERIFIED" value={verified} />
        <BreakdownRow label="UNVERIFIED" value={unverified} />
        <BreakdownRow label="SPENT" value={spent} />
      </div>
    </section>
  );
}
