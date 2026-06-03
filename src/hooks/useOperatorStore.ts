import { create } from "zustand";
import { getStoredOperatorName, setStoredOperatorName } from "@/lib/operator";

// Reactive view of the device-local operator name (see src/lib/operator.ts).
// The data layer reads the raw value via getOperatorName(); the UI uses this
// store so name changes re-render the gate + settings live.
interface OperatorState {
  name: string | null;
  setName: (name: string) => void;
}

export const useOperatorStore = create<OperatorState>((set) => ({
  name: getStoredOperatorName(),
  setName: (name) => {
    setStoredOperatorName(name);
    set({ name: name.trim() || null });
  },
}));
