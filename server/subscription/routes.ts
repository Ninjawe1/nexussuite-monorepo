import express from "express";
import { z } from "zod";
import { requireAuth } from "../auth/authRoutes";
import { subscriptionService } from "./service";
import { SUBSCRIPTION_PLANS } from "./types";
 
import { createSubscriptionSchema, updateSubscriptionSchema } from "./types";
import axios from "axios";

const router = express.Router();

const STATIC_PRODUCT_SLUGS: Record<string, string> = {
  product1: "e09ac149-148e-484b-9dcc-59a84c286452",
  starter: "e09ac149-148e-484b-9dcc-59a84c286452",
};

async function resolveProductIdBySlug(slug: string): Promise<string | null> {
  try {
    const { polar } = require("./polar");
    const resp: any = await polar.products.list({ active: true } as any);
    const items: any[] = resp?.items ?? resp?.data ?? [];
    const sl = String(slug || "").toLowerCase();
    const fromStatic = STATIC_PRODUCT_SLUGS[sl];
    if (fromStatic) return fromStatic;
    for (const prod of items) {
      const name = String(prod?.name || prod?.title || "").toLowerCase();
      const metaSlug = String((prod?.metadata || {}).slug || "").toLowerCase();
      const id = String(prod?.id || prod?.product_id || prod?.uuid || "");
      if (!id) continue;
      if (metaSlug && metaSlug === sl) return id;
      if (name && (name === sl || name.includes(sl))) return id;
    }
    return null;
  } catch {
    return null;
  }
}

// ---- Polar Webhook: define FIRST to bypass auth and preserve raw body ----
 

