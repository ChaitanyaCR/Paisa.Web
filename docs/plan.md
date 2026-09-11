# Paisa.Web — Implementation Plan

> Turning the screen prototype in [`app/page.tsx`](../app/page.tsx) into a working product.
>
> **Architecture decision:** Cloudflare D1 backend with real authentication.
> **Refactor decision:** modularise `app/page.tsx` before adding features.

---

## Where things stand

`app/page.tsx` is a 1942-line `'use client'` component holding the entire product: 6 pages, 4 dialogs,
3 auth screens, charts, filters and toasts — all driven by `useState` over seeded sample data. It is a
faithful, complete UI spec. Nothing behind it is real: no routes, no API, no database, no auth, no
persistence. D1 and R2 are wired into [`vite.config.ts`](../vite.config.ts) but disabled
(`.openai/hosting.json` has both `null`).

The Settings screen states this outright: *"This review uses sample data in memory. Changes reset when
the page reloads. Authentication and cross-device sync are not connected yet."*

So "implement every feature in the design" means: keep the UI, build the product underneath it, and
close the gaps the prototype papers over.

---

## Phase 0 — Foundations

Blocks everything else.

| # | Task | Acceptance |
|---|---|---|
| 0.1 | Enable D1: set `d1: "DB"` in [`.openai/hosting.json`](../.openai/hosting.json), provision the real database, confirm the binding reaches the Worker in `wrangler dev` and on deploy | `SELECT 1` succeeds from a route handler locally and in production |
| 0.2 | Add migrations tooling (`migrations/NNNN_*.sql` plus an `npm run db:migrate` wrapper over `wrangler d1 migrations apply`) | Migrations apply to local Miniflare and remote, idempotently |
| 0.3 | Add a test runner — Vitest with `@cloudflare/vitest-pool-workers` so tests run against real D1 — and an `npm test` script | One passing smoke test hitting a D1-backed handler |
| 0.4 | CI: run `oxlint`, `tsc --noEmit`, `vitest`, `vinext build` on pull requests | Red CI blocks merge |
| 0.5 | Add `tsconfig.tsbuildinfo` to [`.gitignore`](../.gitignore) | Clean `git status` after a build |
| 0.6 | Decide and document: email provider for password reset, session lifetime, D1 data region, password-hashing algorithm | Written into `docs/decisions.md` |

---

## Phase 1 — Refactor (no visible change)

The goal is that a reviewer diffing the rendered output sees nothing. Do this before any feature work;
every later task shrinks as a result.

| # | Task | Acceptance |
|---|---|---|
| 1.1 | Real routes: `app/(app)/overview|transactions|analytics|budgets|categories|settings/page.tsx` and `app/(auth)/signin|signup|reset/page.tsx`. Replace the `page` state machine with the router; sidebar and mobile nav become `<Link>`s | Deep links work, browser back/forward works, refresh keeps you on the page |
| 1.2 | Extract the shell into `components/app-shell/` (sidebar, topbar, mobile-nav, footer) as a layout | Layout renders once, not per page |
| 1.3 | Extract feature components: `features/transactions/` (list, row, filter-bar, dialog), `features/categories/`, `features/budgets/`, `features/analytics/` (summary, bar-chart, spending-breakdown, category-report), `features/settings/` | No file over ~250 lines |
| 1.4 | Extract pure logic to `lib/`: `money.ts` (paise ↔ INR, `money()`), `dates.ts` (`monthLabel`, month arithmetic, period → range), `aggregate.ts` (income/expense totals, breakdown, chart bucketing, category spend) | Each module is unit-tested and framework-free |
| 1.5 | Move filter state (`query`, `typeFilter`, `catFilter`, `period`, `from`, `to`, `month`) into URL search params | Filtered views are shareable and survive refresh; the `navigate()` filter reset becomes a link without params |
| 1.6 | Push static chrome to server components, keep interactive parts as client islands | Client bundle measurably smaller than today's baseline |
| 1.7 | Write unit tests for all of `lib/` against current prototype behaviour **before** 1.4 lands | Tests pass against both the old and new code |

---

## Phase 2 — Data layer

