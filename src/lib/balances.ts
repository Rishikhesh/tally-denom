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

export function netBalance(vs: Voucher[], ss: Spend[]): number {
  return sumCollected(vs) - sumSpends(ss);
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

/**
 * Per-denom inventory: collected (across all vouchers, verified or not) minus
 * what's been spent. May be negative if spends were entered against denoms
 * that weren't collected — the UI surfaces that, this helper doesn't clamp.
 */
export function denomInventory(vs: Voucher[], ss: Spend[]): DenomCounts {
  const inv = emptyDenoms();
  for (const v of vs) {
    for (const d of DENOMS) inv[d] += v.denoms[d];
  }
  for (const s of ss) {
    for (const d of DENOMS) inv[d] -= s.denoms[d];
  }
  return inv;
}

/**
 * Totals filtered to a single route. `denoms` is the collected breakdown for
 * that route (verified + unverified). Spends are global (not per route) and
 * intentionally not subtracted here.
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
