# Paisa.Web — Implementation Plan

> Turning the screen prototype in `app/page.tsx` (now just a redirect — see "Where things stand")
> into a working product.
>
> **Architecture:** Node server (Nitro `node` preset) on India-resident infrastructure, SQLite
> on the same host via `better-sqlite3`, with real authentication. See D-008 in
> [`decisions.md`](decisions.md) for why — this was originally scaffolded as Cloudflare
> Workers + D1 and changed in Phase 0 because D1 has no India region.
> **Refactor decision:** modularise the prototype before adding features (Phase 1, done).

---

## 📍 Resume here (for a fresh session)

**Current state:** Phases 0 and 1 are complete and committed. Phases 2 and 3 are complete in
the `feat/data-layer` working tree and awaiting commit. The app still runs on in-memory sample
financial data via [`components/app-state.tsx`](../components/app-state.tsx); Phase 4 replacing
that state seam with the authenticated APIs is next.

**Before writing any Phase 4 code:**
1. Read [`decisions.md`](decisions.md) in full — D-001 through D-009 are binding constraints,
   not suggestions. D-005 (integer paise) and D-008 (SQLite, not D1) especially.
2. Run the full gate to confirm you're starting from a known-good state:
   `npm run lint && npm run typecheck && npm test && npm run build`
3. Preserve the user-scoped API boundary; never restore sample transactions into account data.

**Do not re-introduce:** Cloudflare Workers, D1, `wrangler`, or any `@cloudflare/*` package —
that path was deliberately abandoned in Phase 0 (D-002, D-008). If asked to "add D1" or "deploy
to Workers" without an explicit new decision overriding D-008, flag the conflict rather than
proceeding.

---

## Where things stand

The original prototype was a 1942-line `'use client'` component (`app/page.tsx`) holding the
entire product: 6 pages, 4 dialogs, 3 auth screens, charts, filters and toasts — all driven by
`useState` over seeded sample data. Phase 1 broke it into 29 files (largest 221 lines); the old
`app/page.tsx` is now a 5-line redirect to `/overview`. Nothing behind the UI is real yet: no
schema beyond the Phase 0 bootstrap table, no auth, no persistence past a page reload.

The Settings screen still states this outright: *"This review uses sample data in memory.
Changes reset when the page reloads. Authentication and cross-device sync are not connected
yet."* Removing that notice is task 3.9, gated on auth actually existing.

So "implement every feature in the design" means: keep the UI, build the product underneath it,
and close the gaps the prototype papers over.

---

## Phase 0 — Foundations ✅ (committed)

Blocks everything else. **Done** — `npm run lint`, `npm run typecheck`, `npm test` and
`npm run build` all pass; `/api/health` returns `{"status":"ok"}` from a SQLite-backed
route handler in both `npm run dev` and the built Node server. Carried forward: the
India-resident host still has to be provisioned, with backups and encryption at rest
(open items in D-008).

| # | Task | Acceptance |
|---|---|---|
| 0.1 | Target a Node server (Nitro `node` preset) with SQLite via `better-sqlite3`; confirm the database is reachable from a route handler in dev and in the built server | ✅ `SELECT 1` succeeds through `/api/health` in both |
| 0.2 | Add migrations tooling (`migrations/NNNN_*.sql` plus `npm run db:migrate`), checksummed and forward-only | ✅ Idempotent; an edited applied migration is refused |
| 0.3 | Add a test runner — Vitest against throwaway in-memory SQLite, migrated through the production code path — and an `npm test` script | ✅ Tests covering the health check and the migration runner |
| 0.4 | CI: run `oxlint`, `tsc --noEmit`, `vitest`, `vinext build` on pull requests | ✅ [`ci.yml`](../.github/workflows/ci.yml); all four gates green |
| 0.5 | Add `tsconfig.tsbuildinfo` to [`.gitignore`](../.gitignore) — plus `/data/` and `*.db`, which hold personal data | ✅ Clean `git status` after a build; the database can never be committed |
| 0.6 | Decide and document: email provider for password reset, session lifetime, data region, password-hashing algorithm | ✅ [`decisions.md`](decisions.md), D-001 to D-009 |

---

## Phase 1 — Refactor (no visible change) ✅ (committed)

**Done.** The prototype went from one 1942-line file to 29 files, the largest 221 lines. All 11
routes render in dev and in the built server; filters round-trip through the URL. Two deliberate
deviations are noted under the table.

