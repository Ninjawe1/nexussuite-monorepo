# Nexus Esports Suite

## Overview

Nexus Esports Suite is a comprehensive multi-tenant SaaS platform designed for esports club management. The system enables esports organizations to manage their complete operations including staff roster management, payroll processing, match scheduling, marketing campaigns, contract administration, and analytics tracking. Built as a subscription-based product intended for sale to multiple clubs, the platform emphasizes stability, performance, and clean data visualization with a dark-mode-first design approach.

The application combines a modern React frontend with a Node.js/Express backend, utilizing PostgreSQL for data persistence and implementing role-based access control to ensure secure multi-tenant operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates (October 2025)

**Complete Implementation Status:**
- ✅ All backend API routes connected to frontend with full CRUD operations
- ✅ Security fixes: Tenant validation before all updates/deletes to prevent cross-tenant data access
- ✅ Comprehensive audit logging across all modules (staff, payroll, matches, campaigns, contracts, tenant settings)
- ✅ Date field handling: Backend schemas accept both Date objects and date strings with automatic transformation
- ✅ End-to-end testing passed for all modules: Staff, Payroll, Matches, Campaigns, Contracts, Settings, Audit
- ✅ Multi-tenant isolation properly enforced with 404 responses for cross-tenant access attempts
- ✅ Stripe subscription billing integrated with checkout, billing portal, and session sync
- ✅ Subscription-based feature gating implemented (staff limits per plan)
- ✅ Super Admin dashboard with subscription management capabilities

**Security Architecture:**
- All update/delete routes validate record ownership before mutation
- Returns 404 (not 403) for cross-tenant access to prevent information disclosure
- Complete audit trail captures all CRUD operations with before/after snapshots
- All data operations scoped by tenantId with proper validation

**Form & Data Handling:**
- React Hook Form with Zod schema validation on frontend
- Server-side validation using shared Zod schemas from `@shared/schema`
- Date fields accept both Date objects and ISO date strings via z.union transformation
- Proper error handling with toast notifications and automatic login redirects for unauthorized access

**Stripe Subscription System:**
- Three-tier pricing: Starter ($29/mo - 10 staff), Growth ($99/mo - 50 staff), Enterprise ($299/mo - unlimited)
- Checkout flow: Creates Stripe customer, generates checkout session, redirects to Stripe hosted page
- Session sync: POST /api/subscriptions/sync-session validates payment and updates tenant subscription
- Security validations: Customer ID verification, payment status check, price verification
- Feature gating: Staff creation blocked when plan limits reached with upgrade prompts
- Billing portal: Integrated Stripe customer portal for subscription management
- Super Admin: Can manually set subscription plans and statuses for all tenants
- URL scheme handling: Proper https:// prefix for checkout/portal redirect URLs

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React** with TypeScript for type safety and developer experience
- **Vite** as the build tool for fast development and optimized production builds
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management, caching, and data synchronization
- **Tailwind CSS** for utility-first styling with custom design system

**UI Component System:**
- **shadcn/ui** component library built on Radix UI primitives for accessible, customizable components
- **New York** style variant selected for a clean, modern aesthetic
- Custom design system combining Material Design principles with esports-specific energy through strategic color usage
- Dark mode as primary interface with exceptional readability (light mode available as secondary)

**State Management Strategy:**
- Server state managed entirely through TanStack Query with aggressive caching (staleTime: Infinity)
- Local UI state handled with React hooks
- Authentication state derived from `/api/auth/user` endpoint query
- Form state managed via react-hook-form with Zod schema validation

**Design Principles:**
- Data clarity prioritized over decoration for information-dense interfaces
- Hybrid elevation system using subtle background overlays (`--elevate-1`, `--elevate-2`) for hover/active states
- Consistent scannable layouts for quick information parsing
- Purposeful color usage for status indicators (success/green, danger/red, warning/yellow, info/blue)

### Backend Architecture

**Technology Stack:**
- **Node.js** with **Express** framework
- **TypeScript** for end-to-end type safety
- **Drizzle ORM** for type-safe database operations
- **Neon PostgreSQL** with serverless connection pooling via `@neondatabase/serverless`

