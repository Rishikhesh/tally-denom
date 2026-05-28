import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { onAuthChange } from "@/lib/auth";
import { db } from "@/lib/firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Subscribes to Firebase auth state. On first sign-in for a given user,
 * idempotently writes `users/{uid}` with `{ email, displayName, createdAt }`.
 * The profile write is fire-and-forget — the returned `user` is not gated on it.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    let ensuredFor: string | null = null;

    const unsubscribe = onAuthChange((user) => {
      setState({ user, loading: false });

      if (user && ensuredFor !== user.uid) {
        ensuredFor = user.uid;
        void ensureUserDoc(user);
      }
      if (!user) {
        ensuredFor = null;
      }
    });

    return unsubscribe;
  }, []);

  return state;
}

async function ensureUserDoc(user: User): Promise<void> {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(
      ref,
      {
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    // Network/offline failures here are fine — the listener will retry next
    // sign-in. We don't want to surface this to the UI.
    console.warn("useAuth: failed to ensure user doc", err);
  }
}
