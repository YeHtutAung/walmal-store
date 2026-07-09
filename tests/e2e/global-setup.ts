import { execSync } from 'child_process'

/**
 * Reset inventory stock for seeded test variants before the test suite runs.
 * Each browser project runs TC-E2E-015, TC-E2E-033, TC-E2E-034 (checkout tests)
 * consuming 1 unit each — 3 browsers × 3 tests = 9 units needed per full run.
 * The seeded migration only inserts 3 units, so without this reset the suite
 * fails with 409 Insufficient Stock for Firefox and WebKit.
 */
async function globalSetup() {
  // Fail fast on test-environment config drift. Both historical flake classes
  // (429s mid-suite, payment-intent 500s with no clientSecret) were caused by
  // reusing servers whose launch-time config differed from the test config.

  // 1. Stripe: the payment-intent route needs a real test-mode secret key.
  //    .env.local carries a placeholder; only .env.test.local has the real one.
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (!stripeKey.startsWith('sk_test_') || stripeKey.length < 30) {
    throw new Error(
      '[global-setup] STRIPE_SECRET_KEY is missing or not a real Stripe test key. ' +
      'Ensure .env.test.local exists with a valid sk_test_... key ' +
      '(payment-intent would otherwise return 500 with no clientSecret).',
    )
  }

  // 2. Backend: verify the running backend was started with the test profile
  //    from a JAR that packages the current application-test.yml. A reused
  //    backend without it has production-grade rate limits (20-300 req/min per
  //    IP) and causes intermittent 429s across a full 3-browser run.
  const infoRes = await fetch('http://localhost:8080/actuator/info').catch((e) => {
    throw new Error(`[global-setup] Backend not reachable on :8080: ${e.message}`)
  })
  const info = await infoRes.json().catch(() => ({}))
  if (info?.walmal?.profile !== 'test') {
    throw new Error(
      '[global-setup] Backend on :8080 is NOT running with the test Spring profile ' +
      '(missing walmal.profile=test marker on /actuator/info). Either a stale backend ' +
      'is being reused (stop it and let Playwright start one), or the JAR predates ' +
      'application-test.yml (rebuild: cd ../walmal && ./mvnw -pl walmal-app -am -DskipTests clean package).',
    )
  }
  console.log('[global-setup] Backend test profile verified; Stripe test key present.')

  // Pre-warm Next.js routes so the first test that visits each route doesn't
  // pay the dev-mode compilation cost during a tight assertion timeout.
  const routes = ['/login', '/register', '/account', '/products', '/cart']
  await Promise.allSettled(
    routes.map((r) =>
      fetch(`http://localhost:3001${r}`, { redirect: 'manual' }).catch(() => {}),
    ),
  )
  console.log('[global-setup] Next.js routes pre-warmed.')
  const sql = [
    "UPDATE inventory_stock SET available_quantity=500",
    " WHERE variant_id IN (",
    "  '20000000-0000-0000-0000-000000000001',",
    "  '20000000-0000-0000-0000-000000000002'",
    " )",
    " AND location_id='a0000000-0000-0000-0000-000000000001'",
  ].join('')

  try {
    execSync(
      `docker exec walmal-postgres psql -U walmal -d walmal -c "${sql}"`,
      { stdio: 'pipe' },
    )
    console.log('[global-setup] Inventory stock reset to 500 for test variants.')
  } catch (err) {
    console.warn('[global-setup] Could not reset inventory stock:', (err as Error).message)
  }
}

export default globalSetup
