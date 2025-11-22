import { Request, Response, NextFunction } from "express";
import { hasPermission, isOwnerOrAdmin, getMemberRole } from "./orgRoles";

// Extended request interface to include role information
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    orgId: string;
    role: string;
    isOwnerOrAdmin: boolean;
  };
}

/**
 * Middleware to require specific permission for route access
 * @param permission - The permission required to access the route
 * @param options - Additional options for permission checking
 */
export function requirePermission(
  permission: string, 
  options: { 
    allowSelf?: boolean; // Allow if user is accessing their own data
    selfParam?: string; // Parameter name for self-identification (default: 'userId')
  } = {}
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // TODO: Implement internal authentication system
      // For now, return a placeholder response
      return res.status(501).json({ 
        message: "Permission system needs to be implemented",
        suggestion: "This middleware will be replaced with internal authentication system"
      });
    } catch (err: any) {
      console.error(`Permission check failed for ${permission}:`, err);
      return res.status(500).json({ 
        message: "Permission check failed", 
        error: String(err?.message || err) 
      });
    }
  };
}

/**
 * Middleware to require owner or admin role
 */
export function requireOwnerOrAdmin(options: { allowSelf?: boolean; selfParam?: string } = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // TODO: Implement internal authentication system
      // For now, return a placeholder response
      return res.status(501).json({ 
        message: "Owner/Admin authorization system needs to be implemented",
        suggestion: "This middleware will be replaced with internal authentication system"
      });
    } catch (err: any) {
      console.error("Owner/Admin check failed:", err);
      return res.status(500).json({ 
        message: "Authorization check failed", 
        error: String(err?.message || err) 
      });
    }
  };
}

/**
 * Middleware to require specific role(s)
 * @param roles - Single role or array of roles that are allowed
 */
export function requireRole(role: string, options: { allowSelf?: boolean; selfParam?: string } = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // TODO: Implement internal authentication system
      // For now, return a placeholder response
      return res.status(501).json({ 
        message: `Role-based authorization system needs to be implemented`,
        requiredRole: role,
        suggestion: "This middleware will be replaced with internal authentication system"
      });
    } catch (err: any) {
      console.error(`Role check failed for ${role}:`, err);
      return res.status(500).json({ 
        message: "Role authorization check failed", 
        error: String(err?.message || err) 
      });
    }
  };
}

/**
 * Middleware to attach user role information to request without enforcing permissions
 * Useful for routes that need role info but don't restrict access
 */
export function attachUserRole() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // TODO: Implement internal authentication system
      // For now, just continue without role info
      next();
    } catch (err: any) {
      console.error("Failed to attach user role:", err);
      // Don't fail the request, just continue without role info
      next();
    }
  };
}

