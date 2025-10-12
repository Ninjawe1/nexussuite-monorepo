# Nexus Esports Suite

## Overview

Nexus Esports Suite is a comprehensive multi-tenant SaaS platform designed for esports club management. It provides tools for staff roster management, payroll, match scheduling, marketing campaigns, contract administration, and analytics. The platform is subscription-based, targets multiple esports organizations, and features a dark-mode-first design with an emphasis on stability, performance, and clear data visualization. It uses a React frontend, Node.js/Express backend, PostgreSQL database, and implements role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React** and **TypeScript**, using **Vite** for fast development and optimized builds, **Wouter** for routing, and **TanStack Query** for server state management. Styling is handled by **Tailwind CSS** with a custom design system. **shadcn/ui** components, based on Radix UI, are used for accessible and customizable UI, following a "New York" style variant and a dark-mode-first approach. Server state is managed via TanStack Query, local UI state with React hooks, and form state with React Hook Form and Zod validation.

### Backend Architecture

The backend uses **Node.js** with **Express** and **TypeScript**. **Drizzle ORM** is employed for type-safe database interactions with **Neon PostgreSQL**. Authentication is handled via a **custom username/password authentication system** with session management using `express-session` and a PostgreSQL store. Passwords are securely hashed with **bcrypt**. Session cookies use httpOnly flag for XSS protection and conditional secure flag (production only) to support development environments. The system supports multi-tenancy, isolating each club's data through automatic tenant context injection and database-level filtering. RESTful APIs are designed with middleware-based authentication, consistent error handling, and automatic audit logging. Role-Based Access Control (RBAC) allows granular permissions for various roles across different modules.

### Data Storage Solutions

**PostgreSQL** serves as the primary data store, managed by **Drizzle ORM** for type-safe queries and schema migrations. Core entities include `sessions`, `users`, `tenants`, `staff`, `payroll`, `tournaments`, `tournamentRounds`, `matches`, `campaigns`, `contracts`, `socialAccounts`, `socialMetrics`, and `auditLogs`. **Zod schemas**, shared between frontend and backend, ensure data validation. Data operations are tenant-scoped, and a repository-like storage layer abstracts CRUD operations.

### Social Media Analytics System

This system supports multi-platform social media integration (Instagram, Twitter/X, Facebook, TikTok, YouTube, Twitch) for analytics. It allows connecting multiple accounts per tenant, aggregating metrics like followers, reach, and engagement into a unified dashboard. Data is stored in `socialAccounts` (for credentials and status) and `socialMetrics` (for time-series analytics). CRUD APIs manage accounts, and an analytics endpoint provides aggregated data.

### Finance & Transaction Management System

This system provides comprehensive tracking of income and expenses with categorization, real-time profit/loss reporting, and summary dashboards. Transactions are stored in a `transactions` table with details like type, category, amount, date, description, and payment method. CRUD APIs are available for managing transactions, with a frontend UI offering filtering, sorting, and real-time financial summaries.

### Tournament Management System

The tournament management system provides hierarchical organization of competitive events using a three-tier structure: **Tournaments → Rounds → Matches**. This allows clubs to organize complex multi-stage competitions with different formats (single elimination, double elimination, round robin, league, Swiss, custom).

**Data Model:**
- `tournaments` table stores top-level tournament information including name, description, format, game, dates, max teams, and status
- `tournamentRounds` table stores intermediate stages/rounds with round numbers, formats, and dates
- `matches` table is enhanced with `tournamentId` and `roundId` foreign keys to link matches to the hierarchy

**Features:**
- Full CRUD operations for tournaments and rounds with tenant isolation
- Expandable UI cards showing hierarchical structure
- Support for multiple tournament formats and status tracking (upcoming, ongoing, completed, cancelled)
- Automatic cascade deletion (deleting a tournament removes all rounds and matches)
- Full audit logging for all create, update, and delete operations
- Modal dialogs for creating and editing tournaments and rounds with form validation

### Tenant Suspension System

The tenant suspension system enables Super Admins to suspend and reactivate club accounts. When a tenant is suspended, all users of that tenant are immediately blocked from accessing the platform, except for Super Admins who can still manage the system.

**Data Model:**
- `tenants` table includes suspension tracking fields:
  - `subscriptionStatus`: Can be "active", "suspended", "canceled", or "trial"
  - `suspendedAt`: Timestamp when suspension occurred
  - `suspensionReason`: Text description of why the tenant was suspended
  - `suspendedBy`: User ID of the Super Admin who performed the suspension

**Backend Implementation:**
- `checkTenantSuspension` middleware runs on all protected routes after authentication
- Checks if the user's tenant has `subscriptionStatus = "suspended"`
- Returns 403 error with suspension details if tenant is suspended
- Super Admins bypass the suspension check to maintain system access
- Dedicated API endpoints for suspension management (Super Admin only):
  - `POST /api/admin/clubs/:id/suspend` - Suspend a tenant with reason
  - `POST /api/admin/clubs/:id/reactivate` - Reactivate a suspended tenant

**Admin UI:**
- Super Admin dashboard displays all tenants with their current status
- Suspension dialog captures the reason before suspending
- Visual indicators show suspended status with reason and timestamp
- One-click reactivation for suspended tenants
- Full audit logging of all suspension and reactivation actions

### Custom Authentication System

The platform uses a fully custom username/password authentication system without any third-party OAuth dependencies.

**Security Implementation:**
- Password hashing using **bcrypt** (10 salt rounds)
- Session-based authentication with PostgreSQL session store
- Session regeneration on login/register to prevent fixation attacks
- httpOnly cookies to prevent XSS attacks
- Conditional secure flag (HTTPS-only in production, allows HTTP in development)
- Session TTL: 7 days

**User Registration Flow:**
- New users provide: email, password, first name, last name, and organization name
- System automatically creates both user account and tenant organization
- First user of each tenant automatically receives 14-day trial subscription
- Session is established immediately after registration

**Authentication Routes:**
- `POST /api/auth/register` - Create new account with tenant
- `POST /api/auth/login` - Authenticate with email/password
- `POST /api/auth/logout` - Destroy session
- `GET /api/auth/user` - Get current authenticated user

**Frontend Pages:**
- `/login` - Login form with email and password
- `/register` - Registration form with organization creation
- Unauthenticated users automatically redirected to login page
- Protected routes require valid session cookie

**User Schema:**
- Users identified by unique email (required)
- Password stored as bcrypt hash (required)
- Each user belongs to one tenant organization
- Super Admin flag for platform-wide administrative access

## External Dependencies

### Third-Party Services

-   **Neon PostgreSQL**: Serverless PostgreSQL database.

### UI Component Dependencies

-   **Radix UI**: Primitives for accessible UI components.
-   **Lucide React**: Icon system.
-   **React Icons**: For specific social media platform icons.
-   **date-fns**: Date formatting and manipulation.
-   **class-variance-authority**: For component variant management.

### Build & Development Tools

-   **Vite**: Frontend build tool.
-   **ESBuild**: Server-side bundling.
-   **tsx**: TypeScript execution in development.
-   **Drizzle-kit**: Database migration tool.

### Font System

-   **Google Fonts**: Inter (primary UI), Space Grotesk (headings), JetBrains Mono (monospace).