// Dev diagnostics: public route defined BEFORE auth guard, non-sensitive env status
router.get("/diagnostics", async (_req, res) => {
  try {
    const serverEnv = (process.env.POLAR_SERVER || "sandbox").toLowerCase();
    const tokenPresent = Boolean(process.env.POLAR_ACCESS_TOKEN);
    return res.json({ success: true, serverEnv, tokenPresent, productsCount: 0, pricesCount: 0, error: null });
  } catch (e: any) {
    console.error("seed_customers_dev_error", e);
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

function buildSuccessUrl(req: any, organizationId?: string) {
  const base = `${req.protocol}://${req.get("host")}/api/subscription/checkout/success`;
  const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
  return base + qs;
}

router.get("/checkout/success", async (req, res) => {
  const organizationId = String(req.query.organizationId || "").trim();
  const to = `${req.protocol}://${req.get("host")}/dashboard/org/billing?success=true${organizationId ? `&organizationId=${encodeURIComponent(organizationId)}` : ""}`;
  res.redirect(to);
});

// Raw diagnostics to inspect Polar REST responses directly


// Dev-only: create portal link without auth by providing organizationId & email
router.get("/portal/dev", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const organizationId = String(req.query.organizationId || "").trim();
    const email = String(req.query.email || "").trim();
    if (!organizationId) return res.status(400).json({ success: false, error: "organizationId required" });
    if (!email) return res.status(400).json({ success: false, error: "email required" });
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Portal disabled" });
    }
    const { polar } = require("./polar");
    let customer: any | null = null;
    try {
      customer = await polar.customers.getExternal({ externalId: organizationId } as any);
    } catch (_) {}
    if (!customer) {
      customer = await polar.customers.create({ email, externalId: organizationId } as any);
    }
    const session: any = await polar.customerSessions.create({
      customerId: String(customer?.id || customer?.customer?.id || ""),
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing`,
    } as any);
    return res.json({ success: true, portalUrl: String(session?.customerPortalUrl || "") });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.get("/products/dev", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const { polar } = require("./polar");
    const resp: any = await polar.products.list({ active: true } as any);
    const items: any[] = resp?.items ?? resp?.data ?? [];
    return res.json({ success: true, products: items });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.get("/resolve-product/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    const id = await resolveProductIdBySlug(slug);
    if (!id) return res.status(404).json({ success: false, error: "Unknown product slug" });
    return res.json({ success: true, productId: id });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.post("/seed/customers/dev", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Portal disabled" });
    }
    const { polar } = require("./polar");
    const { getSupabase } = require("../db/useSupabase");
    const { organizationService } = require("../org/service");
    const s = getSupabase();
    const limitRaw = Number(req.query.limit || 0);
    const { data: users } = await s.from("users").select("id,email,name,organization_id");
    let processed = 0, created = 0, existing = 0, failed = 0, skipped = 0;
    const list = Array.isArray(users) ? users : [];
    const slice = limitRaw > 0 ? list.slice(0, limitRaw) : list;
    for (const u of slice) {
      try {
        const userId = String(u.id);
        const email = String(u.email || "");
        const name = String(u.name || "");
        processed++;
        let orgId = u.organization_id ? String(u.organization_id) : "";
        if (!orgId) {
          try {
            const ensured = await organizationService.ensureOrganizationForUser(userId, { email, name });
            orgId = ensured.organization.id;
          } catch {
            skipped++;
            continue;
          }
        }
        if (!orgId || !email) { skipped++; continue; }
        let customer: any = null;
        try {
          customer = await polar.customers.getExternal({ externalId: orgId } as any);
        } catch {}
        if (!customer) {
          await polar.customers.create({ email, externalId: orgId, name: name || null } as any);
          created++;
        } else {
          existing++;
        }
      } catch {
        failed++;
      }
    }
    return res.json({ success: true, processed, created, existing, skipped, failed });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.post("/public-checkout-slug/:slug", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const slug = String(req.params.slug || "").toLowerCase();
    const interval = String((req.body?.interval || req.query?.interval || "month")).toLowerCase() === "year" ? "year" : "month";
    const productId = await resolveProductIdBySlug(slug);
    if (!productId) {
      return res.status(404).json({ success: false, error: "Unknown product slug" });
    }
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const { polar } = require("./polar");
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: buildSuccessUrl(req),
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      metadata: { slug, interval },
    } as any);
    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.get("/public-checkout-slug/:slug", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const slug = String(req.params.slug || "").toLowerCase();
    const interval = String((req.query?.interval || "month")).toLowerCase() === "year" ? "year" : "month";
    const productId = await resolveProductIdBySlug(slug);
    if (!productId) return res.status(404).json({ success: false, error: "Unknown product slug" });
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const { polar } = require("./polar");
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing?success=true`,
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      metadata: { slug, interval },
    } as any);
    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.get("/public-checkout-product/:id", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const productId = String(req.params.id || "").trim();
    const interval = String((req.query?.interval || "month")).toLowerCase() === "year" ? "year" : "month";
    if (!productId) return res.status(400).json({ success: false, error: "productId required" });
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const { polar } = require("./polar");
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: buildSuccessUrl(req),
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      metadata: { productId, interval },
    } as any);
    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

// Webhook endpoint for Polar (unauthenticated)
router.post("/webhook", async (req, res) => {
  try {
    await subscriptionService.handleWebhookEvent(req.body);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// All other subscription routes require authentication
router.use(requireAuth as any);

/**
 * Get subscription plans
 * GET /api/subscription/plans
 */
router.get("/plans", async (req, res) => {
  try {
    const strict = String(req.query.strict || "").toLowerCase();
    const result = await subscriptionService.getAvailablePlans(strict === "true" || strict === "1");
    return res.json(result);
  } catch (error) {
    console.error("Error getting subscription plans:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get subscription plans",
    });
  }
});

router.get("/plans/by-product/:productId", async (req, res) => {
  try {
    const productId = String(req.params.productId || "").trim();
    const result = await subscriptionService.getAvailablePlansByProductId(productId);
    return res.json(result);
  } catch (error) {
    console.error("Error getting subscription plans by productId:", error);
    return res.status(500).json({ success: false, error: "Failed to get subscription plans by productId" });
  }
});

router.get("/plans/normalized/by-product/:productId", async (req, res) => {
  try {
    const productId = String(req.params.productId || "").trim();
    const result = await subscriptionService.getAvailablePlansByProductId(productId);
    const rawPlans = Array.isArray(result?.plans) ? result.plans : [];
    const plans = rawPlans.map((p: any) => ({
      id: p.priceId || `${p.productId || "plan"}_${p.interval || "month"}`,
      name: p.productName,
      amount: typeof p.amount === "number" ? p.amount : 0,
      price: typeof p.amount === "number" ? p.amount : 0,
      currency: p.currency || "USD",
      interval: p.interval === "year" ? "year" : "month",
      features: [],
      description: `${p.productName} (${p.interval})`,
      limits: {},
      metadata: { productId: p.productId, priceId: p.priceId },
    }));
    return res.json({ success: true, plans });
  } catch (error) {
    console.error("Error getting normalized subscription plans by productId:", error);
    return res.status(500).json({ success: false, error: "Failed to get normalized subscription plans by productId" });
  }
});

router.get("/checkout-slug/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    const productId = await resolveProductIdBySlug(slug);
    if (!productId) return res.status(404).json({ success: false, error: "Unknown product slug" });
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const { polar } = require("./polar");
    const authUser = (req as any).user;
    const { organizationService } = require("../org/service");
    let orgId: string | undefined = authUser?.orgId || authUser?.organizationId;
    if (!orgId) {
      const ensured = await organizationService.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
      orgId = ensured.organization.id;
    }
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: buildSuccessUrl(req, orgId),
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      externalCustomerId: orgId,
      metadata: { slug },
    } as any);
    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

router.post("/checkout-slug/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    const mapping: Record<string, string | undefined> = {
      starter: process.env.POLAR_PRODUCT_STARTER_ID,
      professional: process.env.POLAR_PRODUCT_PROFESSIONAL_ID,
      enterprise: process.env.POLAR_PRODUCT_ENTERPRISE_ID,
    };
    let productId = mapping[slug];
    if (!productId) {
      const resolved = await resolveProductIdBySlug(slug);
      productId = resolved || undefined;
    }
    if (!productId) {
      return res.status(400).json({ success: false, error: "Unknown product slug or missing env mapping" });
    }
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const { polar } = require("./polar");
    const authUser = (req as any).user;
    const { organizationService } = require("../org/service");
    let orgId: string | undefined = authUser?.orgId || authUser?.organizationId;
    if (!orgId) {
      const ensured = await organizationService.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
      orgId = ensured.organization.id;
    }
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: buildSuccessUrl(req, orgId),
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      externalCustomerId: orgId,
      customerEmail: authUser?.email || null,
      metadata: { slug },
    } as any);
    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

/**
 * Get Customer Portal URL
 * GET /api/subscription/portal
 */
router.get("/portal", async (req, res) => {
  try {
    const orgIdParam = req.query.organizationId as string | undefined;
    const authUser = (req as any).user;
    const organizationId = (orgIdParam && orgIdParam.trim() !== "")
      ? orgIdParam
      : (authUser?.orgId || authUser?.organizationId);

    if (!organizationId || typeof organizationId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Organization ID is required (derive from authenticated context failed)",
      });
    }
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Portal disabled" });
    }
    const { polar } = require("./polar");
    let customer: any | null = null;
    try {
      customer = await polar.customers.getExternal({ externalId: organizationId } as any);
    } catch (e: any) {
      customer = null;
    }
    if (!customer) {
      const email = authUser?.email || String(req.query?.email || "");
      if (!email) {
        return res.status(400).json({ success: false, error: "Customer email required to bootstrap portal" });
      }
      customer = await polar.customers.create({
        email,
        externalId: organizationId,
        name: authUser?.name || null,
      } as any);
    }
    const session: any = await polar.customerSessions.create({
      customerId: String(customer?.id || customer?.customer?.id || ""),
      returnUrl: `${req.protocol}://${req.get("host")}/dashboard/org/billing`,
    } as any);
    const portalUrl: string = String(session?.customerPortalUrl || "");
    return res.json({ success: true, portalUrl });
  } catch (error: any) {
    console.error("Error getting portal URL:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to get portal URL" });
  }
});

