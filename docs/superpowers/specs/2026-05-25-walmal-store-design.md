# walmal-store — E-Commerce Store Design

**Date:** 2026-05-25  
**Stack:** Next.js 16 (App Router), React 19, Stripe, Zustand, Tailwind CSS v4, Axios, TypeScript

---

## Overview

A client-side e-commerce store for physical goods. Products are defined in a local JSON data file. Cart state is managed client-side with Zustand (persisted to localStorage). Payments are handled via Stripe using a Next.js API route that creates a Checkout Session.

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Product listing — grid of all products |
| `/products/[id]` | Product detail — image, description, add to cart |
| `/cart` | Cart review page (mirrors drawer content) |
| `/checkout/success` | Post-payment success confirmation |
| `/checkout/cancel` | User cancelled Stripe checkout |
| `/api/checkout` | POST — creates Stripe Checkout Session, returns URL |

---

## Data

Products are stored in `src/data/products.ts` as a typed array. No database or external API.

```ts
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;       // in cents (e.g. 2999 = $29.99)
  image: string;       // path under /public/images/
  category: string;
};
```

A seed of ~6 sample products is included so the store is immediately functional.

---

## Architecture

### Directory Structure

```
src/
  app/
    layout.tsx              # Root layout: navbar + footer
    page.tsx                # Product listing
    products/[id]/page.tsx  # Product detail
    cart/page.tsx           # Cart page
    checkout/
      success/page.tsx
      cancel/page.tsx
    api/
      checkout/route.ts     # Stripe Checkout Session API
  components/
    StoreLayout.tsx         # Client wrapper — owns cart drawer open/closed state
    Navbar.tsx              # Logo + cart icon with item count badge
    Footer.tsx
    ProductCard.tsx         # Used in listing grid
    CartDrawer.tsx          # Slide-out cart accessible from navbar
    CartItem.tsx            # Single row in cart
  store/
    cartStore.ts            # Zustand cart store with localStorage persist
  data/
    products.ts             # Static product catalog
  lib/
    stripe.ts               # Stripe server-side client (singleton)
  types/
    index.ts                # Product, CartItem types
```

### Cart Store (Zustand)

State: `items: CartItem[]` where `CartItem = Product & { quantity: number }`.

Actions: `addItem`, `removeItem`, `updateQuantity`, `clearCart`.

Persisted to localStorage via Zustand's `persist` middleware under the key `walmal-cart`.

### Stripe Checkout Flow

1. User clicks "Checkout" in the cart drawer or cart page.
2. Client POSTs cart items to `/api/checkout` via Axios.
3. API route creates a Stripe Checkout Session with `line_items` mapped from cart, `success_url`, and `cancel_url`.
4. API returns `{ url }` — client redirects to Stripe-hosted checkout.
5. On success, Stripe redirects to `/checkout/success`. Cart is cleared on mount of that page.
6. On cancel, Stripe redirects to `/checkout/cancel`.

Stripe keys are read from environment variables: `STRIPE_SECRET_KEY` (server) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client, used for future inline elements if needed).

### Navbar & Cart Drawer

- Navbar is always visible, shows store name and a cart icon with a badge showing total item count.
- Clicking the cart icon opens `CartDrawer` (fixed overlay, slides in from the right).
- Drawer lists cart items with quantity controls and a "Checkout" button.
- Cart drawer open/closed state lives in a `StoreLayout` client component (`src/components/StoreLayout.tsx`) that wraps page content in the root layout. The root layout (`layout.tsx`) remains a Server Component and renders `<StoreLayout>{children}</StoreLayout>`.

---

## Styling

Tailwind CSS v4. Dark mode via `prefers-color-scheme` (media strategy). No custom design system — clean, minimal, functional. Color palette: zinc/neutral grays with a single accent color (e.g. indigo).

---

## Environment Variables

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Both must be set in `.env.local` before running.

---

## Error Handling

- `/api/checkout` returns `{ error }` with appropriate HTTP status on failure; client shows an inline error message.
- Product detail page: if `id` doesn't match any product, renders a "Product not found" message (no redirect needed).
- Cart empty state: both drawer and cart page show a friendly empty state with a link back to the listing.

---

## Out of Scope

- User authentication / accounts
- Admin panel
- Inventory tracking
- Webhooks / order persistence
- Search or filtering
