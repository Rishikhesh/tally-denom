import { describe, expect, test } from "bun:test";
import {
  denomInventory,
  type Fund,
  netBalance,
  routeTotals,
  sumCollected,
  sumFundDenoms,
  sumFunds,
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

const fund1: Fund = {
  amount: 2000,
  denoms: denoms({ 500: 4 }),
};
const fund2: Fund = {
  amount: 100,
  denoms: denoms({ 100: 1 }),
};

const vouchers = [voucherA, voucherB, voucherC];
const spends = [spend1, spend2];
const funds = [fund1, fund2];

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

describe("sumFunds()", () => {
  test("sums every fund amount", () => {
    expect(sumFunds(funds)).toBe(2100);
  });
  test("zero on empty", () => {
    expect(sumFunds([])).toBe(0);
  });
});

describe("sumFundDenoms()", () => {
  test("sums fund denoms across the list", () => {
    const d = sumFundDenoms(funds);
    expect(d[500]).toBe(4);
    expect(d[100]).toBe(1);
    expect(d[200]).toBe(0);
  });
  test("zero map on empty", () => {
    const d = sumFundDenoms([]);
    for (const k of [500, 200, 100, 50, 20, 10, 1] as const) {
      expect(d[k]).toBe(0);
    }
  });
});

describe("netBalance()", () => {
  test("collected + funds − spent", () => {
    expect(netBalance(vouchers, spends, funds)).toBe(1800 + 2100 - 250);
  });
  test("zero funds collapses to collected − spent", () => {
    expect(netBalance(vouchers, spends, [])).toBe(1800 - 250);
  });
  test("can go negative if spends exceed collections + funds", () => {
    const v: Voucher[] = [];
    const s: Spend[] = [{ amount: 100, denoms: denoms({ 100: 1 }) }];
    expect(netBalance(v, s, [])).toBe(-100);
  });
  test("funds alone produce a positive balance", () => {
    expect(netBalance([], [], funds)).toBe(2100);
  });
});

describe("denomInventory()", () => {
  test("collected + fund denoms minus spent denoms", () => {
    const inv = denomInventory(vouchers, spends, funds);
    // 500: 2 + 1 (vouchers) + 4 (funds) - 0 (spends) = 7
    expect(inv[500]).toBe(7);
    // 100: 0 + 0 + 3 (vouchers) + 1 (funds) - 2 (spends) = 2
    expect(inv[100]).toBe(2);
    // 50: 0 - 1 = -1
    expect(inv[50]).toBe(-1);
    // untouched denoms stay 0
    expect(inv[20]).toBe(0);
    expect(inv[1]).toBe(0);
  });
  test("empty funds matches voucher-minus-spend behaviour", () => {
    const inv = denomInventory(vouchers, spends, []);
    expect(inv[500]).toBe(3);
    expect(inv[100]).toBe(1);
    expect(inv[50]).toBe(-1);
  });
  test("surfaces negative inventory without clamping", () => {
    const v: Voucher[] = [];
    const s: Spend[] = [{ amount: 200, denoms: denoms({ 200: 1 }) }];
    const inv = denomInventory(v, s, []);
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
