# Production Deployment (Phases 3–4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three-repo system deployable to a single VPS behind Caddy TLS — CI-built images, one prod compose stack, Stripe test-mode webhook, demo banner, monitoring, backups, and a two-track runbook — everything short of the user's own provisioning.

**Architecture:** Per the approved spec (`docs/superpowers/specs/2026-07-19-production-deployment-design.md` — READ IT FIRST; it pins the topology, the CSP ship-blocker, the webhook home, and the prod-profile deltas). All configs use `WALMAL_DOMAIN` placeholders. Nothing in this plan requires the VPS to exist: every task verifies locally.

**Tech Stack:** Docker multi-stage builds, Caddy 2, GitHub Actions + GHCR, stripe-java Webhook verification, Uptime Kuma.

**Repos:** walmal (compose/Caddy/webhook/runbook), walmal-store (CSP/Dockerfile/banner), walmal-admin (Dockerfile). Feature branches per repo: `prod-deploy`.

**Verification backbone:** each task ends with a local proof; Task 8 boots the ENTIRE prod stack locally (fake domain via hosts entries + Caddy internal TLS) and drives a browser through it.

---

## Task 1: walmal-store — CSP env-derivation + standalone + Dockerfile

**Files:**
- Modify: `next.config.ts` (CSP + `output: 'standalone'`)
- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1.1:** Read `next.config.ts`'s CSP block. Derive the API origin at config time: `const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').origin`. `connect-src` becomes `'self' https://api.stripe.com ${apiOrigin}` plus (only when `process.env.NODE_ENV !== 'production'`) the dev `ws:` entry; `img-src` keeps localhost:9000 only in non-prod. Keep every other directive byte-identical.
- [ ] **Step 1.2:** Add `output: 'standalone'` to the config. `npm run build` → passes; `npm test` → 86; confirm `.next/standalone/server.js` exists.
- [ ] **Step 1.3: Dockerfile** (multi-stage): builder `node:22-alpine` — `COPY package*.json` → `npm ci` → `COPY .` → `ARG NEXT_PUBLIC_API_URL NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` exported to env → `npm run build`. Runner `node:22-alpine`: non-root user, copy `.next/standalone`, `.next/static` → `.next/static`, `public` → `public`; `ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0`; `CMD ["node","server.js"]`. `.dockerignore`: node_modules, .next, .git, test-results, playwright-report, docs, tests, **`.env*` and `*.local`** (the repo's `.env.local`/`.env.test.local` hold real test-mode Stripe secrets — `COPY . .` must never bake them in).
- [ ] **Step 1.4: Local proof:** build with a DISTINCTIVE origin so the derivation is actually proven (localhost would be byte-identical to the old hardcoded value): `docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.test/api/v1 --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy -t walmal-store:local .`; run on :3100; `curl -sI localhost:3100 | grep -i content-security-policy` (the CSP is a response HEADER, not in the HTML) must contain `https://api.example.test` and must NOT contain `localhost:8080`, `localhost:9000`, or `ws:`. Stop the container.
- [ ] **Step 1.5: Commit** `feat(deploy): standalone output, env-derived CSP, production Dockerfile`.

## Task 2: walmal-admin — Dockerfile

**Files:**
- Create: `Dockerfile`, `deploy/nginx.conf`, `.dockerignore`

- [ ] **Step 2.1:** Builder `node:22-alpine`: `npm ci` → `ARG VITE_API_BASE_URL` → `npm run build`. Runner `nginx:alpine`: copy `dist/` → `/usr/share/nginx/html`, copy `deploy/nginx.conf` → `/etc/nginx/conf.d/default.conf` with SPA fallback (`location / { try_files $uri $uri/ /index.html; }`) + `expires` headers for hashed assets.
- [ ] **Step 2.2:** Delete the stale git-tracked `.env.production` (it hardcodes `api.walmal.com`, predating the `WALMAL_DOMAIN` placeholder scheme; the build ARG supersedes it). **Local proof:** build with `--build-arg VITE_API_BASE_URL=http://localhost:8080`, run on :3200, `curl localhost:3200/login` AND `curl localhost:3200/products` both return the SPA index (fallback works). Stop.
- [ ] **Step 2.3: Commit** `feat(deploy): production Dockerfile (nginx SPA)`.

## Task 3: walmal — prod compose + Caddy + env template + prod-profile deltas + backup script

**Files:**
- Modify: `docker-compose.prod.yml` (extend), `walmal-app/src/main/resources/application-prod.yml` (extend)
- Create: `deploy/Caddyfile`, `deploy/backup.sh`, `.env.production.example`

- [ ] **Step 3.1:** Read the existing `docker-compose.prod.yml` + `application-prod.yml` before touching anything (they already carry nginx-era assumptions — Caddy REPLACES any nginx service).
- [ ] **Step 3.2: Compose:** add `caddy` (ports 80/443, volumes: Caddyfile ro, caddy_data, caddy_config; `WALMAL_DOMAIN` + `MAILHOG_BASIC_AUTH` env passthrough), `store`, `admin`, `uptime-kuma` services (GHCR images, `restart: unless-stopped`, internal network only); keep/extend existing service defs; log rotation on every service (`json-file`, respect the existing 50m/5 sizes if already present — do NOT silently shrink them); `app` env gains `WALMAL_PAYMENT_GATEWAY=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, mail vars per Step 3.4.
- [ ] **Step 3.3: Caddyfile:** sites for `shop.`, `admin.`, `api.`, `status.`, `mail.{$WALMAL_DOMAIN}` reverse-proxying to the services; `mail.` wrapped in `basic_auth` using `{$MAILHOG_BASIC_AUTH}` (bcrypt hash, generated in the runbook via `caddy hash-password`); apex → `shop.` redirect. A commented `local` block documents the Task-8 local mode (internal TLS).
- [ ] **Step 3.4: application-prod.yml deltas:** CORS is ALREADY env-driven — `walmal.cors.allowed-origins: ${WALMAL_CORS_ALLOWED_ORIGINS}` exists and the compose passes it; keep that variable name, do NOT invent a second one. The real deltas are only: mail `auth`/`starttls` flags from env with MailHog-compatible defaults (`false`/`false`) and `info.walmal.profile=prod`. Full backend suite `./mvnw test` still green (config-only sanity gate).
- [ ] **Step 3.5: `.env.production.example`:** every variable the compose file references, names only + comments (NEVER values) — including the `STRIPE_SECRET_KEY` naming fix (the old `.env.example` said `STRIPE_API_KEY`; fix it there too in the same commit).
- [ ] **Step 3.6: `deploy/backup.sh`:** `pg_dump -Fc` via `docker compose exec -T postgres` + `tar` of the minio volume mount → `/opt/walmal/backups/<date>/`, delete dirs older than 7 days; safe `set -euo pipefail`; a `restore` usage comment block. Runs anywhere docker compose runs — smoke it locally against the dev compose stack (dump lands, non-empty).
- [ ] **Step 3.7: Commit** `feat(deploy): prod compose stack — Caddy TLS, frontend services, kuma, backups, env template`.

## Task 4: walmal — Stripe webhook (TDD)

**Files:**
- Create: `walmal-order/.../api/PaymentWebhookController.java`, service + repository pieces per module conventions, `V18__payment_webhook_events.sql`
- Modify: `AuthSecurityConfig` (permitAll the path), rate-limit filter exemption, `docs/kb/SYSTEM.md` + walmal KB (same commit)

- [ ] **Step 4.1: Discover first:** the payment reference lives at `Order.payment_reference` (set via `order.confirm(paymentResult.paymentReference())`). `stripe-java` is infrastructure-scoped and walmal-order does NOT depend on walmal-infrastructure — so the signature-verification interface goes in **walmal-common** (mirroring `com.walmal.common.payment.PaymentGatewayService`) with the impl in walmal-infrastructure; the order module consumes the interface. Do not add an order→infrastructure dependency.
- [ ] **Step 4.2: TDD behavior** (write failing tests first, per test class conventions):
  - Valid signature + `payment_intent.succeeded` where the intent matches an order's payment reference → row in `payment_webhook_events` (event_id, type, payment_intent_id, matched order_id, `MATCHED`), 200.
  - Valid signature, intent matches NO order → row with `UNMATCHED` status (the reconciliation flag), 200.
  - Duplicate `event_id` → no second row (idempotent — unique constraint + upsert-ignore), 200.
  - Unknown event type → 200, no row.
  - Bad/missing signature → 400, nothing persisted.
  - **Payload-parsing trap:** extract `payment_intent` id from the event's RAW JSON (`data.object.id`), NOT via `getDataObjectDeserializer().getObject()` — that returns an empty Optional on any API-version mismatch, which is guaranteed with crafted test payloads and likely against real dashboards.
- [ ] **Step 4.3:** V18 migration: `payment_webhook_events(id uuid pk, event_id text unique not null, event_type text, payment_intent_id text, order_id uuid null, status text, received_at timestamptz default now())`.
- [ ] **Step 4.4:** permitAll `POST /api/v1/payment/webhook` (signature IS the auth — comment says so) + add the path to the rate-limit filter's exemptions (Stripe retries must never 429; comment the reason).
- [ ] **Step 4.5:** Module tests + full `./mvnw test` green. Live check: rebuild JAR (stale-JAR gotcha), restart test backend, POST a crafted signed payload (compute `t=<ts>,v1=HMAC_SHA256(secret, "<ts>.<body>")` in a scratch script) → 200 + row; tampered body → 400. Restore backend state.
- [ ] **Step 4.6: KB same commit:** SYSTEM.md endpoint row (auth = Stripe signature; idempotency; statuses) + env matrix (`STRIPE_WEBHOOK_SECRET`); walmal architecture KB notes the reconciliation-not-authorization design.
- [ ] **Step 4.7: Commit** `feat(payment): signature-verified Stripe webhook — reconciliation log (V18)`.

## Task 5: walmal-store — demo banner + E2E

**Files:**
- Create: `src/components/layout/demo-banner.tsx`
- Modify: the layout that renders `AnnouncementBar`'s parent (banner sits ABOVE it), `tests/e2e/helpers.ts` (clearState pre-seeds dismissal), new `tests/e2e/demo-banner.spec.ts`, README + `docs/kb/testing.md` counts (117 → 120), `docs/kb/architecture.md` (banner + dismissal key)

- [ ] **Step 5.1:** Client component: copy exactly `Demo store — nothing is charged. Pay with test card 4242 4242 4242 4242, any future expiry, any CVC.` + dismiss ×; visibility = `useMounted() && !dismissed` where dismissal persists to localStorage key `walmal-demo-banner-dismissed`; `data-testid="demo-banner"`.
- [ ] **Step 5.2:** `clearState` gains `localStorage.setItem('walmal-demo-banner-dismissed', '1')` after its clear — the 117 existing tests never see the banner (comment why; also note that clearState's own `/` navigation renders the banner once, safe because every spec navigates again afterward — a future spec acting directly on the clearState page must keep that in mind). New spec TC-E2E-042: fresh context WITHOUT the pre-seed → banner visible, dismiss → gone, reload → still gone.
- [ ] **Step 5.3:** Counts: 120 tests (40 unique × 3); grep `117`/`39` claims in README + testing.md. Full matrix `npx playwright test` → **120 passed** (kill :3000 first; webkit worker-exit warnings benign; watchdog if silent).
- [ ] **Step 5.4: Commit** `feat(store): demo-mode banner + E2E (117 -> 120)`.

## Task 6: CI delivery — build/push + deploy jobs, pipeline collapse

**Files:**
- Modify: `walmal-store/.github/workflows/ci.yml`, `walmal-admin/.github/workflows/ci.yml`, `walmal/.github/workflows/ci.yml`
- Modify: each repo's `docs/kb/testing.md` CI section (same commit)

- [ ] **Step 6.1: Store + admin workflows:** new `build-and-push` job (needs: ci; `if: github.event_name == 'push'`; `permissions: packages: write`; docker/build-push-action with GHCR login, tags `latest` + `sha-…`, build-args from `vars.NEXT_PUBLIC_API_URL`/`vars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (store) / `vars.VITE_API_BASE_URL` (admin) with the localhost defaults when vars are unset — CI must stay green BEFORE the user configures anything). New `deploy` job (needs build-and-push; `if: … && vars.DEPLOY_ENABLED == 'true'`; `environment: production`): SSH (`appleboy/ssh-action` or bare ssh with the key) → `cd /opt/walmal && docker compose -f docker-compose.prod.yml pull <svc> && up -d <svc>`.
- [ ] **Step 6.2: walmal pipeline collapse:** replace jobs 4–7 (deploy-staging, smoke-staging, deploy-prod, smoke-prod) with ONE `deploy` (production; `DEPLOY_ENABLED` gate; `environment: production` kept; secrets `DEPLOY_HOST/USER/SSH_KEY`; real SSH deploy command replacing the placeholder echo) + ONE `smoke` job (curl `https://api.${vars.WALMAL_DOMAIN}/actuator/health` UP + `https://shop.…` 200). Remove the retired `STAGING_*`/prod-chain references from DEPLOYMENT.md's secret table (Task 7 rewrites it anyway — keep consistent).
- [ ] **Step 6.3:** Validate YAML (`gh workflow view` after push happens in Task 8's checkpoint; locally: `npx yaml-lint` equivalents or careful review). KB CI sections updated. Commit per repo: `ci: build+push images to GHCR and deploy via SSH (DEPLOY_ENABLED-gated)`.

## Task 7: Runbook + seeder port + KB

**Files:**
- Rewrite: `walmal/docs/DEPLOYMENT.md`
- Create: `walmal/scripts/seed-product-images.sh`
- Modify: walmal KB files claiming deployment facts; `MEMORY`-adjacent docs untouched

- [ ] **Step 7.1: `seed-product-images.sh`:** bash port of the PS1 (login as admin, loop the 15 productId→PNG pairs, multipart upload with `isPrimary=true`, idempotent skip when a primary exists) — same behavior, curl only. Smoke locally against the dev backend (idempotent run: 0 uploads on an already-seeded catalog).
- [ ] **Step 7.2: DEPLOYMENT.md rewrite** per spec §G: the two tracks; exact DNS records table (5 subdomains → one IP); `caddy hash-password` step for the mailhog basic-auth; GH secrets/vars table (new names — retire `STAGING_*`); Stripe TEST-dashboard webhook creation → `STRIPE_WEBHOOK_SECRET`; seeder invocation; Kuma monitor setup; backup cron line + the restore drill (documented command sequence, flagged as MUST-RUN-ONCE); UFW/fail2ban/unattended-upgrades hardening block.
- [ ] **Step 7.3: Commit** `docs(deploy): production runbook + bash image seeder`.

## Task 8: Final verification + delivery

- [ ] **Step 8.1: Local full-stack boot.** Hosts-file entries (`shop.walmal.local`, `admin.`, `api.`, `status.`, `mail.` → 127.0.0.1); throwaway `.env` with `WALMAL_DOMAIN=walmal.local` AND `WALMAL_CORS_ALLOWED_ORIGINS=https://shop.walmal.local,https://admin.walmal.local`; Caddyfile local mode (internal TLS). **REBUILD both frontend images with local-domain build args** (`NEXT_PUBLIC_API_URL=https://api.walmal.local/api/v1`, `VITE_API_BASE_URL=https://api.walmal.local`) — retagging the Task-1/2 images would carry the wrong baked origins and falsify the test. `docker compose -f docker-compose.prod.yml up -d`; wait healthy. **Browser-driven proof (Playwright, `ignoreHTTPSErrors: true`):** the CSP check runs on **`/products`** (a client-fetching page — the homepage is SSR/ISR and cannot prove a browser CSP; note the store container can't resolve `api.walmal.local` for SSR, so empty homepage rails are EXPECTED locally): products render AND the console shows zero CSP-violation errors; demo banner visible; `https://admin.walmal.local` login works; `https://api.walmal.local/actuator/health` UP; `https://mail.walmal.local` → 401 without credentials. Screenshot each; read them. Tear down, restore the dev environment.
- [ ] **Step 8.2:** Fresh gates everywhere: walmal `./mvnw test`; store lint 0 + 86 unit + build + (matrix already run in Task 5 — rerun only if src changed since); admin lint 0 + 81 unit + build.
- [ ] **Step 8.3:** superpowers:verification-before-completion — every spec section shipped or explicitly user-track (provisioning). Honest report: the system is "deployable, pending user provisioning"; list the exact user steps remaining.
- [ ] **Step 8.4: CHECKPOINT — ask the user before pushing** all three repos (workflow changes → CI runs must go green; DEPLOY_ENABLED stays unset so deploy jobs skip). After push: confirm all three CI green.
