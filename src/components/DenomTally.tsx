import { DENOMS, type DenomCounts } from "@/lib/denoms";
import { cn } from "@/lib/utils";

interface Props {
  counts: DenomCounts;
  emphasis?: "default" | "destructive";
}

export function DenomTally({ counts, emphasis = "default" }: Props) {
  const nonZero = DENOMS.filter((d) => counts[d] > 0);

  if (nonZero.length === 0) {
    return (
      <div className="text-sm text-[var(--color-text-muted)]">No notes.</div>
    );
  }

  const destructive = emphasis === "destructive";

  return (
    <div className="flex flex-wrap gap-1.5">
      {nonZero.map((d) => (
        <span
          key={d}
          className={cn(
            "inline-flex items-center gap-1 border px-2 py-1 font-mono text-xs tabular-nums",
            destructive
              ? "border-[var(--color-destructive)] text-[var(--color-destructive)]"
              : "border-[var(--color-border-strong)] text-[var(--color-text)]",
          )}
        >
          <span>₹{d}</span>
          <span aria-hidden>×</span>
          <span>{counts[d]}</span>
        </span>
      ))}
    </div>
  );
}
