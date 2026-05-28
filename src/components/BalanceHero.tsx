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

interface CellProps {
  label: string;
  value: number;
  size: "display" | "mono";
  emphasis?: boolean;
}

function Cell({ label, value, size, emphasis = false }: CellProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <span
        className={
          size === "display"
            ? `font-display tabular-nums text-[var(--color-text)] ${emphasis ? "text-3xl font-semibold" : "text-3xl"}`
            : `font-mono tabular-nums text-[var(--color-text)] ${emphasis ? "text-xl" : "text-lg"}`
        }
      >
        <span className="font-mono">₹ </span>
        {formatINR(value)}
      </span>
    </div>
  );
}

export function BalanceHero({ verified, unverified, spent, net }: Props) {
  return (
    <section className="flex flex-col gap-4 px-5 py-5">
      <div className="eyebrow">01 / BALANCE</div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <Cell label="VERIFIED" value={verified} size="display" />
        <Cell label="UNVERIFIED" value={unverified} size="display" />
        <Cell label="SPENT" value={spent} size="mono" />
        <Cell label="NET" value={net} size="display" emphasis />
      </div>
    </section>
  );
}
