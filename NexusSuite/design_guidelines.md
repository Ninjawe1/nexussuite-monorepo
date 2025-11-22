# Nexus Esports Suite - Design Guidelines

## Design Approach

**Hybrid Design System Strategy**: Material Design foundation for data-heavy interfaces + Linear's clean typography + esports-specific energy through strategic color and modern components.

**Rationale**: This is a utility-focused, information-dense SaaS platform requiring stability, performance, and efficient data visualization. The design must balance professional enterprise UI with esports culture's vibrant, energetic aesthetic.

**Core Principles**:
- Dark mode primary with exceptional readability
- Data clarity over decoration
- Consistent, scannable layouts for quick information parsing
- Purposeful use of color to indicate status and hierarchy
- Esports energy through accent colors and subtle animated elements

## Color Palette

**Dark Mode (Primary)**:
- Background Primary: 222 25% 8%
- Background Secondary: 222 20% 12%
- Background Tertiary: 222 18% 16%
- Text Primary: 0 0% 95%
- Text Secondary: 0 0% 70%
- Text Tertiary: 0 0% 50%

**Brand & Accent Colors**:
- Primary (Cyber Purple): 270 85% 65%
- Primary Hover: 270 85% 70%
- Success (Wins/Positive): 142 70% 50%
- Danger (Losses/Critical): 0 75% 60%
- Warning (Pending/Alerts): 35 90% 60%
- Info (Analytics/Neutral): 200 85% 55%

**Status Indicators**:
- Active/Online: 142 70% 50%
- Inactive/Offline: 0 0% 45%
- Pending: 35 90% 60%
- Expired: 0 75% 60%

**Light Mode (Secondary)**:
- Background Primary: 0 0% 98%
- Background Secondary: 0 0% 95%
- Background Tertiary: 0 0% 92%
- Text Primary: 222 25% 15%
- Text Secondary: 222 20% 35%
- Adapt accent colors for light mode accessibility

## Typography

**Font Families**:
- Primary: Inter (via Google Fonts CDN) - UI, body text, data displays
- Headings: Space Grotesk (via Google Fonts CDN) - dashboard titles, section headers
- Monospace: JetBrains Mono (via Google Fonts CDN) - financial data, IDs, technical info

**Type Scale**:
- Hero/Dashboard Title: 3rem (48px), Space Grotesk, bold
- Section Headers: 1.75rem (28px), Space Grotesk, semibold
- Card Titles: 1.25rem (20px), Inter, semibold
- Body Text: 0.938rem (15px), Inter, regular
- Small/Meta: 0.813rem (13px), Inter, medium
- Financial/Data: 0.938rem (15px), JetBrains Mono, medium

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20 for consistent rhythm.

**Grid Structure**:
- Dashboard: 12-column grid with 24px gutters
- Sidebar Navigation: Fixed 280px width (collapsed: 80px)
- Main Content Area: max-w-7xl with responsive padding (px-6 lg:px-8)
- Card Spacing: gap-6 for card grids

**Responsive Breakpoints**:
- Mobile: Base (< 768px) - single column, stacked cards
- Tablet: md (768px+) - 2-column grids where appropriate
- Desktop: lg (1024px+) - full multi-column layouts
- Wide: xl (1280px+) - maximum content width with side margins

## Component Library

**Navigation**:
- Sidebar: Fixed position, dark background (222 25% 10%), collapsible with icon-only state
- Top Bar: Sticky header with tenant branding, user profile, notifications, theme toggle
- Module Icons: Use Heroicons (outline for inactive, solid for active states)

**Data Display Components**:
- Stat Cards: Elevated cards (shadow-lg) with large numbers (3rem), trend indicators (↑↓), sparkline charts
- Data Tables: Striped rows, hover states (bg-secondary), sticky headers, sortable columns, action menus
- Charts: Use Chart.js - line charts for trends, bar charts for comparisons, donut charts for distributions
- Calendar View: Month grid with match/event indicators, color-coded by status/type

**Forms & Inputs**:
- Input Fields: Rounded (rounded-lg), border (border-secondary), focus ring (ring-2 ring-primary)
- Select Dropdowns: Custom styled with Heroicons chevron, scrollable options list
- File Upload: Drag-and-drop zone with preview thumbnails for contracts/documents
- Toggle Switches: For permissions, active states, feature flags
- Date Pickers: Calendar popup with range selection support

