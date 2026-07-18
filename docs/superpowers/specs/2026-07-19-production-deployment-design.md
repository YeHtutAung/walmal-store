# Production Deployment (Phases 3–4) — Design

**Date:** 2026-07-19
**Status:** Approved (user, 2026-07-19)
**Repos:** walmal (hub — compose stack, runbook, webhook), walmal-store,
walmal-admin. Spec lives in walmal-store per session precedent.

**User decisions (2026-07-19):**
1. **Single VPS + Docker Compose** (user provisions the VPS + accounts; this
   project produces every config and a runbook — account creation and
   payment entry are user-only actions).
2. **Stripe stays in TEST mode** — public demo store, test cards only,
   clearly labeled. The webhook endpoint is still built properly.
3. **Domain to be purchased** — all configs use the placeholder
   `WALMAL_DOMAIN` (e.g. `shop.${WALMAL_DOMAIN}`); the runbook's first step
   is buying it and setting DNS.

## A. Topology

One Ubuntu 24.04 VPS (4–8 GB class, e.g. Hetzner CPX21/CX32). One
production compose file (`walmal/docker-compose.prod.yml`, extended) runs:

| Service | Image | Exposure |
|---|---|---|
| `caddy` | `caddy:2` | :80/:443 — the ONLY published ports. Automatic Let's Encrypt TLS. |
| `app` (Spring) | `ghcr.io/yehtutaung/walmal/walmal-app` (CI-built) | internal :8080 → `api.${WALMAL_DOMAIN}` |
| `store` (Next.js) | `ghcr.io/yehtutaung/walmal-store` (new) | internal :3000 → `shop.${WALMAL_DOMAIN}` (+ apex redirect) |
| `admin` (nginx static) | `ghcr.io/yehtutaung/walmal-admin` (new) | internal :80 → `admin.${WALMAL_DOMAIN}` |
| `postgres` 15, `redis` 7, `rabbitmq` 3.12, `minio` | stock images, named volumes | internal only (MinIO images reach browsers via the store's existing `/api/minio` proxy) |
| `mailhog` | stock | internal; UI at `mail.${WALMAL_DOMAIN}` behind Caddy basic-auth — demo feature ("see the emails the shop sends"); test mode means no real customer email |
| `uptime-kuma` | stock, own volume | `status.${WALMAL_DOMAIN}` — public status page + email alerts |

Caddyfile is committed (`walmal/deploy/Caddyfile`); domain comes from the
server `.env`. No container publishes a port except Caddy.

## B. Frontend images + CI delivery

- **Store Dockerfile** (walmal-store): multi-stage — `npm ci` + `next build`
  with `output: 'standalone'` (add to `next.config.ts`), runtime stage on
  `node:22-alpine` running `server.js` as non-root. Build args for the two
  `NEXT_PUBLIC_*` values (they bake into the client bundle at build time —
  the CI build must receive the real prod values via GH **variables**, not
  secrets: `NEXT_PUBLIC_API_URL=https://api.${WALMAL_DOMAIN}/api/v1` and the
  Stripe **test** publishable key, which is not secret by definition).
  Runtime env supplies `STRIPE_SECRET_KEY` (test) + `RATE_LIMIT_*` if needed.
- **Admin Dockerfile** (walmal-admin): multi-stage — `npm ci` + `npm run
  build` with `VITE_API_BASE_URL=https://api.${WALMAL_DOMAIN}` build arg
  (same variables-not-secrets rule), then `nginx:alpine` serving `dist/`
  with an SPA fallback (`try_files ... /index.html`) config committed
  alongside.
- **CI**: both frontend workflows gain a `build-and-push` job (GHCR, tags
  `latest` + `sha-*`, push-to-default-branch only, `permissions: packages:
  write`) and a `deploy` job gated `vars.DEPLOY_ENABLED == 'true'` that
  SSHes to the VPS and runs `docker compose pull <svc> && docker compose up
  -d <svc>`. The walmal pipeline's staging→prod chain is **collapsed to one
  "Deploy (production)" job + one smoke job** (single VPS, no staging);
  same `DEPLOY_ENABLED` gate; secrets renamed `DEPLOY_HOST` /
  `DEPLOY_USER` / `DEPLOY_SSH_KEY` (runbook updates GH secrets
  accordingly; the old `STAGING_*` names are retired).

## C. Backend prod configuration

- New `application-prod.yml` in walmal-app: prod CORS origins
  (`https://shop.…`, `https://admin.…` from env), sane rate limits, no
  seed-data assumptions beyond migrations, actuator health exposed,
  `info.walmal.profile=prod` marker. All credentials/urls from env vars
  (matching the existing env matrix in `docs/kb/SYSTEM.md` — extend it).
- SMTP points at mailhog (unchanged mechanics; the sink is the demo).
- **Seeding the demo catalog**: Flyway migrations run on boot (V17 catalog
  included). Product images: run `scripts/seed-product-images.ps1`'s logic
  once against prod — port the seeder to a bash script
  (`scripts/seed-product-images.sh`) so it runs from the VPS or any shell
  (the PS1 stays for Windows dev). Runbook step.
- The storefront's in-memory rate limiter is now architecturally correct:
  single instance behind Caddy, which sets a trustworthy
  `X-Forwarded-For`.

## D. Stripe webhook (Phase 4 backend work, walmal)

- New endpoint `POST /api/v1/payment/webhook` in the payment module:
  verifies the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`,
  handles `payment_intent.succeeded` / `payment_intent.payment_failed` as
  a **reconciliation log** (records the event against the order's payment
  reference; flags mismatches) — it does NOT replace the existing
  server-side PaymentIntent verification, it audits it. Unknown event
  types → 200 (ack, ignore). Signature failure → 400. Unit tests with
  Stripe's signed-payload scheme; endpoint added to SYSTEM.md + permitAll
  (signature IS the auth) with rate-limit exemption noted.
- Runbook: create the webhook in the Stripe TEST dashboard pointing at
  `https://api.${WALMAL_DOMAIN}/api/v1/payment/webhook`.

## E. Demo-store labeling (walmal-store)

A dismissible banner (persisted dismissal, localStorage) on the storefront:
"Demo store — nothing is charged. Pay with test card 4242 4242 4242 4242,
any future expiry, any CVC." Rendered above the announcement bar. E2E: one
test that it renders and dismisses (desktop); existing tests must not break
(banner must not intercept clicks — dismissal in `beforeEach`'s
`clearState` keeps old specs untouched IF clearState clears localStorage —
verify; if so the banner appears in every test → instead give the banner a
`data-testid` and have `clearState` pre-seed the dismissal flag).

## F. Backups + monitoring + security

- **Backups**: `deploy/backup.sh` + cron (03:00): `pg_dump -Fc` and a tar
  of the MinIO data volume → `/opt/walmal/backups`, 7-day rotation;
  restore procedure documented and **tested once in the runbook** (restore
  drill into a scratch database). Off-site: documented rclone-to-B2 option,
  not provisioned.
- **Monitoring**: Uptime Kuma monitors `api./actuator/health`, `shop.`,
  `admin.`, `status.` self; email alert channel (user configures SMTP or
  uses a free notifier in the Kuma UI — runbook step). Docker log rotation
  (`json-file`, `max-size=10m`, `max-file=3`) in the compose file.
- **Security**: runbook hardening steps — UFW allow 22/80/443 only, SSH
  key-only auth, fail2ban, unattended-upgrades. Caddy basic-auth on
  `mail.`; admin app keeps its own JWT login (no extra proxy auth — its
  backend enforcement is real).

## G. Runbook (`walmal/docs/DEPLOYMENT.md` rewrite)

Two clearly separated tracks:
- **You (once)**: buy domain; create VPS + SSH key; point DNS (5 A-records);
  install Docker; clone walmal; fill `.env` from `.env.production.example`;
  set GH secrets (`DEPLOY_HOST/USER/SSH_KEY`) + variables
  (`DEPLOY_ENABLED`, `NEXT_PUBLIC_*`, `VITE_API_BASE_URL`); create the
  Stripe test webhook; run the image seeder; set Kuma monitors + alerts;
  run the backup restore drill.
- **Automated (every push)**: CI builds/pushes images and deploys via SSH;
  smoke job curls the public health endpoints.

## Verification

- All Dockerfiles build locally; the full prod compose stack boots on the
  dev machine with a throwaway `.env` (domain faked via sslip.io or
  host-file entries — TLS internal issuer for local) and the three apps
  serve through Caddy.
- Webhook: unit tests + a signed test event via `stripe` CLI (or a crafted
  signature) against the locally running stack.
- Existing suites all stay green (store 117 must pass with the demo banner
  present — see E).
- After the user provisions: first `DEPLOY_ENABLED=true` push goes green
  end-to-end including the smoke job; Kuma shows all monitors up.

## Out of scope

Stripe live mode, real email delivery, multi-instance scaling / k8s,
CDN, off-site backup provisioning, staging environment (explicitly
collapsed), server-side wishlist and other feature backlog.
