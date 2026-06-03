// Per-device operator name. Multiple people share one login (same email), so
// this is stored device-locally — never on the shared Firestore user doc —
// and stamped onto each write so you can see who created a record.
const STORAGE_KEY = "tally.operator";

export function getStoredOperatorName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function setStoredOperatorName(name: string): void {
  const trimmed = name.trim();
  try {
    if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore persistence failure */
  }
}

/** Name to stamp on writes. Falls back to a placeholder if unset. */
export function getOperatorName(): string {
  return getStoredOperatorName() ?? "Unknown";
}