/**
 * List available plans from Polar SDK
 * GET /api/subscription/list
 */
router.get("/list", async (req, res) => {
  try {
    const strict = String(req.query.strict || "").toLowerCase();
    const result = await subscriptionService.getAvailablePlans(strict === "true" || strict === "1");
    return res.json(result);
  } catch (error) {
    console.error("Error listing available plans:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list available plans",
    });
  }
});

router.get("/plans/strict", async (_req, res) => {
  try {
    const result = await subscriptionService.getAvailablePlans(true);
    return res.json(result);
  } catch (error) {
    console.error("Error getting strict subscription plans:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get strict subscription plans",
    });
  }
});

router.get("/plans/normalized", async (req, res) => {
  try {
    const strict = String(req.query.strict || "").toLowerCase();
    const onlyReal = strict === "true" || strict === "1";
    const result = await subscriptionService.getAvailablePlans(onlyReal);
    const rawPlans = Array.isArray(result?.plans) ? result.plans : [];
    const plans = rawPlans.map((p: any) => ({
      id: p.priceId || `${p.productId || "plan"}_${p.interval || "month"}`,
      name: p.productName,
      amount: typeof p.amount === "number" ? p.amount : 0,
      price: typeof p.amount === "number" ? p.amount : 0,
      currency: p.currency || "USD",
      interval: p.interval === "year" ? "year" : "month",
      features: [],
      description: "",
      limits: {},
      metadata: { productId: p.productId, priceId: p.priceId },
    }));
    return res.json({ success: true, plans });
  } catch (error) {
    console.error("Error getting normalized subscription plans:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get normalized subscription plans",
    });
  }
});

