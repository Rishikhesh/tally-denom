import { DENOMS, type DenomCounts } from "@/lib/denoms";
import { cn } from "@/lib/utils";

interface Props {
  counts: DenomCounts;
  /**
   * When `"destructive"`, negative cells render in destructive ink. Used by
   * net inventories where over-spend pushes a denom below zero.
   */
  emphasis?: "default" | "destructive";
  /** Optional muted label suffix appended after the last cell. */
  trailing?: string;
}

/**
 * Compact one-line denom breakdown. Renders `₹500×10 · ₹100×2 · …` in mono
 * tabular-nums. Horizontally scrolls when the line overflows the parent —
 * keeps the row height stable across vouchers / ledger entries of any size.
 */
export function DenomLine({ counts, emphasis = "default", trailing }: Props) {
  const items = DENOMS.filter((d) => counts[d] !== 0).map((d) => ({
    denom: d,
    count: counts[d],
  }));

  if (items.length === 0) {
    return (
      <span className="font-mono text-[11px] tabular-nums text-[var(--color-text-muted)]">
        No notes.
      </span>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-nowrap items-baseline gap-1.5 overflow-x-auto font-mono text-[11px] tabular-nums text-[var(--color-text)]"
      style={{ scrollbarWidth: "none" }}
    >
      {items.map((it, i) => (
        <span
          key={it.denom}
          className={cn(
            "shrink-0 whitespace-nowrap",
            emphasis === "destructive" && it.count < 0 &&
              "text-[var(--color-destructive)]",
          )}
        >
          {i > 0 && (
            <span className="mr-1.5 text-[var(--color-text-muted)]">·</span>
          )}
          ₹{it.denom}×{it.count < 0 ? `(${-it.count})` : it.count}
        </span>
      ))}
      {trailing && (
        <span className="ml-1.5 shrink-0 whitespace-nowrap text-[var(--color-text-muted)]">
          {trailing}
        </span>
      )}
    </div>
  );
}