| # | Task | Acceptance |
|---|---|---|
| 1.1 | ✅ Real routes: `app/(app)/overview|transactions|analytics|budgets|categories|settings/page.tsx` and `app/(auth)/signin|signup|reset/page.tsx`. Replace the `page` state machine with the router; sidebar and mobile nav become `<Link>`s | Deep links work, browser back/forward works, refresh keeps you on the page |
| 1.2 | ✅ Extract the shell into `components/app-shell/` (sidebar, topbar, mobile-nav, footer) as a layout | Layout renders once, not per page |
| 1.3 | ✅ Extract feature components: `features/transactions/`, `features/budgets/`, `features/analytics/` (bar-chart, spending-breakdown, category-report), `features/overview/`, `features/settings/` | No file over ~250 lines |
| 1.4 | ✅ Extract pure logic to `lib/`: `money.ts` (paise ↔ INR, `money()`), `dates.ts` (`monthLabel`, month arithmetic, period → range), `aggregate.ts` (income/expense totals, breakdown, chart bucketing, category spend) | Each module is unit-tested and framework-free |
| 1.5 | ✅ Move filter state (`query`, `typeFilter`, `catFilter`, `period`, `from`, `to`, `month`) into URL search params via [`lib/use-filters.ts`](../lib/use-filters.ts) | Filtered views are shareable and survive refresh |
| 1.6 | ◐ Push static chrome to server components, keep interactive parts as client islands | Client bundle measurably smaller than today's baseline |
| 1.7 | ✅ Write unit tests for all of `lib/` against current prototype behaviour **before** 1.4 lands | Written first, unchanged by the extraction — see `test/money.spec.ts`, `test/dates.spec.ts`, `test/aggregate.spec.ts` |

**Deviation — 1.6 is partial, and cannot be finished until Phase 2/4.** Static chrome that *can*
be a server component already is: the auth layout and its story panel, the auth pages, and
[`app-footer.tsx`](../components/app-shell/app-footer.tsx). The six app pages
(`app/(app)/*/page.tsx`) remain client components because they read from the in-memory store in
[`components/app-state.tsx`](../components/app-state.tsx) — there is nothing to render on the
server until Phase 2 gives them a server data source. Revisit as part of Phase 4.

**Deviation — two Phase 6 fixes were pulled forward during the extraction, not deferred:**
- **6.3 (division by zero) is closed.** `percentage()` and `ratio()` in
  [`lib/money.ts`](../lib/money.ts) guard the zero-limit/zero-total case, and every call site uses
  them instead of raw division.
- **6.1 (unsafe category lookup) is closed for the shared components.**
  `getCategory()` in `app-state.tsx` is typed `Category | undefined` (no non-null assertion), and
  `CategoryIcon`/`CategoryPill` in [`components/category-icon.tsx`](../components/category-icon.tsx)
  render correctly when the category is `undefined`. The remaining places in Phase 6's table
  (`features/analytics/category-report.tsx`, the budgets and categories pages) look up categories
  from an already-filtered `categories` array, so the category is never missing there — nothing
  left to fix for 6.1.

Both deviations were unavoidable: extracting shared helpers forced a decision about what they do,
and reproducing `NaN%` or a crash deliberately would have been perverse.

**The state seam Phase 2 replaces:** [`components/app-state.tsx`](../components/app-state.tsx)
is a `useState`-backed context with this shape: `categories`, `transactions`, `budgets`,
`budgeting`, `notice`, plus `saveTransaction` / `deleteTransaction` / `saveCategory` /
`toggleArchive` / `saveBudget` / `getCategory`. Phase 2/4 give it the same shape backed by
`fetch('/api/*')` instead of `useState`. No page or feature component touches the data directly —
they all go through `useAppState()` — so the swap should not need to touch them.

---

## Phase 2 — Data layer ✅

**Done in the working tree.** Migration `0002_application_schema.sql` extends the Phase 0
bootstrap without modifying it. Repositories own all SQL, shared Zod schemas validate route
inputs, session lookup provides the Phase 3 auth seam, and route tests cover 401/422/403 behavior.

