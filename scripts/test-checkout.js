/**
 * Playwright checkout flow test
 * Run: node scripts/test-checkout.js
 */
const { chromium } = require('playwright')

const BASE = 'http://localhost:3000'
const USERNAME = 'checkouttest'
const PASSWORD = 'Checkout1!'

// Stripe test card
const CARD_NUMBER = '4242424242424242'
const CARD_EXPIRY = '12/29'
const CARD_CVC = '123'
const CARD_ZIP = '10001'

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  // Capture console errors
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', err => errors.push(`[page.error] ${err.message}`))

  try {
    // ── Step 1: Login ──────────────────────────────────────────────────────
    console.log('\n── Step 1: Login ──')
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('#username', { timeout: 10000 })

    await page.locator('#username').fill(USERNAME)
    await page.locator('#password').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/(account|products|$)/, { timeout: 10000 })
    console.log('✓ Logged in, redirected to:', page.url())

    // ── Step 2: Browse products ────────────────────────────────────────────
    console.log('\n── Step 2: Browse products ──')
    await page.goto(`${BASE}/products`)
    // Wait for auth to resolve and products to load (idle guard)
    await page.waitForFunction(() => !document.body.innerText.includes('Loading…'), { timeout: 20000 })
    await page.waitForTimeout(1000)
    const productCount = await page.locator('a[href*="/products/"]').count()
    const pageText2 = await page.locator('main').textContent()
    console.log(`✓ Found ${productCount} product links`)
    console.log('  Page snippet:', pageText2?.substring(0, 150).replace(/\s+/g, ' ').trim())

    // ── Step 3: Open first product ─────────────────────────────────────────
    console.log('\n── Step 3: Open first product ──')
    const firstProduct = page.locator('a[href*="/products/"]').first()
    const productHref = await firstProduct.getAttribute('href')
    console.log('  → Navigating to:', productHref)
    await firstProduct.click()
    await page.waitForURL(/\/products\//, { timeout: 10000 })
    console.log('✓ Product detail page:', page.url())

    // ── Step 4: Add to cart ────────────────────────────────────────────────
    console.log('\n── Step 4: Add to cart ──')
    // Wait for product detail to load (auth guard)
    await page.waitForFunction(() => !document.body.innerText.includes('Loading…'), { timeout: 15000 })
    await page.waitForTimeout(1500)

    // Select variant first (required before "Add to cart" is enabled)
    const variantSection = page.locator('text=Select variant').first()
    const variantSectionVisible = await variantSection.isVisible().catch(() => false)
    console.log(`  → Variant section visible: ${variantSectionVisible}`)

    if (variantSectionVisible) {
      // Click the first variant button (they appear right after "Select variant" text)
      const variantBtn = page.locator('p:has-text("Select variant") + div button').first()
      const variantBtnCount = await page.locator('p:has-text("Select variant") + div button').count()
      console.log(`  → Variant buttons: ${variantBtnCount}`)

      if (variantBtnCount > 0) {
        const variantLabel = await variantBtn.textContent()
        console.log(`  → Selecting variant: "${variantLabel?.trim()}"`)
        await variantBtn.click()
        await page.waitForTimeout(500)
      }
    }

    // Now click "Add to cart"
    const addBtn = page.locator('button').filter({ hasText: /add to cart/i }).first()
    await addBtn.waitFor({ state: 'visible', timeout: 5000 })
    // Wait for it to become enabled after variant selection
    await page.waitForFunction(
      () => !document.querySelector('button[disabled]')?.textContent?.includes('Add to cart'),
      { timeout: 5000 }
    ).catch(() => {})
    await addBtn.click({ force: true })
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Check for "Added to cart!" confirmation
    const addedText = await page.locator('button').filter({ hasText: /added to cart/i }).count()
    console.log(`✓ Add to cart clicked — "Added!" feedback: ${addedText > 0}`)

    // ── Step 5: Navigate to cart ───────────────────────────────────────────
    console.log('\n── Step 5: Navigate to cart ──')
    await page.goto(`${BASE}/cart`)
    await page.waitForTimeout(2000)

    const cartText = await page.locator('h1:has-text("Shopping cart") ~ *').first().textContent().catch(
      () => page.locator('body').textContent()
    )
    const bodyText = await page.locator('body').textContent()
    console.log(`✓ Cart page loaded`)
    console.log('  Cart content snippet:', bodyText?.substring(0, 300).replace(/\s+/g, ' ').trim())

    if (bodyText?.includes('Your cart is empty')) {
      throw new Error('Cart is empty — add to cart may have failed')
    }

    // Verify price displayed
    const hasPrice = /\$[\d,.]+/.test(bodyText ?? '')
    console.log(`  → Price displayed: ${hasPrice}`)
    const hasZeroPrice = /\$0\.00/.test(bodyText ?? '')
    if (hasZeroPrice) console.warn('  ⚠ WARNING: Price shows $0.00')

    // ── Step 6: Proceed to checkout ────────────────────────────────────────
    console.log('\n── Step 6: Proceed to checkout ──')
    const checkoutBtn = page.locator('a[href="/checkout"], button').filter({ hasText: /checkout/i }).first()
    await checkoutBtn.click()
    await page.waitForURL(/\/checkout/, { timeout: 10000 })
    console.log('✓ On checkout page:', page.url())

    // Auth user skips "choose" screen — wait for Stripe to load
    await page.waitForTimeout(3000)

    // ── Step 7: Fill shipping address ──────────────────────────────────────
    console.log('\n── Step 7: Fill shipping address ──')
    const inputs = await page.locator('input:visible').all()
    console.log(`  → Visible inputs found: ${inputs.length}`)
    for (const inp of inputs) {
      const placeholder = await inp.getAttribute('placeholder') ?? ''
      const name = await inp.getAttribute('name') ?? ''
      const id = await inp.getAttribute('id') ?? ''
      console.log(`    input: name=${name} id=${id} placeholder=${placeholder}`)
    }

    // Fill address fields
    const fillField = async (selectors, value) => {
      for (const sel of selectors) {
        const el = page.locator(sel).first()
        if (await el.isVisible().catch(() => false)) {
          await el.fill(value)
          return true
        }
      }
      return false
    }

    await page.locator('#line1').fill('123 Test Street')
    await page.locator('#city').fill('New York')
    await page.locator('#postalCode').fill('10001')
    await page.locator('#country').fill('US')
    console.log('✓ Address fields filled')

    // ── Step 8: Fill Stripe card ───────────────────────────────────────────
    console.log('\n── Step 8: Fill Stripe card ──')
    // Wait for Stripe to initialize and render the iframe
    await page.waitForTimeout(3000)

    const allFrames = page.frames()
    console.log(`  → Total frames: ${allFrames.length}`)
    allFrames.forEach(f => console.log('    frame:', f.url().substring(0, 80)))

    // Stripe CardElement renders inside a cross-origin iframe
    // Find the card iframe by URL pattern (contains "m-outer" in Stripe's CardElement)
    const cardFrame = page.frames().find(f => f.url().includes('m-outer'))
    console.log('  → Card frame found:', !!cardFrame, cardFrame?.url()?.substring(0, 80))

    if (cardFrame) {
      try {
        // The CardElement has inputs for cardnumber, exp-date, cvc
        const cardInput = cardFrame.locator('[name="cardnumber"], input').first()
        await cardInput.waitFor({ timeout: 8000 })
        await cardInput.click()
        await cardInput.type(CARD_NUMBER, { delay: 50 })
        await page.waitForTimeout(500)
        await cardFrame.locator('[name="exp-date"], input').nth(1).type(CARD_EXPIRY.replace('/', ''), { delay: 50 }).catch(
          () => page.keyboard.type(CARD_EXPIRY.replace('/', ''), { delay: 50 })
        )
        await page.waitForTimeout(200)
        await cardFrame.locator('[name="cvc"], input').nth(2).type(CARD_CVC, { delay: 50 }).catch(
          () => page.keyboard.type(CARD_CVC, { delay: 50 })
        )
        await page.waitForTimeout(200)
        await cardFrame.locator('[name="postal"], input').nth(3).type(CARD_ZIP, { delay: 50 }).catch(() => {})
        await page.waitForTimeout(500)
        console.log('✓ Stripe card details entered')
      } catch (e) {
        console.log('  → Card fill failed:', e.message)
        // Try frameLocator approach as fallback
        try {
          await page.frameLocator('iframe').nth(1).locator('input').first().click()
          await page.frameLocator('iframe').nth(1).locator('input').first().type(CARD_NUMBER, { delay: 50 })
          await page.waitForTimeout(500)
          await page.keyboard.type(CARD_EXPIRY.replace('/', '') + CARD_CVC, { delay: 50 })
          await page.waitForTimeout(500)
          console.log('✓ Stripe card (fallback method)')
        } catch (e2) {
          console.log('  → Fallback also failed:', e2.message)
          await page.screenshot({ path: 'stripe-debug.png' })
        }
      }
    } else {
      console.log('  ⚠ Stripe card frame not found — may need more time to load')
      await page.waitForTimeout(5000)
      const cardFrameRetry = page.frames().find(f => f.url().includes('m-outer') || f.url().includes('stripe'))
      console.log('  → Retry frame found:', !!cardFrameRetry)
      await page.screenshot({ path: 'stripe-debug.png' })
    }

    // ── Step 9: Verify order summary ───────────────────────────────────────
    console.log('\n── Step 9: Check order summary ──')
    const summaryText = await page.locator('body').textContent()
    console.log('  Summary snippet:', summaryText?.substring(0, 300).replace(/\s+/g, ' ').trim())
    const summaryHasPrice = /\$[\d,.]+/.test(summaryText ?? '')
    console.log(`  → Price in summary: ${summaryHasPrice}`)

    // ── Step 10: Submit payment ────────────────────────────────────────────
    console.log('\n── Step 10: Submit payment ──')
    const payBtn = page.locator('button').filter({ hasText: /pay now/i }).first()
    const payVisible = await payBtn.isVisible().catch(() => false)
    console.log(`  → "Pay now" button visible: ${payVisible}`)

    if (payVisible) {
      await payBtn.click()
      console.log('  → Payment submitted, waiting for order confirmation...')

      // Wait for redirect to order confirmation or error
      const result = await Promise.race([
        page.waitForURL(/\/order-confirmation/, { timeout: 30000 }).then(() => 'success'),
        page.waitForSelector('[class*="destructive"], .text-destructive', { timeout: 30000 }).then(() => 'error'),
      ]).catch(e => `timeout: ${e.message}`)

      console.log(`  → Result: ${result}`)
      if (result === 'success') {
        console.log('✓ ORDER CONFIRMED! URL:', page.url())
        const confirmText = await page.locator('body').textContent()
        console.log('  Confirmation:', confirmText?.substring(0, 200).replace(/\s+/g, ' ').trim())
      } else {
        const pageText = await page.locator('body').textContent()
        console.log('  Page content:', pageText?.substring(0, 300).replace(/\s+/g, ' ').trim())
      }
    } else {
      console.log('  ⚠ Pay now button not visible — Stripe may not have loaded')
      // Take screenshot for debugging
      await page.screenshot({ path: 'checkout-debug.png' })
      console.log('  Screenshot saved: checkout-debug.png')
    }

    // ── Summary ────────────────────────────────────────────────────────────
    console.log('\n── Console errors captured ──')
    if (errors.length === 0) {
      console.log('  ✓ No console errors')
    } else {
      errors.forEach(e => console.log('  ✗', e))
    }

  } catch (err) {
    console.error('\n✗ Test failed:', err.message)
    await page.screenshot({ path: 'checkout-error.png' })
    console.log('Screenshot saved: checkout-error.png')
  } finally {
    await page.waitForTimeout(2000)
    await browser.close()
  }
}

run().catch(console.error)
