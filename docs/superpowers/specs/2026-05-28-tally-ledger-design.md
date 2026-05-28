# Tally — Cash Denomination Ledger (Design)

**Status:** Draft, awaiting user review
**Date:** 2026-05-28
**Owner:** single user (no sharing)

## 1. Purpose

A personal cash ledger that records collections (vouchers) broken down by INR
note/coin denomination, tracks verified vs unverified amounts, records spends
that consume specific denominations, and logs every action for review.

## 2. Scope and non-goals

In scope:

- Single user, single currency (INR).
- Routes → vouchers → denomination entries.
- Verification toggle on vouchers.
- Spends with denomination breakdown.
- Activity log of every mutation.
- Home, Entry, Activity, Analytics pages.

Not in scope (v1):

- Multi-user / sharing.
- Multi-currency.
- Cloud-functions aggregation, push notifications, exports/imports.
- Recurring vouchers/spends.

## 3. Stack and platform

Already scaffolded:

- Bun + Vite + React 19 + TS strict + Tailwind v4.
- vite-plugin-pwa (offline + installable, in-app update reload prompt).
- Vercel host + `@vercel/analytics`.
- Monochrome brutalist design system — **black / white + shades only**.
  Radius 0 everywhere; the logo is the one curved exception. **No
  chromatic accents** (no editorial red, no lime, no swatches). Colour is
  reserved for *functional* states:
  - **Destructive** (`#c0211b` on `#fff`): only on Delete-confirm buttons
    and irreversible-action warnings.
  - **Success** (`#1f7a3a`) and **warning** (`#b07300`): only when a
    status truly can't be read monochrome (rare; default to ink/outline
    pills for verified/unverified instead).

  Light: `bg #fff · surface #f4f4f4 · text #0a0a0a · text-muted #6b6b6b ·
  border #d4d4d4 · border-strong / accent #0a0a0a`.

  Dark: `bg #0a0a0a · surface #1a1a1a · text #f5f5f5 · text-muted #9a9a9a ·
  border #2a2a2a · border-strong / accent #f5f5f5`.

  "Primary" = ink. Solid CTAs are ink-on-paper (light) / paper-on-ink (dark).
  Verified pill = solid ink; Unverified pill = outline ink. Hero numbers in
  Inter Tight, data in JetBrains Mono with tabular-nums.
- Phone-canvas shell (max 420×900, full-bleed <520px, safe-area).

Added by this spec:

- **Firebase Auth** — Google sign-in only.
- **Cloud Firestore** with offline persistence (`enableIndexedDbPersistence`
  or the modern `persistentLocalCache`). Personal ledger is low-volume —
  client-side aggregation by reducing query results, no cloud functions.
- Firestore security rules: data lives under `users/{uid}/…`; only the owner
  can read or write their own docs.
- **shadcn/ui** initialized for **Tailwind v4** (`bunx shadcn@latest init`,
  which now ships v4-compatible templates). Generated components land in
  `src/components/ui/`. Their CSS-variable bridge is wired through tally's
  existing `@theme inline` block (already defines `--color-background`,
  `--color-card`, `--color-primary`, etc.) so no new CSS is needed.
- **zap component ports — structure/behaviour only, not style.** zap is
  raided strictly for its **patterns** (portal-based bottom sheet, month
  calendar logic, viewport sync, etc.). When a component is copied, its
  zap-specific tokens (`bg-paper`, `text-ink`, `border-line`, `bg-paper-2`,
  `text-ink-3`) and rounded shapes (`rounded-t-[28px]`, `rounded-[13px]`,
  `rounded-full`) are **replaced** with brutalist equivalents:

  | zap class | tally replacement |
  |---|---|
  | `bg-paper` | `bg-[var(--color-bg)]` |
  | `bg-paper-2` | `bg-[var(--color-surface)]` |
  | `text-ink` | `text-[var(--color-text)]` |
  | `text-ink-2`, `text-ink-3` | `text-[var(--color-text-muted)]` |
  | `border-line` | `border-[var(--color-border)]` |
  | `bg-ink`, `text-paper` (active) | `bg-[var(--color-accent)]`, `text-[var(--color-accent-ink)]` |
  | `rounded-t-[28px]`, `rounded-[24px]`, `rounded-[13px]`, `rounded-full` | removed (radius 0) |

  Net effect: same behaviour as zap, brutalist look. No alias bridge, no
  rounded chrome exceptions — only the logo keeps curved edges.

