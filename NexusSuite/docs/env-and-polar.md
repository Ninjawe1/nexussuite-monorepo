# NexusSuite Environment and Polar Integration

This document explains how to configure environment variables, generate Polar access tokens, and how the Better Auth organization context is used by the billing endpoints.

## .env layout (server)

Place your server environment in `NexusSuite/.env` (workspace root) so both the backend and the Vite frontend can read the same values.

Required variables:

- BETTER_AUTH_SECRET=...                # Better Auth secret
- BETTER_AUTH_URL=http://localhost:3001 # Better Auth API base during local dev
- FRONTEND_URL=http://localhost:3000    # Vite dev server origin for CORS

- FIREBASE_PROJECT_ID=...
- FIREBASE_CLIENT_EMAIL=...
- FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"  # remember to escape newlines

- POLAR_ACCESS_TOKEN=polar_oat_...      # OAuth access token from Polar
- POLAR_SERVER=sandbox                  # sandbox or production
- POLAR_WEBHOOK_SECRET=whsec_...        # optional: for webhook verification

Other commonly used variables:

- PORT=3001                             # Express API server port
- NODE_ENV=development

Notes:

- When using FIREBASE_PRIVATE_KEY, ensure the value is quoted and newlines are escaped with \n.
- Vite will read from the workspace root `.env` when `envDir` is configured to the root in vite.config, otherwise you may need to duplicate vars under the frontend.

## Generating a Polar Access Token

Polar offers sandbox and production environments. Use sandbox during local development.

Steps:

1) Register or sign in to Polar
2) Navigate to Settings → Access Tokens
3) Create a new token for the appropriate environment
4) Copy the `polar_oat_...` token and set it in `.env` as `POLAR_ACCESS_TOKEN`
5) Set `POLAR_SERVER` to `sandbox` for local dev, or `production` when going live

Webhook secret:

If you plan to process webhooks, create a webhook in Polar and copy the `whsec_...` secret into `POLAR_WEBHOOK_SECRET`.

## Better Auth org context in billing endpoints

The billing API endpoints infer the organization ID from the authenticated user context or accept an explicit `organizationId` query parameter.

- Authentication bridges through cookies (authToken, better_auth_session) or Authorization: Bearer header.
- `requireAuth` populates `req.user` from the Better Auth session. The user object includes `id` and `orgId`.

Endpoints:

- GET `/api/subscription/plans`: Fetch active plans from Polar (with a static fallback when Polar is not configured).
- GET `/api/subscription`: Returns subscription and customer info. Derives org ID from `req.user.orgId` unless `?organizationId=` is provided.
- GET `/api/subscription/usage`: Returns usage metrics for the organization. Derives org ID the same way.

Permissions:

- Permissions are enforced via Firestore `org_members` records. Admins and owners have billing-related permissions.
- In development, if no member record exists but the authenticated user is the `ownerId` on the organization, a fallback grants permissions to unblock billing views.

## Verifying Polar connectivity

Use the dev test route:

- GET `/api/subscription/test-polar`

This calls `polar.products.list()` and returns raw results or an error to help diagnose missing tokens or network issues.

## Troubleshooting

- 500 from `/api/subscription/plans`: Check `POLAR_ACCESS_TOKEN`. The service will log configuration and may fall back to static plans.
- 400 from `/api/subscription`: Ensure the user belongs to the organization in Firestore (`org_members`), or rely on the owner fallback during dev.
- 400 from `/api/subscription/usage`: Confirm the `organizationId` exists and the user has permissions.

---

For production, remove the owner fallback and ensure all users are properly invited to organizations so `org_members` is authoritative.