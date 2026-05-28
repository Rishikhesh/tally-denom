import { create } from "zustand";

export type TabId = "home" | "entry" | "activity" | "analytics";

export interface NavEntry {
  /** Screen identifier — e.g. "route", "voucher-editor", "spend-editor". */
  name: string;
  params?: Record<string, unknown>;
}

interface NavState {
  tab: TabId;
  stack: NavEntry[];
  setTab: (tab: TabId) => void;
  go: (entry: NavEntry) => void;
  back: () => void;
  reset: () => void;
}

export const useNavStore = create<NavState>((set, get) => ({
  tab: "home",
  stack: [],

  setTab: (tab) => {
    set({ tab, stack: [] });
    if (typeof window !== "undefined") {
      window.history.replaceState({ navTab: tab }, "");
    }
  },

  go: (entry) => {
    const nextDepth = get().stack.length + 1;
    set((s) => ({ stack: [...s.stack, entry] }));
    if (typeof window !== "undefined") {
      window.history.pushState(
        { navTab: get().tab, navDepth: nextDepth },
        "",
      );
    }
  },

  /**
   * Pop one entry. Does NOT touch history — the popstate listener calls this
   * in reaction to a real history event so we mustn't push another.
   */
  back: () => {
    set((s) => (s.stack.length === 0 ? s : { stack: s.stack.slice(0, -1) }));
  },

  reset: () => {
    set({ stack: [] });
  },
}));

// ── popstate wiring ────────────────────────────────────────────────────
// Browser back / iOS edge-swipe / Android back all fire `popstate`. We pop
// one in-tab entry per event so the user can drill out the same way they
// drilled in. The flag prevents double-binding under HMR.
declare global {
  interface Window {
    __tallyNavPopstateBound?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__tallyNavPopstateBound) {
  window.__tallyNavPopstateBound = true;
  window.addEventListener("popstate", () => {
    useNavStore.getState().back();
  });
}
