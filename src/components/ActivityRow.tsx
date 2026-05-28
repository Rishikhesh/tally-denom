import { ChevronRight, FileText, MapPin, Wallet } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
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
  /**
   * When set on a `voucher.create` row, surfaces a `[ VERIFY ]` CTA in place
   * of the chevron and annotates the title with an `(UNVERIFIED)` hint.
   */
  unverified?: boolean;
  onVerify?: () => void;
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

export function ActivityRow({
  activity,
  onTap,
  unverified,
  onVerify,
}: Props) {
  const tappable = typeof onTap === "function";
  const isVoucherCreate = activity.type === "voucher.create";
  const showVerifyCta = isVoucherCreate && unverified === true && !!onVerify;
  const showUnverifiedBadge = isVoucherCreate && unverified === true;

  const metaParts: string[] = [relativeTime(activity.createdAt)];
  if (activity.txDate) metaParts.push(formatDate(activity.txDate));
  if (activity.amount != null) metaParts.push(`₹${formatINR(activity.amount)}`);

  function handleVerifyClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (onVerify) onVerify();
  }

  const icon = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]">
      {renderIcon(activity.type)}
    </div>
  );

  // Strip the trailing action verb so the title reads as the entity, not
  // "VCH #X created". The icon already conveys the action.
  const cleanTitle = activity.title.replace(
    / (created|edited|deleted|verified|unverified)$/i,
    "",
  );

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">
          {cleanTitle}
        </span>
        {showUnverifiedBadge && (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            (UNVERIFIED)
          </span>
        )}
      </span>
      <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
        {metaParts.join(" · ")}
      </span>
    </div>
  );

  const trailing = showVerifyCta ? (
    <button
      type="button"
      onClick={handleVerifyClick}
      aria-label="Verify voucher"
      className="shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-ink)] active:opacity-80"
    >
      [ VERIFY ]
    </button>
  ) : tappable ? (
    <ChevronRight
      size={16}
      aria-hidden
      className="shrink-0 text-[var(--color-text-muted)]"
    />
  ) : null;

  // When the row has a verify CTA, we can't wrap the whole row in a <button>
  // (nested interactive elements are invalid). Render a div, hang the tap
  // handler on the body, and let the inline verify CTA stop propagation.
  if (tappable && showVerifyCta) {
    return (
      <div className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
        {icon}
        <button
          type="button"
          onClick={onTap}
          className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
        >
          {body}
        </button>
        {trailing}
      </div>
    );
  }

  if (tappable) {
    return (
      <button
        type="button"
        onClick={onTap}
        className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-left active:bg-[var(--color-surface)]"
      >
        {icon}
        {body}
        {trailing}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
      {icon}
      {body}
      {trailing}
    </div>
  );
}
