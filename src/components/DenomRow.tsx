import { Minus, Plus } from "lucide-react";
import type { ChangeEvent, FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  denom: number;
  count: number;
  onChange: (next: number) => void;
}

function sanitize(raw: string): number {
  if (raw === "" || raw == null) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

export function DenomRow({ denom, count, onChange }: Props) {
  const subtotal = denom * count;

  function step(delta: number) {
    const next = count + delta;
    if (next < 0) return;
    onChange(next);
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    // Strip everything but digits — number input still receives `e` / `.`
    // events in some browsers; normalise on the way in.
    const cleaned = e.target.value.replace(/[^\d]/g, "");
    onChange(sanitize(cleaned));
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const cleaned = e.target.value.replace(/[^\d]/g, "");
    onChange(sanitize(cleaned));
  }

  return (
    <div className="flex items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
      <span className="font-display w-16 text-base font-medium text-[var(--color-text)] tabular-nums">
        ₹{denom}
      </span>

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={count === 0}
          aria-label={`Decrease ₹${denom} count`}
          className={cn(
            "flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] transition-opacity active:opacity-80",
            count === 0 && "opacity-30",
          )}
        >
          <Minus size={16} />
        </button>

        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={count}
          onChange={handleInput}
          onBlur={handleBlur}
          aria-label={`₹${denom} note count`}
          className="h-9 w-14 border border-[var(--color-border-strong)] border-x-0 bg-[var(--color-bg)] px-1 text-center text-base font-mono tabular-nums shadow-none focus-visible:ring-0"
        />

        <button
          type="button"
          onClick={() => step(1)}
          aria-label={`Increase ₹${denom} count`}
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] transition-opacity active:opacity-80"
        >
          <Plus size={16} />
        </button>
      </div>

      <span className="ml-auto font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
        ₹{subtotal.toLocaleString("en-IN")}
      </span>
    </div>
  );
}