/**
 * Diagnostics (dev-only)
 * GET /api/subscription/diagnostics
 */
router.get("/diagnostics", async (req, res) => {
  try {
    const env = (process.env.NODE_ENV || "development").toLowerCase();
    if (env !== "development") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const authUser = (req as any).user;
    const orgIdParam = String(req.query.organizationId || "");
    const organizationId = orgIdParam || (authUser?.orgId || authUser?.organizationId) || "";
    const tokenPresent = Boolean(process.env.POLAR_ACCESS_TOKEN);
    const serverEnv = String(process.env.POLAR_SERVER || "sandbox").toLowerCase();
    let customerId: string | null = null;
    let subscriptionsCount = 0;
    let pickedStatus: string | null = null;
    let pickedAmount: number | null = null;
    let pickedProductId: string | null = null;
    if (tokenPresent && organizationId) {
      try {
        const { polar } = require("./polar");
        const polCustomer: any = await polar.customers.getExternal({ externalId: organizationId } as any).catch(() => null);
        customerId = String(polCustomer?.id || polCustomer?.customer?.id || "") || null;
        if (customerId) {
          const page: any = await polar.subscriptions.list({ customerId, limit: 10 } as any);
          const items: any[] = page?.items ?? page?.data ?? [];
          subscriptionsCount = items.length;
          const pick = items.find((s: any) => String(s?.status || "").toLowerCase() === "active") || items[0] || null;
          if (pick) {
            pickedStatus = String(pick?.status || "");
            pickedAmount = Number(pick?.amount ?? pick?.price?.amount ?? (Array.isArray(pick?.prices) ? pick?.prices?.[0]?.amount : 0) ?? 0);
            pickedProductId = String(pick?.product?.id || pick?.product_id || "") || null;
          }
        }
      } catch (e: any) {}
    }
    return res.json({ success: true, diagnostics: { tokenPresent, serverEnv, organizationId, customerId, subscriptionsCount, pickedStatus, pickedAmount, pickedProductId } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || "Failed diagnostics" });
  }
});

/**
 * Get current subscription
 * GET /api/subscription
 */
router.get("/", async (req, res) => {
  try {
    // Prefer explicit org from query, otherwise derive from authenticated user context (Better Auth)
    const orgIdParam = req.query.organizationId;
    const authUser = (req as any).user;
    let organizationId = (typeof orgIdParam === "string" && orgIdParam.trim() !== "")
      ? orgIdParam as string
      : (authUser?.orgId || authUser?.organizationId);

    console.log("[route:/subscription] incoming", { orgIdParam, derivedOrgId: organizationId, userId: authUser?.id });
    if (!process.env.POLAR_ACCESS_TOKEN) {
      console.warn("[route:/subscription] POLAR_ACCESS_TOKEN missing; Polar operations will not work");
    }

    const { organizationService } = require("../org/service");
    if (!organizationId || typeof organizationId !== "string") {
      try {
        const ensured = await organizationService.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
        organizationId = ensured.organization.id;
        console.warn("[route:/subscription] billing_org_missing_bootstrap", { organizationId, userId: authUser?.id });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: "Organization ID is required (derive from authenticated context failed)" });
      }
    } else {
      const org = await organizationService.getOrganization(organizationId);
      if (!org) {
        const ensured = await organizationService.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
        organizationId = ensured.organization.id;
        console.warn("[route:/subscription] resolved_invalid_orgId_bootstrap", { organizationId, userId: authUser?.id });
      }
    }

    const authUserId = (req as any).user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const result = await subscriptionService.getSubscription(organizationId, authUserId);
    
    return res.json(result);
  } catch (error: any) {
    console.error("Error getting subscription:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to get subscription",
    });
  }
});

