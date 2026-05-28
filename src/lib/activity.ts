export type ActivityType =
  | "route.create"
  | "route.delete"
  | "voucher.create"
  | "voucher.edit"
  | "voucher.verify"
  | "voucher.unverify"
  | "voucher.delete"
  | "spend.create"
  | "spend.edit"
  | "spend.delete"
  | "fund.create"
  | "fund.edit"
  | "fund.delete"
  | "ledger.create"
  | "ledger.delete"
  | "ledger-entry.in"
  | "ledger-entry.out"
  | "ledger-entry.edit"
  | "ledger-entry.delete"
  | "exchange.create"
  | "exchange.delete";

export interface BuildActivityInput {
  type: ActivityType;
  refId: string;
  routeId?: string | null;
  title: string;
  amount?: number | null;
  txDate?: string | null;
  meta?: Record<string, unknown>;
}

export interface ActivityDoc {
  type: ActivityType;
  refId: string;
  routeId: string | null;
  title: string;
  amount: number | null;
  txDate: string | null;
  meta: Record<string, unknown>;
}

/**
 * Build the activity payload that the mutation batch helper will persist.
 *
 * `createdAt` is intentionally NOT set here — the caller adds it via
 * `serverTimestamp()` so the device clock can't lie.
 */
export function buildActivity(input: BuildActivityInput): ActivityDoc {
  return {
    type: input.type,
    refId: input.refId,
    routeId: input.routeId ?? null,
    title: input.title,
    amount: input.amount ?? null,
    txDate: input.txDate ?? null,
    meta: input.meta ?? {},
  };
}
