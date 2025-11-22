import { z } from "zod";
import { getSupabase } from "../db/useSupabase";
import { 
  SystemMetrics,
  UserAnalytics,
  OrganizationAnalytics,
  AuditLog,
  SubscriptionEventLog,
  BillingSummary,
  SupportTicket,
  SystemSettings,
  createSupportTicketSchema,
  updateSupportTicketSchema,
  addSupportMessageSchema,
  updateSystemSettingsSchema,
  adminUpdateUserSchema,
  adminUpdateOrganizationSchema
} from "./types";
import { subscriptionService } from "../subscription/service";

export class AdminService {
  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Get user counts
      const s = getSupabase();
      const { count: totalUsers } = await s.from("users").select("id", { count: "exact", head: true });
      
      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: newUsersThisMonth } = await s.from("users").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString());

      // Get organization counts
      const { count: totalOrganizations } = await s.from("organizations").select("id", { count: "exact", head: true });
      
      // Get new organizations this month
      const { count: newOrganizationsThisMonth } = await s.from("organizations").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString());

      // Get subscription metrics
      const { count: totalSubscriptions } = await s.from("subscriptions").select("id", { count: "exact", head: true });
      
      const { count: activeSubscriptions } = await s.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active");

      // Calculate churn rate (simplified)
      const churnRate = totalSubscriptions > 0 
        ? ((totalSubscriptions - activeSubscriptions) / totalSubscriptions) * 100 
        : 0;

      // Calculate revenue (simplified - would need actual billing data)
      const totalRevenue = activeSubscriptions * 99; // Average monthly revenue
      const monthlyRevenue = activeSubscriptions * 29; // Estimated monthly revenue
      
      // Calculate ARPU
      const avgRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      // System health (mock data - would integrate with monitoring)
      const systemHealth = {
        status: "healthy" as const,
        uptime: 99.9,
        responseTime: 150,
        lastHealthCheck: new Date().toISOString(),
      };

      return {
        totalUsers,
        totalOrganizations,
        totalSubscriptions,
        activeSubscriptions,
        totalRevenue,
        monthlyRevenue,
        newUsersThisMonth,
        newOrganizationsThisMonth,
        churnRate,
        avgRevenuePerUser,
        systemHealth,
      };
    } catch (error) {
      console.error("Error getting system metrics:", error);
      throw new Error("Failed to get system metrics");
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    page: number = 1,
    limit: number = 50,
    search?: string,
    filter?: {
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{
    users: UserAnalytics[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Use a flexible query type to allow chaining where/orderBy/limit without TypeScript narrowing issues
      const s = getSupabase();
      let usersQuery = s.from("users").select("*");

      // Apply filters
      if (filter?.subscriptionPlan) usersQuery = usersQuery.eq("subscription_plan", filter.subscriptionPlan);
      if (filter?.subscriptionStatus) usersQuery = usersQuery.eq("subscription_status", filter.subscriptionStatus);
      if (filter?.isActive !== undefined) usersQuery = usersQuery.eq("is_active", filter.isActive);
      if (filter?.dateFrom) usersQuery = usersQuery.gte("created_at", filter.dateFrom);
      if (filter?.dateTo) usersQuery = usersQuery.lte("created_at", filter.dateTo);

      // Add ordering and pagination
      usersQuery = usersQuery.order("created_at", { ascending: false });
      
      if (page > 1) {
        // For pagination, we'd need to get the last document from previous page
        // This is a simplified implementation
        const offset = (page - 1) * limit;
        // In a real implementation, you'd use startAfter with a document reference
      }
      
      usersQuery = usersQuery.limit(limit);
      const { data: userRows } = await usersQuery;
      const users: UserAnalytics[] = await Promise.all(
        (userRows || []).map(async (r: any) => {
          let organizationName = "No Organization";
          if (r.organization_id) {
            const { data: org } = await getSupabase().from("organizations").select("name").eq("id", r.organization_id).maybeSingle();
            if (org) organizationName = org.name;
          }
          return {
            id: r.id,
            email: r.email,
            name: r.name || "Unknown",
            organizationName,
            subscriptionPlan: r.subscription_plan || "free",
            subscriptionStatus: r.subscription_status || "active",
            lastLoginAt: r.last_login_at || null,
            createdAt: r.created_at,
            totalApiCalls: r.total_api_calls || 0,
            storageUsed: r.storage_used || 0,
            isActive: r.is_active !== false,
          } as any;
        })
      );

      // Apply search filter if provided
      let filteredUsers = users;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = users.filter(user => 
          user.email.toLowerCase().includes(searchLower) ||
          user.name.toLowerCase().includes(searchLower) ||
          user.organizationName.toLowerCase().includes(searchLower)
        );
      }

      return {
        users: filteredUsers,
        total: filteredUsers.length, // In real implementation, get total count separately
        page,
        limit,
      };
    } catch (error) {
      console.error("Error getting user analytics:", error);
      throw new Error("Failed to get user analytics");
    }
  }

  /**
   * Get organization analytics
   */
  async getOrganizationAnalytics(
    page: number = 1,
    limit: number = 50,
    search?: string,
    filter?: {
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{
    organizations: OrganizationAnalytics[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const s = getSupabase();
      let orgsQuery = s.from("organizations").select("*");

      // Apply filters
      if (filter?.subscriptionPlan) orgsQuery = orgsQuery.eq("subscription_plan", filter.subscriptionPlan);
      if (filter?.subscriptionStatus) orgsQuery = orgsQuery.eq("subscription_status", filter.subscriptionStatus);
      if (filter?.isActive !== undefined) orgsQuery = orgsQuery.eq("status", filter.isActive ? "active" : "canceled");
      if (filter?.dateFrom) orgsQuery = orgsQuery.gte("created_at", filter.dateFrom);
      if (filter?.dateTo) orgsQuery = orgsQuery.lte("created_at", filter.dateTo);

      // Add ordering and pagination
      const { data: orgRows } = await orgsQuery.order("created_at", { ascending: false }).limit(limit);
      const organizations: OrganizationAnalytics[] = await Promise.all(
        (orgRows || []).map(async (r: any) => {
          let ownerEmail = "Unknown";
          const { data: owner } = await getSupabase().from("org_members").select("user_id, role").eq("organization_id", r.id).eq("role", "owner").maybeSingle();
          if (owner) {
            const { data: u } = await getSupabase().from("users").select("email").eq("id", owner.user_id).maybeSingle();
            if (u) ownerEmail = u.email;
          }
          return {
            id: r.id,
            name: r.name,
            slug: r.slug,
            memberCount: r.member_count || 0,
            subscriptionPlan: r.subscription_plan || "free",
            subscriptionStatus: r.subscription_status || "active",
            createdAt: r.created_at,
            lastActivityAt: r.updated_at,
            totalApiCalls: (r.usage?.apiCalls) || 0,
            storageUsed: (r.usage?.storage) || 0,
            isActive: r.subscription_status !== "canceled",
            ownerEmail,
          } as any;
        })
      );

      // Apply search filter if provided
      let filteredOrgs = organizations;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredOrgs = organizations.filter(org => 
          org.name.toLowerCase().includes(searchLower) ||
          org.slug.toLowerCase().includes(searchLower) ||
          org.ownerEmail.toLowerCase().includes(searchLower)
        );
      }

      return {
        organizations: filteredOrgs,
        total: filteredOrgs.length,
        page,
        limit,
      };
    } catch (error) {
      console.error("Error getting organization analytics:", error);
      throw new Error("Failed to get organization analytics");
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    page: number = 1,
    limit: number = 100,
    filter?: {
      userId?: string;
      organizationId?: string;
      action?: string;
      severity?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const s = getSupabase();
      let logsQuery = s.from("audit_logs").select("*");

      // Apply filters
      if (filter?.userId) logsQuery = logsQuery.eq("user_id", filter.userId);
      if (filter?.organizationId) logsQuery = logsQuery.eq("organization_id", filter.organizationId);
      if (filter?.action) logsQuery = logsQuery.eq("action", filter.action);
      if (filter?.severity) logsQuery = logsQuery.eq("severity", filter.severity);
      if (filter?.dateFrom) logsQuery = logsQuery.gte("timestamp", filter.dateFrom);
      if (filter?.dateTo) logsQuery = logsQuery.lte("timestamp", filter.dateTo);

      // Add ordering and pagination
      const { data } = await logsQuery.order("timestamp", { ascending: false }).limit(limit);
      const logs: AuditLog[] = (data || []).map((r: any) => ({ id: r.id, ...r }));

      return {
        logs,
        total: logs.length,
        page,
        limit,
      };
    } catch (error) {
      console.error("Error getting audit logs:", error);
      throw new Error("Failed to get audit logs");
    }
  }

  /**
   * Get subscription events
   */
  async getSubscriptionEvents(
    page: number = 1,
    limit: number = 100,
    filter?: {
      organizationId?: string;
      status?: string;
      plan?: string;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    }
  ): Promise<{ events: SubscriptionEventLog[]; total: number; page: number; limit: number; }> {
    try {
      const s = getSupabase();
      let orgQuery = s.from("organizations").select("id,name,metadata");
      if (filter?.organizationId) orgQuery = orgQuery.eq("id", filter.organizationId);
      const { data: orgRows } = await orgQuery;
      const all: SubscriptionEventLog[] = [];
      for (const r of orgRows || []) {
        const md = (r.metadata || {}) as any;
        const evs: any[] = Array.isArray(md.subscriptionEvents) ? md.subscriptionEvents : [];
        for (const e of evs) {
          const item: SubscriptionEventLog = {
            id: String(e?.id || `${r.id}_${String(e?.type || "evt")}_${String(e?.at || Date.now())}`),
            type: String(e?.type || ""),
            status: String(e?.status || ""),
            plan: String(e?.plan || ""),
            at: String(e?.at || ""),
            organizationId: String(r.id),
            organizationName: String(r.name || "Unknown"),
          };
          all.push(item);
        }
      }
      let filtered = all;
      if (filter?.status) filtered = filtered.filter(x => x.status.toLowerCase() === filter.status!.toLowerCase());
      if (filter?.plan) filtered = filtered.filter(x => x.plan.toLowerCase() === filter.plan!.toLowerCase());
      if (filter?.type) filtered = filtered.filter(x => x.type.toLowerCase() === filter.type!.toLowerCase());
      if (filter?.dateFrom) filtered = filtered.filter(x => x.at && x.at >= filter.dateFrom!);
      if (filter?.dateTo) filtered = filtered.filter(x => x.at && x.at <= filter.dateTo!);
      filtered.sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0));
      const start = (page - 1) * limit;
      const slice = filtered.slice(start, start + limit);
      return { events: slice, total: filtered.length, page, limit };
    } catch (error) {
      console.error("Error getting subscription events:", error);
      throw new Error("Failed to get subscription events");
    }
  }

  async getBillingSummary(limit: number = 25, orgPage: number = 1, orgLimit: number = 50, orgSortBy?: string, orgSortOrder?: "asc" | "desc"): Promise<BillingSummary> {
    try {
      const s = getSupabase();
      const { data: orgRows } = await s.from("organizations").select("id,name,subscription_plan,subscription_status,metadata");
      let organizations = (orgRows || []).map((r: any) => ({ id: String(r.id), name: String(r.name || "Unknown"), plan: String(r.subscription_plan || "free"), status: String(r.subscription_status || "inactive") }));
      if (orgSortBy) {
        const key = String(orgSortBy).toLowerCase();
        const dir = (orgSortOrder === "asc" ? 1 : -1);
        organizations = organizations.sort((a: { id: string; name: string; plan: string; status: string }, b: { id: string; name: string; plan: string; status: string }) => {
          const av = String((a as any)[key] || "").toLowerCase();
          const bv = String((b as any)[key] || "").toLowerCase();
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
      const byPlanMap: Record<string, number> = {};
      const byStatusMap: Record<string, number> = {};
      for (const o of organizations) {
        byPlanMap[o.plan] = (byPlanMap[o.plan] || 0) + 1;
        byStatusMap[o.status] = (byStatusMap[o.status] || 0) + 1;
      }
      const byPlan = Object.entries(byPlanMap).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count);
      const byStatus = Object.entries(byStatusMap).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
      let events: SubscriptionEventLog[] = [];
      for (const r of orgRows || []) {
        const md = (r.metadata || {}) as any;
        const evs: any[] = Array.isArray(md.subscriptionEvents) ? md.subscriptionEvents : [];
        for (const e of evs) {
          events.push({
            id: String(e?.id || `${r.id}_${String(e?.type || "evt")}_${String(e?.at || Date.now())}`),
            type: String(e?.type || ""),
            status: String(e?.status || ""),
            plan: String(e?.plan || ""),
            at: String(e?.at || ""),
            organizationId: String(r.id),
            organizationName: String(r.name || "Unknown"),
          });
        }
      }
      events.sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0));
      const recentEvents = events.slice(0, limit);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last7 = events.filter(e => e.at && e.at >= sevenDaysAgo);
      const tActive = last7.filter(e => e.status.toLowerCase() === "active").length;
      const tCanceled = last7.filter(e => e.status.toLowerCase() === "canceled").length;
      const tTrialing = last7.filter(e => e.status.toLowerCase() === "trialing").length;
      const tIncomplete = last7.filter(e => e.status.toLowerCase() === "incomplete").length;
      const totals = {
        organizations: organizations.length,
        active: byStatusMap["active"] || 0,
        canceled: byStatusMap["canceled"] || 0,
        trialing: byStatusMap["trialing"] || 0,
        incomplete: byStatusMap["incomplete"] || 0,
      };
      const orgTotal = organizations.length;
      const orgStart = Math.max(0, (orgPage - 1) * orgLimit);
      const orgSlice = organizations.slice(orgStart, orgStart + orgLimit);
      return { totals, byPlan, byStatus, recentEvents, organizations: orgSlice, orgPage, orgLimit, orgTotal, trends: { last7d: { active: tActive, canceled: tCanceled, trialing: tTrialing, incomplete: tIncomplete } } };
    } catch (error) {
      console.error("Error getting billing summary:", error);
      throw new Error("Failed to get billing summary");
    }
  }

  /**
   * Create audit log
   */
  async createAuditLog(
    userId: string,
    organizationId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    severity: "info" | "warning" | "error" | "critical" = "info"
  ): Promise<void> {
    try {
      const s = getSupabase();
      const { data: u } = await s.from("users").select("email").eq("id", userId).maybeSingle();
      const { data: o } = await s.from("organizations").select("name").eq("id", organizationId).maybeSingle();

      const auditLog: AuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userEmail: u?.email || "Unknown",
        organizationId,
        organizationName: o?.name || "Unknown",
        action,
        resource,
        resourceId,
        changes,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        severity,
      };

      await s.from("audit_logs").insert(auditLog as any);
    } catch (error) {
      console.error("Error creating audit log:", error);
      // Don't throw error for audit log failures
    }
  }

  /**
   * Get support tickets
   */
  async getSupportTickets(
    page: number = 1,
    limit: number = 50,
    filter?: {
      status?: string;
      priority?: string;
      category?: string;
      assignedTo?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{
    tickets: SupportTicket[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const s = getSupabase();
      let ticketsQuery = s.from("support_tickets").select("*");

      // Apply filters
      if (filter?.status) ticketsQuery = ticketsQuery.eq("status", filter.status);
      if (filter?.priority) ticketsQuery = ticketsQuery.eq("priority", filter.priority);
      if (filter?.category) ticketsQuery = ticketsQuery.eq("category", filter.category);
      if (filter?.assignedTo) ticketsQuery = ticketsQuery.eq("assigned_to", filter.assignedTo);
      if (filter?.dateFrom) ticketsQuery = ticketsQuery.gte("created_at", filter.dateFrom);
      if (filter?.dateTo) ticketsQuery = ticketsQuery.lte("created_at", filter.dateTo);

      // Add ordering and pagination
      const { data: rows } = await ticketsQuery.order("created_at", { ascending: false }).limit(limit);
      const tickets: SupportTicket[] = await Promise.all(
        (rows || []).map(async (r: any) => {
          const { data: msgs } = await getSupabase().from("support_messages").select("*").eq("ticket_id", r.id).order("created_at", { ascending: true });
          return { id: r.id, ...r, messages: msgs || [] } as any;
        })
      );

      return {
        tickets,
        total: tickets.length,
        page,
        limit,
      };
    } catch (error) {
      console.error("Error getting support tickets:", error);
      throw new Error("Failed to get support tickets");
    }
  }

  /**
   * Create support ticket
   */
  async createSupportTicket(
    userId: string,
    organizationId: string,
    data: z.infer<typeof createSupportTicketSchema>
  ): Promise<SupportTicket> {
    try {
      const validatedData = createSupportTicketSchema.parse(data);

      const s = getSupabase();
      const { data: u } = await s.from("users").select("email").eq("id", userId).maybeSingle();
      const { data: o } = await s.from("organizations").select("name").eq("id", organizationId).maybeSingle();

      const ticket: SupportTicket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userEmail: u?.email || "Unknown",
        organizationId,
        organizationName: o?.name || "Unknown",
        subject: validatedData.subject,
        description: validatedData.description,
        status: "open",
        priority: validatedData.priority || "medium",
        category: validatedData.category || "other",
        assignedTo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
        messages: [],
      };

      await s.from("support_tickets").insert({
        id: ticket.id,
        user_id: ticket.userId,
        user_email: ticket.userEmail,
        organization_id: ticket.organizationId,
        organization_name: ticket.organizationName,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assigned_to: ticket.assignedTo,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt,
        resolved_at: ticket.resolvedAt,
      });

      return ticket;
    } catch (error) {
      console.error("Error creating support ticket:", error);
      throw new Error("Failed to create support ticket");
    }
  }

  /**
   * Update support ticket
   */
  async updateSupportTicket(
    ticketId: string,
    data: z.infer<typeof updateSupportTicketSchema>
  ): Promise<SupportTicket> {
    try {
      const validatedData = updateSupportTicketSchema.parse(data);

      const s = getSupabase();
      const { data: existing } = await s.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
      if (!existing) throw new Error("Support ticket not found");

      const updateData: any = {
        ...validatedData,
        updatedAt: new Date().toISOString(),
      };

      if (validatedData.status === "resolved" && !existing.resolved_at) {
        updateData.resolvedAt = new Date().toISOString();
      }
      await s.from("support_tickets").update({
        status: updateData.status,
        priority: updateData.priority,
        category: updateData.category,
        assigned_to: updateData.assignedTo,
        updated_at: updateData.updatedAt,
        resolved_at: updateData.resolvedAt || existing.resolved_at || null,
      }).eq("id", ticketId);
      const { data: updated } = await s.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
      return updated as any;
    } catch (error) {
      console.error("Error updating support ticket:", error);
      throw new Error("Failed to update support ticket");
    }
  }

  /**
   * Add support message
   */
  async addSupportMessage(
    ticketId: string,
    senderId: string,
    data: z.infer<typeof addSupportMessageSchema>
  ): Promise<void> {
    try {
      const validatedData = addSupportMessageSchema.parse(data);

      const s = getSupabase();
      const { data: u } = await s.from("users").select("email").eq("id", senderId).maybeSingle();

      const message: any = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId,
        senderId,
        senderEmail: u?.email || "Unknown",
        message: validatedData.message,
        isInternal: validatedData.isInternal || false,
        createdAt: new Date().toISOString(),
      };

      await s.from("support_messages").insert({
        id: message.id,
        ticket_id: message.ticketId,
        sender_id: message.senderId,
        sender_email: message.senderEmail,
        message: message.message,
        is_internal: message.isInternal,
        created_at: message.createdAt,
      });
      await s.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
    } catch (error) {
      console.error("Error adding support message:", error);
      throw new Error("Failed to add support message");
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const s = getSupabase();
      const { data } = await s.from("system_settings").select("*").eq("id", "default").maybeSingle();
      if (data) return {
        id: data.id,
        maintenanceMode: !!data.maintenance_mode,
        allowNewRegistrations: !!data.allow_new_registrations,
        requireEmailVerification: !!data.require_email_verification,
        maxOrganizationsPerUser: data.max_organizations_per_user,
        defaultSubscriptionPlan: data.default_subscription_plan,
        apiRateLimit: data.api_rate_limit,
        storageLimit: data.storage_limit,
        supportEmail: data.support_email,
        systemEmail: data.system_email,
        termsOfServiceUrl: data.terms_of_service_url,
        privacyPolicyUrl: data.privacy_policy_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as any;

      // Return default settings if not found
      const defaultSettings: SystemSettings = {
        id: "default",
        maintenanceMode: false,
        allowNewRegistrations: true,
        requireEmailVerification: true,
        maxOrganizationsPerUser: 5,
        defaultSubscriptionPlan: "free",
        apiRateLimit: 1000,
        storageLimit: 1024,
        supportEmail: "support@nexussuite.com",
        systemEmail: "system@nexussuite.com",
        termsOfServiceUrl: "https://nexussuite.com/terms",
        privacyPolicyUrl: "https://nexussuite.com/privacy",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return defaultSettings;
    } catch (error) {
      console.error("Error getting system settings:", error);
      throw new Error("Failed to get system settings");
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(
    data: z.infer<typeof updateSystemSettingsSchema>
  ): Promise<SystemSettings> {
    try {
      const validatedData = updateSystemSettingsSchema.parse(data);

      const s = getSupabase();
      const { data: existing } = await s.from("system_settings").select("*").eq("id", "default").maybeSingle();

      const omitUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v !== undefined) out[k] = v;
        }
        return out as Partial<T>;
      };

      let settings: SystemSettings;
      if (existing) {
        const patch = omitUndefined(validatedData);
        settings = {
          id: "default",
          maintenanceMode: existing.maintenance_mode,
          allowNewRegistrations: existing.allow_new_registrations,
          requireEmailVerification: existing.require_email_verification,
          maxOrganizationsPerUser: existing.max_organizations_per_user,
          defaultSubscriptionPlan: existing.default_subscription_plan,
          apiRateLimit: existing.api_rate_limit,
          storageLimit: existing.storage_limit,
          supportEmail: existing.support_email,
          systemEmail: existing.system_email,
          termsOfServiceUrl: existing.terms_of_service_url,
          privacyPolicyUrl: existing.privacy_policy_url,
          createdAt: existing.created_at,
          updatedAt: new Date().toISOString(),
          ...patch,
        } as any;
        await s.from("system_settings").update({
          maintenance_mode: settings.maintenanceMode,
          allow_new_registrations: settings.allowNewRegistrations,
          require_email_verification: settings.requireEmailVerification,
          max_organizations_per_user: settings.maxOrganizationsPerUser,
          default_subscription_plan: settings.defaultSubscriptionPlan,
          api_rate_limit: settings.apiRateLimit,
          storage_limit: settings.storageLimit,
          support_email: settings.supportEmail,
          system_email: settings.systemEmail,
          terms_of_service_url: settings.termsOfServiceUrl,
          privacy_policy_url: settings.privacyPolicyUrl,
          updated_at: settings.updatedAt,
        }).eq("id", "default");
      } else {
        const defaults: SystemSettings = {
          id: "default",
          maintenanceMode: false,
          allowNewRegistrations: true,
          requireEmailVerification: true,
          maxOrganizationsPerUser: 5,
          defaultSubscriptionPlan: "free",
          apiRateLimit: 1000,
          storageLimit: 1024,
          supportEmail: "support@nexussuite.com",
          systemEmail: "system@nexussuite.com",
          termsOfServiceUrl: "https://nexussuite.com/terms",
          privacyPolicyUrl: "https://nexussuite.com/privacy",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const patch = omitUndefined(validatedData);
        settings = { ...defaults, ...patch } as SystemSettings;
        await s.from("system_settings").insert({
          id: "default",
          maintenance_mode: settings.maintenanceMode,
          allow_new_registrations: settings.allowNewRegistrations,
          require_email_verification: settings.requireEmailVerification,
          max_organizations_per_user: settings.maxOrganizationsPerUser,
          default_subscription_plan: settings.defaultSubscriptionPlan,
          api_rate_limit: settings.apiRateLimit,
          storage_limit: settings.storageLimit,
          support_email: settings.supportEmail,
          system_email: settings.systemEmail,
          terms_of_service_url: settings.termsOfServiceUrl,
          privacy_policy_url: settings.privacyPolicyUrl,
          created_at: settings.createdAt,
          updated_at: settings.updatedAt,
        });
      }

      return settings;
    } catch (error) {
      console.error("Error updating system settings:", error);
      throw new Error("Failed to update system settings");
    }
  }

  /**
   * Admin update user
   */
  async adminUpdateUser(
    userId: string,
    data: z.infer<typeof adminUpdateUserSchema>
  ): Promise<void> {
    try {
      const validatedData = adminUpdateUserSchema.parse(data);

      const s = getSupabase();
      await s.from("users").update({
        role: validatedData.role,
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("Failed to update user");
    }
  }

  /**
   * Admin update organization
   */
  async adminUpdateOrganization(
    organizationId: string,
    data: z.infer<typeof adminUpdateOrganizationSchema>
  ): Promise<void> {
    try {
      const validatedData = adminUpdateOrganizationSchema.parse(data);

      const s = getSupabase();
      await s.from("organizations").update({
        name: validatedData.name,
        slug: validatedData.slug,
        subscription_plan: validatedData.subscriptionPlan,
        subscription_status: validatedData.subscriptionStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", organizationId);

      // If subscription plan changed, update limits
      if (validatedData.subscriptionPlan) {}
    } catch (error) {
      console.error("Error updating organization:", error);
      throw new Error("Failed to update organization");
    }
  }

  /**
   * Emergency: Freeze organization (set status to suspended)
   */
  async freezeOrganization(organizationId: string, reason?: string): Promise<void> {
    try {
      const s = getSupabase();
      await s.from("organizations").update({ status: "suspended", updated_at: new Date().toISOString(), metadata: { freezeReason: reason } as any }).eq("id", organizationId);
    } catch (error) {
      console.error("Error freezing organization:", error);
      throw new Error("Failed to freeze organization");
    }
  }

  /**
   * Emergency: Unfreeze organization (set status to active)
   */
  async unfreezeOrganization(organizationId: string): Promise<void> {
    try {
      const s = getSupabase();
      await s.from("organizations").update({ status: "active", updated_at: new Date().toISOString(), metadata: {} as any }).eq("id", organizationId);
    } catch (error) {
      console.error("Error unfreezing organization:", error);
      throw new Error("Failed to unfreeze organization");
    }
  }

  /**
   * Emergency: Unlock user (reactivate account)
   */
  async unlockUser(userId: string): Promise<void> {
    try {
      const s = getSupabase();
      await s.from("users").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", userId);
    } catch (error) {
      console.error("Error unlocking user:", error);
      throw new Error("Failed to unlock user");
    }
  }
}

export const adminService = new AdminService();