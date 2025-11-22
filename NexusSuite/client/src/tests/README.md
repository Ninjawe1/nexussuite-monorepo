# Frontend Integration Tests

This directory contains comprehensive tests for the frontend integration of the B2B SaaS platform.

## Test Structure

### Integration Tests (`integration.test.tsx`)

- **Authentication Flow**: Login, registration, session management
- **Organization Context**: Multi-organization support, role-based access
- **Subscription Management**: Plan management, billing, cancellations
- **Admin Dashboard**: System administration features
- **Role-Based Access Control**: Permission enforcement
- **Error Handling**: Graceful error management
- **Polar Integration Mock Mode**: Testing with mock Polar API

### End-to-End Tests (`e2e/`)

- **Authentication E2E**: Complete user authentication flows
- **Organization Management**: Multi-organization switching and creation
- **Subscription Management**: Plan upgrades, cancellations, billing
- **Admin Dashboard**: System administration workflows
- **Role-Based Access**: Permission-based UI and API access

## Running Tests

### Unit/Integration Tests

```bash
npm test              # Run all tests
npm test -- --watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### E2E Tests

```bash
npm run test:e2e      # Run all E2E tests
npm run test:e2e -- --headed  # Run tests with browser visible
npm run test:e2e -- --debug   # Run tests in debug mode
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

- Uses jsdom environment for DOM testing
- Configured with React Testing Library
- Includes coverage reporting
- Mocks global APIs (fetch, localStorage, etc.)

### Playwright Configuration (`playwright.config.ts`)

- Tests across multiple browsers (Chromium, Firefox, WebKit)
- Configured for local development server
- Includes screenshot and trace capture on failures

## Mock Setup

The test setup (`setup.ts`) provides:

- Global fetch mocking
- localStorage/sessionStorage mocking
- Window location mocking
- Console output suppression
- Environment variable setup

## Test Coverage Areas

### Authentication

- ✅ Login form validation
- ✅ Registration with organization creation
- ✅ Session persistence
- ✅ Logout functionality
- ✅ Error handling for invalid credentials

### Organizations

- ✅ Multi-organization support
- ✅ Organization switching
- ✅ Role-based organization access
- ✅ Organization creation

### Subscriptions

- ✅ Plan display and status
- ✅ Subscription upgrades/downgrades
- ✅ Cancellation and reactivation
- ✅ Billing information display
- ✅ Usage metrics
- ✅ Mock mode integration

### Admin Features

- ✅ System metrics display
- ✅ User management
- ✅ Organization management
- ✅ Audit log viewing
- ✅ Role-based admin access

### Integration Points

- ✅ Better Auth API integration
- ✅ Polar subscription integration
- ✅ Organization management API
- ✅ Admin dashboard API
- ✅ Error handling and recovery

## Environment Variables

Tests use the following environment variables:

```bash
VITE_API_URL=http://localhost:3000
VITE_POLAR_MOCK_MODE=true
VITE_BETTER_AUTH_SECRET=test-secret
```

## Continuous Integration

Tests are configured to run in CI environments with:

- Parallel test execution
- Retry logic for flaky tests
- Coverage reporting
- Screenshot capture on failures
- Trace capture for debugging

## Best Practices

1. **Mock External Dependencies**: All external API calls are mocked
2. **Test User Scenarios**: Tests cover real user workflows
3. **Error Handling**: Both success and error cases are tested
4. **Role-Based Testing**: Different user roles are tested separately
5. **Mock Mode Testing**: Polar integration works in mock mode
6. **Accessibility**: Tests verify UI elements are accessible

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in test configuration
2. **Mock not working**: Check mock setup and imports
3. **E2E tests failing**: Ensure development server is running
4. **Coverage not generating**: Run `npm run test:coverage`

### Debug Mode

For debugging tests:

```bash
# Integration tests
npm test -- --reporter=verbose

# E2E tests
npm run test:e2e --
```
