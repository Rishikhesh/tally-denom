# Tally

A PWA. Content TBD — scaffold only so far.

## Stack

- Bun + Vite + React 19 + TypeScript (strict). **Use bun / bunx, never npm.**
- Tailwind v4 via `@tailwindcss/vite`, no PostCSS config. Tokens in `src/index.css`.
- Firebase (Cloud Firestore) for storage — `src/lib/firebase.ts` (`app`, `db`).
  Config from `VITE_FIREBASE_*` env vars.
- `vite-plugin-pwa` (injectManifest): `src/sw.ts` (precache + skipWaiting),
  `src/pwa.ts` (register + update prompt). Installable + offline, no push.
- Vercel host + `@vercel/analytics`.

## Design system — Monochrome brutalist (tally-specific)

- **Black / white + shades only.** No editorial red, no chromatic accents.
  Borrows brutalist structural rules from cctp (radius 0, eyebrow, section
  numbers, tabular nums) but rejects its red palette.
- Light: `bg #fff · surface #f4f4f4 · text #0a0a0a · text-muted #6b6b6b ·
  border #d4d4d4 · border-strong / accent #0a0a0a`.
  Dark: `bg #0a0a0a · surface #1a1a1a · text #f5f5f5 · text-muted #9a9a9a ·
  border #2a2a2a · border-strong / accent #f5f5f5`.
- **Primary = ink.** Solid CTAs are ink-on-paper (light) / paper-on-ink (dark).
  Verified pill = solid ink; Unverified pill = outline ink.
- **Use colour only when functionally required.** Allowed tokens:
  `--color-destructive` (`#c0211b`, only on Delete-confirm + negative-inventory
  warnings), `--color-success` (`#1f7a3a`), `--color-warning` (`#b07300`).
  Never re-introduce these as a brand colour.
- **No rounded corners** (`--radius: 0` everywhere). Never gradients.
- Inter Tight (display) / Inter (body) / JetBrains Mono (data). Tabular nums globally.
- `.eyebrow` = mono caps 10px tracking 0.25em. Section numbers `01 / X`.
- Dark mode toggled via `data-theme="dark"` on `<html>`.

## Layout — phone-canvas shell (ported from zap)

- `.app-shell-wrap` + `.phone-canvas` (max 420×900, full-bleed <520px, safe-area).
- `src/lib/appViewport.ts` syncs `--app-viewport-height` / `--app-bottom-occlusion`
  to the visual viewport (handles mobile chrome + keyboard).
- Theme toggle: `src/hooks/useTheme.ts` (persists to `localStorage`).

## Commands

```bash
bun install
bun dev             # vite dev server (port 5175, strict)
bun run build       # tsc -b && vite build
bun run lint        # eslint
```

## Conventions

- Theme settings on `<html>`: `data-theme` only (no density/fontpair switchers).
- Path alias `@/` → `src/`.
- **UI components**: prefer **shadcn/ui** (Tailwind v4 templates,
  `bunx shadcn@latest add <name>`, lands under `src/components/ui/`).
  For patterns shadcn doesn't ship (`BottomSheet`, `DatePickerSheet`,
  `SegControl`, `Loader`, `AppSplash`), **copy the file from
  `~/personal/zap/src/components/`** for its **structure and behaviour**,
  then **fully restyle to brutalist**: swap `bg-paper`/`bg-paper-2` →
  `var(--color-bg)`/`var(--color-surface)`, `text-ink`/`text-ink-3` →
  `var(--color-text)`/`var(--color-text-muted)`, `border-line` →
  `var(--color-border)`, strip every `rounded-*` class (radius 0 — only
  the logo is curved). Do **not** import zap's style tokens or rounded
  shapes. No long-press / jiggle / confetti — keep row actions to inline
  `Edit / Verify / Delete` icon buttons.
- **Domain**: INR cash ledger; denoms `[500, 200, 100, 50, 20, 10, 5, 2, 1]`
  (no ₹2000). Rupee symbol `₹`, tabular-nums.
- **Dates**: store as `YYYY-MM-DD` string (sortable, range-comparable in
  Firestore); **display always as `DD-MM-YYYY`** via `src/lib/date.ts`.
- **Spec lives at** `docs/superpowers/specs/2026-05-28-tally-ledger-design.md`.