## 4. Domain model

### 4.1 Denominations (INR)

```ts
export const DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export type Denom = typeof DENOMS[number];
export type DenomCounts = Record<Denom, number>; // 0 when absent
```

`₹2000` is excluded. Display uses the `₹` symbol with tabular-nums (already
globally set in `index.css`).

### 4.2 Entities

```
User                         (implicit; identified by Firebase uid)
Route                        { name }                                                1—N→ Vouchers
Voucher                      { routeId, code, total, denoms, verified, verifiedAt?, txDate }
Spend                        { note, category?, amount, denoms, txDate }    (global, not per route)
Activity                     { type, refId, routeId?, title, amount?, txDate?, meta }
```

`txDate` is a user-chosen date for the transaction (the day the cash was
collected / spent). **Storage**: `YYYY-MM-DD` string — same shape zap uses,
no timezone foot-guns, naturally sortable, comparable with string `<` / `>`
for date-range filters. **Display**: always **`DD-MM-YYYY`** everywhere in
the UI (hero, voucher rows, activity feed, date pickers, filter chips). A
single `formatDate(yyyyMmDd) → 'DD-MM-YYYY'` helper in `src/lib/date.ts`,
paired with `parseDisplayDate('DD-MM-YYYY') → 'YYYY-MM-DD'` for any raw
text-input fallback. Defaults to today on create. `createdAt` (server
timestamp) stays separate so the activity feed always sorts by the actual
write moment when no `txDate` filter is applied.

### 4.3 Invariants

- `sum(denom * count) === voucher.total` — enforced in UI before save, and
  re-checked in a single helper used by both UI and tests.
- `sum(denom * count) === spend.amount` — same helper, same guarantee.
- `voucher.verified === true` implies `verifiedAt` is set; `false` clears it.
- A route may not be deleted while it has vouchers (UI block + Firestore rule).
- All denom counts are non-negative integers.

## 5. Balance math (spend model = "separate spent + net")

Spends are **not** tagged to a pool. They reduce total balance but do not
mutate verified or unverified collected sums.

```
verifiedCollected   = Σ voucher.total where verified
unverifiedCollected = Σ voucher.total where not verified
totalCollected      = verifiedCollected + unverifiedCollected
totalSpent          = Σ spend.amount
net                 = totalCollected − totalSpent

denomInventory[d]   = Σ voucher.denoms[d] − Σ spend.denoms[d]    (may go negative if
                                                                 spends are entered
                                                                 against denoms that
                                                                 weren't collected;
                                                                 UI surfaces this with
                                                                 the destructive token
                                                                 (#c0211b), doesn't block)
```

The hero shows `verifiedCollected`, `unverifiedCollected`, `totalSpent`, `net`.

## 6. Firestore data model

Top-level collections under each user. `serverTimestamp()` is used for
`createdAt`/`updatedAt`/`verifiedAt` so device clock skew can't lie.

```
users/{uid}                                // profile doc (optional metadata)
  { email, displayName, createdAt }

users/{uid}/routes/{routeId}
  { name, createdAt, updatedAt, voucherCount }
                                          // voucherCount maintained by
                                          // mutation helper (incremented on
                                          // voucher create, decremented on
                                          // delete) so route delete can be
                                          // gated cheaply.

users/{uid}/vouchers/{voucherId}
  { routeId, code, total,
    denoms: { D500, D200, D100, D50, D20, D10, D5, D2, D1 }, // all required, ints
    verified: false, verifiedAt: null,
    txDate: 'YYYY-MM-DD',                   // user-chosen transaction date
    createdAt, updatedAt }
                                          // routeId is denormalized so
                                          // we can list vouchers by route
                                          // without subcollections.
                                          // Wire format uses D<value> keys so
                                          // Firestore rules can validate them
                                          // (rules can't use numeric keys).
                                          // Client maps to/from numeric keys.

users/{uid}/spends/{spendId}
  { note, category: string|null, amount,
    denoms: { D500, D200, D100, D50, D20, D10, D5, D2, D1 },
    txDate: 'YYYY-MM-DD',
    createdAt }

users/{uid}/activities/{activityId}
  { type: 'route.create'|'route.delete'|
          'voucher.create'|'voucher.edit'|'voucher.verify'|'voucher.unverify'|'voucher.delete'|
          'spend.create'|'spend.edit'|'spend.delete',
    refId: string,                          // voucher/spend/route id
    routeId: string | null,
    title: string,                          // human label, e.g. "VCH #A123 created"
    amount: number | null,                  // for sorting/filtering by money
    txDate: 'YYYY-MM-DD' | null,            // copied from the doc being changed
                                            // (lets date filters narrow the feed
                                            // without joining other collections)
    meta: object,                            // free-form, e.g. {before, after} for edits
    createdAt }
```

