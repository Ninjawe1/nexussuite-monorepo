# Nexus Suite — Product Requirements Document (PRD)

## 1. Overview
Nexus Suite is a multi-tenant esports club management platform. Each club operates its own portal with role-based access (Super Admin, Club Admin, Coach, Player). The system supports authentication, team and tournament management, financial tracking (transactions), analytics, and secure storage. The backend is an Express app deployed to Vercel serverless via a catch-all entry, and the frontend is a Vite-based application styled with Tailwind CSS.

## 2. Goals
- Provide a secure, reliable portal for clubs to manage users, teams, tournaments, and finances.
- Enable fast, modern UI/UX with responsive design.
- Offer analytics and reporting to guide decision-making.
- Ensure scalable storage with Firestore and optional SQL analytics via Drizzle.

## 3. Non-Goals
- Full-fledged payment processing (beyond recording transactions).
- Real-time game integration or match streaming.
- Deep bracket generation logic beyond basic scheduling.

## 4. Users & Roles
- Super Admin: Platform-level administration, club provisioning, global settings.
- Club Admin: Club configuration, user onboarding, teams, tournaments, finance oversight.
- Coach: Team roster management, schedule coordination, results entry.
- Player: Profile management, participation, view schedules/results/transactions.

## 5. Key Use Cases & User Stories
- As a Club Admin, I can register and log in, then create teams and invite coaches/players.
- As a Coach, I can create a tournament, schedule matches, and record results.
- As a Club Admin, I can create income/expense transactions with categories and notes, and view a ledger.
- As a Player, I can view my team’s schedule and tournament standings.
- As a Super Admin, I can audit logs and monitor system health.

## 6. Functional Requirements
### 6.1 Authentication & Authorization
- Email/password registration and login using bcryptjs hashing.
- Session/token management with secure cookie handling.
- Role-based access control enforced server-side.
- Logout endpoint invalidates session/token.

### 6.2 Club & Team Management
- CRUD for clubs and teams.
- Manage player roster and roles.

### 6.3 Tournament Management
- Create/edit tournaments (name, format, dates).
- Schedule matches and record results.
- View standings/summary.

### 6.4 Transactions & Finance
- Create transactions (income/expense) with amount, category, note, optional attachment.
- Ledger view with filters and summaries.
- Basic analytics charts (e.g., totals by category/month).

### 6.5 Analytics & Reporting
- Fetch social/platform analytics (via server/analytics-fetcher.ts) for dashboards.
- Export CSV/JSON summaries of tournaments and transactions.

### 6.6 Administration & Debug
- Health endpoint returns `{ ok: true }` for monitoring.
- Restricted debug endpoints for environment inspection (admins only).
- Structured request logging and error handling.

## 7. API Endpoints (High-Level)
- GET /api/health — health check
- POST /api/auth/register — register user
- POST /api/auth/login — login (bcryptjs)
- POST /api/auth/logout — logout
- Clubs/Teams/Tournaments/Transactions endpoints — CRUD and actions (exact routes defined in server/routes.ts)

## 8. Data Model (High-Level)
- User(id, email, name, role, clubs[])
- Club(id, name, settings)
- Team(id, clubId, name, roster[])
- Tournament(id, clubId, name, status, schedule[], results)
- Transaction(id, clubId, type[income|expense], amount, category, note, attachmentUrl)

## 9. System Architecture
- Backend: Express app (server/index.ts, server/routes.ts) with modular services (auth, storage, rbac, analytics).
- Serverless Adapter: api/[[...route]].ts imports compiled dist/routes.js for Vercel deployments.
- Frontend: Vite-based application (client/src) styled by Tailwind (tailwind.config.ts, postcss.config.js).
- Storage: Firestore via Firebase Admin (server/storage-firestore.ts, server/firebase.ts). Optional Drizzle ORM (server/db.ts, drizzle.config.ts).
- Dev Experience: Vite dev middleware in development; static serving in production.

## 10. Security & Compliance
- Passwords hashed with bcryptjs.
- Principle of least privilege via RBAC.
- Environment secrets managed via Vercel (.env.production.local).
- Firestore rules and indexes for access control and performance.
- GDPR-ready data policies (export/delete upon request).

## 11. Performance & Reliability
- Target API latency p95 < 300ms for core endpoints.
- 99.9% monthly uptime target.
- Structured logs for API calls; global error handler returns JSON 500 with message.

## 12. Observability & Monitoring
- Request/response logging for /api endpoints (duration, status, sample payload).
- Function logs via Vercel dashboard.
- Health endpoint for uptime checks.

## 13. UX & UI Requirements
- Responsive layouts; accessible color contrast.
- Tailwind CSS for consistent styling.
- Clear flows for register, login, tournament create/edit, transaction create.
- Error messages and validation inline.

## 14. Constraints & Dependencies
- Vercel serverless runtime for production.
- Firebase Admin SDK credentials required.
- Firestore as primary persistence; Drizzle optional.
- PostCSS/Tailwind build pipeline.

## 15. Rollout Plan & Milestones
- M1: Auth + RBAC + Health endpoint
- M2: Teams + Tournaments CRUD + basic scheduling
- M3: Transactions + ledger + analytics charts
- M4: Admin tools + logs + reporting

## 16. Risks & Assumptions
- Data consistency between Firestore and any optional SQL analytics layer.
- Complexity of tournament scheduling/brackets.
- Secret management across environments.

## 17. Acceptance Criteria
- Users can register/login/logout; roles enforced.
- Club Admin can create teams, tournaments, and transactions without server errors.
- Health endpoint returns `{ ok: true }` in production.
- Basic analytics available for transactions.
- Error responses are structured and logs appear in Vercel.