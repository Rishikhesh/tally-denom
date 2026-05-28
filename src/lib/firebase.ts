import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Reuse the existing app across HMR reloads instead of re-initializing.
export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

// Initialize Firestore with persistent IndexedDB cache + multi-tab manager.
// `initializeFirestore` can only be called once per app, so on HMR re-runs we
// fall back to the already-initialized instance via `getFirestore`.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  firestore = getFirestore(app);
}

export const db: Firestore = firestore;
export const auth: Auth = getAuth(app);