| # | Task | Acceptance |
|---|---|---|
| 2.1 | Schema migration(s): `users`, `sessions`, `password_resets`, `categories`, `transactions`, `budgets`, `user_settings`. Money stays **INTEGER paise** (D-005 — the prototype already does this, keep it, never floats). Dates stay `TEXT 'YYYY-MM-DD'`, months `TEXT 'YYYY-MM'`. `PRAGMA foreign_keys` is already enabled per connection in [`lib/db/client.ts`](../lib/db/client.ts) | Migration applies clean via `npm run db:migrate`; foreign keys and `ON DELETE` behaviour defined |
| 2.2 | Constraints: unique `(user_id, type, lower(name))` on categories (backs the duplicate-name check `components/dialogs/category-dialog.tsx` already does client-side); primary key `(user_id, month, category_id)` on budgets; `CHECK (amount_paise > 0)`; `CHECK (type IN ('income','expense'))` | Duplicate and invalid inserts are rejected by the database, not only the UI |
| 2.3 | Indexes: `transactions(user_id, date DESC)`, `transactions(user_id, category_id)`, `budgets(user_id, month)` | Query plans use them (`EXPLAIN QUERY PLAN`) |
| 2.4 | Repository layer in `lib/db/*.ts` (alongside the existing `client.ts`/`health.ts`) — every query scoped by `user_id`, fully parameterised, no string interpolation. This is also the seam that makes a later move to Postgres contained (D-008) | Typed functions; no raw SQL above this layer |
| 2.5 | Validation schemas (Zod or equivalent) shared by client and server for transaction, category, budget and settings payloads | One validation source; the server never trusts the client |
| 2.6 | Route handlers under `app/api/` (alongside the existing `app/api/health/route.ts`): transactions (list with filters and pagination, create, update, delete), categories (list, create, update, archive/restore), budgets (list by month, upsert, delete-on-zero), settings (get, patch) | Each returns 401 unauthenticated, 403 on cross-user access, 422 on invalid input |
| 2.7 | Seed each new account with the design's starter categories (Salary, Freelance, Rent & bills, Food & groceries, Shopping, Transport, Health & wellness — see [`lib/sample-data.ts`](../lib/sample-data.ts) for the exact list/colors) — but **not** the sample transactions | A new user lands on a genuine empty state, not fabricated money |

---

## Phase 3 — Authentication ✅

**Done in the working tree.** Signup, signin, signout, session protection, password changes,
rate limits, real identity rendering, and admin-assisted resets are implemented. Per D-004,
the reset-link flow was replaced by a local admin portal and forced password change.
Rate limits use a 15-minute in-process window: sign-up 5/IP, sign-in 10/IP and 5/account,
password change 5/user/IP, and admin reset 10/admin/IP. A future multi-process deployment
must replace the in-memory counter with a shared store before scaling beyond one server.

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Password hashing via WebCrypto PBKDF2-HMAC-SHA256, 600k iterations (measured at 199 ms on Node — D-001), per-user random salt, versioned hash string to allow future rehashing. The runtime is Node, so argon2id is a drop-in native module if InfoSec prefers it | Unit tests cover hash, verify, and rehash-on-login |
| 3.2 | Sign-up: name, email, password ≥8 characters. Normalise and validate email, reject duplicates without revealing account existence, create user + default categories + settings in one transaction | `POST /api/auth/signup` creates the account and signs the user in |
| 3.3 | Sign-in: constant-time verification, opaque session token, `HttpOnly` `Secure` `SameSite=Lax` cookie, server-side session row with expiry and rotation on login (see D-003 for the exact lifetimes) | Wrong password and unknown email are indistinguishable in both response and timing |
| 3.4 | Admin-assisted password reset per D-004: assign a temporary password, invalidate all existing sessions, record an audit event, and force a password change at next sign-in | Full flow works without email or another external system |
| 3.5 | **Sign-out.** There is currently no way out of the app — no sign-out control exists anywhere in the shell. Add it to the sidebar profile menu ([`components/app-shell/sidebar.tsx`](../components/app-shell/sidebar.tsx)) | Session row deleted, cookie cleared, redirect to `/signin` |
| 3.6 | Route protection: middleware redirecting unauthenticated users to `/signin` and authenticated users away from the `(auth)` route group | No `(app)` route renders data without a valid session |
| 3.7 | Rate limiting on sign-in, sign-up and reset (per IP and per account) | Brute force is throttled; thresholds documented |
| 3.8 | Replace hardcoded identity — sidebar `Chaitanya`/avatar `C` in `sidebar.tsx`, `chaitanya@example.com` in `app/(app)/settings/page.tsx` — with the session user; derive the avatar initial from the name | No literal personal names remain in the source |
| 3.9 | Remove preview scaffolding: the three "Preview sign in / registration / password reset" links and the `preview-note` in `app/(app)/settings/page.tsx`, the "Layout preview" topbar badge in `components/app-shell/topbar.tsx`, and the "Sample data for review" footer text in `components/app-shell/app-footer.tsx` | None of it ships to production |

---

## Phase 4 — Wire the UI to the backend

