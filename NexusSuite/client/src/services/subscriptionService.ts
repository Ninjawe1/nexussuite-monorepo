/**
 * Subscription Service for Polar Integration
 * Handles subscription management, checkout flows, and billing operations
 */

import { apiRequest } from "@/lib/queryClient";

export interface SubscriptionPlan {
  id: string;
  priceId?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  limits: {
    apiCalls?: number;
    storage?: number;
    users?: number;
  };
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
  plan?: SubscriptionPlan;
}

export interface CheckoutSession {
  id: string;
  url: string;
  organizationId: string;
  planId: string;
  status: "open" | "complete" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface UsageMetrics {
  organizationId: string;
  currentUsage: {
    apiCalls: number;
    storage: number;
    users: number;
  };
  limits: {
    apiCalls: number;
    storage: number;
    users: number;
  };
  percentageUsed: {
    apiCalls: number;
    storage: number;
    users: number;
  };
  resetDate: string;
}

export interface BillingInfo {
  organizationId: string;
  paymentMethod: {
    type: "card" | "bank_account";
    last4?: string;
    brand?: string;
  } | null;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  taxId?: {
    type: string;
    value: string;
  };
}

class SubscriptionService {
  /**
   * Get available subscription plans
   */
  async getPlans(productId?: string): Promise<SubscriptionPlan[]> {
    try {
      const url = productId
        ? `/api/subscription/plans/normalized/by-product/${encodeURIComponent(productId)}`
        : "/api/subscription/plans/normalized?strict=true";
      const response = await apiRequest(url, "GET");
      const data = await response.json();
      const plans = (data?.plans || []) as Array<SubscriptionPlan>;
      return plans;
    } catch (error) {
      console.error("Failed to fetch subscription plans:", error);
      throw new Error("Unable to load subscription plans");
    }
  }

  /**
   * Get current subscription for an organization
   */
  async getSubscription(organizationId: string): Promise<Subscription | null> {
    try {
      const response = await fetch(`/api/subscription?organizationId=${organizationId}` , {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        // Gracefully handle unauthorized or bad request without breaking the page
        if (response.status === 401 || response.status === 400) {
          return null;
        }
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      const data = await response.json();
      return data.subscription || null;
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      throw new Error("Unable to load subscription details");
    }
  }

  /**
   * Create a checkout session for plan upgrade/change
   */
  async createCheckoutSession(
    organizationId: string,
    priceId?: string,
    successUrl?: string,
    cancelUrl?: string,
    productId?: string,
    slug?: string,
  ): Promise<CheckoutSession> {
    try {
      const response = await apiRequest(
        "/api/subscription/checkout",
        "POST",
        {
          organizationId,
          priceId,
          products: productId ? [productId] : undefined,
          slug,
          successUrl:
            successUrl ||
            `${window.location.origin}/dashboard/org/billing?success=true`,
          cancelUrl:
            cancelUrl ||
            `${window.location.origin}/dashboard/org/billing?canceled=true`,
        }
      );

      const data = await response.json();
      const url = data?.checkoutUrl || data?.url || null;
      return { url } as CheckoutSession;
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      throw new Error("Unable to initiate checkout");
    }
  }

  /**
   * Get Polar customer portal URL
   */
  async getPortalUrl(organizationId: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/subscription/portal?organizationId=${organizationId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.portalUrl || null;
    } catch (e) {
      console.error("Failed to get portal URL:", e);
      return null;
    }
  }

  async resolveProductId(slug: string): Promise<string | null> {
    try {
      const response = await apiRequest(`/api/subscription/resolve-product/${encodeURIComponent(slug)}`, "GET");
      const data = await response.json();
      return data?.productId || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    organizationId: string,
    plan: string,
    prorationBehavior:
      | "create_prorations"
      | "none"
      | "always_invoice" = "create_prorations",
  ): Promise<Subscription> {
    try {
      // Server uses PATCH /api/subscription for updates
      const response = await apiRequest("/api/subscription", "PATCH", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, plan, prorationBehavior }),
      });

      const data = await response.json();
      return data.subscription;
    } catch (error) {
      console.error("Failed to update subscription:", error);
      throw new Error("Unable to update subscription");
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string,
  ): Promise<Subscription> {
    try {
      const response = await apiRequest(
        "/api/subscription/cancel",
        "POST",
        {
          organizationId,
          cancelAtPeriodEnd,
          reason,
        },
        { headers: { "X-Organization-Id": String(organizationId || "") } }
      );

      const data = await response.json();
      if (data.portalUrl) {
        try { window.open(data.portalUrl, "_blank"); } catch {}
      }
      return data.subscription;
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      throw new Error("Unable to cancel subscription");
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(organizationId: string): Promise<Subscription> {
    try {
      // No explicit reactivate endpoint; use update with cancelAtPeriodEnd=false
      const response = await apiRequest(
        "/api/subscription",
        "PATCH",
        { organizationId, cancelAtPeriodEnd: false },
        { headers: { "X-Organization-Id": String(organizationId || "") } }
      );

      const data = await response.json();
      if (data.checkoutUrl) {
        try { window.open(data.checkoutUrl, "_blank"); } catch {}
      }
      return data.subscription;
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      throw new Error("Unable to reactivate subscription");
    }
  }

  /**
   * Get usage metrics for an organization
   */
  async getUsageMetrics(organizationId: string): Promise<UsageMetrics> {
    try {
      const response = await apiRequest(
        `/api/subscription/usage?organizationId=${organizationId}`,
        "GET"
      );
      const data = await response.json();
      return data.usage;
    } catch (error) {
      console.error("Failed to fetch usage metrics:", error);
      throw new Error("Unable to load usage metrics");
    }
  }

  /**
   * Update usage for an organization (typically called by backend)
   */
  async updateUsage(
    organizationId: string,
    usage: {
      apiCalls?: number;
      storage?: number;
      users?: number;
    },
  ): Promise<void> {
    try {
      await apiRequest("/api/subscription/usage", "POST", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, usage }),
      });
    } catch (error) {
      console.error("Failed to update usage:", error);
      throw new Error("Unable to update usage");
    }
  }

