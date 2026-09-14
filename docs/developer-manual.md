# Paisa.Web — Developer Manual

Engineering reference for the people who maintain this codebase. It covers how the
system is wired, where each concern lives, how to debug the failures this stack
actually produces, and the traps that are easy to fall into.

**This is not a user manual.** For product behaviour, read the UI.

**Companion docs — read in this order when you are new:**

| Doc | What it answers |
|---|---|
| This manual | *How does it work, and where do I look when it breaks?* |
| [`decisions.md`](decisions.md) | *Why is it built this way?* — D-001…D-010 are binding constraints |
| [`plan.md`](plan.md) | *What is done, what is left?* — phase status |
| [`launch-checklist.md`](launch-checklist.md) | *What must the operator do before launch?* — non-code gates |

---

## 1. System at a glance

```
Browser
  │  fetch('/api/*')  — cookie `session`, HttpOnly, SameSite=Lax
  ▼
proxy.ts ─────────────────── route guard + security headers (every matched path)
  │
  ▼
app/api/**/route.ts ──────── HTTP edge: authn/authz, Zod validation, error mapping
  │
  ▼
lib/db/*.ts ──────────────── repository layer — the ONLY code that writes SQL
  │
  ▼
better-sqlite3 (synchronous) ──► data/budget.db  (WAL, foreign_keys=ON)
```

Rendering is React 19 RSC built by **vinext** (a Next-compatible layer on Vite),
bundled for production by **Nitro** with `NITRO_PRESET=node` into a standalone
server at `.output/server/index.mjs`. There is no Next.js runtime, no Cloudflare,
no D1 — see D-008 before you reintroduce any of them.

### Layer responsibilities — hold this line

| Layer | Does | Must never do |
|---|---|---|
| `app/api/**/route.ts` | Auth, parse, validate, map errors to HTTP | Write SQL |
| `lib/db/*.ts` | All SQL, all user scoping | Read `Request`, return `Response` |
| `lib/validation.ts` | Every input schema | Touch the DB |
| `components/app-state.tsx` | Client data fetching + optimistic mutation | Hold business rules |
| `features/*`, `app/(app)/*` | Presentation only | `fetch()` directly |

The repository layer being the sole SQL surface is what makes a future Postgres
move contained (D-008). Bypassing it is the single most expensive shortcut
available in this codebase.

---

## 2. Repository map

| Path | Contents |
|---|---|
| `app/(app)/` | Authenticated pages. `layout.tsx` mounts every provider. |
| `app/(auth)/` | Sign-in, sign-up, reset — no app shell. |
| `app/api/` | Route handlers. One file per resource, verbs as named exports. |
| `components/app-shell/` | Sidebar, topbar, mobile nav, page heading. |
| `components/dialogs/` | Dialog provider + the four entity dialogs. |
| `components/ui/` | shadcn primitives. **Lint-exempt, do not hand-edit** (D-007). |
| `features/` | Page-specific composites (charts, lists, filter bar). |
| `lib/db/` | Repository layer, one module per table/concern. |
| `lib/auth/` | Password hashing, cookie shaping, rate limiting. |
| `migrations/` | Forward-only, checksummed `NNNN_*.sql`. |
| `scripts/migrate.mjs` | Migration runner — also imported directly by tests. |
| `test/` | Vitest, Node environment, real SQLite. |

`.next/`, `.vinext/`, `.output/`, `dist/`, `tsconfig.tsbuildinfo` are build
artefacts. If behaviour looks stale and impossible, delete them first (§9).

---

## 3. Request lifecycle — trace this when something 401s or 403s

### 3.1 `proxy.ts` (page requests)

Runs on every path in its `config.matcher`. For `/api/*` it *only* attaches
security headers. For pages it enforces, in order:

1. Public paths (`/signin`, `/signup`, `/reset`, `/privacy`) → redirect to
   `/overview` (or `/change-password`) if already signed in.
