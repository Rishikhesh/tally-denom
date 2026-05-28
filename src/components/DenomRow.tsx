import { Minus, Plus } from "lucide-react";
import { type ChangeEvent, type FocusEvent, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  denom: number;
  count: number;
  onChange: (next: number) => void;
  /**
   * Optional upper bound. When supplied, the `+` button disables once the
   * count reaches `max`, the input clamps on commit, and an `n / max` hint
   * is shown next to the row.
   */
  max?: number;
}

function sanitize(raw: string): number {
  if (raw === "" || raw == null) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

export function DenomRow({ denom, count, onChange, max }: Props) {
  const subtotal = denom * count;
  const hasCap = typeof max === "number";
  const atMax = hasCap && count >= (max as number);

  function clamp(n: number): number {
    if (!hasCap) return n;
    return Math.min(n, max as number);
  }

  // Local string buffer so we can show "" without breaking controlled-ness.
  // While focused, the buffer is the source of truth for the displayed text;
  // while blurred, it mirrors the parent-supplied `count`.
  const [displayed, setDisplayed] = useState<string>(String(count));
  const focusedRef = useRef(false);

  // Sync from parent → buffer when not actively edited.
  useEffect(() => {
    if (!focusedRef.current) {
      setDisplayed(String(count));
    }
  }, [count]);

  function step(delta: number) {
    const next = count + delta;
    if (next < 0) return;
    onChange(clamp(next));
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    // Strip everything but digits — `number` inputs still emit `e` / `.` in
    // some browsers; normalise on the way in.
    const cleaned = e.target.value.replace(/[^\d]/g, "");
    setDisplayed(cleaned);
    onChange(clamp(sanitize(cleaned)));
  }

  function handleFocus() {
    focusedRef.current = true;
    // Tapping a "0" field on phones is annoying — clear it for the user.
    if (count === 0) {
      setDisplayed("");
    }
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    focusedRef.current = false;
    const cleaned = e.target.value.replace(/[^\d]/g, "");
    const next = clamp(sanitize(cleaned));
    setDisplayed(String(next));
    onChange(next);
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
          value={displayed}
          onChange={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-label={`₹${denom} note count`}
          className="h-9 w-14 border border-[var(--color-border-strong)] border-x-0 bg-[var(--color-bg)] px-1 text-center text-base font-mono tabular-nums shadow-none focus-visible:ring-0"
        />

        <button
          type="button"
          onClick={() => step(1)}
          disabled={atMax}
          aria-label={`Increase ₹${denom} count`}
          className={cn(
            "flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] transition-opacity active:opacity-80",
            atMax && "opacity-30",
          )}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="ml-auto flex flex-col items-end gap-0.5">
        <span className="font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
          ₹{subtotal.toLocaleString("en-IN")}
        </span>
        {hasCap && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {count} / {max}
          </span>
        )}
      </div>
    </div>
  );
}
