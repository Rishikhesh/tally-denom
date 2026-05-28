# Tally

A PWA. Brutalist Editorial Fashion design system (shared with `cctp`) on a
mobile phone-canvas shell (ported from `zap`).

## Stack

- Bun + Vite + React 19 + TypeScript (strict)
- Tailwind v4 via `@tailwindcss/vite` (no PostCSS config) — tokens in `src/index.css`
- Firebase (Cloud Firestore) for storage — `src/lib/firebase.ts`
- `vite-plugin-pwa` (injectManifest) — installable + offline, no push
- Vercel for hosting + `@vercel/analytics`

## Design system

Brutalist Editorial Fashion: cream paper `#f3f1ec` / editorial red `#e6321b`,
light + dark via `data-theme` on `<html>`, radius `0` everywhere, Inter Tight /
Inter / JetBrains Mono. Canonical tokens at
`~/personal/designSystems/brutalist-editorial-fashion/`.

## Setup

```bash
bun install

# Firebase: copy env template, fill from Firebase console
# (Project settings → General → Your apps → SDK setup).
cp .env.example .env.local

bun dev          # vite dev server → http://localhost:5175
bun run build    # tsc -b && vite build
bun run preview  # serve the production build
bun run lint     # eslint
```

## PWA

`src/sw.ts` precaches the build (Workbox) and supports `SKIP_WAITING`.
`src/pwa.ts` registers the worker and exposes an update-prompt subscription.
Icons + `manifest.webmanifest` live in `public/`.
