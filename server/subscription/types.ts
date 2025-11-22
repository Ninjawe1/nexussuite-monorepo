import { z } from "zod";

export type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "paused" | "unpaid";
export type BillingInterval = "month" | "year";

export interface SubscriptionPlanConfig {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: {
    month: number;
    year: number;
  };
  features: string[];
  limits: {
    teamMembers: number;
    apiCalls: number;
    storage: number; // MB
    projects: number;
  };
  polarProductId: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  userId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  quantity: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCustomer {
  id: string;
  organizationId: string;
  polarCustomerId: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingInvoice {
  id: string;
  organizationId: string;
  polarInvoiceId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  invoicePdf: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}

// Zod schemas
export const createSubscriptionSchema = z.object({
  plan: z.enum(["free", "starter", "professional", "enterprise"]),
  billingInterval: z.enum(["month", "year"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const updateSubscriptionSchema = z.object({
  plan: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
  billingInterval: z.enum(["month", "year"]).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

// Subscription plan configurations
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Perfect for individuals and small teams getting started",
    price: { month: 0, year: 0 },
    features: [
      "Up to 3 team members",
      "1,000 API calls per month",
      "100 MB storage",
      "Basic support",
      "Community access",
    ],
    limits: {
      teamMembers: 3,
      apiCalls: 1000,
      storage: 100,
      projects: 1,
    },
    polarProductId: "free_plan",
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "Great for growing teams and small businesses",
    price: { month: 29, year: 290 },
    features: [
      "Up to 10 team members",
      "10,000 API calls per month",
      "1 GB storage",
      "Priority support",
      "Advanced analytics",
      "Custom integrations",
    ],
    limits: {
      teamMembers: 10,
      apiCalls: 10000,
      storage: 1024,
      projects: 5,
    },
    polarProductId: "starter_plan_monthly",
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For established businesses with advanced needs",
    price: { month: 99, year: 990 },
    features: [
      "Up to 50 team members",
      "100,000 API calls per month",
      "10 GB storage",
      "24/7 support",
      "Advanced security",
      "API access",
      "Custom branding",
      "Advanced reporting",
    ],
    limits: {
      teamMembers: 50,
      apiCalls: 100000,
      storage: 10240,
      projects: 20,
    },
    polarProductId: "professional_plan_monthly",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    price: { month: 299, year: 2990 },
    features: [
      "Unlimited team members",
      "Unlimited API calls",
      "Unlimited storage",
      "Dedicated support",
      "Custom security",
      "White-label options",
      "Custom integrations",
      "SLA guarantee",
      "Advanced analytics",
    ],
    limits: {
      teamMembers: -1, // unlimited
      apiCalls: -1, // unlimited
      storage: -1, // unlimited
      projects: -1, // unlimited
    },
    polarProductId: "enterprise_plan_monthly",
  },
};

// Response types
export interface CreateSubscriptionResponse {
  success: boolean;
  checkoutUrl: string;
  subscriptionId: string;
}

export interface UpdateSubscriptionResponse {
  success: boolean;
  subscription: Subscription;
}

export interface GetSubscriptionResponse {
  success: boolean;
  subscription: Subscription | null;
  customer: BillingCustomer | null;
}

export interface GetInvoicesResponse {
  success: boolean;
  invoices: BillingInvoice[];
}

export interface WebhookResponse {
  success: boolean;
  message: string;
}

// Dynamic plan listing from Polar SDK
export interface AvailablePlanPrice {
  productId: string;
  productName: string;
  priceId: string;
  currency: string;
  amount: number;
  interval: BillingInterval;
}

export interface GetAvailablePlansResponse {
  success: boolean;
  plans: AvailablePlanPrice[];
}