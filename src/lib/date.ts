// All persisted dates are `YYYY-MM-DD` strings (sortable, range-comparable).
// All displayed dates are `DD-MM-YYYY`. Conversions live here.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return false;
  }
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Build the date in UTC and confirm round-trip — rejects 31-04, 29-02 on
  // non-leap years, etc.
  const ts = Date.UTC(y, m - 1, d);
  const dt = new Date(ts);
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Today's date in the *local* timezone, in `YYYY-MM-DD` form. We deliberately
 * avoid `toISOString` because that returns UTC and would flip the day in IST
 * on early-morning entries.
 */
export function todayInputDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** `2026-05-28` → `28-05-2026`. Throws on shape or value violations. */
export function formatDate(yyyyMmDd: string): string {
  const m = ISO_RE.exec(yyyyMmDd);
  if (!m) {
    throw new Error(`formatDate: expected YYYY-MM-DD, got "${yyyyMmDd}"`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidYmd(y, mo, d)) {
    throw new Error(`formatDate: not a real date: "${yyyyMmDd}"`);
  }
  return `${pad2(d)}-${pad2(mo)}-${y}`;
}

/** `28-05-2026` → `2026-05-28`. Throws on shape or value violations. */
export function parseDisplayDate(ddMmYyyy: string): string {
  const m = DISPLAY_RE.exec(ddMmYyyy);
  if (!m) {
    throw new Error(
      `parseDisplayDate: expected DD-MM-YYYY, got "${ddMmYyyy}"`,
    );
  }
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!isValidYmd(y, mo, d)) {
    throw new Error(`parseDisplayDate: not a real date: "${ddMmYyyy}"`);
  }
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

/**
 * Add `n` calendar days (can be negative) to a `YYYY-MM-DD` string and
 * return the result in the same format. Math is done in UTC to avoid DST
 * jumps shifting the day.
 */
export function addDaysInput(yyyyMmDd: string, n: number): string {
  const m = ISO_RE.exec(yyyyMmDd);
  if (!m) {
    throw new Error(`addDaysInput: expected YYYY-MM-DD, got "${yyyyMmDd}"`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!isValidYmd(y, mo, d)) {
    throw new Error(`addDaysInput: not a real date: "${yyyyMmDd}"`);
  }
  const ts = Date.UTC(y, mo - 1, d) + n * 86_400_000;
  const dt = new Date(ts);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/**
 * Standard date-range presets, all inclusive of today, all returned as
 * `YYYY-MM-DD` strings ready for Firestore `>=` / `<=` filters.
 */
export function dateRangePresets(): {
  today: { from: string; to: string };
  yesterday: { from: string; to: string };
  last7: { from: string; to: string };
  last30: { from: string; to: string };
} {
  const today = todayInputDate();
  const yesterday = addDaysInput(today, -1);
  return {
    today: { from: today, to: today },
    yesterday: { from: yesterday, to: yesterday },
    last7: { from: addDaysInput(today, -6), to: today },
    last30: { from: addDaysInput(today, -29), to: today },
  };
}

const IST_TZ = "Asia/Kolkata";

/**
 * Format an epoch-millis timestamp as IST 12-hour clock, e.g. `02:35 PM`.
 * Used wherever we surface a recorded time (CRUD createdAt / updatedAt).
 */
export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

/**
 * Format an epoch-millis timestamp as `DD-MM-YYYY 02:35 PM` in IST.
 */
export function formatDateTime(ms: number): string {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(ms))
    .replace(/\//g, "-");
  return `${datePart} ${formatTime(ms)}`;
}
