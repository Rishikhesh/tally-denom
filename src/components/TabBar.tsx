import { Activity, BarChart3, Home, Plus } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { type TabId } from "@/hooks/useNavStore";
import { cn } from "@/lib/utils";

export type { TabId };

interface Props {
  active: TabId;
  onChange: (next: TabId) => void;
}

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const TABS: Array<{ id: TabId; label: string; Icon: IconCmp }> = [
  { id: "home", label: "Home", Icon: Home },
  { id: "entry", label: "Entry", Icon: Plus },
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "analytics", label: "Stats", Icon: BarChart3 },
];

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Primary navigation"
      className="absolute inset-x-0 z-40 flex border-t border-[var(--color-border-strong)] bg-[var(--color-bg)]"
      style={{
        bottom: "var(--tab-safe-bottom)",
        height: "var(--tab-bar-height)",
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
              isActive
                ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                : "bg-[var(--color-bg)] text-[var(--color-text)]",
            )}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
