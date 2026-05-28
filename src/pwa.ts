import { registerSW } from "virtual:pwa-register";

export type PwaUpdateState = {
  needRefresh: boolean;
  offlineReady: boolean;
};

const listeners = new Set<(state: PwaUpdateState) => void>();
let state: PwaUpdateState = {
  needRefresh: false,
  offlineReady: false,
};
let updateRegistration: ServiceWorkerRegistration | undefined;
let updateCheckRunning = false;

function emit(next: Partial<PwaUpdateState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener(state);
}

export async function checkForPwaUpdate() {
  if (!updateRegistration || updateCheckRunning) return;
  updateCheckRunning = true;
  try {
    await updateRegistration.update();
  } catch (error) {
    console.warn("Service worker update check failed", error);
  } finally {
    updateCheckRunning = false;
  }
}

function installForegroundUpdateChecks() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window.addEventListener("focus", () => {
    void checkForPwaUpdate();
  });
  window.addEventListener("online", () => {
    void checkForPwaUpdate();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForPwaUpdate();
  });
}

export function subscribeToPwaUpdates(listener: (state: PwaUpdateState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissPwaUpdatePrompt() {
  emit({ needRefresh: false, offlineReady: false });
}

export const updateServiceWorker = registerSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    updateRegistration = registration;
    installForegroundUpdateChecks();
    void checkForPwaUpdate();
  },
  onNeedRefresh() {
    emit({ needRefresh: true });
  },
  onOfflineReady() {
    emit({ offlineReady: true });
  },
  onRegisterError(error) {
    console.error("Service worker registration failed", error);
  },
});