/**
 * Create subscription checkout session
 * POST /api/subscription/create-checkout
 */
// Backward compatibility alias - will be deprecated after clients migrate to /checkout
router.post("/create-checkout", async (req, res) => {
  try {
    const { priceId, products, slug, organizationId, userEmail, successUrl, cancelUrl } = req.body;
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }

    const authUser = (req as any).user;
    let orgId: string | undefined = (typeof organizationId === "string" && organizationId.trim() !== "")
      ? String(organizationId)
      : (authUser?.orgId || authUser?.organizationId);

    const { organizationService } = require("../org/service");
    if (!orgId) {
      const ensured = await organizationService.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
      orgId = ensured.organization.id;
    }

    const { polar } = require("./polar");
    let productId: string | null = null;
    if (Array.isArray(products) && products.length > 0) {
      productId = String(products[0] || "");
    } else if (typeof slug === "string" && slug.trim() !== "") {
      productId = await resolveProductIdBySlug(String(slug).toLowerCase());
    } else if (typeof priceId === "string" && priceId.trim() !== "") {
      const page: any = await polar.products.list({ active: true } as any);
      const items: any[] = page?.items ?? page?.data ?? [];
      for (const prod of items) {
        const pricesSrc: any = prod?.prices;
        const prices: any[] = Array.isArray(pricesSrc) ? pricesSrc : (pricesSrc?.items ?? pricesSrc?.data ?? []);
        for (const price of prices) {
          const pid = String(price?.id || price?.price_id || "");
          if (pid === priceId) {
            productId = String(prod?.id || prod?.product_id || prod?.uuid || "");
            break;
          }
        }
        if (productId) break;
      }
    }
    if (!productId) {
      const fallback = await resolveProductIdBySlug("product1");
      if (!fallback) {
        return res.status(400).json({ success: false, error: "Missing productId/slug/priceId" });
      }
      productId = fallback;
    }

    const meta2: any = { organizationId: orgId };
    if (typeof priceId === "string" && priceId.trim() !== "") {
      meta2.priceId = priceId;
    }
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: successUrl || `${req.protocol}://${req.get("host")}/dashboard/org/billing?success=true`,
      returnUrl: cancelUrl || `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      customerEmail: userEmail || authUser?.email || null,
      externalCustomerId: orgId,
    } as any);

    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (error: any) {
    console.error("[Checkout] Polar API error (alias /create-checkout):", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to create Polar checkout session",
    });
  }
});

/**
 * Alias endpoint: Create subscription checkout session
 * POST /api/subscription/checkout
 * Mirrors /create-checkout for API consistency with docs/client
 */
router.post("/checkout", async (req, res) => {
  try {
    const { priceId, products, slug, organizationId, userEmail, successUrl, cancelUrl } = req.body;
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }

    const authUser = (req as any).user;
    let orgId: string | undefined = (typeof organizationId === "string" && organizationId.trim() !== "")
      ? String(organizationId)
      : (authUser?.orgId || authUser?.organizationId);

    const { organizationService } = require("../org/service");
    if (!orgId) {
      const ensured = await organizationService.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
      orgId = ensured.organization.id;
    }

    const { polar } = require("./polar");
    let productId: string | null = null;
    if (Array.isArray(products) && products.length > 0) {
      productId = String(products[0] || "");
    } else if (typeof slug === "string" && slug.trim() !== "") {
      productId = await resolveProductIdBySlug(String(slug).toLowerCase());
    } else if (typeof priceId === "string" && priceId.trim() !== "") {
      const page: any = await polar.products.list({ active: true } as any);
      const items: any[] = page?.items ?? page?.data ?? [];
      for (const prod of items) {
        const pricesSrc: any = prod?.prices;
        const prices: any[] = Array.isArray(pricesSrc) ? pricesSrc : (pricesSrc?.items ?? pricesSrc?.data ?? []);
        for (const price of prices) {
          const pid = String(price?.id || price?.price_id || "");
          if (pid === priceId) {
            productId = String(prod?.id || prod?.product_id || prod?.uuid || "");
            break;
          }
        }
        if (productId) break;
      }
    }
    if (!productId) {
      const fallback = await resolveProductIdBySlug("starter");
      if (!fallback) {
        return res.status(400).json({ success: false, error: "Missing productId/slug/priceId" });
      }
      productId = fallback;
    }

    const meta: any = { organizationId: orgId };
    if (typeof priceId === "string" && priceId.trim() !== "") {
      meta.priceId = priceId;
    }
    console.log("[Checkout] creating Polar checkout", {
      products: [productId],
      priceId,
      meta,
    });
    const checkout: any = await polar.checkouts.create({
      products: [productId],
      successUrl: successUrl || buildSuccessUrl(req, orgId),
      returnUrl: cancelUrl || `${req.protocol}://${req.get("host")}/dashboard/org/billing?canceled=true`,
      customerEmail: userEmail || authUser?.email || null,
      externalCustomerId: orgId,
    } as any);

    const url: string | null = checkout?.url || checkout?.redirect_url || null;
    return res.json({ success: true, checkoutUrl: url, subscriptionId: String(checkout?.id || "") });
  } catch (error: any) {
    console.error("[Checkout] Polar API error:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to create Polar checkout session",
    });
  }
});

