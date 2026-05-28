import { describe, expect, test } from "bun:test";
import {
  denomInventory,
  netBalance,
  routeTotals,
  sumCollected,
  sumSpends,
  sumUnverified,
  sumVerified,
  type Spend,
  type Voucher,
} from "../src/lib/balances";
import { emptyDenoms, type DenomCounts } from "../src/lib/denoms";

function denoms(partial: Partial<DenomCounts>): DenomCounts {
  return { ...emptyDenoms(), ...partial };
}

// Shared fixture --------------------------------------------------------------

const voucherA: Voucher = {
  routeId: "r1",
  total: 1000,
  verified: true,
  denoms: denoms({ 500: 2 }),
};
const voucherB: Voucher = {
  routeId: "r1",
  total: 500,
  verified: false,
  denoms: denoms({ 500: 1 }),
};
const voucherC: Voucher = {
  routeId: "r2",
  total: 300,
  verified: true,
  denoms: denoms({ 100: 3 }),
};

const spend1: Spend = {
  amount: 200,
  denoms: denoms({ 100: 2 }),
};
const spend2: Spend = {
  amount: 50,
  denoms: denoms({ 50: 1 }),
};

const vouchers = [voucherA, voucherB, voucherC];
const spends = [spend1, spend2];

// -----------------------------------------------------------------------------

describe("sumVerified()", () => {
  test("sums only verified vouchers", () => {
    expect(sumVerified(vouchers)).toBe(1000 + 300);
  });
  test("zero on empty", () => {
    expect(sumVerified([])).toBe(0);
  });
});

describe("sumUnverified()", () => {
  test("sums only unverified vouchers", () => {
    expect(sumUnverified(vouchers)).toBe(500);
  });
});

describe("sumCollected()", () => {
  test("sums all vouchers regardless of verified flag", () => {
    expect(sumCollected(vouchers)).toBe(1800);
  });
});

describe("sumSpends()", () => {
  test("sums every spend amount", () => {
    expect(sumSpends(spends)).toBe(250);
  });
  test("zero on empty", () => {
    expect(sumSpends([])).toBe(0);
  });
});

describe("netBalance()", () => {
  test("collected minus spent", () => {
    expect(netBalance(vouchers, spends)).toBe(1800 - 250);
  });
  test("can go negative if spends exceed collections", () => {
    const v: Voucher[] = [];
    const s: Spend[] = [{ amount: 100, denoms: denoms({ 100: 1 }) }];
    expect(netBalance(v, s)).toBe(-100);
  });
});

describe("denomInventory()", () => {
  test("collected denoms minus spent denoms", () => {
    const inv = denomInventory(vouchers, spends);
    // 500: 2 + 1 (vouchers) - 0 (spends) = 3
    expect(inv[500]).toBe(3);
    // 100: 0 + 0 + 3 - 2 = 1
    expect(inv[100]).toBe(1);
    // 50: 0 - 1 = -1
    expect(inv[50]).toBe(-1);
    // untouched denoms stay 0
    expect(inv[20]).toBe(0);
    expect(inv[1]).toBe(0);
  });
  test("surfaces negative inventory without clamping", () => {
    const v: Voucher[] = [];
    const s: Spend[] = [{ amount: 200, denoms: denoms({ 200: 1 }) }];
    const inv = denomInventory(v, s);
    expect(inv[200]).toBe(-1);
  });
});

describe("routeTotals()", () => {
  test("limits sums and denoms to the given route", () => {
    const r1 = routeTotals(vouchers, "r1");
    expect(r1.verified).toBe(1000);
    expect(r1.unverified).toBe(500);
    expect(r1.total).toBe(1500);
    expect(r1.denoms[500]).toBe(3); // 2 + 1
    expect(r1.denoms[100]).toBe(0); // none on r1
  });
  test("isolates other routes", () => {
    const r2 = routeTotals(vouchers, "r2");
    expect(r2.verified).toBe(300);
    expect(r2.unverified).toBe(0);
    expect(r2.total).toBe(300);
    expect(r2.denoms[100]).toBe(3);
    expect(r2.denoms[500]).toBe(0);
  });
  test("unknown route returns zero everywhere", () => {
    const rZ = routeTotals(vouchers, "no-such-route");
    expect(rZ.verified).toBe(0);
    expect(rZ.unverified).toBe(0);
    expect(rZ.total).toBe(0);
    expect(rZ.denoms[500]).toBe(0);
  });
});