**Authentication & Authorization:**
- **Replit Auth** integration using OpenID Connect (OIDC) protocol
- **Passport.js** strategy implementation for authentication flow
- Session management using `express-session` with PostgreSQL-backed session store (`connect-pg-simple`)
- Session persistence configured for 7-day TTL with secure, httpOnly cookies

**Multi-Tenant Architecture:**
- Each club operates as an isolated tenant with automatic tenant context injection
- User-tenant relationship established during authentication and stored in users table
- All data operations automatically scoped to authenticated user's tenant via `getTenantId()` helper
- Tenant isolation enforced at the database query level using Drizzle's filtering capabilities

**API Design:**
- RESTful endpoints under `/api` prefix
- Middleware-based authentication check using `isAuthenticated` guard
- Consistent error handling with proper HTTP status codes
- Automatic audit logging for create/update/delete operations
- JSON request/response format with structured error messages

**Role-Based Access Control:**
- Granular permission system with roles: Owner, Admin, Manager, Staff, Player, Marcom, Analyst, Finance
- Module-level permissions: Staff Management, Payroll, Matches, Analytics, Marcom, Contracts, Settings, Audit
- Permission arrays stored per staff member for flexible access control
- Frontend route protection based on user role and permissions

### Data Storage Solutions

**Database Schema Design:**
- **PostgreSQL** as primary data store with the following core entities:
  - `sessions` - Session management for authentication
  - `users` - User accounts with tenant association and role assignment
  - `tenants` - Club/organization master data (name, branding, settings)
  - `staff` - Team members with roles and module permissions
  - `payroll` - Payment records with recurring/one-time support
  - `matches` - Match scheduling with scores and tournament information
  - `campaigns` - Marketing campaigns with platform and performance tracking
  - `contracts` - Document management with expiration tracking
  - `auditLogs` - Complete audit trail with before/after state tracking

**ORM Strategy:**
- **Drizzle ORM** chosen for:
  - Type-safe query building with full TypeScript inference
  - Zero-runtime overhead with compile-time query generation
  - Direct SQL-like syntax for complex queries
  - Automatic schema migration support via `drizzle-kit`

**Data Validation:**
- **Zod schemas** derived from Drizzle schema definitions using `drizzle-zod`
- Shared validation schemas between frontend and backend via `@shared/schema`
- Form validation on client side with server-side re-validation
- Type-safe insert/update operations with automatic validation

**Storage Patterns:**
- Repository-like storage layer abstracted in `server/storage.ts`
- CRUD operations scoped by tenant for data isolation
- Optimistic UI updates on frontend with background synchronization
- Query invalidation strategy for real-time data consistency

### External Dependencies

**Third-Party Services:**
- **Replit Authentication** - OAuth/OIDC provider for user authentication
  - Discovery URL: `https://replit.com/oidc` (or custom via `ISSUER_URL`)
  - Requires `REPL_ID`, `SESSION_SECRET`, and `REPLIT_DOMAINS` environment variables

**Database:**
- **Neon PostgreSQL** - Serverless PostgreSQL database
  - Connection via `DATABASE_URL` environment variable
  - WebSocket support for serverless environments using `ws` package
  - Connection pooling through `@neondatabase/serverless` Pool

**UI Component Dependencies:**
- **Radix UI** primitives for accessible component foundation (dialogs, dropdowns, popovers, etc.)
- **Lucide React** for consistent icon system
- **React Icons** specifically for social media platform icons
- **date-fns** for date formatting and manipulation
- **class-variance-authority** for component variant management

**Development Tools:**
- **Vite plugins** for Replit integration:
  - Runtime error overlay
  - Cartographer for code navigation
  - Dev banner for development environment indication
- **ESBuild** for server-side bundling in production
- **tsx** for TypeScript execution in development

**Build & Deployment:**
- Development: `npm run dev` - Runs server with tsx, Vite handles client HMR
- Production: `npm run build` - Vite builds client, esbuild bundles server to `dist/`
- Database migrations: `npm run db:push` - Applies Drizzle schema changes to PostgreSQL

**Font System:**
- **Google Fonts** integration:
  - Inter (400, 500, 600, 700) - Primary UI font
  - Space Grotesk (500, 600, 700) - Heading font
  - JetBrains Mono (400, 500, 600) - Monospace/code font