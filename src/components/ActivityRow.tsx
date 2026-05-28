import { ChevronRight, FileText, MapPin, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/date";
import type { ActivityType } from "@/lib/activity";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  amount: number | null;
  txDate: string | null;
  createdAt: number;
  meta?: Record<string, unknown>;
}

interface Props {
  activity: Activity;
  onTap?: () => void;
}

function renderIcon(type: ActivityType): ReactNode {
  if (type.startsWith("voucher.")) return <FileText size={16} />;
  if (type.startsWith("spend.")) return <Wallet size={16} />;
  return <MapPin size={16} />;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function relativeTime(createdAt: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - createdAt);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} d ago`;
  const d = new Date(createdAt);
  const weekday = d.toLocaleDateString("en", { weekday: "short" });
  const dayNum = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en", { month: "short" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${weekday} ${dayNum} ${month} ${hh}:${mm}`;
}

export function ActivityRow({ activity, onTap }: Props) {
  const tappable = typeof onTap === "function";

  const metaParts: string[] = [relativeTime(activity.createdAt)];
  if (activity.txDate) metaParts.push(formatDate(activity.txDate));
  if (activity.amount != null) metaParts.push(`₹${formatINR(activity.amount)}`);

  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]">
        {renderIcon(activity.type)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-[var(--color-text)]">
          {activity.title}
        </span>
        <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
          {metaParts.join(" · ")}
        </span>
      </div>
      {tappable && (
        <ChevronRight
          size={16}
          aria-hidden
          className="shrink-0 text-[var(--color-text-muted)]"
        />
      )}
    </>
  );

  if (tappable) {
    return (
      <button
        type="button"
        onClick={onTap}
        className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left active:bg-[var(--color-surface)]"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
      {content}
    </div>
  );
}
