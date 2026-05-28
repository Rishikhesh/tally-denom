/* Date helpers (todayInputDate, inputDateFromDate, dateFromInput, addDays)
 * are co-located with the component because callers import them as a unit
 * via the components barrel; this is the public contract preserved from
 * the zap port. */
/* eslint-disable react-refresh/only-export-components */
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";

export function todayInputDate() {
  return inputDateFromDate(new Date());
}

export function inputDateFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function isFutureInputDate(value: string) {
  return value > todayInputDate();
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function DatePickerSheet({
  value,
  onChange,
  onClose,
  minDate,
  allowFuture = false,
  quickPicks: quickPicksProp,
  eyebrow = "Date",
  title = "When was it?",
}: {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  minDate?: string;
  /** When true, allow selecting dates after today and navigating forward. */
  allowFuture?: boolean;
  /** Override default chip shortcuts above the calendar. */
  quickPicks?: Array<{ label: string; value: string }>;
  eyebrow?: string;
  title?: string;
}) {
  const selectedDate = dateFromInput(value || todayInputDate());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const today = todayInputDate();
  const todayDate = dateFromInput(today);
  const currentMonthStart = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    1,
  );
  const quickPicks =
    quickPicksProp ??
    (allowFuture
      ? [
          { label: "Today", value: today },
          { label: "Tomorrow", value: inputDateFromDate(addDays(new Date(), 1)) },
          { label: "Next week", value: inputDateFromDate(addDays(new Date(), 7)) },
        ]
      : [
          { label: "Today", value: today },
          { label: "Yesterday", value: inputDateFromDate(addDays(new Date(), -1)) },
        ]);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const nextMonthDisabled = allowFuture
    ? false
    : visibleMonth >= currentMonthStart;

  function moveMonth(delta: number) {
    setVisibleMonth(new Date(year, month + delta, 1));
  }

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex items-start justify-between px-6 pb-2 pt-4">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <div className="font-display mt-1 text-2xl">{title}</div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-2">
        {quickPicks.map((pick) => (
          <button
            key={pick.label}
            onClick={() => onChange(pick.value)}
            className={cn(
              "flex-shrink-0 border px-4 py-2 text-[13px] font-bold transition-colors",
              value === pick.value
                ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
            )}
          >
            {pick.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">
        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pb-3 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              className="flex h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] transition-colors active:bg-[var(--color-surface)]"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-extrabold text-[var(--color-text)]">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => {
                if (nextMonthDisabled) return;
                moveMonth(1);
              }}
              disabled={nextMonthDisabled}
              aria-label="Next month"
              className="flex h-10 w-10 items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] transition-colors active:bg-[var(--color-surface)] disabled:opacity-35"
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
              if (!day)
                return (
                  <div key={`lead-${index}`} className="aspect-square" />
                );

              const dateValue = inputDateFromDate(new Date(year, month, day));
              const selected = dateValue === value;
              const isToday = dateValue === today;
              const futureDate = !allowFuture && isFutureInputDate(dateValue);
              const beforeMinDate = minDate ? dateValue < minDate : false;

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={futureDate || beforeMinDate}
                  onClick={() => {
                    if (futureDate || beforeMinDate) return;
                    onChange(dateValue);
                  }}
                  className={cn(
                    "aspect-square border text-sm font-bold transition-[background-color,border-color,transform] active:scale-95 disabled:opacity-30",
                    selected
                      ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : isToday
                        ? "border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]"
                        : "border-transparent bg-[var(--color-bg)] text-[var(--color-text)] active:bg-[var(--color-surface)]",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