### 6.1 Indexes

Composite indexes required:

- `vouchers` by `(routeId, txDate desc)` — list vouchers in a route, date-sorted.
- `vouchers` by `(verified, txDate desc)` — verified/unverified filters.
- `vouchers` by `(routeId, txDate asc)` — date range filter inside a route.
- `spends` by `(txDate desc)` — recent + analytics buckets.
- `activities` by `(txDate desc, createdAt desc)` — feed with optional date filter.
- `activities` by `(createdAt desc)` — feed (single field, auto).

### 6.2 Security rules (sketch)

```
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }
    match /users/{uid} {
      allow read, write: if isOwner(uid);
      match /{rest=**} { allow read, write: if isOwner(uid); }
    }
  }
}
```

Field-level validation (denom shape, non-negative ints, `total === Σ denoms`)
is enforced via Firestore rules functions to keep the invariant true even if a
malicious client bypasses the UI. Sample helper:

```
function denomsSumEq(denoms, total) {
  return total == denoms.D500*500 + denoms.D200*200 + denoms.D100*100 +
                  denoms.D50*50  + denoms.D20*20  + denoms.D10*10 +
                  denoms.D5*5    + denoms.D2*2    + denoms.D1*1;
}
```

(Rules can't use numeric map keys, so on-the-wire denom maps use `D500`-style
keys. Client converts.)

### 6.3 Activity write batching

Every mutation that changes voucher/spend/route state is written through a
helper that:

1. Performs the primary write (set/update/delete).
2. Adds the activity doc.
3. Updates the route `voucherCount` if applicable.

All three go through a Firestore `writeBatch` so the activity entry can't
diverge from reality.

## 7. App architecture

### 7.1 Navigation

No router library. Bottom **TabBar** with four tabs: Home, Entry, Activity,
Analytics. A `useNavStore` (Zustand) holds:

- current `tab: 'home' | 'entry' | 'activity' | 'analytics'`
- a stack of in-tab routes for drill-downs (route → voucher edit, etc.) so the
  browser back button and iOS edge-swipe pop the stack via `popstate`.

Pattern lifted from zap. Single `renderScreen()` switch in `App.tsx`.

### 7.2 Data hooks

`src/hooks/useData.ts` wraps Firestore queries with React Query–style stale
state. Specifically:

- `useRoutes()` — `onSnapshot` listener on the routes collection.
- `useRoute(id)` — single doc listener.
- `useVouchersByRoute(routeId)` — listener with `where('routeId','==',…)`.
- `useAllVouchers()` — listener, used for hero totals.
- `useSpends()` — listener.
- `useActivity({ limit })` — listener with limit + `orderBy('createdAt','desc')`.

Mutations are plain async functions that call the activity-write batch helper:

- `createRoute`, `deleteRoute`.
- `createVoucher`, `editVoucher`, `verifyVoucher`, `unverifyVoucher`, `deleteVoucher`.
- `createSpend`, `editSpend`, `deleteSpend`.

### 7.3 Aggregation

Hero totals, per-route totals, and denom inventory are derived synchronously
by reducing the listener arrays. Helpers in `src/lib/balances.ts`:

- `sumVerified(vouchers)`, `sumUnverified(vouchers)`, `sumSpends(spends)`.
- `denomInventory(vouchers, spends)`.
- `routeTotals(vouchers, routeId)`.

