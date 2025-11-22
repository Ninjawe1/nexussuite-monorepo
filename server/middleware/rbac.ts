/**
 * RBAC Middleware
 * Role-based access control middleware for protecting routes
 */

import { Request, Response, NextFunction } from "express";
import { organizationService } from "../org/service";
import { OrgRole, OrgPermission } from "../org/types";
import { getSupabase } from "../db/useSupabase";

/**
 * Middleware to require specific role
 */
export function requireRole(requiredRole: OrgRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }
      
      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: "Organization ID required",
          message: "Organization ID is required for this operation",
        });
      }
      
      // Check if user has the required role in the organization
      const hasRole = await organizationService.checkUserRole(userId, orgId, requiredRole);
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          message: `This operation requires ${requiredRole} role`,
        });
      }
      
      return next();
    } catch (error) {
      console.error("Role check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(requiredPermission: OrgPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }
      
      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: "Organization ID required",
          message: "Organization ID is required for this operation",
        });
      }
      
      // Check if user has the required permission in the organization
      const hasPermission = await organizationService.checkPermission(userId, orgId, requiredPermission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          message: `This operation requires ${requiredPermission} permission`,
        });
      }
      
      return next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: OrgPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }
      
      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: "Organization ID required",
          message: "Organization ID is required for this operation",
        });
      }
      
      // Check if user has any of the required permissions
      const userPermissions = await organizationService.getUserPermissions(userId, orgId);
      
      const hasAnyPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          message: `This operation requires one of: ${permissions.join(", ")}`,
        });
      }
      
      return next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: OrgPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }
      
      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: "Organization ID required",
          message: "Organization ID is required for this operation",
        });
      }
      
      // Check if user has all of the required permissions
      const userPermissions = await organizationService.getUserPermissions(userId, orgId);
      
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          message: `This operation requires all of: ${permissions.join(", ")}`,
        });
      }
      
      return next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to check if user is organization owner
 */
export function requireOwner() {
  return requireRole("owner");
}

/**
 * Middleware to check if user is organization admin or owner
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }
      
      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: "Organization ID required",
          message: "Organization ID is required for this operation",
        });
      }
      
      // Check if user has admin or owner role
      const hasAdminRole = await organizationService.checkUserRole(userId, orgId, "admin") ||
                          await organizationService.checkUserRole(userId, orgId, "owner");
      
      if (!hasAdminRole) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          message: "This operation requires admin or owner role",
        });
      }
      
      return next();
    } catch (error) {
      console.error("Admin check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to require superadmin role (system-wide)
 */
export function requireSuperAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }

      const s = getSupabase();
      let isSuper = false;
      if (s) {
        const { data } = await s.from("users").select("role").eq("id", userId).maybeSingle();
        isSuper = (data?.role === "super_admin");
      } else {
        const u = (req as any).user || {};
        isSuper = u.role === "super_admin" || u.isSuperAdmin === true;
      }

      if (!isSuper) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
          message: "Superadmin access required",
        });
      }

      return next();
    } catch (error) {
      console.error("Superadmin check error:", error);
      return res.status(500).json({
        success: false,
        error: "Permission check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to require recent MFA (2FA) verification for superadmin actions
 * Checks latest verified OTP of type two_factor_auth
 */
export function requireSuperAdminMfa(maxAgeMinutes: number = 30) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }

      const s = getSupabase();
      const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
      let ok = false;

      if (s) {
        const { data } = await s
          .from("otps")
          .select("verified_at, status, type")
          .eq("user_id", userId)
          .eq("type", "two_factor_auth")
          .eq("status", "verified")
          .order("verified_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.verified_at) {
          const verifiedAt = new Date(data.verified_at);
          ok = verifiedAt >= cutoff;
        }
      } else {
        const admin = require("firebase-admin");
        const db = admin.firestore();
        const snap = await db
          .collection("otps")
          .where("userId", "==", userId)
          .where("type", "==", "two_factor_auth")
          .where("status", "==", "verified")
          .orderBy("verifiedAt", "desc")
          .limit(1)
          .get();
        const doc = snap.docs[0];
        if (doc) {
          const data = doc.data();
          const verifiedAt = (data.verifiedAt?.toDate?.() || new Date(data.verifiedAt)) as Date;
          ok = verifiedAt >= cutoff;
        }
      }

      if (!ok) {
        return res.status(403).json({
          success: false,
          error: "MFA required",
          message: "Superadmin multi-factor verification required",
        });
      }

      return next();
    } catch (error) {
      console.error("Superadmin MFA check error:", error);
      return res.status(500).json({
        success: false,
        error: "MFA check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Middleware to check if user is member of organization
 */
export function requireMembership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          message: "User must be authenticated to access this resource",
        });
      }
      
      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: "Organization ID required",
          message: "Organization ID is required for this operation",
        });
      }
      
      // Check if user is a member of the organization
      const isMember = await organizationService.isUserMember(userId, orgId);
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
          message: "User is not a member of this organization",
        });
      }
      
      return next();
    } catch (error) {
      console.error("Membership check error:", error);
      return res.status(500).json({
        success: false,
        error: "Membership check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

/**
 * Utility function to get user's organization context
 */
export async function getUserOrgContext(userId: string) {
  try {
    const userOrg = await organizationService.getUserOrganization(userId);
    
    if (!userOrg) {
      return null;
    }
    
    return {
      organization: userOrg.organization,
      member: userOrg.member,
    };
  } catch (error) {
    console.error("Error getting user org context:", error);
    return null;
  }
}