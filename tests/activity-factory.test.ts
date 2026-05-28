import { describe, expect, test } from "bun:test";
import { buildActivity, type ActivityType } from "../src/lib/activity";

describe("buildActivity()", () => {
  test("returns the expected shape for a voucher.create event", () => {
    const out = buildActivity({
      type: "voucher.create",
      refId: "vch_1",
      routeId: "rt_1",
      title: "VCH #A123 created",
      amount: 1000,
      txDate: "2026-05-28",
      meta: { code: "A123" },
    });
    expect(out).toEqual({
      type: "voucher.create",
      refId: "vch_1",
      routeId: "rt_1",
      title: "VCH #A123 created",
      amount: 1000,
      txDate: "2026-05-28",
      meta: { code: "A123" },
    });
  });

  test("defaults routeId / amount / txDate / meta to null / {}", () => {
    const out = buildActivity({
      type: "route.create",
      refId: "rt_1",
      title: "Route Anna Nagar created",
    });
    expect(out.type).toBe("route.create");
    expect(out.refId).toBe("rt_1");
    expect(out.routeId).toBeNull();
    expect(out.amount).toBeNull();
    expect(out.txDate).toBeNull();
    expect(out.meta).toEqual({});
  });

  test("preserves the activity type verbatim across every variant", () => {
    const types: ActivityType[] = [
      "route.create",
      "route.delete",
      "voucher.create",
      "voucher.edit",
      "voucher.verify",
      "voucher.unverify",
      "voucher.delete",
      "spend.create",
      "spend.edit",
      "spend.delete",
    ];
    for (const t of types) {
      const out = buildActivity({ type: t, refId: "x", title: "y" });
      expect(out.type).toBe(t);
    }
  });

  test("does not attach createdAt — that is the caller's job via serverTimestamp()", () => {
    const out = buildActivity({
      type: "spend.create",
      refId: "sp_1",
      title: "Spend ₹450",
      amount: 450,
      txDate: "2026-05-28",
    });
    expect("createdAt" in out).toBe(false);
  });

  test("explicit null routeId/txDate is honoured", () => {
    const out = buildActivity({
      type: "spend.create",
      refId: "sp_1",
      title: "Spend ₹450",
      routeId: null,
      txDate: null,
      amount: 450,
    });
    expect(out.routeId).toBeNull();
    expect(out.txDate).toBeNull();
    expect(out.amount).toBe(450);
  });
});