All pure functions; unit-testable without Firebase.

### 7.4 Auth gating

`App.tsx` renders one of:

- **Loading** — auth state pending.
- **SignIn screen** — Google sign-in button (one screen, brutalist, eyebrow
  `00 / SIGN IN`).
- **Authenticated shell** — phone-canvas + TabBar + screens.

Auth state via `onAuthStateChanged` exposed by a `useAuth()` hook.

## 8. Pages

### 8.1 Home

```
[ HEADER: = Tally   theme-toggle ]

01 / BALANCE
  ₹ 12,345.00   VERIFIED              ← display font, large
  ₹  2,100.00   UNVERIFIED            ← display font, large, muted
  ₹  4,200.00   SPENT                 ← mono, smaller
  ──────────────────────────────────
  ₹ 10,245.00   NET                   ← display, accent

02 / RECENT
  • VCH #A123 verified              · 2m ago
  • Spend ₹450 (petrol)             · 1h ago
  • Route "Anna Nagar" created      · today
  • ...                             ↳ View all → Activity tab
```

### 8.2 Entry

Two-level: route picker, then within-route view.

```
01 / ROUTE
  [ Route name input | + create | dropdown to select existing ]

02 / VOUCHERS — Anna Nagar
  Verified collected   ₹ 8,200
  Unverified collected ₹ 1,500
  Denom tally          500 × 10 · 200 × 4 · 100 × 5 · 50 × 3 ...

  ┌ VCH #A123  ₹1,000   [verified pill]   ⌄ ┐
  │   500 × 1 · 200 × 2 · 100 × 1               │
  └────────────────────────────────────────────┘
  ┌ VCH #A124  ₹500    [unverified outline] ⌄ ┐
  └────────────────────────────────────────────┘

  [ + Add voucher ]   [ + Add spend ]
```

**Voucher editor (full-screen overlay):**

```
03 / VOUCHER
  CODE   [ A123                                ]
  TOTAL  [ 1000                                 ]
  DATE   [ 28-05-2026 ▾ ]    ← opens DatePickerSheet (§9.3)

04 / DENOMINATIONS
  ₹500  [ − 1 + ]
  ₹200  [ − 2 + ]
  ₹100  [ − 1 + ]
  ₹50   [ − 0 + ]
  ₹20   [ − 0 + ]
  ₹10   [ − 0 + ]
  ₹5    [ − 0 + ]
  ₹2    [ − 0 + ]
  ₹1    [ − 0 + ]
                              REMAINING  ₹0
                              [ SAVE ]   ← disabled until remaining = 0
```

**Spend editor:** same shape, no `code`, plus `note`, optional `category`
(free-text with chip suggestions drawn from past entries), and the same
`DATE` field.

**Per-route date filter:** the route screen has the same date chip row as
Activity (`All / Today / 7d / 30d / Custom…`). The header sums + denom tally
recompute against the filtered voucher set so you can answer "how much did
we collect on Anna Nagar last Tuesday?" without leaving the screen.

### 8.3 Activity

Single scrolling feed of every action, newest first. Two filter rows:

```
TYPE     [ All ] [ Vouchers ] [ Spends ] [ Verifications ] [ Routes ]
DATE     [ All ] [ Today ] [ Yesterday ] [ 7d ] [ 30d ] [ Custom… ]
```

Tapping `Custom…` opens a **Date range sheet** (see §9.3) — pick `From` and
`To` and the feed re-queries with `where('txDate','>=',from)` /
`where('txDate','<=',to)`. Active range shows above the feed as
`07-04-2026 → 28-05-2026  [×]`.

Each row:

```
[ icon ] Voucher VCH#A123 edited
         denoms shifted: 500 +1 / 100 −5
         · 12 minutes ago · Anna Nagar · 28-05-2026
```

Date format `DD-MM-YYYY` is used in every row (per §4.2). Tap a row to open
the original editor (read-only on activity rows — they navigate to the
voucher / spend they reference if it still exists). Undo and any reversing
actions are v2 (see §11).

### 8.4 Analytics

Read-only charts (no extra deps yet — render with inline SVG, brutalist line/bar):