| # | Task | Acceptance |
|---|---|---|
| 2.1 | Schema migration: `users`, `sessions`, `password_resets`, `categories`, `transactions`, `budgets`, `user_settings`. Money stays **INTEGER paise** (the prototype already does this — keep it, never floats). Dates stay `TEXT 'YYYY-MM-DD'`, months `TEXT 'YYYY-MM'` | Migration applies clean; foreign keys and `ON DELETE` behaviour defined |
| 2.2 | Constraints: unique `(user_id, type, lower(name))` on categories (backs the duplicate-name check the dialog already does client-side); primary key `(user_id, month, category_id)` on budgets; `CHECK (amount_paise > 0)`; `CHECK (type IN ('income','expense'))` | Duplicate and invalid inserts are rejected by the database, not only the UI |
| 2.3 | Indexes: `transactions(user_id, date DESC)`, `transactions(user_id, category_id)`, `budgets(user_id, month)` | Query plans use them |
| 2.4 | Repository layer in `lib/db/*.ts` — every query scoped by `user_id`, fully parameterised, no string interpolation | Typed functions; no raw SQL above this layer |
| 2.5 | Validation schemas (Zod or equivalent) shared by client and server for transaction, category, budget and settings payloads | One validation source; the server never trusts the client |
| 2.6 | Route handlers under `app/api/`: transactions (list with filters and pagination, create, update, delete), categories (list, create, update, archive/restore), budgets (list by month, upsert, delete-on-zero), settings (get, patch) | Each returns 401 unauthenticated, 403 on cross-user access, 422 on invalid input |
| 2.7 | Seed each new account with the design's starter categories (Salary, Freelance, Rent & bills, Food & groceries, Shopping, Transport, Health & wellness) — but **not** the sample transactions | A new user lands on a genuine empty state, not fabricated money |

---

## Phase 3 — Authentication

The design defines three auth screens and states plainly that they do nothing. This phase makes them real.

| # | Task | Acceptance |
|---|---|---|
| 3.1 | Password hashing via WebCrypto PBKDF2-HMAC-SHA256, ≥600k iterations, per-user random salt, versioned hash string to allow future rehashing. *(bcrypt and argon2 have no native Workers support — if InfoSec mandates argon2id, budget for a WASM build; decide in 0.6.)* | Unit tests cover hash, verify, and rehash-on-login |
| 3.2 | Sign-up: name, email, password ≥8 characters. Normalise and validate email, reject duplicates without revealing account existence, create user + default categories + settings in one transaction | `POST /api/auth/signup` creates the account and signs the user in |
| 3.3 | Sign-in: constant-time verification, opaque session token, `HttpOnly` `Secure` `SameSite=Lax` cookie, server-side session row with expiry and rotation on login | Wrong password and unknown email are indistinguishable in both response and timing |
| 3.4 | Password reset: single-use, hashed, short-TTL token; email delivery via the provider chosen in 0.6; **plus a `/reset/[token]` completion screen the design omits**; always respond "if that email exists…" | Full flow works: request → email → set new password → all existing sessions invalidated |
| 3.5 | **Sign-out.** The design imports the `LogOut` icon but never uses it — there is no way out of the app. Add it to the sidebar profile menu | Session row deleted, cookie cleared, redirect to `/signin` |
| 3.6 | Route protection: middleware redirecting unauthenticated users to `/signin` and authenticated users away from the auth screens | No app route renders data without a valid session |
| 3.7 | Rate limiting on sign-in, sign-up and reset (per IP and per account) | Brute force is throttled; thresholds documented |
| 3.8 | Replace hardcoded identity — sidebar `Chaitanya`, avatar initial `C`, `chaitanya@example.com` in Settings — with the session user; derive the avatar initial from the name | No literal personal names remain in the source |
| 3.9 | Remove preview scaffolding: the three "Preview sign in / registration / password reset" buttons and the `preview-note` in Settings, the "Layout preview" topbar badge, and the "Sample data for review" footer text | None of it ships to production |

---

## Phase 4 — Wire the UI to the backend

| # | Task | Acceptance |
|---|---|---|
| 4.1 | Transactions create / edit / delete against the API, with optimistic updates and rollback on failure | Reload preserves every change; the existing toasts fire on server confirmation, not on click |
| 4.2 | Server-side filtering and pagination for the transactions list (search, type, category, month/year/custom range) | A 10k-transaction account loads the list in one page; footer totals are computed server-side over the **full** filtered set, not the current page |
| 4.3 | Categories create / edit / archive / restore against the API; the duplicate-name error surfaces the database constraint | Archive is reversible and never orphans transactions |
| 4.4 | Budgets: per-`(month, category)` upsert; saving `0` deletes the row, matching the dialog's stated behaviour | A September budget does not leak into October |
| 4.5 | Settings persistence: `budgeting_enabled` and `appearance` move into `user_settings` | The budgeting toggle and theme survive reload and follow the user across devices |
| 4.6 | Analytics aggregation in SQL (`GROUP BY`) rather than pulling every row to the client | Analytics response time stays flat as transaction count grows |
| 4.7 | Loading and error states for every fetch — the design has an empty state and a toast, but no skeletons and no failure path | Each page has skeleton, empty and error variants; failures are recoverable |

---

## Phase 5 — Features the design implies but does not deliver