  /**
   * Get billing information
   */
  async getBillingInfo(organizationId: string): Promise<BillingInfo> {
    try {
      const response = await apiRequest(
        `/api/subscription/billing?organizationId=${organizationId}`,
        "GET"
      );
      const data = await response.json();
      return data.billingInfo;
    } catch (error) {
      console.error("Failed to fetch billing info:", error);
      throw new Error("Unable to load billing information");
    }
  }

  /**
   * Update billing information
   */
  async updateBillingInfo(
    organizationId: string,
    billingInfo: Partial<BillingInfo>,
  ): Promise<BillingInfo> {
    try {
      const response = await apiRequest("/api/subscription/billing", "PUT", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, ...billingInfo }),
      });

      const data = await response.json();
      return data.billingInfo;
    } catch (error) {
      console.error("Failed to update billing info:", error);
      throw new Error("Unable to update billing information");
    }
  }

  /**
   * Get billing history/invoices
   */
  async getInvoices(organizationId: string): Promise<any[]> {
    try {
      const response = await apiRequest(
        `/api/subscription/invoices?organizationId=${organizationId}`,
        "GET"
      );
      const data = await response.json();
      return data.invoices || [];
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      throw new Error("Unable to load billing history");
    }
  }

  /**
   * Handle webhook events (called by backend)
   */
  async handleWebhook(event: any): Promise<void> {
    // This would typically be called by the backend webhook handler
    // Frontend can listen for subscription updates via polling or WebSocket
    console.log("Subscription webhook event:", event);
  }

  /**
   * Poll for subscription updates (fallback for webhook issues)
   */
  async pollForUpdates(
    organizationId: string,
    maxAttempts: number = 10,
    intervalMs: number = 2000,
  ): Promise<Subscription> {
    let attempts = 0;

    const poll = async (): Promise<Subscription> => {
      attempts++;

      try {
        const subscription = await this.getSubscription(organizationId);

        // Check if subscription is in a stable state
        if (
          subscription &&
          ["active", "canceled"].includes(subscription.status)
        ) {
          return subscription;
        }

        // Continue polling if not at max attempts
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
          return poll();
        }

        return subscription!;
      } catch (error) {
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
          return poll();
        }
        throw error;
      }
    };

    return poll();
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;
