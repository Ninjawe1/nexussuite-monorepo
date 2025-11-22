/**
 * Organization Routes
 * Express routes for organization and member management
 */

import { Router } from "express";
import { z } from "zod";
import { organizationService } from "./service";
import { requireAuth } from "../auth/authRoutes";
import { createOrgSchema, updateOrgSchema, inviteMemberSchema, acceptInvitationSchema, ORG_PERMISSIONS, OrgPermission } from "./types";
import { storage } from "../useStorage";

const router = Router();

/**
 * Create organization
 * POST /api/org/create
 */
router.post("/create", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const data = req.body;
    
    const result = await organizationService.createOrganization(userId, data);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Create organization error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Organization creation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get current user's organization
 * GET /api/org/me
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    const organization = await organizationService.getUserOrganization(userId);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
        message: "User is not a member of any organization",
      });
    }
    
    return res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Get user organization error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Failed to get organization",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get organization by ID
 * GET /api/org/:orgId
 */
router.get("/:orgId", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    const organization = await organizationService.getOrganization(orgId);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }
    
    // Check if user has permission to view this organization
    const hasPermission = await organizationService.checkPermission(userId, orgId, ORG_PERMISSIONS.ORG_VIEW_SETTINGS as OrgPermission);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You don't have permission to view this organization",
      });
    }
    
    return res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Get organization error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Failed to get organization",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get organization settings
 * GET /api/org/:orgId/settings
 */
router.get("/:orgId/settings", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const canView = await organizationService.checkPermission(userId, orgId, ORG_PERMISSIONS.ORG_VIEW_SETTINGS as OrgPermission);
    if (!canView) {
      return res.status(403).json({ success: false, error: "Access denied", message: "You don't have permission to view settings" });
    }

    const organization = await organizationService.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    return res.json({ success: true, data: organization.settings });
  } catch (error) {
    console.error("Get organization settings error:", error);
    return res.status(500).json({ success: false, error: "Failed to get organization settings", message: error instanceof Error ? error.message : "Unknown error" });
  }
});

/**
 * Update organization settings
 * PUT /api/org/:orgId/settings
 */
router.put("/:orgId/settings", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const canUpdate = await organizationService.checkPermission(userId, orgId, ORG_PERMISSIONS.ORG_UPDATE_SETTINGS as OrgPermission);
    if (!canUpdate) {
      return res.status(403).json({ success: false, error: "Access denied", message: "You don't have permission to update settings" });
    }

    const data = { settings: req.body?.settings };
    const organization = await organizationService.updateOrganization(orgId, userId, data as any);

    // Audit log
    try {
      await storage.createAuditLog({
        tenantId: orgId,
        userId,
        action: "org_settings_update",
        resource: "organization",
        resourceId: orgId,
        changes: data,
        ipAddress: (req.ip || ""),
        userAgent: (req.get("User-Agent") || ""),
        createdAt: new Date(),
      });
    } catch {}

    return res.json({ success: true, data: organization?.settings || data.settings });
  } catch (error) {
    console.error("Update organization settings error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const status = msg.includes("Insufficient permissions") ? 403 : 500;
    return res.status(status).json({ success: false, error: status === 403 ? "Access denied" : "Organization settings update failed", message: msg });
  }
});

/**
 * Create audit log entry
 * POST /api/org/:orgId/audit
 */
router.post("/:orgId/audit", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const isMember = await organizationService.isUserMember(userId, orgId);
    if (!isMember) {
      return res.status(403).json({ success: false, error: "Access denied", message: "User is not a member of this organization" });
    }

    const { action, resource, resourceId, changes } = req.body || {};
    await storage.createAuditLog({
      tenantId: orgId,
      userId,
      action: String(action || "org_action"),
      resource: String(resource || "organization"),
      resourceId: String(resourceId || orgId),
      changes: changes || {},
      ipAddress: (req.ip || ""),
      userAgent: (req.get("User-Agent") || ""),
      createdAt: new Date(),
    });

    return res.json({ success: true, message: "Audit log created" });
  } catch (error) {
    console.error("Create audit log error:", error);
    return res.status(500).json({ success: false, error: "Failed to create audit log", message: error instanceof Error ? error.message : "Unknown error" });
  }
});

/**
 * Update organization
 * PUT /api/org/:orgId
 */
