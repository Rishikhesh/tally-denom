import { create } from "zustand";

export type TabId = "home" | "entry" | "ledger" | "records";

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
  /** Pop in reaction to a real browser-back / popstate. Don't call directly
   *  from UI — use `goBack()` instead so browser history stays in sync. */
  back: () => void;
  /** UI entry-point for an in-app back action (e.g. header chevron). Pops the
   *  store stack AND rewinds the browser one step, suppressing the popstate
   *  handler so we don't double-pop. */
  goBack: () => void;
  reset: () => void;
}

// Module-private flag toggled by `goBack` so the popstate handler can skip
// its store-pop on the matching history event.
let skipNextPopstate = false;

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

  back: () => {
    set((s) => (s.stack.length === 0 ? s : { stack: s.stack.slice(0, -1) }));
  },

  goBack: () => {
    const len = get().stack.length;
    if (len > 0) {
      skipNextPopstate = true;
      set((s) => ({ stack: s.stack.slice(0, -1) }));
    }
    if (typeof window !== "undefined") window.history.back();
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
    if (skipNextPopstate) {
      skipNextPopstate = false;
      return;
    }
    useNavStore.getState().back();
  });
}
