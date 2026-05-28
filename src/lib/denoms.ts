// INR cash denominations the ledger tracks. ₹2000, ₹5 and ₹2 are intentionally
// excluded from the client-facing set. The wire format keeps D5/D2 for
// backwards compatibility with existing Firestore documents and the
// `denomsSumEq` rule that validates them server-side.
export const DENOMS = [500, 200, 100, 50, 20, 10, 1] as const;

export type Denom = (typeof DENOMS)[number];

/** Numeric-keyed denom map used everywhere in client code. */
export type DenomCounts = Record<Denom, number>;

/**
 * Firestore wire shape — Firestore rules cannot validate numeric map keys,
 * so we persist denom maps with `D<value>` keys. D5 / D2 stay in the wire
 * format so historic docs (and the `denomsSumEq` rule helper) keep working;
 * new client writes always set them to 0.
 */
export type DenomCountsWire = {
  D500: number;
  D200: number;
  D100: number;
  D50: number;
  D20: number;
  D10: number;
  D5: number;
  D2: number;
  D1: number;
};

export function emptyDenoms(): DenomCounts {
  return { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 1: 0 };
}

export function toWire(c: DenomCounts): DenomCountsWire {
  return {
    D500: c[500],
    D200: c[200],
    D100: c[100],
    D50: c[50],
    D20: c[20],
    D10: c[10],
    // ₹5 and ₹2 are no longer tracked client-side; always write 0 so the
    // rule's `denomsSumEq` helper continues to validate (D5*5 + D2*2 = 0).
    D5: 0,
    D2: 0,
    D1: c[1],
  };
}

export function fromWire(w: DenomCountsWire): DenomCounts {
  // D5 / D2 are intentionally ignored — even on documents written by older
  // clients with non-zero D5/D2, we don't surface those counts in the UI.
  return {
    500: w.D500,
    200: w.D200,
    100: w.D100,
    50: w.D50,
    20: w.D20,
    10: w.D10,
    1: w.D1,
  };
}

/** Money value represented by the denom counts: Σ denom × count. */
export function sumDenoms(c: DenomCounts): number {
  let total = 0;
  for (const d of DENOMS) total += d * c[d];
  return total;
}

/** Plain note/coin count: Σ count. */
export function totalNotes(c: DenomCounts): number {
  let total = 0;
  for (const d of DENOMS) total += c[d];
  return total;
}

/**
 * How much money is still unaccounted for relative to `target`.
 *   `0`  → counts match the target
 *   `>0` → the breakdown is short (more needed)
 *   `<0` → the breakdown overshoots
 */
export function reconcile(c: DenomCounts, target: number): number {
  return target - sumDenoms(c);
}

/** True iff every denom slot holds a non-negative safe integer. */
export function isValidCounts(c: DenomCounts): boolean {
  for (const d of DENOMS) {
    const v = c[d];
    if (typeof v !== "number") return false;
    if (!Number.isInteger(v)) return false;
    if (v < 0) return false;
  }
  return true;
}
