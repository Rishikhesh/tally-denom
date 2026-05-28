import { DENOMS, emptyDenoms, type DenomCounts } from "./denoms";

export interface Voucher {
  total: number;
  denoms: DenomCounts;
  verified: boolean;
  routeId: string;
}

export interface Spend {
  amount: number;
  denoms: DenomCounts;
}

export interface Fund {
  amount: number;
  denoms: DenomCounts;
}

/** Ledger entry as seen by the balance math — only `kind` + denoms matter. */
export interface LedgerEntry {
  kind: "in" | "out";
  amount: number;
  denoms: DenomCounts;
}

/** Exchange swaps `fromDenoms` for `toDenoms`. Net amount delta is 0 by rule. */
export interface Exchange {
  amount: number;
  fromDenoms: DenomCounts;
  toDenoms: DenomCounts;
}

export function sumVerified(vs: Voucher[]): number {
  let s = 0;
  for (const v of vs) if (v.verified) s += v.total;
  return s;
}

export function sumUnverified(vs: Voucher[]): number {
  let s = 0;
  for (const v of vs) if (!v.verified) s += v.total;
  return s;
}

export function sumCollected(vs: Voucher[]): number {
  let s = 0;
  for (const v of vs) s += v.total;
  return s;
}

export function sumSpends(ss: Spend[]): number {
  let s = 0;
  for (const x of ss) s += x.amount;
  return s;
}

export function sumFunds(fs: Fund[]): number {
  let s = 0;
  for (const f of fs) s += f.amount;
  return s;
}

/** Sum of all ledger-in entry amounts. */
export function sumLedgerIn(es: LedgerEntry[]): number {
  let s = 0;
  for (const e of es) if (e.kind === "in") s += e.amount;
  return s;
}

/** Sum of all ledger-out entry amounts. */
export function sumLedgerOut(es: LedgerEntry[]): number {
  let s = 0;
  for (const e of es) if (e.kind === "out") s += e.amount;
  return s;
}

/**
 * Net cash position
 *   = vouchers (verified + unverified) + funds + ledger.in
 *   − spends − ledger.out
 * Exchanges contribute 0 to the net balance (rule-enforced same-sum swap).
 */
export function netBalance(
  vs: Voucher[],
  ss: Spend[],
  fs: Fund[],
  es: LedgerEntry[] = [],
): number {
  return (
    sumCollected(vs) +
    sumFunds(fs) +
    sumLedgerIn(es) -
    sumSpends(ss) -
    sumLedgerOut(es)
  );
}

/** Sum denom counts across the supplied vouchers (verified or not). */
export function sumVoucherDenoms(vs: Voucher[]): DenomCounts {
  const out = emptyDenoms();
  for (const v of vs) {
    for (const d of DENOMS) out[d] += v.denoms[d];
  }
  return out;
}

/** Sum denom counts across the supplied spends. */
export function sumSpendDenoms(ss: Spend[]): DenomCounts {
  const out = emptyDenoms();
  for (const s of ss) {
    for (const d of DENOMS) out[d] += s.denoms[d];
  }
  return out;
}

/** Sum denom counts across the supplied funds. */
export function sumFundDenoms(fs: Fund[]): DenomCounts {
  const out = emptyDenoms();
  for (const f of fs) {
    for (const d of DENOMS) out[d] += f.denoms[d];
  }
  return out;
}

/** Signed ledger denom map: Σ(in.denoms) − Σ(out.denoms). May go negative. */
export function sumLedgerDenoms(es: LedgerEntry[]): DenomCounts {
  const out = emptyDenoms();
  for (const e of es) {
    const sign = e.kind === "in" ? 1 : -1;
    for (const d of DENOMS) out[d] += sign * e.denoms[d];
  }
  return out;
}

/** Net exchange denom delta: Σ(to) − Σ(from). Always net-zero on money. */
export function sumExchangeDenoms(xs: Exchange[]): DenomCounts {
  const out = emptyDenoms();
  for (const x of xs) {
    for (const d of DENOMS) {
      out[d] += x.toDenoms[d] - x.fromDenoms[d];
    }
  }
  return out;
}

/**
 * Total amount delta exchanges contribute to net balance. Always 0 because
 * each exchange is rule-checked to swap equal sums. Useful for test clarity.
 */
export function sumExchangeDelta(xs: Exchange[]): number {
  let s = 0;
  for (const x of xs) s += 0 * x.amount; // intentionally 0 (preserves shape)
  return s;
}

/**
 * Per-denom inventory:
 *   collected (vouchers) + funds + ledger.in
 *   − spends − ledger.out
 *   − Σ exchange.from + Σ exchange.to
 *
 * May be negative if writes outran inflows — UI surfaces the negative.
 */
export function denomInventory(
  vs: Voucher[],
  ss: Spend[],
  fs: Fund[],
  es: LedgerEntry[] = [],
  xs: Exchange[] = [],
): DenomCounts {
  const inv = emptyDenoms();
  for (const v of vs) {
    for (const d of DENOMS) inv[d] += v.denoms[d];
  }
  for (const f of fs) {
    for (const d of DENOMS) inv[d] += f.denoms[d];
  }
  for (const e of es) {
    const sign = e.kind === "in" ? 1 : -1;
    for (const d of DENOMS) inv[d] += sign * e.denoms[d];
  }
  for (const s of ss) {
    for (const d of DENOMS) inv[d] -= s.denoms[d];
  }
  for (const x of xs) {
    for (const d of DENOMS) inv[d] += x.toDenoms[d] - x.fromDenoms[d];
  }
  return inv;
}

/**
 * Totals filtered to a single route. `denoms` is the collected breakdown for
 * that route (verified + unverified). Spends + funds are global (not per
 * route) and intentionally not folded in here.
 */
export function routeTotals(
  vs: Voucher[],
  routeId: string,
): {
  verified: number;
  unverified: number;
  total: number;
  denoms: DenomCounts;
} {
  let verified = 0;
  let unverified = 0;
  const denoms = emptyDenoms();
  for (const v of vs) {
    if (v.routeId !== routeId) continue;
    if (v.verified) verified += v.total;
    else unverified += v.total;
    for (const d of DENOMS) denoms[d] += v.denoms[d];
  }
  return { verified, unverified, total: verified + unverified, denoms };
}
