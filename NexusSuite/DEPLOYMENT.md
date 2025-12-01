# NexusSuite Production Deployment (Vercel + Supabase)

## Overview
- Frontend: React/Vite on Vercel (project root: `NexusSuite/client`)
- API: Express router wrapped as Vercel serverless at `NexusSuite/vercel/api/index.ts`
- Data APIs: Supabase Edge Functions at `supabase/functions/api`
- Single dev `.env`: `NexusSuite/.env`; mirror prod envs in dashboards

## 1) Clean Reset on Vercel
- Delete all existing projects for NexusSuite (frontend/backend), domains, and envs
- Create a new project for the frontend
  - Framework preset: Vite
  - Project root: `NexusSuite/client`
  - Build: `npm run build`
  - Output: `dist`
  - Env (Production):
    - `VITE_APP_NAME`
    - `VITE_APP_URL` → your Vercel domain
    - `VITE_API_URL` → functions domain hosting `/api` (from the backend project)
    - `VITE_SUPABASE_ANON_KEY` → Supabase anon key
    - `VITE_SUPABASE_URL` (optional for direct SDK usage)

- Create a new project for serverless API
  - Project root: `NexusSuite/vercel`
  - Functions: `/api/index.ts` (uses Express router from `server/routes/index.ts`)
  - Env (Production):
    - `BETTER_AUTH_SECRET`
    - `BETTER_AUTH_URL` → your functions base (e.g., `https://<backend>.vercel.app`)
    - `JWT_SECRET`
    - `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`
    - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
    - `MEM0_API_KEY`

## 2) Supabase Setup
- Create (or use) a Supabase project; note your `PROJECT_REF`
- Confirm tables used by server exist (users, accounts, sessions, organizations, etc.)
- Deploy Edge Function `api` from `supabase/functions/api`
  - Configure function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
  - Set `ALLOWED_ORIGIN` to your Vercel frontend domain
  - Test endpoints: `/api/ping`, `/api/diagnostics`, `/api/matches`

## 3) Client Configuration
- The client now prepends `VITE_API_URL` for any `/api/*` requests
  - Auth endpoints (`/api/auth/*`) and webhooks are served by Vercel functions
  - Data endpoints can be moved to Supabase Edge Functions incrementally
- For Better Auth calls, `betterAuthService` uses `VITE_API_URL` when available

## 4) Verification
- Frontend health: load main pages and check network calls
- Vercel functions: `/api/diagnostics` returns JSON
- Auth flow: register → login → get current user → logout
- Billing: post to `/api/subscription/webhook` using Polar sandbox
- Supabase function: `/api/diagnostics`, `/api/matches` return expected JSON

## 5) Notes
- Keep dev server on port `3000` and Vite on `5173`
- Always restart servers after env changes
- Never expose server-only secrets with `VITE_`