| # | Task | Acceptance |
|---|---|---|
| 4.1 | Transactions create / edit / delete against the API, with optimistic updates and rollback on failure — replaces the in-memory `saveTransaction`/`deleteTransaction` in `app-state.tsx` | Reload preserves every change; the existing toasts fire on server confirmation, not on click |
| 4.2 | Server-side filtering and pagination for the transactions list (search, type, category, month/year/custom range) — the filter shape already lives in [`lib/use-filters.ts`](../lib/use-filters.ts) and [`lib/aggregate.ts`](../lib/aggregate.ts), just needs a server-side implementation | A 10k-transaction account loads the list in one page; footer totals are computed server-side over the **full** filtered set, not the current page |
| 4.3 | Categories create / edit / archive / restore against the API; the duplicate-name error surfaces the database constraint from 2.2 | Archive is reversible and never orphans transactions |
| 4.4 | Budgets: per-`(month, category)` upsert; saving `0` deletes the row, matching the dialog's stated behaviour (`components/dialogs/budget-dialog.tsx`) | A September budget does not leak into October |
| 4.5 | Settings persistence: `budgeting_enabled` and `appearance` move into `user_settings` — replaces the `useState` in `app-state.tsx` and `components/theme-provider.tsx` | The budgeting toggle and theme survive reload and follow the user across devices |
| 4.6 | Analytics aggregation in SQL (`GROUP BY`) rather than pulling every row to the client — replaces the client-side `lib/aggregate.ts` computation for the analytics page specifically (keep `aggregate.ts` for anything still computed client-side) | Analytics response time stays flat as transaction count grows |
| 4.7 | Loading and error states for every fetch — there is currently an empty state and a toast, but no skeletons and no failure path | Each page has skeleton, empty and error variants; failures are recoverable |
| — | **Complete Phase 1.6**, now that pages have a server data source | The app pages move to server components where the data fetch allows it |

---

## Phase 5 — Features the design implies but does not deliver