- **Verified vs Unverified** stacked bar over the last 30 days.
- **Denom distribution** — current inventory as a bar chart (₹500 → ₹1).
- **Spend by category** — donut + list, last 30 days.
- **Collection over time** — line, daily/weekly toggle.

If chart needs grow, swap to a small library later.

## 9. Components

Three buckets, in this order of preference: **shadcn first** (anything they
provide), **zap port** (specific patterns zap has solved), then **app-specific
new components** for tally's domain rows.

### 9.1 shadcn/ui primitives (under `src/components/ui/`)

Generated with `bunx shadcn@latest add <name>` (v4 templates). All inherit
brutalist tokens via the existing CSS-variable bridge — they render
square-cornered and monochrome (ink primary, paper background), no extra
theming needed beyond the bridge.

- `button` — solid accent / ghost / outline / destructive variants via CVA.
- `input` — text + number, brutalist border, 16 px font (no iOS zoom).
- `label`.
- `badge` — used for status pills (verified / unverified / spent).
- `card` — square wrapper used by voucher rows etc.
- `select` — Radix-backed; used for route picker.
- `scroll-area` — used in long voucher lists, activity feed.
- `dialog` — base for editor overlays.
- `popover` — used for category chip suggestions.

### 9.2 Components ported from zap (structure/behaviour only — restyled)

Each file is copied from `~/personal/zap/src/components/<name>.tsx` into
`~/personal/tally/src/components/<name>.tsx`, then **fully restyled** to
brutalist per the table in §3 (swap paper/ink/line tokens for brutalist
ones, strip all `rounded-*` classes). Imports of `@/lib/utils` already work
— tally has the same `cn` helper. Internal logic (portal target, sheet-up
animation hookup, calendar-cell math, etc.) is preserved exactly.

| File | Why we want it |
|---|---|
| `BottomSheet.tsx` | Foundation for every sheet — portal into `.phone-canvas`, fade-in backdrop, sheet-up animation, scroll lock. Underlies date pickers, editors, filter sheets. |
| `DatePickerSheet.tsx` | Mobile-tuned month calendar with `Today / Yesterday` quick-picks, future-date gating, `minDate` support. Re-used for voucher date, spend date, filter-from, filter-to. **One UX wrap**: the visible chip and the cell labels stay numeric, but the sheet title (`When was it?`) is replaced with `Pick date` and the selected-day footer reads `DD-MM-YYYY` via `formatDate` while internal state stays `YYYY-MM-DD`. |
| `SegControl.tsx` | Segmented control for Activity type filter and date quick-picks. Restyled to square brutalist (no pill rounding). |
| `Loader.tsx` | Screen loader during auth handshake / first listener attach. Recoloured. |
| `AppSplash.tsx` | First-paint splash before auth resolves. Recoloured around the brutalist black `=` logo. |

**Dropped vs the previous draft:** `JigglePressable.tsx`, `Confetti.tsx`,
`Header.tsx` — no long-press menu, no celebration animation, header is a
plain brutalist layout in `App.tsx` already. Splitem-specific zap files
(`SpendGraph`, `SlideToSettle`, `UpiReceive`, `CryptoReceive`, `Avatar`,
`Keypad`, `StatusBar`, `TabBar` from zap) are **not** ported either.

**Row actions instead of long-press.** Each voucher / spend row carries
inline icon buttons on the right edge: `✎ Edit`, `✓ Verify` (vouchers only,
toggles between Verify/Unverify), `🗑 Delete`. Confirm-on-tap for Delete via
a shadcn `dialog`, not a context menu.

### 9.3 New tally-specific components (under `src/components/`)

- `TabBar.tsx` — bottom-fixed, 4 slots (Home / Entry / Activity / Analytics),
  safe-area aware via `--tab-safe-bottom`, brutalist square pill for the
  active slot. Built fresh against shadcn `button` + accent token.
- `DenomRow.tsx` — `₹500   [ − ][ 0 ][ + ]` stepper + computed subtotal,
  used in voucher + spend editors.
- `VoucherRow.tsx` — collapsible row showing code, total, verified pill,
  txDate, expand to see per-denom breakdown.
