# Decisions

Decisions taken in Phase 0 (and one in Phase 1) that later phases depend on. See
[`plan.md`](plan.md) for the phase-by-phase task list and current status — start
there, come here for the *why* behind a constraint. Each decision has a status:
**Accepted** (settled, build on it), **Proposed** (a recommendation that needs
sign-off before Phase 3 starts), or **Blocked** (needs an answer from outside
the engineering team).

Recorded 2026-09-12. Phases 0 and 1 are complete and committed as of this
writing; Phase 2 has not started. If you are resuming this project in a new
session, read every decision below before writing Phase 2 code — they are
binding constraints, not suggestions.

---

## D-001 · Password hashing — PBKDF2-HMAC-SHA256, 600,000 iterations

**Status:** Accepted for V1 on 2026-09-12.

Measured, not assumed. On 2026-09-12, 600,000 iterations of PBKDF2-HMAC-SHA256
via WebCrypto:

| Runtime | 600k iterations |
|---|---|
| Node 22 (the deploy target, per D-008) | 199 ms |
| workerd (the original target, for reference) | 66 ms |

600,000 is the current OWASP floor for PBKDF2-HMAC-SHA256. 199 ms of CPU per
sign-in is acceptable, but note it is *blocking* CPU on a single Node server —
unlike the Workers model, a burst of simultaneous sign-ins contends for the same
event loop. Hash in a worker thread if sign-in latency degrades under load.

Now that the runtime is Node (D-008), argon2id is no longer a WASM problem: the
`argon2` npm package is a native addon that works on a Node server. If InfoSec
prefers argon2id, it is a much smaller change than it would have been on Workers —
swap the implementation behind the versioned hash string.

Stored format is versioned (`pbkdf2$sha256$<iterations>$<salt>$<hash>`) so the
iteration count can be raised, or the whole scheme swapped, with rehash-on-login
rather than a forced reset.

The user chose the built-in PBKDF2 implementation for V1 so authentication has
no additional native dependency or external service. Revisit Argon2id only if a
future organizational security standard requires it.

---

## D-002 · Data region — RESOLVED by D-008

**Status:** Resolved 2026-09-12. Superseded by D-008; kept for the record.

Cloudflare D1 places a database using a coarse location hint (`wnam`, `enam`,
`weur`, `eeur`, `apac`, `oc` at the time of writing — confirm the current list when
provisioning). **There is no India-specific region.** The closest is `apac`,
which may place the data in Singapore, Tokyo or elsewhere in the region.

This matters because from Phase 3 onward the database holds names, email
addresses and personal financial records:

- **DPDP Act 2023** does not impose blanket localisation, but it does restrict
  transfers to countries on the Central Government's negative list, and it
  requires the purpose and location of processing to be disclosed.
- **RBI** rules are stricter and *do* mandate in-India storage for payment system
  data. Whether a personal budgeting ledger falls under that framing is a
  compliance call, not an engineering one — but if Surya-Fintech's policy treats
  all customer financial data as RBI-scoped, **D1 cannot be used at all** and the
  data layer needs a different home (for example Postgres hosted in ap-south-1,
  with Workers connecting over Hyperdrive).

**Outcome:** rather than seek an exception, the deploy target was changed. The
application now runs as a Node server on India-resident infrastructure with SQLite
on the same host (D-008), so customer data never leaves the country and the
question does not arise. The residency obligation still has to be *evidenced* —
see the open items in D-008.

---

## D-003 · Session lifetime

**Status:** Accepted 2026-09-12.

| Parameter | Value | Reasoning |
|---|---|---|
| Absolute lifetime | 30 days | A budgeting app people open a few times a week; shorter means constant re-authentication for no real gain. |
| Idle timeout | 14 days | Bounds exposure of an abandoned session on a shared device. |
| Rotation | On every sign-in and password change | Limits the value of a stolen token. |
| Global invalidation | On password reset and on password change | Task 3.4 depends on this. |
| Cookie | `HttpOnly`, `Secure`, `SameSite=Lax`, host-only | Lax still allows the top-level-navigation sign-in return. |

