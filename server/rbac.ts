import type { RequestHandler } from "express";
import { storage } from "./useStorage";

export type Role =
  | "owner"
  | "admin"
  | "manager"
  | "staff"
  | "player"
  | "marcom"
  | "analyst"
  | "finance";

export type Permission =
  | "manage:staff"
  | "manage:payroll"
  | "manage:tournaments"
  | "manage:matches"
  | "manage:campaigns"
  | "manage:contracts"
  | "manage:invites"
  | "manage:finance"
  | "manage:social"
  | "manage:users"
  | "manage:files";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "manage:staff",
    "manage:payroll",
    "manage:tournaments",
    "manage:matches",
    "manage:campaigns",
    "manage:contracts",
    "manage:invites",
    "manage:finance",
    "manage:social",
    "manage:users",
    "manage:files",
  ],
  admin: [
    "manage:staff",
    "manage:payroll",
    "manage:tournaments",
    "manage:matches",
    "manage:campaigns",
    "manage:contracts",
    "manage:invites",
    "manage:finance",
    "manage:social",
    "manage:users",
    "manage:files",
  ],
  manager: [
    "manage:staff",
    "manage:tournaments",
    "manage:matches",
    "manage:campaigns",
    "manage:contracts",
    "manage:invites",
    "manage:files",
  ],
  finance: ["manage:finance", "manage:payroll"],
  marcom: ["manage:campaigns", "manage:social"],
  analyst: [],
  staff: [],
  player: [],
};

async function isSuperAdmin(req: any): Promise<boolean> {
  const userId = req.user?.claims?.sub;
  if (!userId) return false;
  const user = await storage.getUser(userId);
  return user?.isSuperAdmin || false;
}

async function getUserRole(req: any): Promise<Role | undefined> {
  const userId = req.user?.claims?.sub;
  if (!userId) return undefined;
  const user = await storage.getUser(userId);
  return user?.role as Role | undefined;
}

export function requireRoles(roles: Role[]): RequestHandler {
  return async (req: any, res, next) => {
    try {
      if (await isSuperAdmin(req)) return next();
      const role = await getUserRole(req);
      if (!role) return res.status(401).json({ message: "Unauthorized" });
      if (!roles.includes(role)) {
        return res.status(403).json({
          message: "Forbidden",
          reason: "Insufficient role",
          requiredRoles: roles,
          role,
        });
      }
      next();
    } catch (error) {
      console.error("RBAC role check error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

export function requirePermission(permission: Permission): RequestHandler {
  return async (req: any, res, next) => {
    try {
      if (await isSuperAdmin(req)) return next();
      const role = await getUserRole(req);
      if (!role) return res.status(401).json({ message: "Unauthorized" });
      const granted = ROLE_PERMISSIONS[role] || [];
      if (!granted.includes(permission)) {
        return res.status(403).json({
          message: "Forbidden",
          reason: "Missing permission",
          requiredPermission: permission,
          role,
          granted,
        });
      }
      next();
    } catch (error) {
      console.error("RBAC permission check error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
}

// Export a middleware that requires super admin
export function requireSuperAdmin(): RequestHandler {
  return async (req: any, res, next) => {
    try {
      if (await isSuperAdmin(req)) return next();
      return res.status(403).json({
        message: "Forbidden",
        reason: "Super admin access required",
      });
    } catch (error) {
      console.error("RBAC super admin check error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
}