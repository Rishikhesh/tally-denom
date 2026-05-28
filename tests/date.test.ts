import { describe, expect, test } from "bun:test";
import {
  addDaysInput,
  dateRangePresets,
  formatDate,
  parseDisplayDate,
  todayInputDate,
} from "../src/lib/date";

describe("todayInputDate()", () => {
  test("returns a YYYY-MM-DD string", () => {
    const s = todayInputDate();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test("agrees with the local date", () => {
    const s = todayInputDate();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(s).toBe(expected);
  });
});

describe("formatDate()", () => {
  test("converts ISO to display", () => {
    expect(formatDate("2026-05-28")).toBe("28-05-2026");
  });
  test("pads single-digit days/months", () => {
    expect(formatDate("2026-01-09")).toBe("09-01-2026");
  });
  test("throws on wrong shape", () => {
    expect(() => formatDate("28-05-2026")).toThrow();
    expect(() => formatDate("2026/05/28")).toThrow();
    expect(() => formatDate("")).toThrow();
  });
  test("throws on impossible date", () => {
    expect(() => formatDate("2026-02-30")).toThrow();
    expect(() => formatDate("2026-13-01")).toThrow();
  });
});

describe("parseDisplayDate()", () => {
  test("converts display to ISO", () => {
    expect(parseDisplayDate("28-05-2026")).toBe("2026-05-28");
  });
  test("round-trips through formatDate", () => {
    const iso = "2024-02-29"; // leap day, valid
    expect(parseDisplayDate(formatDate(iso))).toBe(iso);
  });
  test("throws on bad shape", () => {
    expect(() => parseDisplayDate("2026-05-28")).toThrow();
    expect(() => parseDisplayDate("28/05/2026")).toThrow();
  });
  test("throws on impossible date 99-13-2026", () => {
    expect(() => parseDisplayDate("99-13-2026")).toThrow();
  });
  test("throws on Feb 29 of a non-leap year", () => {
    expect(() => parseDisplayDate("29-02-2023")).toThrow();
  });
});

describe("addDaysInput()", () => {
  test("adds positive days", () => {
    expect(addDaysInput("2026-05-28", 3)).toBe("2026-05-31");
  });
  test("adds negative days (subtraction)", () => {
    expect(addDaysInput("2026-05-01", -1)).toBe("2026-04-30");
  });
  test("crosses month / year boundaries", () => {
    expect(addDaysInput("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysInput("2026-01-01", -1)).toBe("2025-12-31");
  });
  test("zero is identity", () => {
    expect(addDaysInput("2026-05-28", 0)).toBe("2026-05-28");
  });
});

describe("dateRangePresets()", () => {
  test("today range is from === to === today", () => {
    const t = todayInputDate();
    const p = dateRangePresets();
    expect(p.today.from).toBe(t);
    expect(p.today.to).toBe(t);
  });
  test("yesterday range is single-day, one day before today", () => {
    const t = todayInputDate();
    const yest = addDaysInput(t, -1);
    const p = dateRangePresets();
    expect(p.yesterday.from).toBe(yest);
    expect(p.yesterday.to).toBe(yest);
  });
  test("last7 spans 7 calendar days inclusive of today", () => {
    const t = todayInputDate();
    const p = dateRangePresets();
    expect(p.last7.to).toBe(t);
    expect(p.last7.from).toBe(addDaysInput(t, -6));
  });
  test("last30 spans 30 calendar days inclusive of today", () => {
    const t = todayInputDate();
    const p = dateRangePresets();
    expect(p.last30.to).toBe(t);
    expect(p.last30.from).toBe(addDaysInput(t, -29));
  });
});