Tokens are opaque 256-bit random values, stored hashed (SHA-256) in `sessions`, so
a database leak does not hand over live sessions.

Tighten these if compliance treats the app as RBI-scoped — that framing usually
brings a much shorter idle timeout.

---

## D-004 · No transactional email in V1; password resets are admin-assisted

**Status:** Accepted 2026-09-12. Supersedes the proposed Amazon SES integration.

V1 must not rely on an external system. Users therefore cannot request a reset
link. An administrator assigns a temporary password in the local admin portal;
the operation invalidates all of the target user's sessions, records an audit
event, and forces the user to choose a new password at the next sign-in.

The first administrator is created through the one-time setup endpoint guarded
by the local `ADMIN_SETUP_TOKEN`. Remove that environment value after bootstrap.
No email provider, API key, reset token, or recipient address leaves the server.

---

## D-005 · Money is stored as integer paise

**Status:** Accepted.

Already true of the prototype and kept deliberately. Amounts are `INTEGER` paise
everywhere — database, API payloads, and application logic — converted to rupees
only at the render boundary. No floating point touches a monetary value.

---

## D-006 · Migrations are checksummed and forward-only

**Status:** Accepted.

[`scripts/migrate.mjs`](../scripts/migrate.mjs) applies `migrations/NNNN_*.sql` in
filename order, each in a transaction, recording name and SHA-256 in a
`_migrations` table. Re-running is a no-op.

Editing a migration that has already been applied is refused outright: the stored
checksum no longer matches, so the database and the repository disagree about what
the schema is. Add a new migration instead. This matters more than usual here —
with SQLite on the app server there is no managed schema-drift detection to catch
it later.

The runner is exported, so tests migrate a throwaway in-memory database through
exactly the same code path that production uses.

---

## D-007 · Lint scope and a11y rule configuration

**Status:** Accepted.

CI gates on `npm run lint`, so the rule set had to be made truthful rather than
aspirational. Three changes, each a judgement call worth recording:

- **`components/ui/**` and `hooks/use-mobile.ts` are excluded.** These are vendored
  shadcn files regenerated by its CLI; fixes there are overwritten on the next
  `shadcn add`.
- **`jsx-a11y/prefer-tag-over-role` is off.** It is a stylistic rule, not a WCAG
  requirement. In every case it flagged, the explicit role is the correct markup —
  `role="progressbar"` on a custom-styled bar, `role="img"` on a div-based chart,
  `role="group"` on the month navigator. Swapping in `<progress>`, `<img>` or
  `<fieldset>` would break the design without helping any user.
- **`jsx-a11y/no-autofocus` is off.** It targets page-level autofocus; both call
  sites are modal dialogs, where focusing the first field on open is recommended
  practice. Dialog focus management is audited properly in Phase 7.1.
- **`jsx-a11y/label-has-associated-control` now knows about the shadcn control
  components** (`controlComponents`), which removes the false positives on
  `<label>Text <Input /></label>` without weakening the rule.

None of this substitutes for the Phase 7.1 audit with real tooling; a linter
cannot measure contrast or test a focus trap.

---

## D-008 · Deploy target — Node server on India-resident infrastructure, SQLite on the same host

**Status:** Accepted 2026-09-12. Supersedes D-002.

Cloudflare Workers + D1 was the inherited scaffold, not a chosen architecture, and
it forced an unanswerable question: D1 has no India region, so customer financial
records would have sat in `apac`. Rather than seek a compliance exception, the
target changed.

**Now:** vinext builds a standalone Node server through Nitro
(`NITRO_PRESET=node`), served from `.output/server/index.mjs`, with SQLite on the
same host via `better-sqlite3`. Data residency becomes a property of where the box
is, which is a question with a clean answer.

**What this bought:**

- Data never leaves India. DPDP and any RBI framing are satisfied by hosting
  location rather than by argument.
