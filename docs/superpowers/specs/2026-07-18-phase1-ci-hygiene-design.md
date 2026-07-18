# Phase 1: CI + Hygiene (cross-repo) — Design

**Date:** 2026-07-18
**Status:** Approved (user, 2026-07-18)
**Repos:** walmal (backend), walmal-store, walmal-admin. This spec lives in
walmal-store (session home), same precedent as the sport-reskin Phase A.

**Goal:** Close the operational gaps called out in the production-readiness
review: the search status predicate (kills the E2E-residue pollution class
for good), CI for the two frontend repos, and lint/dead-code hygiene to
zero in both.

**User decisions (2026-07-18):**
1. **Opt-in `status` param** on the product endpoints — default behavior
   unchanged (all statuses; the admin filters status client-side over
   results and NEEDS inactive rows). The storefront opts into
   `status=ACTIVE`. Non-breaking for every existing client.
2. **CI scope: unit + lint + build only** (fast, no secrets, no cross-repo
   coupling). The 117-test E2E matrix remains a local pre-merge gate,
   documented as such. E2E-in-CI is explicitly out of scope.

## Part 1 — walmal: opt-in status filter

- `GET /api/v1/product/search` and
  `GET /api/v1/product/categories/{categoryId}/products` accept an optional
  `status` query param, enum `ACTIVE | INACTIVE` (Spring converts to the
  existing `ProductStatus` enum; invalid value → the framework's standard
  400). **Absent param = no status predicate = today's behavior,
  byte-compatible.**
- Implementation: optional predicate threaded through the existing
  controller → service → repository path for both queries (follow the
  established pattern for optional query params in the product module; the
  JPQL gains `AND (:status IS NULL OR p.status = :status)` or the
  repository-method equivalent). Note: the blank-`q` path uses Spring
  Data's built-in `findAll(pageable)` (no JPQL) — that path and the
  category-products path need repository-method equivalents, not the JPQL
  snippet.
- Tests per walmal conventions: service-level unit tests (param present /
  absent for both endpoints) + controller test for param binding. The
  suite's existing tests must pass unchanged (absent-param behavior
  identical).
- **Docs (same session, cross-repo contract):** `walmal/docs/kb/SYSTEM.md`
  gains the param on both endpoint contracts; walmal's own KB
  (architecture/api file, wherever the endpoints are documented) updated in
  the same commit as the code.

## Part 2 — walmal-store

### 2a. Consume `status=ACTIVE`

- `fetchProducts`, `fetchProductsByCategory`, `fetchProductsSSG`
  (`src/lib/api/products.ts`) all pass `status=ACTIVE`.
- Result: deactivated products (admin-E2E residue) can no longer appear in
  the homepage rails, `/products`, or category listings. The store E2E
  first-card tests become immune to residue.
- **KB updates:** `docs/kb/architecture.md` (the endpoints now request
  ACTIVE-only — coupled to the walmal `status` param), `docs/kb/gotchas.md`
  or wherever residue is documented: the SQL cleanup recipe is now needed
  only for admin-side visuals (terminals list, product table screenshots),
  not for store suite runs.

### 2b. Dead code deletion

- Delete `src/app/api/v1/` (all legacy mock routes) and `src/lib/mock-db.ts`.
  The KB already marks these "inactive/legacy … deletion is routine cleanup
  that updates this file" — remove their row from `docs/kb/architecture.md`
  in the same commit. Grep first: no remaining imports/references in `src/`
  or `tests/` (verified at spec review: unit tests mock at the axios layer;
  only URL-string mentions exist). Also sweep
  `tests/security/FRONTEND_CHECKLIST.md`: several PASS entries anchor on
  the mock routes (RBAC-06, the API Route Security rows, mitigation M1) —
  mark them removed/N-A in the same commit so the checklist status stays
  honest.
- Delete `scripts/test-checkout.js` (obsolete manual precursor to the real
  E2E suite; 1 lint error + 2 warnings live there).

### 2c. Lint to zero

Current baseline: 7 errors / 8 warnings. Target: **0 / 0**.

- `scripts/test-checkout.js` — deleted (2b).
- Five `@typescript-eslint/no-explicit-any` errors in
  `tests/components/account/layout.test.tsx`, `tests/lib/api/client.test.ts`,
  `tests/store/auth-store.test.ts` — replace `any` with proper types
  (`unknown` + narrowing or the real types; behavior of the tests must not
  change — they must still pass for the same reasons).
- `checkout-form.tsx` `react-hooks/set-state-in-effect` — same documented
  eslint-disable treatment as `products/page.tsx`, but the comment must
  describe THIS effect's actual purpose (it syncs the guest/authenticated
  checkout mode when `isAuthenticated` changes — it is NOT a fetch-status
  reset). NOT a refactor.
- Warnings: unused vars (`minusBtn`, `SEEDED_ITEM_B`, `e` in providers.tsx)
  removed; unused `eslint-disable` directives (`mock-db.ts` — deleted
  anyway — and `auth-store.ts:107`) removed.
- Any doc that states the lint baseline (KB) updated to "lint clean".

### 2d. Polish

- `products/page.tsx` breadcrumb wrapped in `<nav aria-label="Breadcrumb">`
  (consistency with the Bag page).
- Re-capture `docs/images/product.png` (detail page now shows the wishlist
  heart; same 1440×900 flow as before).

### 2e. CI

- `.github/workflows/ci.yml`: on push/PR to main — Node 22, `npm ci`,
  `npm run lint`, `npx vitest run`, `npm run build`. No secrets: the build
  needs none (`fetchProductsSSG` try/catches a missing backend; Stripe keys
  are runtime-only). Cache node_modules via `actions/setup-node` cache.
- README: CI badge + a sentence noting the E2E matrix is a local pre-merge
  gate (decision 2 above); `docs/kb/testing.md` records the same.

## Part 3 — walmal-admin

- `.github/workflows/ci.yml`: same shape — `npm ci`, `npm run lint`,
  `npm run test:unit`, `npm run build` (Vite). No secrets.
- Lint: current baseline ~14 problems (10 errors / 4 warnings as of spec
  review — take the count at execution time) driven to **0/0** —
  same rules as 2c: mechanical fixes, no behavior changes, documented
  disables only where a rule fights a legitimate pattern.
- KB (`docs/kb/testing.md`): CI section — what runs in CI, and that the
  21-test E2E suite is local-only (port 8080 constraint).
- README: CI badge.

## Verification

- walmal: full backend test suite green; live-verify the param with curl
  (`status=ACTIVE` excludes a deactivated product; absent returns it).
- store: fresh full E2E matrix (117) against the updated backend —
  additionally, seed one deactivated residue product deliberately and
  verify it does NOT appear on `/products` (then clean it).
- admin: `npm run test:unit` + affected E2E specs locally (products list
  must still show inactive rows — that's the contract the opt-in design
  preserves).
- Both new CI workflows verified green on GitHub after push.

## Out of scope

E2E-in-CI, server-side facets/sort, tax/delivery model, deployment infra
(Phases 2–4), any UI changes beyond 2d.