/**
 * Create subscription checkout for a NEW organization (no orgId required)
 * POST /api/subscription/create-checkout-new-org
 */
router.post("/create-checkout-new-org", async (req, res) => {
  try {
    const validatedData = createSubscriptionSchema.parse(req.body);

    const authUserId = (req as any).user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const result = await subscriptionService.createSubscriptionForNewOrg(
      authUserId,
      validatedData
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Error creating new-org subscription checkout:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to create subscription checkout for new organization",
    });
  }
});

/**
 * Update subscription
 * PATCH /api/subscription
 */
router.patch("/", async (req, res) => {
  try {
    let { organizationId } = req.body as { organizationId?: string };

    const validatedData = updateSubscriptionSchema.parse(req.body);
    
    const authUser = (req as any).user;
    const authUserId = authUser?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!organizationId || typeof organizationId !== "string" || organizationId.trim() === "") {
      const fromQuery = typeof req.query.organizationId === "string" ? (req.query.organizationId as string) : undefined;
      const fromHeader = typeof req.headers["x-organization-id"] === "string" ? (req.headers["x-organization-id"] as string) : undefined;
      const fromAuth = (authUser?.orgId || authUser?.organizationId) as string | undefined;
      organizationId = (fromQuery || fromHeader || fromAuth || organizationId || "").toString();
      if (!organizationId || organizationId.trim() === "") {
        try {
          const { organizationService: orgSvc } = require("../org/service");
          const ensured = await orgSvc.ensureOrganizationForUser(authUserId, { email: authUser?.email, name: authUser?.name });
          organizationId = ensured.organization.id;
        } catch (e: any) {
          return res.status(400).json({ success: false, error: "Organization ID is required" });
        }
      }
    }

    const result = await subscriptionService.updateSubscription(
      String(organizationId),
      authUserId,
      validatedData
    );
    
    return res.json(result);
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to update subscription",
    });
  }
});

/**
 * Cancel subscription
 * POST /api/subscription/cancel
 */
