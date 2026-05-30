export type VerifyStatus = "tallied" | "excess" | "shortage";

/**
 * Reconciliation status of a verified voucher: the counted amount entered at
 * verification vs the voucher's collected total. Returns `null` when no
 * counted amount was recorded.
 */
export function verifyStatusOf(
  verifyAmount: number | null | undefined,
  total: number,
): VerifyStatus | null {
  if (verifyAmount == null) return null;
  const diff = verifyAmount - total;
  if (diff === 0) return "tallied";
  if (diff > 0) return "excess";
  return "shortage";
}

/** Signed difference (counted − collected), or `null` when not recorded. */
export function verifyDiffOf(
  verifyAmount: number | null | undefined,
  total: number,
): number | null {
  if (verifyAmount == null) return null;
  return verifyAmount - total;
}

/**
 * Human label for a reconciliation diff. `fmt` formats the rupee magnitude.
 * e.g. "Tallied", "Excess ₹50.00", "Shortage ₹20.00".
 */
export function verifyLabel(
  diff: number,
  fmt: (n: number) => string,
): string {
  if (diff === 0) return "Tallied";
  if (diff > 0) return `Excess ₹${fmt(diff)}`;
  return `Shortage ₹${fmt(Math.abs(diff))}`;
}

/** Display tone for a reconciliation status: tallied = neutral, excess =
 *  success (green), shortage = destructive (red). */
export function verifyTone(
  status: VerifyStatus | null,
): "neutral" | "success" | "destructive" {
  if (status === "excess") return "success";
  if (status === "shortage") return "destructive";
  return "neutral";
}

/** Number shown for a voucher — the real number takes precedence over the
 *  auto-generated dummy ref. */
export function voucherDisplayCode(v: {
  code: string;
  actualCode?: string | null;
}): string {
  return v.actualCode ?? v.code;
}

/**
 * Auto dummy ref assigned at voucher creation, prefixed with a short 2–3
 * letter route slug so vouchers stay easy to scan. e.g. "KOD-7F3A".
 */
export function genVoucherRef(routeName: string): string {
  const letters = routeName.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const slug = (letters.slice(0, 3) || "VCH").padEnd(2, "X");
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `${slug}-${suffix}`;
}
