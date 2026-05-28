import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

// Keep the user signed in across sessions. Awaited inside `signInWithGoogle`
// so the persistence is locked in before the popup/redirect kicks off.
let persistencePromise: Promise<void> | null = null;
function ensurePersistence(): Promise<void> {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch(
      (err) => {
        console.warn("Auth persistence setup failed", err);
      },
    );
  }
  return persistencePromise;
}

/**
 * Kick off the Google sign-in flow.
 *
 * Popup-first everywhere. `signInWithRedirect` is unreliable on modern Chrome
 * because the firebaseapp.com auth iframe relies on third-party cookies that
 * are blocked by default. We fall back to redirect only when the popup is
 * actually blocked / closed-by-user.
 */
export async function signInWithGoogle(): Promise<void> {
  await ensurePersistence();
  const provider = new GoogleAuthProvider();
  // Force the account chooser every time so users on shared machines aren't
  // silently signed in with the last account.
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string } | null)?.code ?? "";
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

/**
 * Drain any pending redirect result on app load. Safe to call repeatedly;
 * resolves to `null` if no redirect was in flight. Errors are surfaced via
 * `console.warn` and swallowed — `onAuthStateChanged` is the source of truth
 * for downstream UI.
 */
export async function consumeRedirectResult(): Promise<void> {
  try {
    await getRedirectResult(auth);
  } catch (err) {
    console.warn("Redirect sign-in did not complete", err);
  }
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