- `SpendRow.tsx` — sibling shape for spends; shows category chip + note.
- `RoutePicker.tsx` — combobox built on shadcn `select` + `input` for
  free-text "or create new".
- `BalanceHero.tsx` — the home hero grid (verified / unverified / spent / net).
- `DenomTally.tsx` — chip grid `₹500 × 10 · ₹200 × 4 · …` used per route
  and in analytics.
- `DateRangeSheet.tsx` — wraps two `DatePickerSheet`s as a single sheet
  with `From` and `To` rows; emits `{ from?, to? }`; the eight-row preset
  list (`Today`, `Yesterday`, `7d`, `30d`, …) sits on top.
- `ActivityRow.tsx` — feed row with icon, title, delta meta, relative time
  + `txDate` label in `DD-MM-YYYY`.
- `PwaUpdatePrompt.tsx` — already exists.

## 10. Tests

`tests/` (Node `--test`, like zap) — pure-function tests against
`src/lib/balances.ts` and a denom-reconcile helper:

- `reconcile(denoms, total) === 0` for valid breakdowns; `> 0` otherwise.
- `sumVerified` / `sumUnverified` over fixtures.
- `denomInventory` over voucher+spend fixtures.
- Activity factory shape (correct `type`/`title`/`amount` per mutation kind).

No Firestore integration tests in v1.

## 11. Open items deferred to v2

- Backup/export (JSON or CSV).
- Soft-delete (currently hard delete; activity log is the audit trail).
- Multi-currency / FX.
- Cloud-functions aggregation if document counts grow past ~10k.
- Optional PIN-lock screen on top of Google auth.

## 12. File map (additions)

```
components.json                     (shadcn config — generated by `bunx shadcn init`)
firestore.rules                     (new)
firestore.indexes.json              (new)

src/
  App.tsx                           (rewritten — auth gate + tab shell)
  components/
    ui/                             (shadcn — generated, never hand-edited):
      button.tsx
      input.tsx
      label.tsx
      badge.tsx
      card.tsx
      select.tsx
      scroll-area.tsx
      dropdown-menu.tsx
      dialog.tsx
      popover.tsx
    BottomSheet.tsx                 (port from zap — restyled)
    DatePickerSheet.tsx             (port from zap — restyled)
    DateRangeSheet.tsx              (new, wraps two DatePickerSheets)
    SegControl.tsx                  (port from zap — restyled)
    Loader.tsx                      (port from zap — restyled)
    AppSplash.tsx                   (port from zap — restyled)
    PwaUpdatePrompt.tsx             (existing)
    TabBar.tsx                      (new)
    DenomRow.tsx                    (new)
    DenomTally.tsx                  (new)
    VoucherRow.tsx                  (new)
    SpendRow.tsx                    (new)
    RoutePicker.tsx                 (new)
    BalanceHero.tsx                 (new)
    ActivityRow.tsx                 (new)
    index.ts                        (barrel — mirrors zap's pattern)
  screens/
    SignInScreen.tsx
    HomeScreen.tsx
    EntryScreen.tsx
    RouteScreen.tsx
    VoucherEditorScreen.tsx
    SpendEditorScreen.tsx
    ActivityScreen.tsx
    AnalyticsScreen.tsx
  hooks/
    useAuth.ts
    useData.ts                      (Firestore listener wrappers)
    useNavStore.ts                  (Zustand stack)
    useTheme.ts                     (existing)
  lib/
    firebase.ts                     (existing — extend with getAuth + Firestore persistence)
    auth.ts                         (signIn/signOut helpers, onAuthStateChanged)
    denoms.ts                       (DENOMS const, types, reconcile helpers,
                                     numeric ↔ D-prefixed wire conversions)
    balances.ts                     (pure aggregations)
    activity.ts                     (writeBatch helpers)
    date.ts                         (formatDate / parseDisplayDate /
                                     todayInputDate / dateRangePresets)
    appViewport.ts                  (existing)
    utils.ts                        (existing)

tests/
  balances.test.mjs
  denoms.test.mjs
  date.test.mjs                     (formatDate, parseDisplayDate, presets)
  activity-factory.test.mjs
```

