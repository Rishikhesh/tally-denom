import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { addDaysInput, dateRangePresets, formatDate, todayInputDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";

interface RangeValue {
  from?: string;
  to?: string;
}

interface Props {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
  onClose: () => void;
}

type Editing = "presets" | "from" | "to";

function inputDateFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

interface CalendarProps {
  value?: string;
  /** Inclusive lower bound — for the "to" picker. */
  minDate?: string;
  /** Inclusive upper bound — for the "from" picker. */
  maxDate?: string;
  onPick: (next: string) => void;
}

function Calendar({ value, minDate, maxDate, onPick }: CalendarProps) {
  const initial = value ? dateFromInput(value) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1),
  );

  const today = todayInputDate();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const cells = Array.from(
    { length: leadingBlanks + daysInMonth },
    (_, index) => (index < leadingBlanks ? null : index - leadingBlanks + 1),
  );
  const monthLabel = visibleMonth.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function moveMonth(delta: number) {
    setVisibleMonth(new Date(year, month + delta, 1));
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-3 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-extrabold text-[var(--color-text)]">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-0.5">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <div key={`lead-${index}`} className="aspect-square" />;

          const dateValue = inputDateFromDate(new Date(year, month, day));
          const selected = dateValue === value;
          const isToday = dateValue === today;
          const beforeMin = minDate ? dateValue < minDate : false;
          const afterMax = maxDate ? dateValue > maxDate : false;
          const disabled = beforeMin || afterMax;

          return (
            <button
              key={dateValue}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onPick(dateValue);
              }}
              className={cn(
                "aspect-square border text-sm font-bold disabled:opacity-30",
                selected
                  ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : isToday
                    ? "border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
                    : "border-transparent bg-[var(--color-bg)] text-[var(--color-text)]",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangeSheet({ value, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<RangeValue>(value);
  const [editing, setEditing] = useState<Editing>("presets");

  const presets = useMemo(() => dateRangePresets(), []);

  const presetChips: Array<{ label: string; from: string; to: string }> = [
    { label: "Today", from: presets.today.from, to: presets.today.to },
    {
      label: "Yesterday",
      from: presets.yesterday.from,
      to: presets.yesterday.to,
    },
    { label: "7d", from: presets.last7.from, to: presets.last7.to },
    { label: "30d", from: presets.last30.from, to: presets.last30.to },
  ];

  function activePreset(): string | null {
    if (!draft.from || !draft.to) return null;
    for (const p of presetChips) {
      if (p.from === draft.from && p.to === draft.to) return p.label;
    }
    return null;
  }

  function applyPreset(p: { from: string; to: string }) {
    setDraft({ from: p.from, to: p.to });
  }

  function pickFrom(next: string) {
    let nextTo = draft.to;
    if (nextTo && nextTo < next) {
      // Clamp `to` forward so from <= to.
      nextTo = next;
    }
    setDraft({ from: next, to: nextTo });
    setEditing("presets");
  }

  function pickTo(next: string) {
    let nextFrom = draft.from;
    if (nextFrom && nextFrom > next) {
      nextFrom = next;
    }
    setDraft({ from: nextFrom, to: next });
    setEditing("presets");
  }

  const canApply =
    !draft.from || !draft.to || (draft.from && draft.to && draft.from <= draft.to);

  function apply() {
    if (!canApply) return;
    onChange(draft);
    onClose();
  }

  const activeChip = activePreset();

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex items-start justify-between px-5 pb-2 pt-4">
        <div>
          <div className="eyebrow">Range</div>
          <div className="font-display mt-1 text-2xl">Pick dates</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEditing(editing === "from" ? "presets" : "from")}
            className={cn(
              "flex flex-col items-start gap-1 border px-3 py-2 text-left",
              editing === "from"
                ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]",
            )}
          >
            <span
              className={cn(
                "eyebrow",
                editing === "from" && "text-[var(--color-accent-ink)]",
              )}
            >
              FROM
            </span>
            <span className="font-mono text-sm tabular-nums">
              {draft.from ? formatDate(draft.from) : "—"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEditing(editing === "to" ? "presets" : "to")}
            className={cn(
              "flex flex-col items-start gap-1 border px-3 py-2 text-left",
              editing === "to"
                ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]",
            )}
          >
            <span
              className={cn(
                "eyebrow",
                editing === "to" && "text-[var(--color-accent-ink)]",
              )}
            >
              TO
            </span>
            <span className="font-mono text-sm tabular-nums">
              {draft.to ? formatDate(draft.to) : "—"}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {presetChips.map((p) => {
            const active = activeChip === p.label;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  "border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]",
                  active
                    ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                    : "border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]",
                )}
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setDraft({})}
            className="border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-2 pt-3">
        {editing === "from" && (
          <Calendar
            value={draft.from}
            maxDate={draft.to}
            onPick={pickFrom}
          />
        )}
        {editing === "to" && (
          <Calendar
            value={draft.to}
            minDate={draft.from}
            onPick={pickTo}
          />
        )}
        {editing === "presets" && (
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-xs text-[var(--color-text-muted)]">
            Tap <span className="font-bold">FROM</span> or{" "}
            <span className="font-bold">TO</span> above to change a date, or
            choose a preset. Today is{" "}
            <span className="font-mono tabular-nums text-[var(--color-text)]">
              {formatDate(todayInputDate())}
            </span>
            . 7d covers{" "}
            <span className="font-mono tabular-nums text-[var(--color-text)]">
              {formatDate(addDaysInput(todayInputDate(), -6))}
            </span>{" "}
            → today.
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-border-strong)] px-5 py-3">
        <button
          type="button"
          onClick={apply}
          disabled={!canApply}
          className="h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-accent)] text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-accent-ink)] disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </BottomSheet>
  );
}