router.put("/:orgId", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const data = req.body;
    
    const organization = await organizationService.updateOrganization(orgId, userId, data);
    
    return res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Update organization error:", error);
    
    if (error instanceof Error && error.message.includes("Insufficient permissions")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Organization update failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get organization members
 * GET /api/org/:orgId/members
 */
router.get("/:orgId/members", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    const members = await organizationService.getOrganizationMembers(orgId, userId);
    
    return res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("Get organization members error:", error);
    
    if (error instanceof Error && error.message.includes("Insufficient permissions")) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to get organization members",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Invite member to organization
 * POST /api/org/:orgId/invite
 */
router.post("/:orgId/invite", requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const data = req.body;
    
    const result = await organizationService.inviteMember(orgId, userId, data);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Invite member error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("Insufficient permissions")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: error.message,
        });
      }
      
      if (error.message.includes("already a member") || error.message.includes("already been sent")) {
        return res.status(400).json({
          success: false,
          error: "Invalid invitation",
          message: error.message,
        });
      }
      
      if (error.message.includes("maximum member limit")) {
        return res.status(400).json({
          success: false,
          error: "Member limit reached",
          message: error.message,
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: "Invitation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Accept organization invitation
 * POST /api/org/invite/accept
 */
router.post("/invite/accept", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { token, otpCode } = req.body;
    
    const result = await organizationService.acceptInvitation(userId, token, otpCode);
    
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("Invalid or expired invitation")) {
        return res.status(400).json({
          success: false,
          error: "Invalid invitation",
          message: error.message,
        });
      }
      if (error.message.includes("Authenticated email does not match invitation")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: error.message,
        });
      }
      if (error.message.includes("Invalid OTP code") || error.message.includes("OTP does not match organization/invitation")) {
        return res.status(400).json({
          success: false,
          error: "OTP verification failed",
          message: error.message,
        });
      }
      
      if (error.message.includes("already been") || error.message.includes("already a member")) {
        return res.status(400).json({
          success: false,
          error: "Invalid invitation state",
          message: error.message,
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to accept invitation",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/invite/:token", async (req, res) => {
  try {
    const token = String(req.params.token);
    const { getPendingInvitationByToken } = require('../db/repos/orgInvitations');
    const inv = await getPendingInvitationByToken(token);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Invitation not found" });
    }
    const org = await organizationService.getOrganization(String(inv.organization_id));
    return res.json({
      success: true,
      data: {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        organizationId: inv.organization_id,
        organizationName: org?.name || "",
        organizationLogo: (org as any)?.logo || null,
        expiresAt: inv.expires_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to get invitation" });
  }
});

router.post("/invite/signup", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    const { getPendingInvitationByToken } = require('../db/repos/orgInvitations');
    const inv = await getPendingInvitationByToken(String(token));
    if (!inv) return res.status(404).json({ success: false, message: "Invitation not found or expired" });
    const email = String(inv.email);
    const { registerUser } = require('../auth/service');
    const result = await registerUser(email, String(password));
    if (!result?.success || !result?.user?.id) {
      return res.status(400).json({ success: false, message: "Registration failed" });
    }
    const uid = String(result.user.id);
    await organizationService.completeInvitationForUser(uid, String(token));
    // set cookies like /auth/login
    const cookieBase = {
      httpOnly: true,
      secure: (process.env.NODE_ENV || "development") === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    } as const;
    const tokenVal = String(result.session?.token || "");
    if (tokenVal) {
      res.cookie("better_auth_session", tokenVal, cookieBase);
      res.cookie("better-auth.session", tokenVal, cookieBase);
      res.cookie("authToken", tokenVal, cookieBase);
    }
    return res.json({ success: true, user: result.user, session: result.session });
  } catch (error: any) {
    const msg = String(error?.message || "Unexpected error");
    if (msg.includes("expired") || msg.toLowerCase().includes("invitation")) {
      return res.status(400).json({ success: false, error: "Invalid invitation", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to complete signup", message: msg });
  }
});

/**
 * Update member role
 * PUT /api/org/:orgId/members/:memberId/role
 */
router.put("/:orgId/members/:memberId/role", requireAuth, async (req, res) => {
  try {
    const { orgId, memberId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { role } = req.body;
    
    const member = await organizationService.updateMemberRole(orgId, memberId, userId, role);
    
    return res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Update member role error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("Insufficient permissions")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: error.message,
        });
      }
      
      if (error.message.includes("Member not found")) {
        return res.status(404).json({
          success: false,
          error: "Member not found",
          message: error.message,
        });
      }
      
      if (error.message.includes("owner") || error.message.includes("promote")) {
        return res.status(400).json({
          success: false,
          error: "Invalid role change",
          message: error.message,
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: "Role update failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Remove member from organization
 * DELETE /api/org/:orgId/members/:memberId
 */
router.delete("/:orgId/members/:memberId", requireAuth, async (req, res) => {
  try {
    const { orgId, memberId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    
    await organizationService.removeMember(orgId, memberId, userId);
    
    return res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("Insufficient permissions")) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: error.message,
        });
      }
      
      if (error.message.includes("Member not found")) {
        return res.status(404).json({
          success: false,
          error: "Member not found",
          message: error.message,
        });
      }
      
      if (error.message.includes("owner")) {
        return res.status(400).json({
          success: false,
          error: "Cannot remove owner",
          message: error.message,
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: "Member removal failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;