2. No session → `/signin`.
3. `mustChangePassword` → forced to `/change-password`.
4. `/admin/*` with `role !== 'admin'` → `/overview`.

The CSP is set here, inline, as a string literal. `script-src` includes
`'unsafe-inline'` — required by the current RSC inline bootstrap. Any new
third-party asset must be added here or it is silently blocked by the browser.

### 3.2 `requireUser()` in [`lib/api.ts`](../lib/api.ts) (API requests)

Every authenticated route starts with the same three lines:

```ts
const user = requireUser(request);
if (isResponse(user)) return user;
```

`requireUser` returns **either an `ApiUser` or a `Response`** — `isResponse()` is
the discriminator. Forgetting that guard is a type error, which is deliberate.

It performs, in order:

| Check | Failure |
|---|---|
| Same-origin for mutating verbs | `403 CSRF_REJECTED` |
| `session` cookie present | `401 UNAUTHENTICATED` |
| Session row valid, unexpired, seen < 14d | `401 UNAUTHENTICATED` |
| `mustChangePassword` not set | `403 PASSWORD_CHANGE_REQUIRED` |

`allowPasswordChangeRequired: true` opts out of the last check. Exactly three
routes use it: `/api/auth/me`, `/api/auth/signout`, `/api/auth/change-password`.
If a user is stuck in a redirect loop on `/change-password`, this flag is the
first thing to check.

### 3.3 Error contract

All errors go through `apiError(status, code, message, details?)` and come back as:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": {} } }
```

`mapDbError()` translates SQLite failures into stable codes. The mapping is by
**error message matching** — brittle by nature, so it is centralised in one place:

| Thrown / matched | HTTP | Code |
|---|---|---|
| `CATEGORY_NOT_FOUND` | 422 | `INVALID_CATEGORY` |
| `CATEGORY_IN_USE` | 409 | `CATEGORY_IN_USE` |
| `CATEGORY_NAME_INDEX` (unique index) | 422 | `DUPLICATE_CATEGORY` |
| `…constraint…` | 422 | `CONSTRAINT_ERROR` |
| anything else | 500 | `INTERNAL_ERROR` (logged, not exposed) |

The index name is not a literal at the HTTP edge: it is exported as
`CATEGORY_NAME_INDEX` from [`lib/db/categories.ts`](../lib/db/categories.ts), and
`test/data-layer.spec.ts` asserts the migrated schema still defines an index by
that name. Renaming it in a migration without updating the constant now fails a
test instead of silently degrading to a generic 422.

### 3.4 `PATCH /api/categories/:id` multiplexes two operations

Archive-toggle and field-update share one verb. The body is read **once** and
discriminated by a Zod union, `z.union([archiveSchema, categoryUpdateSchema])`:
`categoryUpdateSchema` strips unknown keys and rejects an empty patch, so an
`{ archived }` body can only match the first member. If you add a third
operation, extend that union — do not re-clone the request.

---

## 4. Authentication and sessions

### Passwords — [`lib/auth/password.ts`](../lib/auth/password.ts)

PBKDF2-HMAC-SHA256, 600,000 iterations, 32-byte key, per-password random salt.
Stored in a **versioned string**:

```
pbkdf2$sha256$600000$<salt-b64url>$<hash-b64url>
```

The version prefix is the upgrade path. `needsRehash()` is called on every
successful sign-in, and a stale hash is silently upgraded — raising the iteration
count or swapping to argon2id therefore needs no forced reset (D-001).

Two timing-attack defences worth knowing before you "simplify" them:

- `signin/route.ts` holds a module-level `dummyHash` promise and verifies against
  it when the email does not exist, so a missing account costs the same ~199 ms as
  a wrong password. **Do not short-circuit on `!user`.**
- `setup-admin/route.ts` compares the bootstrap token with `timingSafeEqual`, and
  returns `404` (not `401`) when it fails, so the endpoint is not discoverable.

### Sessions — [`lib/db/sessions.ts`](../lib/db/sessions.ts)

- Token: 32 random bytes, base64url. **Only its SHA-256 hash is stored.** The
  plaintext token exists only in the cookie; a database leak does not yield
  sessions.
- Absolute expiry 30 days; idle expiry 14 days (`last_seen_at`).
- `findSessionUser()` has a **write side effect** — it refreshes `last_seen_at`.
  It runs on every proxy-matched page request and every API call, so the write is
  throttled: the `UPDATE` only fires when `last_seen_at` is more than five minutes
  old. Idle expiry has 14-day granularity, so the sliding window stays accurate
  without a write per request. Covered by `test/data-layer.spec.ts`.
- Password change and admin reset both call `deleteUserSessions()` — all other
  devices are signed out by design.

### Admin-assisted reset (there is no email — D-004)

`POST /api/admin/users/:id/reset-password` sets a temporary password, forces
`must_change_password = 1`, kills the target's sessions, and writes a row to
`admin_audit_log` — all inside one transaction (`lib/db/admin.ts`). The temporary
password is delivered out of band by the admin. V1 has no self-service reset;
`/reset` is an informational page.

### Rate limiting — the known scale ceiling

[`lib/auth/rate-limit.ts`](../lib/auth/rate-limit.ts) is an **in-process `Map`**.

- It resets on every deploy or restart.
- It is per-process, so **it stops working correctly the moment you run more than
  one application process.** Replace it with a shared store before horizontal
  scaling. This is tracked in `plan.md` as a scale prerequisite.

Current limits: sign-in 10/IP and 5/account per 15 min; sign-up 5/IP;
change-password 5; admin reset 10.

---

## 5. Data model

Five migrations, current `schema_version = '0005'`.

```
users ─┬─ sessions            (ON DELETE CASCADE)
       ├─ password_resets     (CASCADE)  — created in 0002, unused in V1 (D-004)
       ├─ categories          (CASCADE)
       ├─ transactions        (CASCADE)  ─► categories  (RESTRICT)
       ├─ budgets             (CASCADE)  ─► categories  (RESTRICT)
       ├─ user_settings       (CASCADE)
       └─ admin_audit_log     (RESTRICT, both sides)