| # | Task | Notes |
|---|---|---|
| 5.1 | **Category icons.** The `icons` map is hardcoded against the seven seed slugs. Any category created through the UI gets a `crypto.randomUUID()` id and silently falls back to the generic `Tags` icon. Add an `icon` column and an icon picker to the category dialog | Without this, the design's per-category iconography breaks the moment a user adds a category |
| 5.2 | **Currency and timezone** are rendered as static text (`INR · ₹`, `Asia/Kolkata`). Either make them real settings or mark them explicitly fixed | Decide either way; do not ship a control that looks editable and is not |
| 5.3 | **Delete a category.** Only archive exists today. Users will expect delete for a mistyped category — needs a reassign-or-block rule for attached transactions | |
| 5.4 | **Archived categories still appear** in the Transactions category filter dropdown. Filter them out, or group them under an "Archived" heading | |
| 5.5 | Copy budgets from the previous month. The month-keyed budget model makes re-entering every limit each month tedious | Nominally a nice-to-have, but the per-month model makes it near-mandatory in practice |
| 5.6 | Account management: change name, change email (with re-verification), change password, delete account | Account deletion is a DPDP obligation, not a nice-to-have — see Phase 7 |

---

## Phase 6 — Correctness fixes

| # | Issue | Location |
|---|---|---|
| 6.1 | `getCat(id)!` non-null asserts. A transaction whose category was deleted crashes the render with a TypeError | [`app/page.tsx:216`](../app/page.tsx#L216) and roughly 8 call sites |
| 6.2 | Timezone bugs: chart bucketing uses `new Date(...).toISOString().slice(0,10)`, which in IST shifts dates across bucket boundaries; the `new Date(month + '-02')` pattern parses as UTC | [`app/page.tsx:565-575`](../app/page.tsx#L565-L575), plus `moveMonth` and `monthLabel` |
| 6.3 | Division by zero: percentage math (`c.total / expense`, `spent / limit`) yields `NaN` or `Infinity` in edge cases. Several call sites are guarded, several are not | Analytics and budget cards |
| 6.4 | `<input type="month">` is unsupported in Safari — the month picker is dead on iOS and macOS Safari | [`app/page.tsx:855`](../app/page.tsx#L855) |
| 6.5 | Client-generated `crypto.randomUUID()` ids become server-assigned | Transaction and category creation |
| 6.6 | Replace the hand-rolled `<div>` bar chart with Recharts — already a dependency, and [`components/ui/chart.tsx`](../components/ui/chart.tsx) exists unused. Gains accessible tooltips and real axes | [`app/page.tsx:598-660`](../app/page.tsx#L598-L660) |
| 6.7 | Long lists need virtualization or capped pagination — the design renders every matching row | Transactions list |

---

## Phase 7 — Quality, security, compliance

| # | Task |
|---|---|
| 7.1 | Accessibility audit. The design is already careful (`aria-label`, `role="progressbar"`, `role="alert"`, `role="status"`). Verify focus traps in dialogs, focus return on close, keyboard reachability of the segmented bar and category-report buttons, colour contrast for user-chosen category colours, and correct toast announcement |
| 7.2 | Responsive verification at 360 / 768 / 1024 / 1440 px — mobile nav, `mobile-category-badge` and `mobile-avatar` paths |
| 7.3 | Security headers (CSP, HSTS, `X-Content-Type-Options`), CSRF protection on mutating routes, secrets supplied only via `wrangler secret` |
| 7.4 | Integration tests: auth flows, per-user data isolation (user A cannot read or write user B's data), budget month boundaries, aggregation correctness |
| 7.5 | End-to-end happy path: sign up → add transaction → set budget → view analytics → sign out |
| 7.6 | **DPDP Act 2023 compliance** — see Risks below |
| 7.7 | Observability: structured logs (no PII, no amounts), error tracking, D1 query timing |

---

## Risks and flags

**Compliance needs a decision before launch, not after.** The moment Phase 3 ships, this stores real
names, email addresses and personal financial records. Under the DPDP Act 2023 that triggers: a consent
notice at sign-up, stated purpose limitation, a retention policy, working data export and account
deletion (tasks 7.4 and 5.6), a breach-notification procedure, and a named grievance officer. If this is
a Surya-Fintech product rather than a personal project, it also needs InfoSec sign-off on the D1 data
region and the password-hashing choice. Route this through compliance during Phase 0 — retrofitting
consent and deletion after launch is far more expensive.

**Sample data is seeded with a real-looking person** — `Chaitanya`, `chaitanya@example.com`, and 33
transactions including salary figures. Tasks 2.7 and 3.8 remove it; make sure it never reaches a
production database.

**PBKDF2 versus argon2id** (task 3.1) is the one technical decision that could force rework. Workers has
no native argon2, so if InfoSec mandates it, that is a WASM dependency to scope during Phase 0.

**Phase 1 is a large no-visible-change commit.** Land task 1.7's tests first so the refactor is
verifiable rather than eyeballed.

---

## Sequencing

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
                 │                                    │
                 └──► Phase 6 (parallel) ◄────────────┘
                                  │
                                  └──► Phase 7 (7.6 starts in Phase 0)
```

Phases 0–4 are the critical path — completing them is the point at which every feature in the design is
genuinely functional. Phase 5 closes the gaps the prototype hides, Phase 6 can run alongside Phase 4,
and Phase 7 gates launch.
