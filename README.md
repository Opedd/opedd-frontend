# Opedd Frontend

Publisher dashboard and marketing site for [Opedd](https://opedd.com) — the programmatic content licensing protocol for the human and AI era.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui components
- Supabase (auth + data) via Edge Functions
- Stripe Checkout (subscriptions + per-article licenses)
- Playwright E2E + Vitest unit tests
- Deployed via Lovable → Vercel. Main is production.

## Local development

```bash
npm install
cp .env.example .env.local  # fill in values
npm run dev                 # http://localhost:8080
```

## Scripts

```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Production build → dist/
npm run preview      # Serve built bundle locally
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E suite
```

## Pricing architecture

All plan pricing is fetched from `GET /functions/v1/plans` via the `usePlans()` hook (see `src/hooks/usePlans.ts`). **Do not hardcode subscription prices** (`$39`, `$99`, etc.) in components — the hook provides them with a localStorage fallback cache. Source of truth lives in the backend `_shared/pricing.ts`. See [PR #1](https://github.com/Opedd/opedd-frontend/pull/1) for the rationale.

## Backend

Edge Functions + database live in the [opedd-backend](https://github.com/Opedd/opedd-backend) repo. API calls go through `src/lib/api.ts` which proxies through the `api-proxy` edge function.

## Key files

- `src/App.tsx` — routing, lazy-loaded marketing pages
- `src/contexts/AuthContext.tsx` — Supabase auth + session refresh
- `src/hooks/usePlans.ts` — subscription plan catalog from backend
- `src/components/auth/ProtectedRoute.tsx` — auth gate (`requireAdmin` flag for admin routes)
- `src/lib/api.ts` — fetch wrapper with auth token injection
- `tailwind.config.ts` — brand tokens: `oxford` (#4A26ED), `navy.deep` (#040042), `plum.magenta` (#D1009A)
- `playwright.config.ts` — E2E settings (serial, single worker, 25min timeout)

## Deploying

CI is the sole deploy path — Vercel git integration is disabled. Every push to main runs `.github/workflows/e2e-tests.yml`, which builds, runs Playwright, and only then deploys to Vercel production. PRs trigger the same E2E suite as a gate but don't deploy.
