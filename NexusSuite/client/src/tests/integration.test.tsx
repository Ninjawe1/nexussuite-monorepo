import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import userEvent from "@testing-library/user-event";

// Contexts
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

// Components
import { Login } from "@/pages/login";
import { Register } from "@/pages/register";
import { Dashboard } from "@/pages/dashboard";
import { SubscriptionDashboard } from "@/components/SubscriptionDashboard";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Better Auth service
vi.mock("@/services/betterAuthService", () => ({
  betterAuthService: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  },
}));

// Mock subscription service
vi.mock("@/services/subscriptionService", () => ({
  subscriptionService: {
    getPlans: vi.fn(),
    getSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    updateSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    reactivateSubscription: vi.fn(),
    getUsageMetrics: vi.fn(),
  },
}));

// Mock admin service
vi.mock("@/services/adminService", () => ({
  adminService: {
    getSystemMetrics: vi.fn(),
    getUsers: vi.fn(),
    getOrganizations: vi.fn(),
    getAuditLogs: vi.fn(),
    updateUser: vi.fn(),
    updateOrganization: vi.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement, { route = "/" } = {}) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <Router hook={() => [route, () => {}]}>
        <AuthProvider>
          <OrganizationProvider>{ui}</OrganizationProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>,
  );
};

describe("Frontend Integration Tests", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication Flow", () => {
    it("should render login form with all required fields", () => {
      renderWithProviders(<Login />);

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: /remember me/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    it("should show validation errors for invalid login form", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle successful login", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: "1",
            email: "test@example.com",
            name: "Test User",
            role: "user",
          },
          session: {
            token: "test-token",
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          },
        }),
      });

      renderWithProviders(<Login />);

      await user.type(
        screen.getByLabelText(/email address/i),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/betauth/login",
          expect.objectContaining({
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "test@example.com",
              password: "password123",
              rememberMe: false,
            }),
          }),
        );
      });
    });

    it("should render registration form with all required fields", () => {
      renderWithProviders(<Register />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: /i accept the terms/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i }),
      ).toBeInTheDocument();
    });

    it("should validate password requirements during registration", async () => {
      const user = userEvent.setup();
      renderWithProviders(<Register />);

      await user.type(screen.getByLabelText(/^password$/i), "weak");
      await user.type(screen.getByLabelText(/confirm password/i), "different");

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });
  });

  describe("Organization Context", () => {
    it("should display organization selector when user has multiple organizations", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        organizationRoles: {
          org1: "owner",
          org2: "member",
        },
      };

      const mockOrganizations = [
        { id: "org1", name: "Test Org 1", plan: "premium", memberCount: 5 },
        { id: "org2", name: "Test Org 2", plan: "free", memberCount: 3 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: mockOrganizations }),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });
    });

    it("should show current organization information", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        organizationRoles: {
          org1: "owner",
        },
      };

      const mockOrganizations = [
        {
          id: "org1",
          name: "Test Organization",
          plan: "premium",
          memberCount: 5,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organizations: mockOrganizations }),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Organization")).toBeInTheDocument();
        expect(screen.getByText("owner")).toBeInTheDocument();
        expect(screen.getByText("premium")).toBeInTheDocument();
      });
    });
  });

  describe("Subscription Management", () => {
    it("should display current subscription status", async () => {
      const mockSubscription = {
        id: "sub1",
        status: "active",
        plan: "premium",
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cancelAtPeriodEnd: false,
      };

      const mockPlans = [
        { id: "free", name: "Free", price: 0, features: ["Basic features"] },
        {
          id: "premium",
          name: "Premium",
          price: 29,
          features: ["All features"],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: mockSubscription,
          plans: mockPlans,
        }),
      });

      renderWithProviders(<SubscriptionDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/premium plan/i)).toBeInTheDocument();
        expect(screen.getByText(/active/i)).toBeInTheDocument();
      });
    });

    it("should handle subscription cancellation", async () => {
      const user = userEvent.setup();
      const mockSubscription = {
        id: "sub1",
        status: "active",
        plan: "premium",
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cancelAtPeriodEnd: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscription: mockSubscription }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithProviders(<SubscriptionDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/cancel subscription/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/cancel subscription/i));

      // Confirm cancellation in dialog
      await user.click(
        screen.getByRole("button", { name: /confirm cancellation/i }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/subscription/cancel",
          expect.objectContaining({
            method: "POST",
            credentials: "include",
          }),
        );
      });
    });
  });

  describe("Admin Dashboard", () => {
    it("should display system metrics for admin users", async () => {
      const mockUser = {
        id: "1",
        email: "admin@example.com",
        name: "Admin User",
        role: "system_admin",
      };

      const mockMetrics = {
        totalUsers: 150,
        totalOrganizations: 45,
        activeSubscriptions: 30,
        revenue: 1450,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metrics: mockMetrics }),
      });

      renderWithProviders(<Dashboard />, { route: "/admin" });

      await waitFor(() => {
        expect(screen.getByText(/150/i)).toBeInTheDocument();
        expect(screen.getByText(/45/i)).toBeInTheDocument();
      });
    });

    it("should show admin navigation for system admin users", async () => {
      const mockUser = {
        id: "1",
        email: "admin@example.com",
        name: "Admin User",
        role: "system_admin",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/system_admin/i)).toBeInTheDocument();
      });
    });
  });

  describe("Role-Based Access Control", () => {
    it("should hide admin features from regular users", async () => {
      const mockUser = {
        id: "1",
        email: "user@example.com",
        name: "Regular User",
        role: "user",
        organizationRoles: {
          org1: "member",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText(/system_admin/i)).not.toBeInTheDocument();
      });
    });

    it("should show organization admin features to organization owners", async () => {
      const mockUser = {
        id: "1",
        email: "owner@example.com",
        name: "Org Owner",
        role: "user",
        organizationRoles: {
          org1: "owner",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/owner/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication errors gracefully", async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      renderWithProviders(<Login />);

      await user.type(
        screen.getByLabelText(/email address/i),
        "test@example.com",
      );
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });

    it("should handle subscription API errors", async () => {
      mockFetch.mockRejectedValueOnce(
        new Error("Subscription service unavailable"),
      );

      renderWithProviders(<SubscriptionDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load subscription data/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Polar Integration Mock Mode", () => {
    it("should work with Polar mock mode enabled", async () => {
      process.env.VITE_POLAR_MOCK_MODE = "true";

      const mockCheckoutSession = {
        id: "checkout_123",
        url: "https://mock-polar.com/checkout/123",
        status: "open",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ checkoutSession: mockCheckoutSession }),
      });

      renderWithProviders(<SubscriptionDashboard />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /upgrade plan/i }),
        ).toBeInTheDocument();
      });

      delete process.env.VITE_POLAR_MOCK_MODE;
    });
  });
});
