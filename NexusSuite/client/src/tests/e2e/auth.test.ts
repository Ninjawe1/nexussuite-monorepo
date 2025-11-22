import { test, expect } from "@playwright/test";

test.describe("Authentication E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto("/login");
  });

  test("should login with valid credentials", async ({ page }) => {
    // Fill in the login form
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("/dashboard");

    // Verify we're logged in
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[name="email"]', "invalid@example.com");
    await page.fill('input[name="password"]', "wrongpassword");

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator("text=Login failed")).toBeVisible();

    // Verify we're still on login page
    await expect(page).toHaveURL("/login");
  });

  test("should validate email format", async ({ page }) => {
    // Fill in invalid email
    await page.fill('input[name="email"]', "invalid-email");
    await page.fill('input[name="password"]', "password123");

    // Submit the form
    await page.click('button[type="submit"]');

    // Verify validation error
    await expect(
      page.locator("text=Please enter a valid email address"),
    ).toBeVisible();
  });

  test("should register new user successfully", async ({ page }) => {
    // Navigate to register page
    await page.goto("/register");

    // Fill in registration form
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', "newuser@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.fill('input[name="confirmPassword"]', "password123");
    await page.fill('input[name="organizationName"]', "Test Organization");
    await page.check('input[name="acceptTerms"]');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("/dashboard");

    // Verify registration was successful
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("/dashboard");

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Wait for navigation to login page
    await page.waitForURL("/login");

    // Verify we're logged out
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test("should maintain session across page reloads", async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("/dashboard");

    // Reload the page
    await page.reload();

    // Verify we're still logged in
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });
});

test.describe("Organization Management E2E Tests", () => {
  test("should switch between organizations", async ({ page }) => {
    // Login with multi-org user
    await page.goto("/login");
    await page.fill('input[name="email"]', "multiorg@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("/dashboard");

    // Click organization selector
    await page.click('[data-testid="organization-selector"]');

    // Select different organization
    await page.click("text=Second Organization");

    // Verify organization changed
    await expect(page.locator("text=Second Organization")).toBeVisible();
  });

  test("should create new organization", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL("/dashboard");

    // Click organization selector
    await page.click('[data-testid="organization-selector"]');

    // Click create new organization
    await page.click("text=Create New Organization");

    // Fill in organization details
    await page.fill('input[name="name"]', "New Test Org");
    await page.fill('input[name="description"]', "Test description");

    // Submit form
    await page.click('button[type="submit"]');

    // Verify organization was created
    await expect(page.locator("text=New Test Org")).toBeVisible();
  });
});

test.describe("Subscription Management E2E Tests", () => {
  test("should display subscription status", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "subscribed@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to billing page
    await page.goto("/billing");

    // Verify subscription status is displayed
    await expect(page.locator("text=Premium Plan")).toBeVisible();
    await expect(page.locator("text=Active")).toBeVisible();
  });

  test("should upgrade subscription plan", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "freeuser@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to billing page
    await page.goto("/billing");

    // Click upgrade button
    await page.click("text=Upgrade Plan");

    // Wait for checkout page
    await page.waitForURL(/.*polar.*/);

    // Verify we're on checkout page (mock mode)
    await expect(page.locator("text=Checkout")).toBeVisible();
  });

  test("should cancel subscription", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "subscribed@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to billing page
    await page.goto("/billing");

    // Click cancel subscription
    await page.click("text=Cancel Subscription");

    // Confirm cancellation
    await page.click('button:has-text("Confirm Cancellation")');

    // Verify cancellation was successful
    await expect(page.locator("text=Cancellation successful")).toBeVisible();
  });
});

test.describe("Admin Dashboard E2E Tests", () => {
  test("should access admin dashboard as system admin", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to admin dashboard
    await page.goto("/admin");

    // Verify admin dashboard is accessible
    await expect(page.locator("text=Admin Dashboard")).toBeVisible();
    await expect(page.locator("text=System Metrics")).toBeVisible();
  });

  test("should not allow regular users to access admin dashboard", async ({
    page,
  }) => {
    // Login as regular user
    await page.goto("/login");
    await page.fill('input[name="email"]', "user@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Try to navigate to admin dashboard
    await page.goto("/admin");

    // Verify access is denied
    await expect(page.locator("text=Access Denied")).toBeVisible();
  });

  test("should manage users in admin panel", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to users page
    await page.goto("/admin/users");

    // Verify users list is displayed
    await expect(page.locator("text=Users Management")).toBeVisible();

    // Search for user
    await page.fill('input[name="search"]', "testuser");
    await page.click('button:has-text("Search")');

    // Verify search results
    await expect(page.locator("text=testuser@example.com")).toBeVisible();
  });

  test("should manage organizations in admin panel", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to organizations page
    await page.goto("/admin/organizations");

    // Verify organizations list is displayed
    await expect(page.locator("text=Organizations Management")).toBeVisible();

    // Filter by plan
    await page.selectOption('select[name="plan"]', "premium");

    // Verify filtered results
    await expect(page.locator("text=Premium")).toBeVisible();
  });

  test("should view audit logs in admin panel", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to audit logs page
    await page.goto("/admin/logs");

    // Verify audit logs are displayed
    await expect(page.locator("text=Audit Logs")).toBeVisible();

    // Filter by action type
    await page.selectOption('select[name="action"]', "user.login");

    // Verify filtered logs
    await expect(page.locator("text=user.login")).toBeVisible();
  });
});

test.describe("Role-Based Access Control E2E Tests", () => {
  test("should show different UI based on user role", async ({ page }) => {
    // Login as organization owner
    await page.goto("/login");
    await page.fill('input[name="email"]', "owner@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Verify owner-specific features are visible
    await expect(page.locator("text=Organization Settings")).toBeVisible();

    // Logout
    await page.click('button:has-text("Logout")');

    // Login as organization member
    await page.goto("/login");
    await page.fill('input[name="email"]', "member@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Verify member-specific features are hidden
    await expect(page.locator("text=Organization Settings")).not.toBeVisible();
  });

  test("should enforce role-based permissions", async ({ page }) => {
    // Login as organization member
    await page.goto("/login");
    await page.fill('input[name="email"]', "member@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Try to access organization settings directly
    await page.goto("/organization/settings");

    // Verify access is denied
    await expect(page.locator("text=Access Denied")).toBeVisible();
  });
});
