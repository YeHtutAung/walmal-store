import { execSync } from 'child_process'

/**
 * Reset inventory stock for seeded test variants before the test suite runs.
 * Each browser project runs TC-E2E-015, TC-E2E-033, TC-E2E-034 (checkout tests)
 * consuming 1 unit each — 3 browsers × 3 tests = 9 units needed per full run.
 * The seeded migration only inserts 3 units, so without this reset the suite
 * fails with 409 Insufficient Stock for Firefox and WebKit.
 */
async function globalSetup() {
  // Pre-warm Next.js routes so the first test that visits each route doesn't
  // pay the dev-mode compilation cost during a tight assertion timeout.
  const routes = ['/login', '/register', '/account', '/products', '/cart']
  await Promise.allSettled(
    routes.map((r) =>
      fetch(`http://localhost:3000${r}`, { redirect: 'manual' }).catch(() => {}),
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
