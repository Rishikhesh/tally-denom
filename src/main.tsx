import { Analytics } from "@vercel/analytics/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./lib/firebase";
import { consumeRedirectResult } from "./lib/auth";
import { installAppViewportSync } from "./lib/appViewport";
import "./pwa";

installAppViewportSync();

// Resolve any in-flight redirect sign-in before React mounts so the auth state
// listener fires with the freshly authenticated user (no-op when no redirect
// is pending).
void consumeRedirectResult();

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>,
);
