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
  test("matches the INR ledger set (no ₹2000)", () => {
    expect([...DENOMS]).toEqual([500, 200, 100, 50, 20, 10, 5, 2, 1]);
  });
});

describe("emptyDenoms()", () => {
  test("returns zero for every denom", () => {
    const e = emptyDenoms();
    for (const d of DENOMS) expect(e[d]).toBe(0);
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
      5: 2, // 10
      2: 0,
      1: 7, // 7
    };
    expect(sumDenoms(c)).toBe(1627);
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
      5: 2,
      2: 0,
      1: 7,
    };
    expect(totalNotes(c)).toBe(21);
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
  test("round-trips through fromWire", () => {
    const c: DenomCounts = {
      500: 2,
      200: 0,
      100: 3,
      50: 4,
      20: 0,
      10: 1,
      5: 0,
      2: 6,
      1: 7,
    };
    const r = fromWire(toWire(c));
    expect(r).toEqual(c);
  });
  test("fromWire returns all 9 numeric keys", () => {
    const w = toWire(emptyDenoms());
    const r = fromWire(w);
    for (const d of DENOMS) expect(r[d]).toBe(0);
  });
});