router.post("/cancel", async (req, res) => {
  try {
    let { organizationId, cancelAtPeriodEnd } = req.body as { organizationId?: string; cancelAtPeriodEnd?: boolean };

    const authUser = (req as any).user;
    const authUserId = authUser?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Multi-source derivation for orgId
    const fromQuery = typeof req.query.organizationId === "string" ? (req.query.organizationId as string) : undefined;
    const fromHeader = typeof req.headers["x-organization-id"] === "string" ? (req.headers["x-organization-id"] as string) : undefined;
    const fromAuth = (authUser?.orgId || authUser?.organizationId) as string | undefined;
    organizationId = (organizationId && organizationId.trim() !== "") ? organizationId : (fromQuery || fromHeader || fromAuth);

    if (!organizationId) {
      try {
        const { organizationService: orgSvc } = require("../org/service");
        const current = await orgSvc.getUserOrganization(authUserId);
        if (current?.organization?.id) organizationId = current.organization.id as string;
      } catch {}
    }

    if (!organizationId || typeof organizationId !== "string" || organizationId.trim() === "") {
      try {
        const { organizationService: orgSvc } = require("../org/service");
        const ensured = await orgSvc.ensureOrganizationForUser(authUserId, { email: authUser?.email, name: authUser?.name });
        organizationId = ensured.organization.id;
      } catch (e: any) {
        // As last resort, return a consistent response rather than 400
        return res.status(400).json({ success: false, error: "Organization ID is required" });
      }
    }

    cancelAtPeriodEnd = Boolean(cancelAtPeriodEnd);
    await subscriptionService.cancelSubscription(String(organizationId), authUserId, cancelAtPeriodEnd);

    try {
      const updated = await subscriptionService.getSubscription(String(organizationId), authUserId);
      return res.json({ success: true, message: "Subscription canceled successfully", subscription: updated.subscription });
    } catch {
      return res.json({ success: true, message: "Subscription canceled successfully" });
    }
  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to cancel subscription",
    });
  }
});

/**
 * Check usage limits
 * GET /api/subscription/usage
 */
router.get("/usage", async (req, res) => {
  try {
    // Prefer explicit org from query, otherwise derive from authenticated user context (Better Auth)
    const orgIdParam = req.query.organizationId;
    const authUser = (req as any).user;
    let organizationId = (typeof orgIdParam === "string" && orgIdParam.trim() !== "")
      ? orgIdParam as string
      : (authUser?.orgId || authUser?.organizationId);

    console.log("[route:/usage] incoming", { orgIdParam, derivedOrgId: organizationId, userId: authUser?.id });

    const { organizationService: orgSvc } = require("../org/service");
    if (!organizationId || typeof organizationId !== "string") {
      try {
        const ensured = await orgSvc.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
        organizationId = ensured.organization.id;
        console.warn("[route:/usage] billing_org_missing_bootstrap", { organizationId, userId: authUser?.id });
      } catch (e: any) {
        return res.status(400).json({ success: false, error: "Organization ID is required (derive from authenticated context failed)" });
      }
    } else {
      const org = await orgSvc.getOrganization(organizationId);
      if (!org) {
        const ensured = await orgSvc.ensureOrganizationForUser(authUser?.id, { email: authUser?.email, name: authUser?.name });
        organizationId = ensured.organization.id;
        console.warn("[route:/usage] resolved_invalid_orgId_bootstrap", { organizationId, userId: authUser?.id });
      }
    }

    const result = await subscriptionService.checkUsageLimits(organizationId);
    
    return res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error checking usage limits:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to check usage limits",
    });
  }
});

/**
 * Dev-only: test Polar SDK connectivity
 * GET /api/subscription/test-polar
 */
