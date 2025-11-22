# Nexus Suite — Esports Club Management

## Product Vision
Nexus Suite is a multi-tenant, role-based platform enabling esports clubs to manage their operations end-to-end. Each club operates in its own portal with granular roles (Super Admin, Club Admin, Coach, Player). The system provides registration/login, tournament orchestration, team roster management, financial tracking, analytics, and secure storage.

## Objectives
- Streamline club operations across teams, tournaments, finances, and analytics.
- Ensure secure, scalable, and compliant data handling.
- Deliver a responsive, modern UI powered by Tailwind + Vite.
- Integrate with Firestore and optional SQL via Drizzle ORM.

## Users & Roles
- Super Admin: Platform-wide oversight, club provisioning, global settings.
- Club Admin: Club configuration, user onboarding, team/tournament/finance oversight.
- Coach: Team roster management, schedule coordination, match results.
- Player: Profile management, participation, view schedules/results/transactions.

## Core Functional Requirements
1. Authentication & Access Control
   - Email/password registration & login
   - Session/token management
   - Role-based permissions (RBAC)
2. Club & Team Management
   - Club profile/configuration
   - Teams: create/update, player roster, roles
3. Tournament Management
   - Create, edit, publish tournaments
   - Match scheduling, brackets, results entry
4. Transactions & Finance
   - Create transactions (income/expense)
   - Categorization, notes, attachments
   - Ledger view, summary analytics
5. Analytics & Reporting
   - Fetch social/platform analytics for club dashboards
   - Export CSV or JSON summaries
6. Storage & Files
   - Firestore-backed data persistence
   - Optional SQL (Drizzle) for analytical queries
   - File attachments for tournaments/transactions
7. Administration & Debug
   - Health endpoint, env inspection (restricted)
   - Audit logs, error logging

## Non-Functional Requirements
- Security: Hash passwords with bcryptjs; enforce least privilege via RBAC.
- Performance: API latency under 300ms p95 for core endpoints; SSR/dev optimized with Vite.
- Reliability: 99.9% monthly uptime target.
- Compliance & Privacy: GDPR-ready data access policies; secure secret management.
- Observability: API request logs; structured error responses.

## Data Model (High Level)
- User(id, email, name, role, clubs[])
- Club(id, name, settings)
- Team(id, clubId, name, roster[])
- Tournament(id, clubId, name, status, schedule, results)
- Transaction(id, clubId, type[income|expense], amount, category, note, attachmentUrl)

## Milestones
- M1: Auth + RBAC + Health endpoint
- M2: Teams + Tournaments CRUD + basic scheduling
- M3: Transactions + ledger + analytics charts
- M4: Admin tools + logs + reporting

## Success Metrics
- Clubs actively managing tournaments and transactions weekly
- Reduced operational overhead through unified portal
- Positive user feedback (CSAT/NPS) on ease of use and reliability