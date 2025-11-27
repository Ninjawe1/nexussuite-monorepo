import { Router } from "express";
import { requireAuth } from "../auth/authRoutes";
import { z } from "zod";
import { adminService } from "./service";
import { requireSuperAdmin, requireSuperAdminMfa } from "../middleware/rbac";
import { otpService } from "../otp/service";
import { OTP_TYPE } from "../otp/types";
import { 
  createSupportTicketSchema,
  updateSupportTicketSchema,
  addSupportMessageSchema,
  updateSystemSettingsSchema,
  adminUpdateUserSchema,
  adminUpdateOrganizationSchema
} from "./types";

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireSuperAdmin);

// --- Club Management ---
router.get("/clubs", async (req, res) => {
  try {
    const { storage } = await import("../useStorage");
    const clubs = await storage.getAllTenants();
    return res.json(clubs);
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch clubs" });
  }
});

router.post("/clubs", async (req, res) => {
  try {
    const { storage } = await import("../useStorage");
    const { name, clubTag, subscriptionPlan, subscriptionStatus } = req.body || {};
    if (!name || !clubTag) {
      return res.status(400).json({ success: false, error: "Name and club tag are required" });
    }
    const created = await storage.createTenant({
      name,
      clubTag,
      subscriptionPlan: subscriptionPlan || "starter",
      subscriptionStatus: subscriptionStatus || "active",
      createdAt: new Date(),
    });
    return res.json(created);
  } catch (error) {
    console.error("Error creating club:", error);
    return res.status(500).json({ success: false, error: "Failed to create club" });
  }
});

// --- User Management ---
router.get("/users", async (req, res) => {
  try {
    const { storage } = await import("../useStorage");
    const users = await storage.getAllUsers();
    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// --- Superadmin MFA endpoints (exempt from MFA gate so users can enroll/verify) ---
router.post("/mfa/generate", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { deliveryMethod, target, metadata } = req.body || {};
    const result = await otpService.generateOtp({
      userId,
      type: OTP_TYPE.TWO_FACTOR_AUTH,
      deliveryMethod,
      target,
      metadata,
    } as any);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Admin MFA generate error:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to generate MFA" });
  }
});

router.post("/mfa/verify", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { code } = req.body || {};
    const result = await otpService.verifyOtp({ userId, code, type: OTP_TYPE.TWO_FACTOR_AUTH } as any);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Admin MFA verify error:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to verify MFA" });
  }
});

// Apply MFA requirement for all subsequent admin actions
router.use(requireSuperAdminMfa(30));

/**
 * Emergency: Freeze organization
 * POST /api/admin/organizations/:organizationId/freeze
 */
router.post("/organizations/:organizationId/freeze", async (req, res) => {
  try {
    const { organizationId } = req.params;
    const reason = (req.body?.reason as string) || undefined;
    await adminService.freezeOrganization(organizationId, reason);

    const user = (req as any).user;
    await adminService.createAuditLog(
      user.id,
      organizationId,
      "admin_organization_freeze",
      "organization",
      organizationId,
      { reason },
      req.ip || "",
      req.get("User-Agent") || "",
      "critical"
    );

    return res.json({ success: true, message: "Organization frozen" });
  } catch (error) {
    console.error("Error freezing organization:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to freeze organization" });
  }
});

/**
 * Emergency: Unfreeze organization
 * POST /api/admin/organizations/:organizationId/unfreeze
 */
router.post("/organizations/:organizationId/unfreeze", async (req, res) => {
  try {
    const { organizationId } = req.params;
    await adminService.unfreezeOrganization(organizationId);

    const user = (req as any).user;
    await adminService.createAuditLog(
      user.id,
      organizationId,
      "admin_organization_unfreeze",
      "organization",
      organizationId,
      {},
      req.ip || "",
      req.get("User-Agent") || "",
      "warning"
    );

    return res.json({ success: true, message: "Organization unfrozen" });
  } catch (error) {
    console.error("Error unfreezing organization:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to unfreeze organization" });
  }
});

/**
 * Emergency: Unlock user
 * POST /api/admin/users/:userId/unlock
 */
router.post("/users/:userId/unlock", async (req, res) => {
  try {
    const { userId } = req.params;
    await adminService.unlockUser(userId);

    const admin = (req as any).user;
    const orgId = admin.organizationId || "system";
    await adminService.createAuditLog(
      admin.id,
      orgId,
      "admin_user_unlock",
      "user",
      userId,
      {},
      req.ip || "",
      req.get("User-Agent") || "",
      "warning"
    );

    return res.json({ success: true, message: "User unlocked" });
  } catch (error) {
    console.error("Error unlocking user:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to unlock user" });
  }
});

/**
 * Get system metrics
 * GET /api/admin/metrics
 */
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await adminService.getSystemMetrics();
    return res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("Error getting system metrics:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get system metrics" 
    });
  }
});

/**
 * Get user analytics
 * GET /api/admin/users/analytics
 */
router.get("/users/analytics", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    
    const filter: {
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
    } = {};
    if (req.query.subscriptionPlan) filter.subscriptionPlan = String(req.query.subscriptionPlan);
    if (req.query.subscriptionStatus) filter.subscriptionStatus = String(req.query.subscriptionStatus);
    if (typeof req.query.isActive !== "undefined") filter.isActive = String(req.query.isActive) === "true";
    if (req.query.dateFrom) filter.dateFrom = String(req.query.dateFrom);
    if (req.query.dateTo) filter.dateTo = String(req.query.dateTo);

    const analytics = await adminService.getUserAnalytics(page, limit, search, filter);
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error getting user analytics:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get user analytics" 
    });
  }
});

/**
 * Admin update user
 * PUT /api/admin/users/:userId
 */
