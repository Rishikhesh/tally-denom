import {
  ArrowLeftRight,
  ChevronRight,
  FileText,
  MapPin,
  PiggyBank,
  Scale,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatDate, formatTime } from "@/lib/date";
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
   * Optional context label appended to the title (e.g. route name for a
   * voucher activity, voucher code for a spend activity, ledger name for a
   * ledger-entry activity). Rendered muted, normal-weight.
   */
  contextLabel?: string;
}

function renderIcon(type: ActivityType): ReactNode {
  if (type.startsWith("voucher.")) return <FileText size={16} />;
  if (type.startsWith("spend.")) return <Wallet size={16} />;
  if (type.startsWith("fund.")) return <PiggyBank size={16} />;
  if (type.startsWith("ledger")) return <Scale size={16} />;
  if (type.startsWith("exchange.")) return <ArrowLeftRight size={16} />;
  return <MapPin size={16} />;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


export function ActivityRow({ activity, onTap, contextLabel }: Props) {
  // Delete activities point at a now-gone target — no chevron, no tap.
  const isDelete = activity.type.endsWith(".delete");
  const tappable = !isDelete && typeof onTap === "function";

  // Meta line: actual recorded time in IST 12hr + transaction date + amount.
  const metaParts: string[] = [formatTime(activity.createdAt)];
  if (activity.txDate) metaParts.push(formatDate(activity.txDate));
  if (activity.amount != null) metaParts.push(`₹${formatINR(activity.amount)}`);
  // Caller-supplied context (route name / voucher code / ledger name).
  const titleContextSuffix = contextLabel ? ` · ${contextLabel}` : "";

  const icon = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-text)]">
      {renderIcon(activity.type)}
    </div>
  );

  // Clean the title: drop redundant entity-type prefix (icon conveys it),
  // drop the inline ₹amount token (already in meta line), drop the trailing
  // action verb, and tidy stray separators. Leaves just the human-meaningful
  // entity name (note / title / code) — falls back to the entity type label
  // when stripping empties the string (e.g. plain `Exchange`).
  let t = activity.title;
  t = t.replace(/^(Spend|Inflow|Fund|Ledger|Exchange) /, "");
  t = t.replace(/^₹[\d,]+(?:\.\d+)?\s*/, "");
  t = t.replace(/^(in|out)\s+/i, "");
  t = t.replace(/^[–-]\s*/, "");
  t = t.replace(/ (created|edited|deleted|verified|unverified)$/i, "");
  t = t.trim();
  let cleanTitle = t;
  if (!cleanTitle) {
    if (activity.type.startsWith("exchange.")) cleanTitle = "Exchange";
    else if (activity.type.startsWith("spend.")) cleanTitle = "Spend";
    else if (activity.type.startsWith("fund.")) cleanTitle = "Inflow";
    else if (activity.type.startsWith("ledger")) cleanTitle = "Ledger";
    else cleanTitle = activity.title;
  }

  // Ledger-entry kind badge (IN / OUT) — surfaced as a chip so the icon's
  // identity is preserved without cluttering the title.
  const ledgerKind: "in" | "out" | null =
    activity.type.startsWith("ledger-entry.") &&
    typeof activity.meta?.kind === "string"
      ? (activity.meta.kind as string) === "out"
        ? "out"
        : "in"
      : null;

  // Type chip so each row states what it is (the note alone is ambiguous).
  const typeTag = activity.type.startsWith("spend.")
    ? "SPEND"
    : activity.type.startsWith("exchange.")
      ? "EXCHANGE"
      : null;

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={
            isDelete
              ? "min-w-0 truncate text-sm font-semibold text-[var(--color-text-muted)] line-through"
              : "min-w-0 truncate text-sm font-semibold text-[var(--color-text)]"
          }
        >
          {cleanTitle}
          {titleContextSuffix && (
            <span className="font-normal text-[var(--color-text-muted)]">
              {titleContextSuffix}
            </span>
          )}
        </span>
        {typeTag && (
          <span className="shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {typeTag}
          </span>
        )}
        {ledgerKind && (
          <span
            className={
              ledgerKind === "in"
                ? "shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-ink)]"
                : "shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text)]"
            }
          >
            {ledgerKind.toUpperCase()}
          </span>
        )}
        {isDelete && (
          <span className="shrink-0 border border-[var(--color-destructive)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-destructive)]">
            DELETED
          </span>
        )}
      </span>
      <span className="truncate font-mono text-xs tabular-nums text-[var(--color-text-muted)]">
        {metaParts.join(" · ")}
      </span>
    </div>
  );

  const trailing = tappable ? (
    <ChevronRight
      size={16}
      aria-hidden
      className="shrink-0 text-[var(--color-text-muted)]"
    />
  ) : null;

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
    </div>
  );
}