| # | Task | Notes |
|---|---|---|
| 5.1 | **Category icons.** [`lib/category-icons.ts`](../lib/category-icons.ts) hardcodes icons against the seven seed slugs. Any category created through the UI gets a `crypto.randomUUID()` id and silently falls back to the generic `Tags` icon. Add an `icon` column and an icon picker to `components/dialogs/category-dialog.tsx` | Without this, the design's per-category iconography breaks the moment a user adds a category |
| 5.2 | **Currency and timezone** are rendered as static text (`INR · ₹`, `Asia/Kolkata`) in `app/(app)/settings/page.tsx`. Either make them real settings or mark them explicitly fixed | Decide either way; do not ship a control that looks editable and is not |
| 5.3 | **Delete a category.** Only archive exists today (`toggleArchive` in `app-state.tsx`). Users will expect delete for a mistyped category — needs a reassign-or-block rule for attached transactions | |
| 5.4 | **Archived categories still appear** in the Transactions category filter dropdown (`features/transactions/filter-bar.tsx`). Filter them out, or group them under an "Archived" heading | |
| 5.5 | Copy budgets from the previous month. The month-keyed budget model (`${month}:${categoryId}` in `lib/aggregate.ts`'s `budgetKey`) makes re-entering every limit each month tedious | Nominally a nice-to-have, but the per-month model makes it near-mandatory in practice |
| 5.6 | Account management: change name, change email (with re-verification), change password, delete account | Account deletion is a DPDP obligation, not a nice-to-have — see Phase 7 |

---

## Phase 6 — Correctness fixes

Two of these (6.1 partially, 6.3 fully) were already closed as a side effect of Phase 1 — see
the deviation notes under Phase 1. The rest are open.

| # | Issue | Location |
|---|---|---|
| 6.1 | ~~Unsafe category lookup~~ — **closed for shared components** in Phase 1 (`getCategory` returns `Category \| undefined`, `CategoryIcon`/`CategoryPill` handle it). Re-check `features/analytics/category-report.tsx` and the budgets/categories pages if their category source ever stops being a pre-filtered array | `components/category-icon.tsx`, `components/app-state.tsx` |
| 6.2 | Timezone bugs: chart bucketing in `buildChartData` uses `new Date(...).toISOString().slice(0,10)`, which in IST shifts dates across bucket boundaries; the `new Date(month + '-02')` pattern used throughout parses as UTC | [`lib/aggregate.ts`](../lib/aggregate.ts) (`buildChartData`), [`lib/dates.ts`](../lib/dates.ts) (`monthLabel`, `moveMonth`) |
| 6.3 | ~~Division by zero~~ — **closed in Phase 1.** `percentage()`/`ratio()` in `lib/money.ts` guard the zero case; every call site uses them | [`lib/money.ts`](../lib/money.ts) |
| 6.4 | `<input type="month">` is unsupported in Safari — the month picker is dead on iOS and macOS Safari | [`components/app-shell/page-heading.tsx`](../components/app-shell/page-heading.tsx) |
| 6.5 | Client-generated `crypto.randomUUID()` ids become server-assigned | `components/app-state.tsx` (`saveTransaction`, `saveCategory`) — resolved naturally by Phase 4's API wiring |
| 6.6 | Replace the hand-rolled `<div>` bar chart with Recharts — already a dependency, and [`components/ui/chart.tsx`](../components/ui/chart.tsx) exists unused. Gains accessible tooltips and real axes | [`features/analytics/bar-chart.tsx`](../features/analytics/bar-chart.tsx) |
| 6.7 | Long lists need virtualization or capped pagination — the design renders every matching row | [`features/transactions/transaction-list.tsx`](../features/transactions/transaction-list.tsx) — largely subsumed by Phase 4.2's server-side pagination |

---

## Phase 7 — Quality, security, compliance

| # | Task |
|---|---|
| 7.1 | Accessibility audit. The design is already careful (`aria-label`, `role="progressbar"`, `role="alert"`, `role="status"`). Verify focus traps in dialogs (`components/dialogs/`), focus return on close, keyboard reachability of the segmented bar and category-report buttons, colour contrast for user-chosen category colours, and correct toast announcement |
| 7.2 | Responsive verification at 360 / 768 / 1024 / 1440 px — mobile nav, `mobile-category-badge` and `mobile-avatar` paths |
| 7.3 | Security headers (CSP, HSTS, `X-Content-Type-Options`), CSRF protection on mutating routes, secrets supplied only via environment/secrets manager on the host — **never** `wrangler secret` (there is no Worker — see D-008) |
| 7.4 | Integration tests: auth flows, per-user data isolation (user A cannot read or write user B's data), budget month boundaries, aggregation correctness |
| 7.5 | End-to-end happy path: sign up → add transaction → set budget → view analytics → sign out |
| 7.6 | **DPDP Act 2023 compliance** — see Risks below |
| 7.7 | Observability: structured logs (no PII, no amounts), error tracking, SQLite query timing |

---

## Risks and flags

**Compliance needs a decision before launch, not after.** The moment Phase 3 ships, this stores
real names, email addresses and personal financial records. Under the DPDP Act 2023 that
triggers: a consent notice at sign-up, stated purpose limitation, a retention policy, working
data export and account deletion (tasks 7.4 and 5.6), a breach-notification procedure, and a
named grievance officer. If this is a Surya-Fintech product rather than a personal project, it
also needs InfoSec sign-off on D-001 (password hashing) and D-008's open items (backups,
encryption at rest, host provisioning). Route this through compliance now — retrofitting consent
and deletion after launch is far more expensive. Data residency itself is resolved (D-002/D-008):
the app runs on India-hosted infrastructure with SQLite on the same host, specifically to avoid
the Cloudflare D1 residency gap.

**Sample data is seeded with a real-looking person** — `Chaitanya`, `chaitanya@example.com`, and
33 transactions including salary figures, in [`lib/sample-data.ts`](../lib/sample-data.ts). Tasks
2.7 and 3.8 remove it; make sure it never reaches a production database.

**PBKDF2 versus argon2id** (task 3.1) is recorded in D-001 with real benchmark numbers (199ms on
Node for 600k iterations). Node makes an argon2id swap straightforward if InfoSec requires it —
this is a much smaller risk now than it was under the original Workers plan.

**Phase 1 is done and committed** — its tests (`test/money.spec.ts`, `test/dates.spec.ts`,
`test/aggregate.spec.ts`) were written first and are the safety net for Phase 6.2's timezone fix
and Phase 6.6's chart replacement; run them before and after either change.

---

## Sequencing

```
Phase 0 ✅ ──► Phase 1 ✅ ──► Phase 2 ✅ ──► Phase 3 ✅ ──► Phase 4 ──► Phase 5
                                  │                        │
                                  └──► Phase 6 (parallel) ◄┘
                                             │
                                             └──► Phase 7 (7.6 already active since Phase 0)
```

Phase 4 is next. Phases 0–4 are the critical path — completing them is the point
at which every feature in the design is genuinely functional. Phase 5 closes the gaps the
prototype hides, Phase 6 can run alongside Phase 4, and Phase 7 gates launch.
