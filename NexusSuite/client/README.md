# NexusSuite Frontend

A modern React-based frontend for the NexusSuite B2B SaaS platform, featuring Better Auth authentication, Polar subscription management, and comprehensive admin capabilities.

## Features

### 🔐 Authentication
- **Better Auth Integration**: Secure authentication with session management
- **Multi-Organization Support**: Users can belong to multiple organizations
- **Role-Based Access Control**: Granular permissions system
- **Session Persistence**: Automatic token refresh and session management

### 💳 Subscription Management
- **Polar Integration**: Full subscription lifecycle management
- **Plan Management**: Upgrade, downgrade, and cancel subscriptions
- **Billing Dashboard**: Usage metrics and billing history
- **Mock Mode**: Test subscription flows without real payments

### 🏢 Organization Management
- **Multi-Organization**: Users can switch between organizations
- **Organization Roles**: Owner, Admin, Member role hierarchy
- **Organization Switching**: Seamless context switching
- **Organization Creation**: Easy onboarding for new organizations

### 🛠️ Admin Dashboard
- **System Metrics**: Overview of platform usage
- **User Management**: Admin user CRUD operations
- **Organization Management**: System-wide organization oversight
- **Audit Logs**: Complete activity tracking
- **Support Tickets**: Customer support management

## Tech Stack

### Core Technologies
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety throughout the application
- **Vite**: Fast development and build tooling
- **Tailwind CSS**: Utility-first CSS framework

### State Management
- **React Context**: Authentication and organization state
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management with validation

### Routing & Navigation
- **Wouter**: Lightweight React router
- **Radix UI**: Accessible UI components
- **Lucide React**: Beautiful icon library

### Testing
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing
- **MSW**: API mocking for tests

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Radix)
│   ├── OrganizationSelector.tsx
│   ├── SubscriptionDashboard.tsx
│   └── ...
├── contexts/           # React Context providers
│   ├── AuthContext.tsx
│   ├── OrganizationContext.tsx
│   └── ...
├── pages/              # Page components
│   ├── admin/          # Admin dashboard pages
│   ├── login.tsx
│   ├── register.tsx
│   └── ...
├── services/           # API service layers
│   ├── betterAuthService.ts
│   ├── subscriptionService.ts
│   └── adminService.ts
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── tests/              # Test files
│   ├── e2e/            # End-to-end tests
│   ├── integration.test.tsx
│   └── setup.ts
└── themes/             # Theme configurations
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running (see backend documentation)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NexusSuite/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Better Auth Configuration
VITE_BETTER_AUTH_SECRET=your-secret-key

# Polar Configuration
VITE_POLAR_ACCESS_TOKEN=your-polar-token
VITE_POLAR_MOCK_MODE=true  # Set to false for production

# Application Configuration
VITE_APP_NAME=NexusSuite
VITE_APP_URL=http://localhost:5173
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run end-to-end tests
npm run test:e2e:headed  # Run E2E tests with browser visible

# Code Quality
npm run lint             # Run ESLint
```

### Testing Strategy

#### Unit Tests
- Component rendering and interactions
- Service layer functionality
- Utility function behavior
- Context provider logic

#### Integration Tests
- API service integration
- Authentication flows
- Organization management
- Subscription handling
- Role-based access control

#### E2E Tests
- Complete user workflows
- Cross-browser compatibility
- Mobile responsiveness
- Error handling scenarios

### Mock Mode

The application supports mock mode for testing without real API calls:

```bash
# Enable mock mode
VITE_POLAR_MOCK_MODE=true npm run dev
```

Mock mode provides:
- Simulated subscription plans
- Mock checkout sessions
- Test user data
- Simulated admin features

## API Integration

### Better Auth Integration

The application integrates with Better Auth for authentication:

```typescript
// Login example
const { login } = useAuth();
await login({ email, password });

// Access current user
const { user } = useAuth();
```

### Polar Integration

Subscription management through Polar:

```typescript
// Create checkout session
const session = await subscriptionService.createCheckoutSession({
  priceId: 'plan_id',
  successUrl: '/dashboard',
  cancelUrl: '/billing'
});

// Get current subscription
const subscription = await subscriptionService.getSubscription();
```

### Organization Management

Multi-organization support:

```typescript
// Switch organizations
const { switchOrganization } = useOrganization();
await switchOrganization('org_id');

// Get current organization
const { currentOrganization } = useOrganization();
```

## Deployment

### Build Process
```bash
npm run build
```

### Environment Setup
1. Set production environment variables
2. Configure API endpoints
3. Disable mock mode for production
4. Set up monitoring and error tracking

### Hosting
The application is optimized for deployment on:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Style
- Follow TypeScript best practices
- Use React hooks appropriately
- Maintain component separation of concerns
- Write comprehensive tests
- Document complex logic

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the documentation
- Review the test cases
- Check the troubleshooting guide
- Create an issue in the repository

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version