New runtime deps to install: `firebase` (already there), `zustand`,
`date-fns`, plus the Radix packages pulled in by the shadcn `add` commands
(`@radix-ui/react-{dialog,dropdown-menu,scroll-area,select,popover,slot}`).

## 13. Risks / things to confirm in implementation

- Firestore offline persistence has subtle limits in multi-tab — pick
  `persistentLocalCache` with `LRU` policy.
- Firestore rules `denomsSumEq` check needs all keys explicitly listed; missing
  a denom in the doc must reject the write.
- Zustand + browser history pop sequencing — copy zap's pattern verbatim.
- `lucide-react@1.16.0` icon names — verify each icon import exists at install
  time (the major version bump may have renamed some icons relative to the
  zap pinning at `0.5xx`).
- `bunx shadcn@latest init` against a Tailwind v4 project: confirm the CLI
  detects v4 and writes a v4 `components.json` (no `tailwind.config.ts`,
  CSS-variable based). If the CLI ever requires v3, downgrade strategy =
  hand-craft `components.json` and copy templates from the shadcn docs.
- zap component recolour: after the alias bridge is in place, render each
  ported component once (Storybook-style "kitchen sink" screen, throwaway)
  to confirm `bg-paper-2`, `text-ink-3`, etc. resolve and no class slipped
  through (e.g. `bg-g-coral`, group-color swatches that don't exist in tally).
- `DatePickerSheet` ships its own `inputDateFromDate` / `dateFromInput`
  helpers operating on `YYYY-MM-DD`. Keep those untouched; the display
  conversion to `DD-MM-YYYY` happens at the call-site label, not inside the
  picker.

## 14. Firebase project setup (run-book for the user)

Follow these once, then the app picks everything up via `.env.local`.

### 14.1 Create the Firebase project

1. Go to **https://console.firebase.google.com** → **Add project**.
2. Name it `tally` (or anything — display only). Skip Google Analytics
   for this project unless you want it.
3. Wait until the project is ready, then open it.

### 14.2 Register the web app

1. Project Overview → **`</>`** (Add app — Web) → nickname `tally-web`.
2. **Skip** "Also set up Firebase Hosting" (we deploy on Vercel).
3. Firebase shows a `firebaseConfig` snippet. Copy each value into
   `tally/.env.local` (template is `.env.example`):

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=tally-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tally-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=tally-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

### 14.3 Enable Cloud Firestore

1. Console → **Build → Firestore Database → Create database**.
2. **Production mode** (we'll write our own rules).
3. Pick a region near you (e.g. `asia-south1` for Mumbai). **This is
   permanent** — pick deliberately.

### 14.4 Enable Google Authentication

1. Console → **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**. Set the project support email
   (your Google account). Save.
3. (Optional, recommended) **Authentication → Settings → Authorized domains** —
   confirm `localhost` is listed, and add the Vercel preview/production
   domains when you deploy (e.g. `tally.vercel.app`).
4. (Optional) **Authentication → Settings → User actions** — disable
   anonymous sign-up if visible, since we don't use it.

### 14.5 Install the Firebase CLI (once per machine)

```bash
bun add -g firebase-tools
firebase login
firebase use --add        # pick the tally project, alias it "default"
```

### 14.6 Deploy Firestore rules + indexes

The repo will check in `firestore.rules` and `firestore.indexes.json`. After
each change:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

For local development the rules also apply through the SDK — there's no
emulator dependency unless you want one (`firebase emulators:start` is
optional and not required by this spec).

### 14.7 Sanity-check sign-in

```bash
bun dev
# → http://localhost:5175 → tap "Sign in with Google" → pick your account.
```

On first success, a `users/{uid}` doc is auto-created on demand. Use the
Firebase Console → Firestore tab to verify writes.

### 14.8 Locking the app to a single account (optional)

If you want to harden it so only your Google account can ever read/write
(in case the rules ever loosen by mistake), add a hard-coded uid check in
`firestore.rules`:

```
function isMe() {
  return request.auth != null && request.auth.uid == 'YOUR_UID_HERE';
}
```

Get your uid from the **Authentication → Users** tab after first sign-in,
then redeploy rules. This is belt-and-suspenders on top of the standard
`isOwner(uid)` check.