router.put("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const validatedData = adminUpdateUserSchema.parse(req.body);

    await adminService.adminUpdateUser(userId, validatedData);

    // Create audit log
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    await adminService.createAuditLog(
      user.id,
      user.organizationId!,
      "admin_user_update",
      "user",
      userId,
      validatedData,
      req.ip || "",
      req.get("User-Agent") || ""
    );

    return res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update user" 
    });
  }
});

/**
 * Get organization analytics
 * GET /api/admin/organizations/analytics
 */
router.get("/organizations/analytics", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    
    const filter: {
      subscriptionPlan?: string;
      subscriptionStatus?: string;
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
    } = {};
    if (req.query.subscriptionPlan) filter.subscriptionPlan = String(req.query.subscriptionPlan);
    if (req.query.subscriptionStatus) filter.subscriptionStatus = String(req.query.subscriptionStatus);
    if (typeof req.query.isActive !== "undefined") filter.isActive = String(req.query.isActive) === "true";
    if (req.query.dateFrom) filter.dateFrom = String(req.query.dateFrom);
    if (req.query.dateTo) filter.dateTo = String(req.query.dateTo);

    const analytics = await adminService.getOrganizationAnalytics(page, limit, search, filter);
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error getting organization analytics:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get organization analytics" 
    });
  }
});

/**
 * Admin update organization
 * PUT /api/admin/organizations/:organizationId
 */
router.put("/organizations/:organizationId", async (req, res) => {
  try {
    const { organizationId } = req.params;
    const validatedData = adminUpdateOrganizationSchema.parse(req.body);

    await adminService.adminUpdateOrganization(organizationId, validatedData);

    // Create audit log
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    await adminService.createAuditLog(
      user.id,
      user.organizationId!,
      "admin_organization_update",
      "organization",
      organizationId,
      validatedData,
      req.ip || "",
      req.get("User-Agent") || ""
    );

    return res.json({ success: true, message: "Organization updated successfully" });
  } catch (error) {
    console.error("Error updating organization:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update organization" 
    });
  }
});

/**
 * Get audit logs
 * GET /api/admin/audit-logs
 */
router.get("/audit-logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const filter = {
      userId: req.query.userId as string,
      organizationId: req.query.organizationId as string,
      action: req.query.action as string,
      severity: req.query.severity as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };

    const logs = await adminService.getAuditLogs(page, limit, filter);
    return res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error getting audit logs:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get audit logs" 
    });
  }
});

router.get("/billing/events", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const filter = {
      organizationId: req.query.organizationId as string,
      status: req.query.status as string,
      plan: req.query.plan as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      type: req.query.type as string,
    };
    const out = await adminService.getSubscriptionEvents(page, limit, filter);
    return res.json({ success: true, data: out });
  } catch (error) {
    console.error("Error getting billing events:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to get billing events" });
  }
});

router.get("/billing/summary", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;
    const orgPage = parseInt(req.query.orgPage as string) || 1;
    const orgLimit = parseInt(req.query.orgLimit as string) || 50;
    const orgSortBy = (req.query.orgSortBy as string) || undefined;
    const orgSortOrder = ((req.query.orgSortOrder as string) || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const out = await adminService.getBillingSummary(limit, orgPage, orgLimit, orgSortBy, orgSortOrder as any);
    return res.json({ success: true, data: out });
  } catch (error) {
    console.error("Error getting billing summary:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to get billing summary" });
  }
});

/**
 * Get support tickets
 * GET /api/admin/support-tickets
 */
router.get("/support-tickets", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const filter = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      category: req.query.category as string,
      assignedTo: req.query.assignedTo as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };

    const tickets = await adminService.getSupportTickets(page, limit, filter);
    return res.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error getting support tickets:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get support tickets" 
    });
  }
});

/**
 * Update support ticket
 * PUT /api/admin/support-tickets/:ticketId
 */
router.put("/support-tickets/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const validatedData = updateSupportTicketSchema.parse(req.body);

    const ticket = await adminService.updateSupportTicket(ticketId, validatedData);

    // Create audit log
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    await adminService.createAuditLog(
      user.id,
      user.organizationId!,
      "admin_support_ticket_update",
      "support_ticket",
      ticketId,
      validatedData,
      req.ip || "",
      req.get("User-Agent") || ""
    );

    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update support ticket" 
    });
  }
});

/**
 * Add support message
 * POST /api/admin/support-tickets/:ticketId/messages
 */
router.post("/support-tickets/:ticketId/messages", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const validatedData = addSupportMessageSchema.parse(req.body);

    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    await adminService.addSupportMessage(ticketId, user.id, validatedData);

    // Create audit log
    await adminService.createAuditLog(
      user.id,
      user.organizationId!,
      "admin_support_message_added",
      "support_message",
      ticketId,
      validatedData,
      req.ip || "",
      req.get("User-Agent") || ""
    );

    return res.json({ success: true, message: "Message added successfully" });
  } catch (error) {
    console.error("Error adding support message:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to add support message" 
    });
  }
});

/**
 * Get system settings
 * GET /api/admin/system-settings
 */
router.get("/system-settings", async (req, res) => {
  try {
    const settings = await adminService.getSystemSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error getting system settings:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get system settings" 
    });
  }
});

/**
 * Update system settings
 * PUT /api/admin/system-settings
 */
router.put("/system-settings", async (req, res) => {
  try {
    const validatedData = updateSystemSettingsSchema.parse(req.body);

    const settings = await adminService.updateSystemSettings(validatedData);

    // Create audit log
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    await adminService.createAuditLog(
      user.id,
      user.organizationId!,
      "admin_system_settings_update",
      "system_settings",
      "default",
      validatedData,
      req.ip || "",
      req.get("User-Agent") || ""
    );

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update system settings" 
    });
  }
});

export default router;