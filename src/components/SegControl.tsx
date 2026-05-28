import { cn } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function SegControl({ options, value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex gap-0.5 border border-[var(--color-border)] bg-[var(--color-surface)] p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          className={cn(
            "flex-1 whitespace-nowrap px-2.5 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition-all",
            value === o.id &&
              "bg-[var(--color-accent)] text-[var(--color-accent-ink)]",
          )}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
