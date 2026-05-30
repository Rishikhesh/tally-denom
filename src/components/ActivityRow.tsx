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
import { cn } from "@/lib/utils";
import { verifyStatusOf, verifyTone } from "@/lib/voucher";

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
  /**
   * Override the title entirely — used when the activity's stored title froze
   * a value that has since changed (e.g. a voucher's dummy ref → real number).
   */
  titleOverride?: string;
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


export function ActivityRow({
  activity,
  onTap,
  contextLabel,
  titleOverride,
}: Props) {
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
  let t = titleOverride ?? activity.title;
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
  let typeTag: string | null = null;
  if (activity.type.startsWith("spend.")) typeTag = "SPEND";
  else if (activity.type.startsWith("exchange.")) typeTag = "EXCHANGE";

  // Action chip — distinguishes same-entity rows (create vs verify vs edit)
  // that otherwise look identical.
  let actionTag: string | null = null;
  if (activity.type === "voucher.create") actionTag = "NEW";
  else if (activity.type === "voucher.verify") actionTag = "VERIFIED";
  else if (activity.type === "voucher.edit") actionTag = "EDITED";
  else if (activity.type === "ledger-entry.edit") actionTag = "EDITED";

  // Verify rows carry the reconciliation result in meta.
  const verifyStatus =
    activity.type === "voucher.verify"
      ? verifyStatusOf(
          typeof activity.meta?.verifyAmount === "number"
            ? (activity.meta.verifyAmount as number)
            : null,
          typeof activity.meta?.voucherTotal === "number"
            ? (activity.meta.voucherTotal as number)
            : 0,
        )
      : null;
  const verifyToneVal = verifyTone(verifyStatus);

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
        {actionTag && (
          <span className="shrink-0 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {actionTag}
          </span>
        )}
        {verifyStatus && (
          <span
            className={cn(
              "shrink-0 border bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em]",
              verifyToneVal === "success" &&
                "border-[var(--color-success)] text-[var(--color-success)]",
              verifyToneVal === "destructive" &&
                "border-[var(--color-destructive)] text-[var(--color-destructive)]",
              verifyToneVal === "neutral" &&
                "border-[var(--color-border-strong)] text-[var(--color-text-muted)]",
            )}
          >
            {verifyStatus}
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
