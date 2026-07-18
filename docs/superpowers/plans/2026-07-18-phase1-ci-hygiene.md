# Phase 1: CI + Hygiene Implementation Plan (cross-repo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opt-in `status` filter on the product endpoints (storefront requests ACTIVE-only — kills residue pollution), CI workflows for store + admin, and lint/dead-code hygiene to zero in both frontends.

**Architecture:** Backend change is a non-breaking optional query param threaded controller→service→repository on two endpoints. Frontends: three fetchers add `status=ACTIVE`; mock routes deleted; lint zeroed; two minimal no-secrets GitHub Actions workflows (unit+lint+build only — E2E stays a local gate by decision).

**Tech Stack:** Spring Boot/JPA, Next.js, Vite/React, GitHub Actions, vitest, Playwright.

**Reference:** Spec `docs/superpowers/specs/2026-07-18-phase1-ci-hygiene-design.md` (read fully first — it pins the two user decisions and the verified deletion-safety facts). Repos: `C:/YHA/006_Claude_Workspace/{walmal,walmal-store,walmal-admin}`.

**Cross-repo gotchas (memory-verified):**
- After ANY walmal change: rebuild the JAR (`cd walmal && ./mvnw -pl walmal-app -am -DskipTests clean package`) — the store E2E suite boots that JAR; a stale JAR silently masks the change.
- walmal module tests: always `-pl <module> -am` (bare `-pl` compiles against stale walmal-common).
- Store E2E needs :3000 free (Next refuses two dev servers) and exclusive use of :8080 (never simultaneously with admin E2E).
- A dev server for user browsing may be running on :3000 — kill it before suite runs, note that it was killed.

---

### Task 1: walmal — opt-in `status` param

