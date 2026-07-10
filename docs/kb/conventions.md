# walmal-store — Conventions

> Error-body shape definitions (ProblemDetail, `{ code, message }`, `{ error }`): `../walmal/docs/kb/SYSTEM.md`.

## Next.js Version Warning

See `AGENTS.md` — read `node_modules/next/dist/docs/` before writing Next.js code.

## API Client (`src/lib/api/client.ts`)

- `apiClient` — Axios instance; `baseURL` = `NEXT_PUBLIC_API_URL`; 10-second timeout.
- Request interceptor: attaches `Authorization: Bearer {token}` from `useAuthStore` when a token is present.
- Error interceptor parsing precedence: `fieldErrors` (from `data.errors` or `data.violations`) > `data.message` > `data.detail` > `error.message`.
- 401 while `status === 'authenticated'`: forces logout + cart clear + redirect to `/login?next=…`. 401 during `'idle'` (silent refresh) is ignored.
- Throws `ApiError(status, code, message)` — exported from `src/lib/api/client.ts`.

## ApiError Shape

```ts
class ApiError extends Error {
  status: number   // HTTP status code
  code: string     // data.code ?? 'UNKNOWN'
  message: string  // parsed per precedence above
}
```

## Store Patterns

- Zustand stores are created once and accessed via named exports (`useAuthStore`, `useCartStore`).
- `auth-store.ts` uses a `globalThis.__walmal_auth_store` singleton guard to survive Next.js HMR re-evaluation — do not remove it.
- Avoid direct store imports in Server Components; stores are client-only.

## Component Patterns

- All interactive components are `'use client'`.
- UI primitives come from `src/components/ui/` (shadcn).
- Hooks in `src/hooks/` wrap store access (`use-auth.ts`, `use-cart.ts`) — prefer these over direct store calls in components.
- `src/components/providers.tsx` mounts the proactive 50-minute token refresh interval.
