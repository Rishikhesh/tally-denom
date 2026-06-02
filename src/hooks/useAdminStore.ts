import { create } from "zustand";

// Admin mode unlocks the Home / Ledger / Records tabs and the voucher
// verify / unverify actions. The Entry tab is the only user-facing surface.
const ADMIN_PASSWORD = "admin-thiru-open";
const STORAGE_KEY = "tally.admin";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface AdminState {
  isAdmin: boolean;
  /** Returns true if the password matched and admin mode was enabled. */
  enable: (password: string) => boolean;
  disable: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdmin: readInitial(),
  enable: (password) => {
    if (password.trim() !== ADMIN_PASSWORD) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore persistence failure */
    }
    set({ isAdmin: true });
    return true;
  },
  disable: () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore persistence failure */
    }
    set({ isAdmin: false });
  },
}));