router.get("/test-polar", async (req, res) => {
  try {
    console.log("[route:/test-polar] serverEnv=", (process.env.POLAR_SERVER || "sandbox").toLowerCase());
    if (!process.env.POLAR_ACCESS_TOKEN) {
      console.warn("[route:/test-polar] POLAR_ACCESS_TOKEN missing");
    }
    // products.list tends to include embedded prices
    // Importing polar from service layer to avoid duplicate config
    const { polar } = require("./polar");
    const resp = await polar.products.list({ active: true } as any);
    return res.json({ success: true, raw: resp });
  } catch (err: any) {
    console.error("[route:/test-polar] error:", err);
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

/**
 * Diagnostics
 * GET /api/subscription/diagnostics
 */
router.get("/diagnostics/deep", async (_req, res) => {
  try {
    const serverEnv = (process.env.POLAR_SERVER || "sandbox").toLowerCase();
    const tokenPresent = Boolean(process.env.POLAR_ACCESS_TOKEN);
    let productsCount = 0;
    let pricesCount = 0;
    let error: string | null = null;
    try {
      const { polar } = require("./polar");
      const firstPage: any = await polar.products.list({ active: true } as any);
      const items: any[] = firstPage?.items ?? firstPage?.data ?? [];
      productsCount = items.length;
      for (const prod of items) {
        const pricesSrc: any = prod?.prices;
        const prices: any[] = Array.isArray(pricesSrc) ? pricesSrc : (pricesSrc?.items ?? pricesSrc?.data ?? []);
        pricesCount += prices.length;
      }
    } catch (e: any) {
      error = e?.message || String(e);
    }
    return res.json({ success: true, serverEnv, tokenPresent, productsCount, pricesCount, error });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

/**
 * Get invoices for organization
 * GET /api/subscription/invoices?organizationId=...
 */
router.get("/invoices", async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId || typeof organizationId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Organization ID is required",
      });
    }

    const authUserId = (req as any).user?.id;
    if (!authUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const result = await subscriptionService.getInvoices(organizationId, authUserId);

    return res.json(result);
  } catch (error: any) {
    console.error("Error getting invoices:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to get invoices",
    });
  }
});

/**
 * Update usage metrics
 * POST /api/subscription/usage
 */
router.post("/usage", async (req, res) => {
  try {
    const { organizationId, ...metrics } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: "Organization ID is required",
      });
    }

    // Validate metrics
    const metricsSchema = z.object({
      apiCalls: z.number().optional(),
      storage: z.number().optional(),
      teamMembers: z.number().optional(),
      projects: z.number().optional(),
    });

    const validatedMetrics = metricsSchema.parse(metrics);
    // Sanitize to avoid undefined values with exactOptionalPropertyTypes
    const sanitizedMetrics: {
      apiCalls?: number;
      storage?: number;
      teamMembers?: number;
      projects?: number;
    } = {};
    if (typeof validatedMetrics.apiCalls === 'number') sanitizedMetrics.apiCalls = validatedMetrics.apiCalls;
    if (typeof validatedMetrics.storage === 'number') sanitizedMetrics.storage = validatedMetrics.storage;
    if (typeof validatedMetrics.teamMembers === 'number') sanitizedMetrics.teamMembers = validatedMetrics.teamMembers;
    if (typeof validatedMetrics.projects === 'number') sanitizedMetrics.projects = validatedMetrics.projects;

    await subscriptionService.updateUsage(organizationId, sanitizedMetrics);
    
    return res.json({
      success: true,
      message: "Usage metrics updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating usage metrics:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to update usage metrics",
    });
  }
});

/**
 * Create or update billing customer
 * POST /api/subscription/customer
 */
router.post("/customer", async (req, res) => {
  try {
    const { organizationId, email, name, phone, address } = req.body;
    
    if (!organizationId || !email) {
      return res.status(400).json({
        success: false,
        error: "Organization ID and email are required",
      });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const customer = await subscriptionService.createOrUpdateCustomer(
      organizationId,
      userId,
      {
        email,
        name,
        phone,
        address,
      }
    );
    
    return res.json({
      success: true,
      customer,
    });
  } catch (error: any) {
    console.error("Error creating/updating customer:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Failed to create/update customer",
    });
  }
});

/**
 * Polar webhook endpoint
 * POST /api/subscription/webhook
 */
router.post(
  "/webhook",
  // Use raw body for signature verification
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const secret = process.env.POLAR_WEBHOOK_SECRET || "";
      if (!secret) {
        console.error("[webhook] Missing POLAR_WEBHOOK_SECRET");
        return res.status(500).json({ success: false, error: "Webhook secret not configured" });
      }

      // Validate event signature and parse event
      return res.status(501).json({ success: false, error: "Billing disabled" });
    } catch (error: any) {
      
      console.error("[webhook] processing_error", error?.message || error);
      return res.status(500).json({ success: false, error: "Failed to process webhook" });
    }
  }
);

export default router;
