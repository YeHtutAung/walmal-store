/**
 * Shared in-memory mock database for Next.js API routes used in E2E tests.
 * Uses global to survive Hot Module Replacement in dev mode.
 */

interface MockOrder {
  id: string
  userId: string
  status: string
  totalAmount: number
  currency: string
  shippingAddress: { line1: string; line2?: string; city: string; postalCode: string; country: string }
  items: {
    variantId: string
    productNameSnapshot: string
    skuSnapshot: string
    quantity: number
    priceAtPurchase: number
    currency: string
    subtotal: number
  }[]
  createdAt: string
}

declare global {
  // eslint-disable-next-line no-var
  var __mockOrders: Record<string, MockOrder> | undefined
  // eslint-disable-next-line no-var
  var __registeredEmails: Set<string> | undefined
}

if (!global.__mockOrders) global.__mockOrders = {}
// Pre-seed the customer_test email so TC-E2E-022 (duplicate email) works
if (!global.__registeredEmails) global.__registeredEmails = new Set(['customer@test.com'])

export const mockDb = {
  get orders() { return global.__mockOrders! },
  get registeredEmails() { return global.__registeredEmails! },
}