**Cards & Containers**:
- Standard Card: rounded-xl, border border-tertiary, p-6, shadow-sm on hover
- Dashboard Widget: Same as standard but with header section (title + action button)
- Player/Staff Profile Card: Includes avatar (64px), name, role badge, quick stats
- Campaign Card: Image thumbnail, title, dates, platform icons, metrics preview

**Modals & Overlays**:
- Modal: Centered overlay, max-w-2xl, rounded-2xl, backdrop blur (backdrop-blur-sm)
- Slide-over Panel: Right-side panel (w-96) for details/quick actions
- Toast Notifications: Top-right position, auto-dismiss, color-coded by type

**Buttons & Actions**:
- Primary: bg-primary, px-6, py-2.5, rounded-lg, font-medium
- Secondary: border-2 border-primary, text-primary, same padding/rounding
- Danger: bg-danger for destructive actions
- Icon Buttons: p-2, rounded-lg, hover:bg-secondary

**Role Badges**:
- Owner: bg-primary with gold border
- Admin: bg-info
- Manager: bg-success
- Staff/Others: bg-secondary with colored left border

**Status Indicators**:
- Online/Active: Green dot (h-2 w-2 rounded-full) + text
- Match Results: Win (green accent), Loss (red accent), neutral border for draws
- Payment Status: Paid (green), Pending (yellow), Overdue (red)

## Key Sections Design

**Central Dashboard**:
- Hero Stats Row: 4-column stat cards (total revenue, active rosters, upcoming matches, active campaigns)
- Recent Activity Feed: Timeline with icons, color-coded by action type
- Quick Actions: Floating action button (bottom-right) with contextual actions
- Performance Charts: 2-column layout (finance trends + roster win rates)

**Staff Management**:
- Header: Add Staff button (top-right), search and filter bar
- Staff Grid: 3-column card layout with avatar, name, role, permission count
- Permission Matrix: Modal with checkbox grid (rows=staff, columns=modules)

**Payroll & Finance**:
- Summary Cards: Total salaries, monthly revenue, profit/loss with trend indicators
- Payroll Table: Filterable by recurring/one-time, export button, payment status column
- Category Breakdown: Donut chart showing expense distribution

**Analytics Dashboard**:
- Roster Filter: Dropdown to select game/roster (Valorant, LoL, etc.)
- Metrics Grid: Win/loss rate, tournament placements, player stats cards
- Performance Charts: Line chart for trends over time, bar chart for player comparisons

**Matches Management**:
- View Toggle: Button group to switch between List and Calendar views
- Calendar: Month grid with match markers, click to expand match details modal
- Match Card: Team logos, score, date/time, venue, result badge

**Marcom Department**:
- Campaign Grid: 2-3 column cards with image, title, dates, platform icons, ROI metric
- Social Analytics: Connected platform cards with follower count, engagement rate, reach
- Add Campaign Form: Multi-step modal with platform selection, date range picker, metrics tracking

**Contracts Management**:
- Document List: Table with file icon, name, type, linked person, expiration date, status
- Upload Zone: Drag-and-drop area with file type indicator (PDF/DOCX)
- Contract Preview: Modal with PDF viewer and download button

**Audit Log**:
- Filter Bar: Date range, user, action type filters
- Log Entries: Timeline format with user avatar, action description, timestamp, before/after comparison

**Club Branding Settings**:
- Logo Upload: Drag-and-drop with preview (supports transparent PNG)
- Color Picker: Primary and accent color selectors with live preview
- Theme Toggle: Switch between light/dark with instant application

**Images**:
- Dashboard widgets and stat cards should use icon illustrations (abstract data visualizations, trophy icons for wins, chart graphics)
- Player/Staff profiles use uploaded avatar photos (circular crop, 64px-128px)
- Match cards include team logos (40px square)
- Marcom campaigns display thumbnail images from campaigns (16:9 aspect, rounded corners)
- Contract documents show PDF/DOCX file previews where possible
- Hero sections are not applicable for this dashboard-style application