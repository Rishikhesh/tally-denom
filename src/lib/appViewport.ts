// Keeps CSS viewport vars in sync with the visual viewport so the phone-canvas
// shell stays correct across mobile browser chrome and on-screen keyboards.
// Ported from zap.

const APP_VIEWPORT_HEIGHT = "--app-viewport-height";
const APP_LAYOUT_VIEWPORT_HEIGHT = "--app-layout-viewport-height";
const APP_BOTTOM_OCCLUSION = "--app-bottom-occlusion";
const KEYBOARD_SHRINK_THRESHOLD = 120;
const FOCUSED_INPUT_MARGIN = 18;

let lastLayoutHeight = 0;

function focusedTextInput() {
  const el = document.activeElement;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  ) {
    return el;
  }
  return null;
}

function isTextInputFocused() {
  return focusedTextInput() !== null;
}

function nearestScrollableAncestor(el: HTMLElement) {
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (/(auto|scroll|overlay)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function scrollFocusedInputIntoView(viewport?: VisualViewport | null) {
  const input = focusedTextInput();
  if (!input) return;

  const rect = input.getBoundingClientRect();
  const visualTop = viewport?.offsetTop ?? 0;
  const visualBottom = visualTop + (viewport?.height ?? window.innerHeight);
  const scrollTarget = nearestScrollableAncestor(input) ?? window;

  if (rect.bottom > visualBottom - FOCUSED_INPUT_MARGIN) {
    scrollTarget.scrollBy({ top: rect.bottom - visualBottom + FOCUSED_INPUT_MARGIN, behavior: "smooth" });
  } else if (rect.top < visualTop + FOCUSED_INPUT_MARGIN) {
    scrollTarget.scrollBy({ top: rect.top - visualTop - FOCUSED_INPUT_MARGIN, behavior: "smooth" });
  }
}

function syncAppViewport() {
  const viewport = window.visualViewport;
  const visibleHeight = viewport?.height ?? window.innerHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  const rawLayoutHeight = Math.max(window.innerHeight, visibleHeight);
  const previousLayoutHeight = lastLayoutHeight || rawLayoutHeight;
  const keyboardLikelyOpen = isTextInputFocused() && visibleHeight < previousLayoutHeight - KEYBOARD_SHRINK_THRESHOLD;
  const layoutHeight = keyboardLikelyOpen ? previousLayoutHeight : rawLayoutHeight;
  const appHeight = keyboardLikelyOpen ? layoutHeight : visibleHeight;
  const bottomOcclusion = keyboardLikelyOpen ? 0 : Math.max(0, rawLayoutHeight - visibleHeight - offsetTop);

  lastLayoutHeight = layoutHeight;
  document.documentElement.dataset.keyboardOpen = keyboardLikelyOpen ? "true" : "false";
  document.documentElement.style.setProperty(APP_LAYOUT_VIEWPORT_HEIGHT, `${Math.round(layoutHeight)}px`);
  document.documentElement.style.setProperty(APP_VIEWPORT_HEIGHT, `${Math.round(appHeight)}px`);
  document.documentElement.style.setProperty(APP_BOTTOM_OCCLUSION, `${Math.round(bottomOcclusion)}px`);
  if (keyboardLikelyOpen) scrollFocusedInputIntoView(viewport);
}

export function installAppViewportSync() {
  if (typeof window === "undefined") return;

  let frame = 0;
  const scheduleSync = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncAppViewport();
    });
  };
  const syncWhenVisible = () => {
    if (document.visibilityState === "visible") scheduleSync();
  };

  syncAppViewport();
  window.addEventListener("resize", scheduleSync);
  window.addEventListener("orientationchange", scheduleSync);
  window.visualViewport?.addEventListener("resize", scheduleSync);
  window.visualViewport?.addEventListener("scroll", scheduleSync);
  document.addEventListener("focusin", scheduleSync);
  document.addEventListener("focusout", scheduleSync);
  document.addEventListener("visibilitychange", syncWhenVisible);
}