```

### Invariants the schema enforces — rely on these

- **Money is integer paise, always.** `amount_paise INTEGER CHECK (> 0)`. Never a
  float, never rupees. Convert at the UI edge only, with `toPaise`/`toRupees`
  (D-005). A float amount is rejected by both Zod and the CHECK constraint.
- **Dates are timezone-free ISO text.** `GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`.
  Date comparison is string comparison; ranges are plain `>=` / `<=`.
- **A transaction's type must match its category's type.** Enforced by a composite
  FK `(user_id, category_id, type) → categories(user_id, id, type)`. This is why
  `categories` carries the otherwise-redundant `UNIQUE (user_id, id, type)`.
- **Categories in use cannot be deleted** — `RESTRICT`, plus an explicit
  pre-check in `deleteCategory()` that raises `CATEGORY_IN_USE`. Archive instead.
- **Category names are unique per user per type**, case-insensitively
  (`categories_user_type_name` on `lower(name)`).
- **Every query in `lib/db/` is scoped by `user_id`.** Reads, writes and
  ownership probes. There is no unscoped accessor, and adding one is a
  cross-tenant data leak.

`transactions.user_id` is denormalised specifically so scoping never requires a
join through `categories`.

### Ownership vs. existence

`forbiddenOrNotFound(ownerId, userId)` distinguishes *someone else's row* (403)
from *no such row* (404) using `transactionOwner()` / `categoryOwner()` — the only
two intentionally unscoped lookups, and they return nothing but an owner id.

### Migrations — forward-only and checksummed (D-006)

`scripts/migrate.mjs` hashes each `.sql` file and records it in `_migrations`.
**Editing an applied migration throws**:

```
Migration 0002_application_schema.sql changed after it was applied.
Add a new migration instead of editing an applied one.
```

That is the guard working. Fix forward with `npm run db:create -- <name>`. Each
migration runs inside a transaction; bump `schema_meta.schema_version` at the end
to match the migration's own number. `test/health.spec.ts` derives the expected
value from the highest-numbered migration file, so adding a migration does not
break it — but **forgetting the `schema_meta` bump does**, which is the point.

SQLite's `ALTER TABLE` is limited: you can add a column but not drop one or change
a CHECK. Non-trivial changes need the create-copy-swap dance inside the migration.

---

## 6. Client data flow

### `components/app-state.tsx` — the one seam

A single React context. Every page and feature component reads and mutates through
`useAppState()`; nothing else calls `fetch` for app data (D-010).

**The load effect** fires on any filter change or `revision` bump and fetches four
endpoints in parallel — categories, transactions, budgets, settings. Notes:

- It uses an `AbortController`; rapid filter changes cancel in flight. `AbortError`
  is swallowed deliberately — do not surface it as an error.
- If *any* of the four fails, the whole load errors. There is no partial state.
- `reload()` increments `revision`, which is the only way to force a refetch.

**Mutations** are optimistic for transactions (apply locally, snapshot `before`,
roll back on failure) and pessimistic elsewhere (await, then `reload()`).
Optimistic-then-reload means a successful write costs two round trips; that is the
accepted trade for a UI that never shows a stale list.

**Budgets are keyed `${month}:${categoryId}`** via `budgetKey()`. Amounts and
spending are kept in two parallel maps, `budgets` and `budgetSpending`.

Other providers: `AuthUserProvider` (identity, from `/api/auth/me`),
`DialogProvider`, `Toast` and `DataStatus` (the global loading/error banner) are
mounted in `app/(app)/layout.tsx`; `ThemeProvider` sits higher, in the root
`app/layout.tsx`, so the auth screens are themed too.

### Filter state lives in the URL — [`lib/use-filters.ts`](../lib/use-filters.ts)

`month`, `q`, `type`, `category`, `period`, `from`, `to`, `page`. Values at their
default are **deleted** from the query string, so a clean view has a clean URL and
navigating to a bare route resets the filters. The default month is
`currentMonth()` from [`lib/dates.ts`](../lib/dates.ts) — the real calendar month,
evaluated per render, in local time. Because these params drive the load
effect, a filter bug and a data bug look identical — check the URL first.

`useSearchParams()` requires the `<Suspense>` boundary in `app/(app)/layout.tsx`.
Removing it breaks the build, not just the runtime.

### Aggregation runs in two places — keep them honest

[`lib/aggregate.ts`](../lib/aggregate.ts) holds pure client-side helpers
(`filterTransactions`, `buildBreakdown`, `buildCategoryReport`, `buildChartData`).
`lib/db/analytics.ts` computes the same shapes in SQL for the analytics endpoint —
then feeds its daily rows back through `buildChartData()` so bucketing logic exists
once. If you change bucketing, `test/aggregate.spec.ts` covers it; the SQL side has
coverage in `test/data-layer.spec.ts`.

---

## 7. Dates and money — the two places bugs hide

**Dates.** Everything is a `YYYY-MM-DD` string. `addDays()` computes in UTC
explicitly so a bucket boundary never shifts with the viewer's timezone. Display
formatters parse with a `T12:00:00` anchor for the same reason — noon is far from
either boundary. If you find a `new Date(dateString)` without an anchor, it is a
timezone bug waiting for a user in a negative-offset zone.

**Money.** `money()` formats `en-IN` (lakh/crore grouping) and drops decimals for
whole-rupee amounts. `percentage()` and `ratio()` return `0` for a zero
denominator rather than `NaN`/`Infinity` — use them instead of dividing inline
(D-010). `toPaise()` rounds rather than truncating, so float input cannot lose a
paisa.

---

## 8. Local development

```bash
npm ci                    # native better-sqlite3 build/prebuild
npm run db:migrate        # creates data/budget.db if absent
npm run dev               # vinext dev server
```

Bootstrap the first admin (the only way to create one):

```bash
# .env: ADMIN_SETUP_TOKEN=<long random secret>
curl -X POST http://localhost:3000/api/auth/setup-admin \
  -H 'content-type: application/json' \
  -H "x-admin-setup-token: $ADMIN_SETUP_TOKEN" \
  -d '{"name":"Admin","email":"admin@example.com","password":"…","consent":true}'
