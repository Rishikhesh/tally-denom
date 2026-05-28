import { describe, expect, test } from "bun:test";
import {
  DENOMS,
  emptyDenoms,
  fromWire,
  isValidCounts,
  reconcile,
  sumDenoms,
  toWire,
  totalNotes,
  type DenomCounts,
} from "../src/lib/denoms";

describe("DENOMS constant", () => {
  test("matches the active INR ledger set (no ₹2000 / ₹5 / ₹2)", () => {
    expect([...DENOMS]).toEqual([500, 200, 100, 50, 20, 10, 1]);
  });
  test("has exactly 7 entries", () => {
    expect(DENOMS.length).toBe(7);
  });
});

describe("emptyDenoms()", () => {
  test("returns zero for every denom", () => {
    const e = emptyDenoms();
    for (const d of DENOMS) expect(e[d]).toBe(0);
  });
  test("has 7 keys and no ₹5 or ₹2", () => {
    const e = emptyDenoms() as Record<string | number, number>;
    expect(Object.keys(e).length).toBe(7);
    expect(5 in e).toBe(false);
    expect(2 in e).toBe(false);
    expect("5" in e).toBe(false);
    expect("2" in e).toBe(false);
  });
  test("returns a fresh object each call", () => {
    const a = emptyDenoms();
    const b = emptyDenoms();
    a[500] = 9;
    expect(b[500]).toBe(0);
  });
});

describe("sumDenoms()", () => {
  test("zero on empty", () => {
    expect(sumDenoms(emptyDenoms())).toBe(0);
  });
  test("computes Σ denom × count", () => {
    const c: DenomCounts = {
      500: 2, // 1000
      200: 1, // 200
      100: 3, // 300
      50: 0,
      20: 5, // 100
      10: 1, // 10
      1: 7, // 7
    };
    expect(sumDenoms(c)).toBe(1617);
  });
});

describe("totalNotes()", () => {
  test("counts physical notes/coins", () => {
    const c: DenomCounts = {
      500: 2,
      200: 1,
      100: 3,
      50: 0,
      20: 5,
      10: 1,
      1: 7,
    };
    expect(totalNotes(c)).toBe(19);
  });
  test("zero on empty", () => {
    expect(totalNotes(emptyDenoms())).toBe(0);
  });
});

describe("reconcile()", () => {
  test("zero when counts match the target", () => {
    const c = emptyDenoms();
    c[500] = 2; // 1000
    expect(reconcile(c, 1000)).toBe(0);
  });
  test("positive when breakdown is short (undershoot)", () => {
    const c = emptyDenoms();
    c[500] = 1; // 500, target 1000
    expect(reconcile(c, 1000)).toBe(500);
  });
  test("negative when breakdown overshoots", () => {
    const c = emptyDenoms();
    c[500] = 3; // 1500
    expect(reconcile(c, 1000)).toBe(-500);
  });
});

describe("isValidCounts()", () => {
  test("accepts a clean zero map", () => {
    expect(isValidCounts(emptyDenoms())).toBe(true);
  });
  test("accepts a populated map of non-neg ints", () => {
    const c = emptyDenoms();
    c[500] = 2;
    c[10] = 7;
    expect(isValidCounts(c)).toBe(true);
  });
  test("rejects a negative count", () => {
    const c = emptyDenoms();
    c[100] = -1;
    expect(isValidCounts(c)).toBe(false);
  });
  test("rejects a float count", () => {
    const c = emptyDenoms();
    c[100] = 1.5;
    expect(isValidCounts(c)).toBe(false);
  });
  test("rejects NaN", () => {
    const c = emptyDenoms();
    c[100] = Number.NaN;
    expect(isValidCounts(c)).toBe(false);
  });
});

describe("toWire() / fromWire()", () => {
  test("toWire maps numeric keys to D-prefixed", () => {
    const c = emptyDenoms();
    c[500] = 2;
    c[1] = 7;
    const w = toWire(c);
    expect(w.D500).toBe(2);
    expect(w.D200).toBe(0);
    expect(w.D1).toBe(7);
  });
  test("toWire(emptyDenoms()) still ships D5 = 0 and D2 = 0", () => {
    const w = toWire(emptyDenoms());
    expect(w.D5).toBe(0);
    expect(w.D2).toBe(0);
  });
  test("toWire always emits D5 = 0 and D2 = 0 — they're not tracked client-side", () => {
    const c = emptyDenoms();
    c[500] = 1;
    c[100] = 3;
    const w = toWire(c);
    expect(w.D5).toBe(0);
    expect(w.D2).toBe(0);
  });
  test("round-trips through fromWire for the 7-denom set", () => {
    const c: DenomCounts = {
      500: 2,
      200: 0,
      100: 3,
      50: 4,
      20: 0,
      10: 1,
      1: 7,
    };
    const r = fromWire(toWire(c));
    expect(r).toEqual(c);
  });
  test("fromWire returns the 7 numeric keys", () => {
    const w = toWire(emptyDenoms());
    const r = fromWire(w);
    for (const d of DENOMS) expect(r[d]).toBe(0);
  });
  test("fromWire ignores stale D5 / D2 values from historic docs", () => {
    const w = {
      D500: 0,
      D200: 0,
      D100: 0,
      D50: 0,
      D20: 0,
      D10: 0,
      D5: 99,
      D2: 99,
      D1: 0,
    };
    const r = fromWire(w) as Record<string | number, number>;
    expect(5 in r).toBe(false);
    expect(2 in r).toBe(false);
    expect("5" in r).toBe(false);
    expect("2" in r).toBe(false);
    expect(Object.keys(r).length).toBe(7);
  });
});