**Files (walmal repo; exact paths discovered by reading the product module):**
- Modify: product controller (search + category-products endpoints), the service interface/impl behind them, `ProductRepository` (or equivalent) queries
- Test: extend `ProductSearchServiceImplTest` + `ProductControllerTest` (or the module's actual test classes)
- Modify: `docs/kb/` file documenting these endpoints + `docs/kb/SYSTEM.md` (same commit)

- [ ] **Step 1.1: Read the current code paths.** `GET /product/search` (note: blank `q` short-circuits to `findAll(pageable)` — no JPQL) and `GET /product/categories/{id}/products`. Identify the three repository call sites needing a status variant.
- [ ] **Step 1.2: TDD — add failing service tests first** (param absent → unchanged results incl. INACTIVE; param `ACTIVE` → INACTIVE rows excluded; both endpoints), run per convention `./mvnw -pl walmal-product -am test` → new tests FAIL.
- [ ] **Step 1.3: Implement**: `@RequestParam(required = false) ProductStatus status` on both endpoints (Spring's enum binding gives standard 400 on bad values — no custom handling); thread `@Nullable ProductStatus` through the service; repository: JPQL search gains `AND (:status IS NULL OR p.status = :status)` — **in BOTH the value query and its explicit `countQuery`** (`ProductRepository.searchByNameBrandSkuOrBarcode` has a separate mandatory countQuery; a mismatch silently corrupts `totalElements` and mocked-service tests won't catch it); the `findAll` path becomes `status == null ? findAll(pageable) : findByStatus(status, pageable)` (derived query); category path gains the equivalent. NO default — absent means all statuses (spec decision #1: admin needs INACTIVE rows).
- [ ] **Step 1.4:** Module tests green; then full backend suite `./mvnw test` → green (integration tests are `@Tag("integration")` and excluded by default — no extra flags).
- [ ] **Step 1.5: KB same commit**: endpoint docs + `SYSTEM.md` contracts gain the optional `status` param (enum values, absent = all). Note: SYSTEM.md's contracts table has a `search?q=` row to edit, but likely NO row yet for `categories/{id}/products` — add one. Also update walmal's `docs/kb/testing.md` residue note (~line 96): store is immune once it passes `status=ACTIVE`.
- [ ] **Step 1.6: Commit** in walmal: `feat(product): opt-in status filter on search + category products`.
- [ ] **Step 1.7: Rebuild the JAR** (command above) → BUILD SUCCESS. Restart the backend (`java -Dspring.profiles.active=test -jar walmal-app/target/walmal-app-0.1.0-SNAPSHOT.jar`, background) → health UP.
- [ ] **Step 1.8: Live-verify with curl**: deactivate one seeded product via SQL or the admin deactivate endpoint, then `search?q=&status=ACTIVE` excludes it, plain `search?q=` includes it, `search?q=&status=INACTIVE` returns only it, `categories/{boots-id}/products?status=ACTIVE` behaves likewise. Reactivate the product (SQL `UPDATE product_products SET status='ACTIVE'`) afterwards.

### Task 2: walmal-store — request ACTIVE-only

**Files:**
- Modify: `src/lib/api/products.ts` (all three fetchers), `docs/kb/architecture.md`, `docs/kb/gotchas.md` (NEW gotcha entry — the store KB currently has no residue documentation; the residue docs live in walmal/admin KBs, updated in Tasks 1 and 6)

- [ ] **Step 2.1:** `fetchProducts` + `fetchProductsByCategory`: `params.set('status', 'ACTIVE')`. `fetchProductsSSG`: add `&status=ACTIVE` to its URL.
- [ ] **Step 2.2: KB same commit**: architecture.md — the three fetchers request ACTIVE-only (coupled to walmal's opt-in `status` param; admin intentionally omits it). Add a NEW `docs/kb/gotchas.md` entry: admin-E2E residue products are INACTIVE and now invisible to the storefront (ACTIVE-only fetchers); SQL cleanup is only ever needed for admin-side visuals.
- [ ] **Step 2.3: Verify deliberately**: with backend up, SQL-insert one INACTIVE product (or deactivate a seeded one), confirm `/products` (dev server, or curl the API call the page makes) excludes it while the admin search endpoint without the param still returns it; restore state.
- [ ] **Step 2.4:** Unit suite green (17/86 — no unit test asserts the query string; if one does, update it). Commit: `feat(api): storefront requests ACTIVE products only`.

### Task 3: walmal-store — dead code deletion

**Files:**
- Delete: `src/app/api/v1/` (whole tree), `src/lib/mock-db.ts`, `scripts/test-checkout.js`
- Modify: `docs/kb/architecture.md` (remove the mock-routes row), `tests/security/FRONTEND_CHECKLIST.md` (RBAC-06, API Route Security rows, mitigation M1 → removed/N-A)

- [ ] **Step 3.1:** `grep -rn "api/v1\|mock-db" src/ tests/ --include="*.ts*"` — confirm only the deletion targets and URL-strings in tests that hit the REAL backend path (`NEXT_PUBLIC_API_URL`); delete the three targets.
- [ ] **Step 3.2:** Checklist + KB sweeps per spec 2b. `npm run build` (proves no import broke) + `npm test` (17 files — count unchanged; if a test file exists solely for mock routes, delete it and adjust counts/docs accordingly — spec review found none).
- [ ] **Step 3.3: Commit**: `chore: delete legacy mock API routes + obsolete checkout script`.

### Task 4: walmal-store — lint to zero + polish

**Files:**
- Modify: `tests/components/account/layout.test.tsx`, `tests/lib/api/client.test.ts`, `tests/store/auth-store.test.ts` (type the `any`s), `src/components/checkout/checkout-form.tsx` (documented disable — comment must describe the guest/auth mode-sync, NOT fetch-status), `src/components/providers.tsx` (unused `e`), `tests/components/cart/cart-drawer.test.tsx` (`minusBtn`), `tests/e2e/authenticated-checkout.spec.ts` (`SEEDED_ITEM_B` is defined once and never referenced — verified at plan review; delete the const), `src/store/auth-store.ts` (unused disable directive)
- Modify: `src/app/(shop)/products/page.tsx` (breadcrumb → `<nav aria-label="Breadcrumb">`, matching cart/page.tsx)
- Modify: any KB/README line stating the lint baseline → "lint clean"
- Re-capture: `docs/images/product.png` (1440×900, detail page with heart — same temp-script flow as prior captures; needs dev server w/ test env; kill :3000 after)

- [ ] **Step 4.1:** Fix each lint item mechanically; tests must pass for the same reasons (no assertion weakening). `npm run lint` → **0 problems**.
- [ ] **Step 4.2:** `npm test` green; `npm run build` green. Screenshot re-captured and eyeballed (heart visible).
- [ ] **Step 4.3: Commit**: `chore: lint to zero + breadcrumb consistency + fresh product screenshot`.

### Task 5: walmal-store — CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (badge + local-E2E note), `docs/kb/testing.md` (CI section)

- [ ] **Step 5.1: Write the workflow:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      # Dummy build-time values; runtime secrets are not needed for lint/unit/build
      NEXT_PUBLIC_API_URL: http://localhost:8080/api/v1
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_dummy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx vitest run
      - run: npm run build
```

- [ ] **Step 5.2:** README: CI badge (`https://github.com/YeHtutAung/walmal-store/actions/workflows/ci.yml/badge.svg`) + one sentence: the 117-test Playwright matrix runs locally as the pre-merge gate (decision recorded in the Phase 1 spec). `docs/kb/testing.md`: same facts in a short CI section.
- [ ] **Step 5.3: Commit**: `ci: lint + unit + build workflow`. (Green-run verification on GitHub happens at final push — Task 7.)

### Task 6: walmal-admin — lint to zero + CI

**Files (admin repo):**
- Modify: whatever `npm run lint` flags (~14 problems at spec review; take the live count) — mechanical fixes only, documented disables where a rule fights a legitimate pattern
- Create: `.github/workflows/ci.yml` — same shape as Task 5 BUT with `branches: [master]` in both triggers (admin's default branch is master, not main — a main-only filter would never fire and the badge would show "no status"); steps: `npm ci`, `npm run lint`, `npm run test:unit`, `npm run build`; env `VITE_API_BASE_URL: http://localhost:8080`
- Modify: `README.md` (badge), `docs/kb/testing.md` (CI section + E2E-is-local-only note)

- [ ] **Step 6.1:** `npm run lint` → fix to **0 problems**; `npm run test:unit` (81+ tests) green; `npm run build` green.
- [ ] **Step 6.2:** Workflow + README badge + KB. Commit(s) on admin `master`: `chore: lint to zero` + `ci: lint + unit + build workflow`.
- [ ] **Step 6.3:** Run the admin affected E2E locally (products list shows INACTIVE rows still — contract check): `npx playwright test products-crud.spec.ts --project=chromium` → green. (Port 8080: ensure the store suite is not running.)

### Task 7: Final verification + delivery

- [ ] **Step 7.1:** Store full matrix from the rebuilt-JAR backend: kill any :3000 dev server first, `npx playwright test` → **117 passed** (watchdog for the WebKit-wedge risk: check `test-results/` mtimes if silent >10 min).
- [ ] **Step 7.2:** Fresh gates all three repos: walmal `./mvnw test` green; store `npm test`+build+lint(0); admin unit+build+lint(0).
- [ ] **Step 7.3:** superpowers:verification-before-completion — spec sections vs tree.
- [ ] **Step 7.4: CHECKPOINT — ask the user before pushing.** CI can only be proven green on GitHub after `git push` of walmal (main), store (main after merge), admin (master). On approval: push all three, then watch both new workflows' first runs (`gh run watch` or the Actions API) → green. If a workflow fails on GitHub-only differences (e.g. case-sensitive paths, npm ci lockfile), fix forward and re-push.
