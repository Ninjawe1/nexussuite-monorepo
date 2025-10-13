# Nexus Esports Suite

## Overview

Nexus Esports Suite is a multi-tenant SaaS platform designed for comprehensive esports club management. It offers tools for staff and payroll administration, match scheduling, marketing campaigns, contract management, and analytics. The platform is subscription-based, targeting multiple esports organizations, and features a dark-mode-first design emphasizing stability, performance, and clear data visualization. It supports a full suite of features including social media analytics with OAuth 2.0 integration, financial transaction management, and a hierarchical tournament system. The overarching goal is to provide a robust, all-in-one solution for esports club operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform adopts a dark-mode-first design using **Tailwind CSS** with a custom design system. **shadcn/ui** components, based on Radix UI, are used for accessible and customizable UI elements, following a "New York" style variant. The primary UI font is Inter, with Space Grotesk for headings and JetBrains Mono for monospace elements.

### Technical Implementations

The frontend is built with **React** and **TypeScript**, using **Vite** for optimized builds, **Wouter** for routing, and **TanStack Query** for server state management. Form state is managed with React Hook Form and Zod validation.

The backend uses **Node.js** with **Express** and **TypeScript**. **Drizzle ORM** facilitates type-safe database interactions with **PostgreSQL**. Authentication is handled via a **custom username/password system** with session management, using `express-session` and a PostgreSQL store, with passwords hashed by **bcrypt**.

### Feature Specifications

*   **Multi-tenancy:** Achieved through automatic tenant context injection and database-level filtering, isolating each club's data.
*   **Role-Based Access Control (RBAC):** Granular permissions are implemented across various modules.
*   **Social Media Analytics:** Supports multi-platform integration (Instagram, Twitter/X, Facebook, TikTok, YouTube, Twitch) using **OAuth 2.0 authorization code flow**. It aggregates metrics like followers, reach, and engagement into a unified dashboard, with platform-specific fetchers for real metrics and engagement rate calculations.
*   **Finance & Transaction Management:** Tracks income and expenses with categorization, real-time profit/loss reporting, and summary dashboards. Transactions use `decimal(10, 2)` for precision.
*   **Tournament Management System:** Provides a hierarchical structure (Tournaments → Rounds → Matches) for organizing competitive events, supporting various formats and status tracking.
*   **Tenant Suspension System:** Allows Super Admins to suspend and reactivate club accounts, blocking access for suspended tenants while maintaining Super Admin oversight.
*   **Custom Authentication System:** Session-based authentication with bcrypt hashing, httpOnly cookies, and session regeneration. New users automatically create a tenant and receive a 14-day trial.
*   **User Management & Invitation System:** Club owners can create staff accounts directly or send email invitations with expiring tokens, facilitating onboarding for new members. Super Admins have full user management capabilities across all tenants.

### System Design Choices

**RESTful APIs** are designed with middleware-based authentication, consistent error handling, and automatic audit logging. Data validation is enforced using **Zod schemas**, shared between frontend and backend. A repository-like storage layer abstracts CRUD operations, ensuring tenant-scoped data access. Audit logging is comprehensive across critical operations.

## External Dependencies

### Third-Party Services

*   **Neon PostgreSQL**: Serverless PostgreSQL database.

### UI Component Dependencies

*   **Radix UI**: Primitives for accessible UI components.
*   **Lucide React**: Icon system.
*   **React Icons**: Specific social media platform icons.
*   **date-fns**: Date formatting and manipulation.
*   **class-variance-authority**: Component variant management.

### Build & Development Tools

*   **Vite**: Frontend build tool.
*   **ESBuild**: Server-side bundling.
*   **tsx**: TypeScript execution in development.
*   **Drizzle-kit**: Database migration tool.

### Font System

*   **Google Fonts**: Inter (primary UI), Space Grotesk (headings), JetBrains Mono (monospace).