```

It returns `404` if the token is absent or wrong, and `409` once any admin exists.
**Remove `ADMIN_SETUP_TOKEN` from the runtime after setup.**

### The gate — run all four before any commit

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

This is exactly what CI runs (`.github/workflows/`), on Node 22.13.0.

| Command | Notes |
|---|---|
| `npm run lint` | oxlint, type-aware. `components/ui/**` and `hooks/use-mobile.ts` are excluded (D-007). |
| `npm run typecheck` | `tsc --noEmit`, strict. |
| `npm test` | Vitest, Node env, real in-memory SQLite. |
| `npm run build` | Nitro node preset → `.output/server/index.mjs`. |
| `npm run db:status` | Which migrations have been applied. |

### Tests

`test/helpers.ts` gives each test a migrated `:memory:` database via `freshDb()`,
so tests never touch `data/budget.db`. `test/api.spec.ts` goes further: it points
`DATABASE_PATH` at a temp directory and imports route handlers **directly**,
calling them with hand-built `Request` objects — no HTTP server involved. When
adding an API test, remember to `closeDb()` and `clearRateLimits()` between cases,
or the module-level singletons leak across tests.

Note that the tests import `scripts/migrate.mjs` directly — the shipped migration
runner and the test fixture are the same code path, on purpose. `test/health.spec.ts`
also uses `listMigrations()` to derive the schema version it expects, rather than
hard-coding it.

---

## 9. Debugging playbook

| Symptom | Likely cause | First move |
|---|---|---|
| `ERR_DLOPEN_FAILED` from `better-sqlite3` | Node ABI mismatch — the shell's `node` differs from the vendored one (**D-009**) | Run via `npm run …`, never bare `node`. `npm rebuild better-sqlite3` if it persists. |
| `SQLITE_BUSY` | Another process holds the write lock | Only one process may write. `busy_timeout` is 5 s; check for a stray dev server or open SQLite CLI. |
| FK constraint "decorative" — bad rows accepted | `foreign_keys` is **off by default per connection** | Any new connection must `pragma('foreign_keys = ON')`. `getDb()` does; ad-hoc scripts must too. |
| Migration runner throws "changed after it was applied" | An applied `.sql` was edited | Revert the edit, add a new migration. Never hand-patch `_migrations`. |
| `test/health.spec.ts` fails after a schema change | The new migration did not bump `schema_meta` to its own number | Add the `UPDATE schema_meta …` line to that migration. The test derives the expected value; it is not hard-coded. |
| `test/data-layer.spec.ts` "defines the unique index" fails | A migration renamed `categories_user_type_name` | Update `CATEGORY_NAME_INDEX` in `lib/db/categories.ts` to match. |
| Redirect loop on `/change-password` | Route missing `allowPasswordChangeRequired` | Check the `requireUser` options in that handler. |
| `403 CSRF_REJECTED` on a mutation | Cross-origin `Origin` header | Expected in V1. Call the API same-origin. |
| Asset/script silently not loading | CSP in `proxy.ts` blocks it | Add the source to the CSP string; the browser logs it, the server does not. |
| Sign-in feels slow (~200 ms CPU) | PBKDF2 at 600k iterations, blocking (D-001) | Expected. Move to a worker thread if it degrades under load. |
| Rate limits reset unexpectedly | In-process `Map`, cleared on restart | Expected. Shared store needed before multi-process. |
| Stale build behaviour that defies the source | Cached artefacts | `rm -rf .next .vinext .output dist tsconfig.tsbuildinfo` and rebuild. |
| Empty UI but API returns rows | Filter params in the URL | Inspect the query string; `use-filters` drives the load effect. |
| Loading banner never clears | One of the four parallel loads failed | Network tab — the load is all-or-nothing. |

**Health check:** `GET /api/health` → `{"status":"ok"}` or `503`. It deliberately
exposes nothing else; the schema version and driver error go to the server log
only. Use it for process supervision.

---

## 10. Traps and open debt

Things that will cost you an afternoon if nobody tells you.

1. **`node` is an npm dependency** (`"node": "^22.23.2"`). `npm run` scripts
   execute under `node_modules/.bin/node`, not your shell's Node. Recorded as
   D-009, recommended for removal in favour of `engines` + an `.nvmrc`. Until then:
   **run everything through npm scripts.**

2. **The default month is now `currentMonth()`**, evaluated in local time on each
   render. It replaced a frozen `DEFAULT_MONTH = '2026-09'`. One consequence to
   know: server and client evaluate it independently, so a client in a timezone
   that has crossed a month boundary when the server has not could hydrate with a
   different default for a few hours a year. It self-corrects on the next render
   and the month is explicit in the URL for any shared link.

3. **`lib/sample-data.ts` now holds only `initialCategories` and
   `categoryColors`.** The prototype's fabricated `initialTransactions` and
   `initialBudgets` — 33 transactions with salary figures for a realistic-looking
   person — have been deleted. Do not reintroduce seed *financial* data here:
   `createUser()` seeds this module's categories into every new account, so
   anything exported from it is one step from a production database.

4. **`password_resets` exists in the schema but is unused** (D-004). Don't assume
   self-service reset works because the table is there.

5. **`mapDbError` still matches on error message text.** That is inherent to
   `better-sqlite3`, but the one identifier it depends on is now a shared constant
   with a test behind it (§3.3). Any *new* message match you add is unguarded
   unless you add coverage too.

6. **`findSessionUser` writes on read**, throttled to once per five minutes per
   session. It is still not a pure read — an ad-hoc script that opens the database
   read-only and calls it will fail.

7. **Operational debt is ours, not a vendor's** (D-008): backups, encryption at
   rest, restore testing, TLS, supervision. Back up with `VACUUM INTO` or the
   SQLite backup API — **never a plain file copy of a live WAL database.** All of
   it is enumerated in [`launch-checklist.md`](launch-checklist.md).

8. **Single process, single point of failure.** SQLite on the same host means no
   horizontal scaling without moving off it. The repository layer is the seam that
   makes a Postgres move contained — keep it clean.

---

## 11. Conventions for new work

- **New endpoint:** schema in `lib/validation.ts` → SQL in `lib/db/<area>.ts`
  (user-scoped) → thin handler in `app/api/…/route.ts` using
  `requireUser` / `parseJson` / `mapDbError`. Tests in `test/data-layer.spec.ts`
  and `test/api.spec.ts`.
- **New client data:** extend `app-state.tsx`; do not `fetch` from a component.
- **New schema:** `npm run db:create -- <name>`, forward-only, and bump
  `schema_meta.schema_version` to the migration's own number — `test/health.spec.ts`
  checks that for you.
- **Money:** integer paise end to end. **Dates:** `YYYY-MM-DD` strings, UTC-safe
  arithmetic only.
- **Don't hand-edit `components/ui/**`** — regenerated by shadcn, lint-exempt.
- **Never log** names, emails, session tokens, notes, or monetary amounts
  (launch checklist, DPDP). Existing `console.error` calls log the error object
  only.
- **Don't reintroduce** Cloudflare Workers, D1, `wrangler`, or `@cloudflare/*`
  without a decision that explicitly overrides D-008. Flag the conflict instead.
