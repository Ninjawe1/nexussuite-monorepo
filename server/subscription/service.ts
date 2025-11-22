import { z } from "zod";
import { organizationService } from "../org/service";
import { 
  createSubscriptionSchema, 
  updateSubscriptionSchema,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  type Subscription,
  type BillingCustomer,
  type CreateSubscriptionResponse,
  type UpdateSubscriptionResponse,
  type GetSubscriptionResponse
} from "./types";
import { ORG_PERMISSIONS } from "../org/types";
import mem0, { getMem0 } from "../memory/mem0Client";

export class SubscriptionService {
  /**
   * Create subscription checkout session
   */
  async createSubscription(
    organizationId: string,
    userId: string,
    data: z.infer<typeof createSubscriptionSchema>
  ): Promise<CreateSubscriptionResponse> {
    try {
      // Validate input
      const validatedData = createSubscriptionSchema.parse(data);

      // Check permissions
      const hasPermission = await organizationService.checkPermission(userId, organizationId, ORG_PERMISSIONS.BILLING_UPDATE);
      if (!hasPermission) {
        throw new Error("Insufficient permissions to manage billing");
      }

      // Get organization
      const organization = await organizationService.getOrganization(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      // Check if already has active subscription
      const existingRow = await require('../db/repos/organizations').getOrgById(organizationId);
      if (existingRow && String(existingRow.subscription_status || '') === 'active') {
        throw new Error("Organization already has an active subscription");
      }

      const response = { success: true, checkoutUrl: String(validatedData.successUrl || '') } as any;

      // Mem0: store memory of user plan selection at checkout initiation
      try {
        const mClient = getMem0();
        if (mClient) {
          await (mClient as any).add({
            userId: organizationId,
            memory: `User ${userId} selected plan ${validatedData.plan} (${validatedData.billingInterval})`,
            metadata: { category: "subscription", event: "create-checkout" },
          });
          console.log("[mem0] Added subscription memory for organization", organizationId);
        }
      } catch (mErr) {
        console.warn("[mem0] Failed to add subscription memory:", mErr);
      }

      return response;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  /**
   * Create subscription checkout for users who don't have an organization yet.
   * After payment succeeds, a webhook will create the organization and assign ownership.
   */
  async createSubscriptionForNewOrg(
    userId: string,
    data: z.infer<typeof createSubscriptionSchema>
  ): Promise<CreateSubscriptionResponse> {
    const validatedData = createSubscriptionSchema.parse(data);

    // Ensure the user does not already own an organization
    const alreadyOwner = await organizationService.doesUserOwnOrganization(userId);
    if (alreadyOwner) {
      throw new Error("You already own an organization and cannot create another.");
    }

    return { success: true, checkoutUrl: String(validatedData.successUrl || '') } as any;
  }

  /**
   * Get current subscription
   */
  async getSubscription(organizationId: string, userId: string): Promise<GetSubscriptionResponse> {
    try {
      // Check permissions
      const hasPermission = await organizationService.checkPermission(userId, organizationId, ORG_PERMISSIONS.BILLING_VIEW);
      if (!hasPermission) {
        throw new Error("Insufficient permissions to view billing");
      }
      const hasToken = Boolean(process.env.POLAR_ACCESS_TOKEN);
      let subscription: Subscription | null = null;
      let customer: BillingCustomer | null = null;

      if (hasToken) {
        try {
          const { polar } = require("./polar");
          let polCustomer: any = null;
          try {
            polCustomer = await polar.customers.getExternal({ externalId: organizationId } as any);
          } catch {}
          if (polCustomer) {
            const custId = String(polCustomer?.id || polCustomer?.customer?.id || "");
            customer = {
              id: organizationId,
              organizationId,
              polarCustomerId: custId,
              email: String(polCustomer?.email || polCustomer?.customer?.email || ""),
              name: (polCustomer?.name || polCustomer?.customer?.name || null) as any,
              phone: null,
              address: {
                line1: null,
                line2: null,
                city: null,
                state: null,
                postalCode: null,
                country: null,
              },
              metadata: (polCustomer?.metadata || {}) as any,
              createdAt: String(polCustomer?.created_at || new Date().toISOString()),
            } as any;

            const page: any = await polar.subscriptions.list({ customerId: custId, limit: 10 } as any);
            const items: any[] = page?.items ?? page?.data ?? [];
            const pick = items.find((s: any) => String(s?.status || "").toLowerCase() === "active") || items[0] || null;
            if (pick) {
              const pName = String(pick?.product?.name || "").toLowerCase();
              const pSlug = String((pick?.product?.metadata || {}).slug || "").toLowerCase();
              const amount = Number(pick?.amount ?? pick?.price?.amount ?? (Array.isArray(pick?.prices) ? pick?.prices?.[0]?.amount : 0) ?? 0);
              let plan: SubscriptionPlan = "free";
              const ref = pSlug || pName;
              if (ref.includes("enterprise")) plan = "enterprise";
              else if (ref.includes("professional") || ref.includes("pro")) plan = "professional";
              else if (ref.includes("starter")) plan = "starter";
              else if (amount > 0) plan = "starter";
              else {
                // Single-tier policy: any non-free active/trialing/incomplete subscription is treated as Starter
                const stat = String(pick?.status || "").toLowerCase();
                if (stat === "active" || stat === "trialing" || stat === "incomplete") {
                  plan = "starter";
                }
              }

              const productId = String(pick?.product?.id || pick?.product_id || "");
              const priceId = String(
                pick?.price?.id ||
                (Array.isArray(pick?.prices) ? pick?.prices?.[0]?.id : null) ||
                pick?.price_id ||
                ""
              );
              const envMap: Record<string, SubscriptionPlan | undefined> = {
                [String(process.env.POLAR_PRODUCT_STARTER_ID || "")]: "starter",
                [String(process.env.POLAR_PRODUCT_PROFESSIONAL_ID || "")]: "professional",
                [String(process.env.POLAR_PRODUCT_ENTERPRISE_ID || "")]: "enterprise",
              };
              const mappedByProduct = envMap[productId];
              if (!ref && mappedByProduct) plan = mappedByProduct;
              if (!ref && priceId) {
                // If we can’t derive plan name but have a price, assume paid starter
                plan = plan === "free" ? "starter" : plan;
              }

              const intervalRaw = String(pick?.recurring_interval || pick?.price?.recurring_interval || (Array.isArray(pick?.prices) ? pick?.prices?.[0]?.recurring_interval : null) || pick?.product?.recurring_interval || "month").toLowerCase();
              const billingInterval = intervalRaw === "year" ? "year" : "month";

              subscription = {
                id: String(pick?.id || ""),
                organizationId,
                plan,
                status: String(pick?.status || "inactive") as any,
                billingInterval,
                currentPeriodStart: String(pick?.current_period_start || ""),
                currentPeriodEnd: String(pick?.current_period_end || ""),
                cancelAtPeriodEnd: Boolean(pick?.cancel_at_period_end || false),
                canceledAt: pick?.canceled_at ? String(pick?.canceled_at) : null,
                customerId: custId,
                subscriptionId: String(pick?.id || ""),
                priceId,
                quantity: Number(pick?.seats || 1),
                metadata: { ...(pick?.metadata || {}), productId } as any,
                createdAt: String(pick?.created_at || new Date().toISOString()),
                updatedAt: String(pick?.modified_at || new Date().toISOString()),
              };
            }
          }
        } catch (sdkErr) {
          console.warn("[subscription] Polar SDK unavailable or errored, falling back", String(sdkErr));
        }
      }

      if (!subscription) {
        const row = await require('../db/repos/organizations').getOrgById(organizationId);
        if (row) {
          const planRow = String(row.subscription_plan || 'free') as SubscriptionPlan;
          const statusRow = String(row.subscription_status || 'inactive');
          const normalizedPlan = (planRow === 'free' && ['active','trialing','incomplete'].includes(statusRow.toLowerCase())) ? 'starter' : planRow;
          subscription = {
            id: String(row.id),
            organizationId: String(row.id),
            plan: normalizedPlan as SubscriptionPlan,
            status: statusRow as any,
            billingInterval: 'month',
            currentPeriodStart: null as any,
            currentPeriodEnd: null as any,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            customerId: customer?.polarCustomerId || null as any,
            subscriptionId: null as any,
            priceId: null as any,
            quantity: 1,
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else {
          subscription = null;
        }
      }

      // Mem0: optional search for memory context about plan selection
      try {
        const mClient = getMem0();
        if (mClient) {
          const searchResult = await (mClient as any).search({
            userId: organizationId,
            query: "What plan did this user select?",
            limit: 3,
          });
          console.log("[mem0] Search context (top 3):", Array.isArray(searchResult) ? searchResult.slice(0,3) : searchResult);
        }
      } catch (sErr) {
        console.warn("[mem0] Search failed:", sErr);
      }

      return {
        success: true,
        subscription,
        customer,
      };
    } catch (error) {
      console.error("Error getting subscription:", error);
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    organizationId: string,
    userId: string,
    data: z.infer<typeof updateSubscriptionSchema>
  ): Promise<UpdateSubscriptionResponse> {
    try {
      // Validate input
      const validatedData = updateSubscriptionSchema.parse(data);

      // Check permissions
      const hasPermission = await organizationService.checkPermission(userId, organizationId, ORG_PERMISSIONS.BILLING_UPDATE);
      if (!hasPermission) {
        throw new Error("Insufficient permissions to manage billing");
      }

      const currentRow = await require('../db/repos/organizations').getOrgById(organizationId);
      const currentSubscription = currentRow ? {
        id: String(currentRow.id),
        organizationId: String(currentRow.id),
        plan: String(currentRow.subscription_plan || 'free'),
        status: String(currentRow.subscription_status || 'inactive'),
        billingInterval: 'month',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        customerId: null,
        subscriptionId: null,
        priceId: null,
        quantity: 1,
        metadata: {},
        createdAt: null,
        updatedAt: new Date().toISOString(),
      } as any : null;
      if (!currentSubscription) {
        throw new Error("No active subscription found");
      }

      // Update subscription with Polar
      let response: UpdateSubscriptionResponse;

      if (validatedData.plan && validatedData.plan !== currentSubscription.plan) {
        // Plan change
        const s = require('../db/useSupabase').getSupabase();
        await s.from('organizations').update({ subscription_plan: validatedData.plan, subscription_status: 'active', updated_at: new Date().toISOString() }).eq('id', organizationId);
        response = { success: true, subscription: { ...currentSubscription, plan: validatedData.plan, updatedAt: new Date().toISOString() } } as any;
        // Mem0: record plan change
        try {
          const mClient = getMem0();
          if (mClient) {
            await (mClient as any).add({
              userId: organizationId,
              memory: `User ${userId} changed plan from ${currentSubscription.plan} to ${validatedData.plan}`,
              metadata: { category: "subscription", event: "plan-change" },
            });
          }
        } catch (mErr) {
          console.warn("[mem0] Failed to add plan-change memory:", mErr);
        }
      } else if (validatedData.billingInterval && validatedData.billingInterval !== currentSubscription.billingInterval) {
        // Billing interval change
        const s = require('../db/useSupabase').getSupabase();
        await s.from('organizations').update({ updated_at: new Date().toISOString() }).eq('id', organizationId);
        response = { success: true, subscription: { ...currentSubscription, billingInterval: validatedData.billingInterval, updatedAt: new Date().toISOString() } } as any;
        // Mem0: record billing interval change
        try {
          const mClient = getMem0();
          if (mClient) {
            await (mClient as any).add({
              userId: organizationId,
              memory: `User ${userId} changed billing interval from ${currentSubscription.billingInterval} to ${validatedData.billingInterval}`,
              metadata: { category: "subscription", event: "interval-change" },
            });
          }
        } catch (mErr) {
          console.warn("[mem0] Failed to add interval-change memory:", mErr);
        }
      } else if (validatedData.cancelAtPeriodEnd !== undefined) {
        const hasToken = Boolean(process.env.POLAR_ACCESS_TOKEN);
        const resultExtras: any = {};
        if (hasToken) {
          try {
            const { polar } = require("./polar");
            let polCustomer: any = null;
            try {
              polCustomer = await polar.customers.getExternal({ externalId: organizationId } as any);
            } catch {}
            const customerId = String(polCustomer?.id || polCustomer?.customer?.id || "");
            if (validatedData.cancelAtPeriodEnd === false) {
              // Reactivate via checkout (re-subscribe)
              // Choose starter product by slug fallback
              let starterProductId: string | null = null;
              try {
                const firstPage: any = await polar.products.list({ active: true } as any);
                const items: any[] = firstPage?.items ?? firstPage?.data ?? [];
                for (const prod of items) {
                  const name = String(prod?.name || "").toLowerCase();
                  const slug = String((prod?.metadata || {}).slug || "").toLowerCase();
                  if (name.includes("starter") || slug.includes("starter")) {
                    starterProductId = String(prod?.id || prod?.product_id || prod?.uuid || "");
                    break;
                  }
                }
              } catch {}
              if (!starterProductId) starterProductId = "starter";
              const checkout: any = await polar.checkouts.create({
                products: [starterProductId],
                successUrl: `${process.env.VITE_APP_URL || "http://localhost:5173"}/dashboard/org/billing?success=true`,
                returnUrl: `${process.env.VITE_APP_URL || "http://localhost:5173"}/dashboard/org/billing?canceled=true`,
                externalCustomerId: organizationId,
                customerEmail: undefined,
              } as any);
              const url: string | null = checkout?.url || checkout?.redirect_url || null;
              if (url) resultExtras.checkoutUrl = url;
            } else {
              // Cancel via customer portal session
              let session: any = null;
              if (!customerId) {
                // Portal requires a customer; attempt minimal bootstrap via organization email resolution
                try {
                  const org = await organizationService.getOrganization(organizationId);
                  const email = (org?.ownerEmail || org?.email || null) as any;
                  if (email) {
                    const created = await polar.customers.create({ email, externalId: organizationId } as any);
                    session = await polar.customerSessions.create({ customerId: String(created?.id || created?.customer?.id || ""), returnUrl: `${process.env.VITE_APP_URL || "http://localhost:5173"}/dashboard/org/billing` } as any);
                  }
                } catch {}
              } else {
                session = await polar.customerSessions.create({ customerId, returnUrl: `${process.env.VITE_APP_URL || "http://localhost:5173"}/dashboard/org/billing` } as any);
              }
              const portalUrl: string = String(session?.customerPortalUrl || "");
              if (portalUrl) resultExtras.portalUrl = portalUrl;
            }
          } catch (sdkErr) {
            console.warn("[subscription] Polar SDK operation failed; falling back", (sdkErr as any)?.message || String(sdkErr));
          }
        }

        const nowIso = new Date().toISOString();
        const s = require('../db/useSupabase').getSupabase();
        if (validatedData.cancelAtPeriodEnd === false) {
          await s.from('organizations').update({ subscription_plan: 'starter', subscription_status: 'active', updated_at: nowIso }).eq('id', organizationId);
          response = { success: true, subscription: { ...currentSubscription, plan: 'starter', status: 'active', cancelAtPeriodEnd: false, updatedAt: nowIso }, ...resultExtras } as any;
        } else {
          await s.from('organizations').update({ subscription_plan: 'free', subscription_status: 'canceled', updated_at: nowIso }).eq('id', organizationId);
          response = { success: true, subscription: { ...currentSubscription, plan: 'free', status: 'canceled', cancelAtPeriodEnd: true, updatedAt: nowIso }, ...resultExtras } as any;
        }
      } else {
        throw new Error("No changes specified");
      }

      // Mem0: small search to retrieve recent subscription memories (for debugging/context)
      try {
        const mClient = getMem0();
        if (mClient) {
          const searchResult = await (mClient as any).search({
            userId: organizationId,
            query: "latest subscription changes",
            limit: 3,
          });
          console.log("[mem0] Post-update search (top 3):", Array.isArray(searchResult) ? searchResult.slice(0,3) : searchResult);
        }
      } catch (sErr) {
        console.warn("[mem0] Post-update search failed:", sErr);
      }

      return response;
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(organizationId: string, userId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      // Check permissions
      const hasPermission = await organizationService.checkPermission(userId, organizationId, ORG_PERMISSIONS.BILLING_UPDATE);
      if (!hasPermission) {
        throw new Error("Insufficient permissions to manage billing");
      }

      const s = require('../db/useSupabase').getSupabase();
      await s.from('organizations').update({ subscription_plan: 'free', subscription_status: 'canceled', updated_at: new Date().toISOString() }).eq('id', organizationId);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  }

  /**
   * Get subscription plans
   */
  async getSubscriptionPlans(): Promise<typeof SUBSCRIPTION_PLANS> {
    // Legacy static plans for compatibility with existing UI
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Get available plans via Polar SDK (dynamic)
   */
  async getAvailablePlans(strict?: boolean): Promise<{ success: boolean; plans: import("./types").AvailablePlanPrice[] }> {
    try {
      const hasToken = Boolean(process.env.POLAR_ACCESS_TOKEN);
      const serverEnv = (process.env.POLAR_SERVER || "sandbox").toLowerCase();
      console.log(`[subscription] getAvailablePlans: POLAR_SERVER=${serverEnv}, tokenPresent=${hasToken}`);

      if (hasToken) {
        const { polar } = require("./polar");
        const firstPage: any = await polar.products.list({ active: true } as any);
        const items: any[] = firstPage?.items ?? firstPage?.data ?? [];
        const out: import("./types").AvailablePlanPrice[] = [];
        for (const prod of items) {
          const pricesSrc: any = prod?.prices;
          const prices: any[] = Array.isArray(pricesSrc) ? pricesSrc : (pricesSrc?.items ?? pricesSrc?.data ?? []);
          for (const price of prices) {
            const interval: any = String(price?.billing_interval || price?.interval || "month").toLowerCase() === "year" ? "year" : "month";
            out.push({
              productId: String(prod?.id || prod?.product_id || prod?.uuid || ""),
              productName: String(prod?.name || prod?.title || "Plan"),
              priceId: String(price?.id || price?.price_id || ""),
              currency: String(price?.currency || "USD").toUpperCase(),
              amount: Number(price?.amount || price?.unit_amount || 0),
              interval,
            });
          }
        }
        if (out.length > 0 || strict) {
          return { success: true, plans: out };
        }
      }

      // Fallback to static SUBSCRIPTION_PLANS mapping when SDK or token unavailable
      // Skip fallback entirely when strict mode is enabled
      if (strict) {
        return { success: true, plans: [] };
      }
      const fallback: import("./types").AvailablePlanPrice[] = [];
      for (const [planKey, cfg] of Object.entries(SUBSCRIPTION_PLANS)) {
        const productId = (cfg as any).polarProductId || planKey;
        const productName = cfg.name;
        fallback.push({ productId, productName, priceId: "", currency: "USD", amount: cfg.price.month, interval: "month" } as any);
        fallback.push({ productId, productName, priceId: "", currency: "USD", amount: cfg.price.year, interval: "year" } as any);
      }
      return { success: true, plans: fallback };
    } catch (error) {
      console.error("Error getting available plans (Polar SDK)", error);
      // Fallback: static mapping
      if (strict) {
        return { success: true, plans: [] };
      }
      const fallback: import("./types").AvailablePlanPrice[] = [];
      for (const [planKey, cfg] of Object.entries(SUBSCRIPTION_PLANS)) {
        const productId = (cfg as any).polarProductId || planKey;
        const productName = cfg.name;
        fallback.push({ productId, productName, priceId: "", currency: "USD", amount: cfg.price.month, interval: "month" } as any);
        fallback.push({ productId, productName, priceId: "", currency: "USD", amount: cfg.price.year, interval: "year" } as any);
      }
      console.warn("[subscription] Using static SUBSCRIPTION_PLANS fallback due to Polar error");
      return { success: true, plans: fallback };
    }
  }

  async getAvailablePlansByProductId(productId: string): Promise<{ success: boolean; plans: import("./types").AvailablePlanPrice[] }> {
    try {
      const pid = String(productId || "").trim();
      if (!pid) return { success: true, plans: [] };
      if (!process.env.POLAR_ACCESS_TOKEN) {
        return { success: true, plans: [] };
      }
      const { polar } = require("./polar");
      let product: any = null;
      try {
        const resp: any = await polar.products.list({ active: true } as any);
        const items: any[] = resp?.items ?? resp?.data ?? [];
        product = items.find((p: any) => String(p?.id || p?.product_id || p?.uuid || "") === pid) || null;
      } catch {}
      if (!product) return { success: true, plans: [] };
      const pricesSrc: any = product?.prices;
      const prices: any[] = Array.isArray(pricesSrc) ? pricesSrc : (pricesSrc?.items ?? pricesSrc?.data ?? []);
      const out: import("./types").AvailablePlanPrice[] = prices.map((price: any) => ({
        productId: String(product?.id || product?.product_id || product?.uuid || ""),
        productName: String(product?.name || product?.title || "Plan"),
        priceId: String(price?.id || price?.price_id || ""),
        currency: String(price?.currency || "USD").toUpperCase(),
        amount: Number(price?.amount || price?.unit_amount || 0),
        interval: String(price?.billing_interval || price?.interval || "month").toLowerCase() === "year" ? "year" : "month",
      }));
      return { success: true, plans: out };
    } catch (error) {
      console.error("Error getting plans by productId", error);
      return { success: true, plans: [] };
    }
  }

  /**
   * Get customer portal URL for an organization
   */
  async getPortalUrlForOrganization(organizationId: string): Promise<string> {
    throw new Error('Portal not available');
  }

  /**
   * Check usage limits
   */
  async checkUsageLimits(organizationId: string): Promise<{
    withinLimits: boolean;
    limits: any;
    currentUsage: any;
  }> {
    try {
      // Get organization
      const organization = await organizationService.getOrganization(organizationId);
      if (!organization) {
        throw new Error("Organization not found");
      }

      // Get current subscription
      const row2 = await require('../db/repos/organizations').getOrgById(organizationId);
      const plan = String((row2?.subscription_plan || 'free') as SubscriptionPlan);
      const planConfig = SUBSCRIPTION_PLANS[plan as SubscriptionPlan];

      const limits = planConfig.limits;
      const currentUsage = (organization?.usage || {}) as any;

      // Check if within limits
      const withinLimits = 
        (limits.teamMembers === -1 || (currentUsage.members || 0) <= limits.teamMembers) &&
        (limits.apiCalls === -1 || (currentUsage.apiCalls || 0) <= limits.apiCalls) &&
        (limits.storage === -1 || (currentUsage.storage || 0) <= limits.storage) &&
        (limits.projects === -1 || (currentUsage.projects || 0) <= limits.projects);

      return {
        withinLimits,
        limits,
        currentUsage,
      };
    } catch (error) {
      console.error("Error checking usage limits:", error);
      throw error;
    }
  }

  /**
   * Get invoices for organization
   */
  async getInvoices(
    organizationId: string,
    userId: string
  ): Promise<{ success: boolean; invoices: any[] }> {
    try {
      // Check permissions
      const hasPermission = await organizationService.checkPermission(userId, organizationId, 'billing:view');
      if (!hasPermission) {
        throw new Error("Insufficient permissions to view billing");
      }

      // TODO: Integrate Polar invoices retrieval when available
      // For now, return an empty list in dev/mock mode
      return { success: true, invoices: [] };
    } catch (error) {
      console.error("Error getting invoices:", error);
      throw error;
    }
  }

  /**
   * Update usage metrics
   */
  async updateUsage(organizationId: string, metrics: {
    apiCalls?: number;
    storage?: number;
    teamMembers?: number;
    projects?: number;
  }): Promise<void> {
    try {
      const orgRow = await require('../db/repos/organizations').getOrgById(organizationId);
      if (!orgRow) throw new Error("Organization not found");
      const currentUsage = (orgRow.usage || {}) as any;

      const updatedUsage: any = {
        ...currentUsage,
        apiCalls: (currentUsage.apiCalls || 0) + (metrics.apiCalls || 0),
        storage: (currentUsage.storage || 0) + (metrics.storage || 0),
        // Map teamMembers metric to members field in org usage
        members: metrics.teamMembers !== undefined ? metrics.teamMembers : (currentUsage.members || 0),
        // Projects may not exist on org usage; store as auxiliary field if provided
        projects: metrics.projects !== undefined ? metrics.projects : (currentUsage.projects || 0),
      };

      const s = require('../db/useSupabase').getSupabase();
      await s.from('organizations').update({ usage: updatedUsage, updated_at: new Date().toISOString() }).eq('id', organizationId);
    } catch (error) {
      console.error("Error updating usage:", error);
      throw error;
    }
  }

  /**
   * Create or update billing customer
   */
  async createOrUpdateCustomer(
    organizationId: string,
    userId: string,
    data: {
      email: string;
      name?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    }
  ): Promise<BillingCustomer> {
    try {
      // Check permissions
      const hasPermission = await organizationService.checkPermission(userId, organizationId, ORG_PERMISSIONS.BILLING_UPDATE);
      if (!hasPermission) {
        throw new Error("Insufficient permissions to manage billing");
      }

      // Get existing customer
      let customer = null;

      if (customer) {
        // Update existing customer
        const normalizedUpdate: Partial<BillingCustomer> = {
          email: data.email,
          name: data.name ?? null,
          phone: data.phone ?? null,
        };

        if (data.address) {
          normalizedUpdate.address = {
            line1: data.address.line1 ?? null,
            line2: data.address.line2 ?? null,
            city: data.address.city ?? null,
            state: data.address.state ?? null,
            postalCode: data.address.postalCode ?? null,
            country: data.address.country ?? null,
          };
        }
        customer = { id: organizationId, organizationId, ...normalizedUpdate } as any;
      } else {
        // Create new customer
        customer = { id: organizationId, organizationId, email: data.email, name: data.name || null } as any;
      }

      return customer as any;
    } catch (error) {
      console.error("Error creating/updating customer:", error);
      throw error;
    }
  }

  /**
   * Handle Polar webhook events
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      const enabled = String(process.env.POLAR_WEBHOOK_ENABLED || "").toLowerCase() === "true";
      if (!enabled) return;
      if (!event) return;
      const eType = String(event?.type || event?.event || "").toLowerCase();
      const data = (event?.data || event?.payload || event) as any;
      const sub = data?.subscription || data?.object || data;
      const orgId = String(
        sub?.external_customer_id ||
        sub?.customer?.external_id ||
        (sub?.metadata ? sub?.metadata.organizationId : "") ||
        ""
      );
      if (!orgId) return;

      let status: any = String(sub?.status || sub?.state || "").toLowerCase();
      let plan: SubscriptionPlan = "free";
      const prodName = String(sub?.product?.name || "").toLowerCase();
      const slug = String((sub?.product?.metadata || {}).slug || "").toLowerCase();
      const amount = Number(sub?.amount ?? sub?.price?.amount ?? (Array.isArray(sub?.prices) ? sub?.prices?.[0]?.amount : 0) ?? 0);
      const ref = slug || prodName;
      if (ref.includes("enterprise")) plan = "enterprise";
      else if (ref.includes("professional") || ref.includes("pro")) plan = "professional";
      else if (ref.includes("starter")) plan = "starter";
      else if (amount > 0) plan = "starter";
      else if (["active","trialing","incomplete"].includes(status)) plan = "starter";

      const s = require('../db/useSupabase').getSupabase();
      const nowIso = new Date().toISOString();
      const updates: any = {
        subscription_plan: plan,
        subscription_status: status || (amount > 0 ? 'active' : 'inactive'),
        updated_at: nowIso,
      };
      // Append compact event log into metadata
      try {
        const orgRow = await require('../db/repos/organizations').getOrgById(orgId);
        const md = (orgRow?.metadata || {}) as any;
        const evs: any[] = Array.isArray(md.subscriptionEvents) ? md.subscriptionEvents : [];
        evs.push({ type: eType, status, plan, at: nowIso, id: String(sub?.id || "") });
        updates.metadata = { ...md, subscriptionEvents: evs };
      } catch {}
      await s.from('organizations').update(updates).eq('id', orgId);
    } catch (err) {
      console.warn('[subscription] handleWebhookEvent failed', (err as any)?.message || String(err));
    }
  }
}

export const subscriptionService = new SubscriptionService();
