# Nexus Esports Suite

## Overview

Nexus Esports Suite is a comprehensive multi-tenant SaaS platform designed for esports club management. It provides tools for staff roster management, payroll, match scheduling, marketing campaigns, contract administration, and analytics. The platform is subscription-based, targets multiple esports organizations, and features a dark-mode-first design with an emphasis on stability, performance, and clear data visualization. It uses a React frontend, Node.js/Express backend, PostgreSQL database, and implements role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React** and **TypeScript**, using **Vite** for fast development and optimized builds, **Wouter** for routing, and **TanStack Query** for server state management. Styling is handled by **Tailwind CSS** with a custom design system. **shadcn/ui** components, based on Radix UI, are used for accessible and customizable UI, following a "New York" style variant and a dark-mode-first approach. Server state is managed via TanStack Query, local UI state with React hooks, and form state with React Hook Form and Zod validation.

### Backend Architecture

The backend uses **Node.js** with **Express** and **TypeScript**. **Drizzle ORM** is employed for type-safe database interactions with **Neon PostgreSQL**. Authentication is handled via **Replit Auth** (OpenID Connect) and **Passport.js**, with session management using `express-session` and a PostgreSQL store. The system supports multi-tenancy, isolating each club's data through automatic tenant context injection and database-level filtering. RESTful APIs are designed with middleware-based authentication, consistent error handling, and automatic audit logging. Role-Based Access Control (RBAC) allows granular permissions for various roles across different modules.

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

## External Dependencies

### Third-Party Services

-   **Replit Authentication**: OAuth/OIDC provider for user authentication.
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