- No vendor account, credentials or spend needed to develop, test or run.
- Synchronous SQLite access — no `await` on every query, simpler repository code.

**What it cost:**

- No edge distribution; latency is now distance-from-Mumbai for all users.
- One server. No horizontal scaling without moving off SQLite, and the process is
  a single point of failure.
- Backup, restore, DR and encryption-at-rest are **ours to build and evidence**.
  This is the real debt in this decision — managed D1 would have done it.

**Open items before production:**

1. Provision the India-resident host (Mumbai/Hyderabad region).
2. Automated encrypted backups of the SQLite file with a documented RPO/RTO, plus
   a *tested* restore. `VACUUM INTO` or the SQLite backup API — never a plain file
   copy of a live WAL database.
3. Encryption at rest on the volume.
4. Process supervision and a health check against `/api/health`.
5. TLS termination.

Reversible if scale demands it: the Phase 2.4 repository layer is the only thing
that touches SQL, so moving to Postgres later is a contained change.

---

## D-009 · Known footgun — Node is vendored as an npm dependency

**Status:** Recorded, not fixed. Recommend removing.

`package.json` lists `"node": "^22.23.2"` as a runtime dependency. It is a scaffold
artefact and it means **`npm run` scripts execute under `node_modules/.bin/node`
(22.23.2), not the developer's shell Node**.

This is not cosmetic. It cost real debugging time during Phase 0: `better-sqlite3`
installed a prebuilt binary for Node 22's ABI while the shell's `node` was 20.20.2,
producing an `ERR_DLOPEN_FAILED` that looked like a broken install. Everything
works — through npm scripts. Anything run as bare `node ...` may not.

Recommended: drop the dependency, keep `engines`, and add an `.nvmrc` pinning
22.13.0 so the shell and npm agree. Not done here because changing which Node runs
the toolchain mid-phase risked destabilising a working build; worth doing as a
standalone change.

---

## D-010 · Phase 1 pulled two Phase 6 fixes forward; app-state is the Phase 2 seam

**Status:** Accepted 2026-09-12, recorded during Phase 1.

Extracting the prototype's inline logic into shared helpers forced a decision
about what those helpers do when given bad input — deferring that decision
wasn't an option once the code was shared across pages. Two Phase 6 items
closed as a result, ahead of schedule:

- **6.3 (division by zero).** `percentage()` and `ratio()` in
  [`lib/money.ts`](../lib/money.ts) return `0` (or clamp to 100) instead of
  `NaN`/`Infinity` when the denominator is zero. Every call site was updated to
  use them.
- **6.1 (unsafe category lookup), partially.** `getCategory()` in
  [`components/app-state.tsx`](../components/app-state.tsx) is typed
  `Category | undefined` — no non-null assertion — and the shared
  `CategoryIcon`/`CategoryPill` components in
  [`components/category-icon.tsx`](../components/category-icon.tsx) render
  correctly when it's `undefined`. Not fully closed: this only covers call
  sites that go through the shared components. If Phase 2/4 introduce a new
  place that looks up a category by id from an *unfiltered* source (e.g. a raw
  API response before the corresponding category has loaded), re-verify it
  doesn't assume the category exists.

**Why this belongs here and not just in `plan.md`:** it changes what Phase 6
actually has left to do, and a session picking up Phase 6 cold needs to know
these two are already done rather than re-implementing them.

**The Phase 2 seam.** [`components/app-state.tsx`](../components/app-state.tsx)
is a `useState`-backed React context implementing: `categories`,
`transactions`, `budgets`, `budgeting`, `notice`, and the mutators
`saveTransaction`, `deleteTransaction`, `saveCategory`, `toggleArchive`,
`saveBudget`, plus the `getCategory` lookup. Every page and feature component
reads and writes through `useAppState()` — none touch `useState` or sample
data directly. Phase 2/4 should give this same shape a `fetch('/api/*')`
backing rather than inventing a new data-access pattern; that is what keeps
the swap from rippling into every page.
