import { z } from "zod";

// Admin user types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "support";
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// System metrics
export interface SystemMetrics {
  totalUsers: number;
  totalOrganizations: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
  newOrganizationsThisMonth: number;
  churnRate: number;
  avgRevenuePerUser: number;
  systemHealth: {
    status: "healthy" | "degraded" | "down";
    uptime: number;
    responseTime: number;
    lastHealthCheck: string;
  };
}

// User analytics
export interface UserAnalytics {
  id: string;
  email: string;
  name: string;
  organizationName: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
  totalApiCalls: number;
  storageUsed: number;
  isActive: boolean;
}

// Organization analytics
export interface OrganizationAnalytics {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  lastActivityAt: string;
  totalApiCalls: number;
  storageUsed: number;
  isActive: boolean;
  ownerEmail: string;
}

// Audit log types
export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "critical";
}

export interface SubscriptionEventLog {
  id: string;
  type: string;
  status: string;
  plan: string;
  at: string;
  organizationId: string;
  organizationName: string;
}

export interface BillingSummary {
  totals: {
    organizations: number;
    active: number;
    canceled: number;
    trialing: number;
    incomplete: number;
  };
  byPlan: { plan: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentEvents: SubscriptionEventLog[];
  organizations: { id: string; name: string; plan: string; status: string }[];
  orgPage: number;
  orgLimit: number;
  orgTotal: number;
  trends: { last7d: { active: number; canceled: number; trialing: number; incomplete: number } };
}

// Support ticket types
export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "billing" | "technical" | "feature_request" | "other";
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderEmail: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

// System settings
export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  requireEmailVerification: boolean;
  maxOrganizationsPerUser: number;
  defaultSubscriptionPlan: string;
  apiRateLimit: number;
  storageLimit: number;
  supportEmail: string;
  systemEmail: string;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  createdAt: string;
  updatedAt: string;
}

// Zod schemas for validation
export const createSupportTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.enum(["billing", "technical", "feature_request", "other"]).optional(),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.enum(["billing", "technical", "feature_request", "other"]).optional(),
  assignedTo: z.string().optional(),
});

export const addSupportMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

export const updateSystemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  allowNewRegistrations: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  maxOrganizationsPerUser: z.number().int().min(1).max(100).optional(),
  defaultSubscriptionPlan: z.string().optional(),
  apiRateLimit: z.number().int().min(100).max(10000).optional(),
  storageLimit: z.number().int().min(100).max(100000).optional(),
  supportEmail: z.string().email().optional(),
  systemEmail: z.string().email().optional(),
  termsOfServiceUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(["super_admin", "admin", "support", "user"]).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const adminUpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).optional(),
  subscriptionPlan: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  isActive: z.boolean().optional(),
  maxMembers: z.number().int().min(1).max(1000).optional(),
});

// Response types
export interface GetSystemMetricsResponse {
  success: boolean;
  metrics: SystemMetrics;
}

export interface GetUserAnalyticsResponse {
  success: boolean;
  users: UserAnalytics[];
  total: number;
  page: number;
  limit: number;
}

export interface GetOrganizationAnalyticsResponse {
  success: boolean;
  organizations: OrganizationAnalytics[];
  total: number;
  page: number;
  limit: number;
}

export interface GetAuditLogsResponse {
  success: boolean;
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface GetSupportTicketsResponse {
  success: boolean;
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
}

export interface GetSystemSettingsResponse {
  success: boolean;
  settings: SystemSettings;
}

export interface UpdateSystemSettingsResponse {
  success: boolean;
  settings: SystemSettings;
}