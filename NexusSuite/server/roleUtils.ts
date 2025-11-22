import { getMemberRole, hasPermission, isOwnerOrAdmin, ROLE_PERMISSIONS, OrgRole } from "./orgRoles";

/**
 * Utility class for role and permission management
 */
export class RoleManager {
  /**
   * Check if a user can perform an action on another user
   * @param actorOrgId - Organization ID of the actor
   * @param actorUserId - User ID of the actor performing the action
   * @param targetUserId - User ID of the target user
   * @param action - The action being performed
   * @param allowSelf - Whether the actor can perform the action on themselves
   */
  static async canActOnUser(
    actorOrgId: string,
    actorUserId: string,
    targetUserId: string,
    action: string,
    allowSelf: boolean = false
  ): Promise<{ allowed: boolean; reason?: string; actorRole?: string }> {
    try {
      // Allow self-actions if specified
      if (allowSelf && actorUserId === targetUserId) {
        const actorRole = await getMemberRole(actorOrgId, actorUserId);
        return { allowed: true, reason: "self-action", actorRole: actorRole || undefined };
      }

      // Check if actor has permission for the action
      const [hasActionPermission, actorRole] = await Promise.all([
        hasPermission(actorOrgId, actorUserId, action),
        getMemberRole(actorOrgId, actorUserId)
      ]);

      if (!hasActionPermission) {
        return { 
          allowed: false, 
          reason: `insufficient-permission-for-${action}`, 
          actorRole: actorRole || undefined 
        };
      }

      return { allowed: true, actorRole: actorRole || undefined };
    } catch (err) {
      console.error("Error in canActOnUser:", err);
      return { allowed: false, reason: "error-checking-permissions" };
    }
  }

  /**
   * Check if a role change is valid (e.g., owners can't demote themselves)
   * @param actorOrgId - Organization ID
   * @param actorUserId - User ID of the actor making the change
   * @param targetUserId - User ID of the target user
   * @param newRole - The new role being assigned
   */
  static async canChangeRole(
    actorOrgId: string,
    actorUserId: string,
    targetUserId: string,
    newRole: OrgRole
  ): Promise<{ allowed: boolean; reason?: string; currentRole?: string }> {
    try {
      const [actorRole, targetRole, actorIsOwnerAdmin] = await Promise.all([
        getMemberRole(actorOrgId, actorUserId),
        getMemberRole(targetUserId === actorUserId ? actorOrgId : actorOrgId, targetUserId),
        isOwnerOrAdmin(actorOrgId, actorUserId)
      ]);

      // Only owners/admins can change roles
      if (!actorIsOwnerAdmin) {
        return { 
          allowed: false, 
          reason: "insufficient-role", 
          currentRole: actorRole || undefined 
        };
      }

      // Prevent owners from demoting themselves
      if (actorUserId === targetUserId && actorRole === "owner" && newRole !== "owner") {
        return { 
          allowed: false, 
          reason: "owner-self-demotion-forbidden", 
          currentRole: actorRole 
        };
      }

      // Admins cannot promote users to owner or demote owners
      if (actorRole === "admin") {
        if (newRole === "owner") {
          return { 
            allowed: false, 
            reason: "admin-cannot-create-owner", 
            currentRole: actorRole 
          };
        }
        if (targetRole === "owner") {
          return { 
            allowed: false, 
            reason: "admin-cannot-modify-owner", 
            currentRole: actorRole 
          };
        }
      }

      return { allowed: true, currentRole: targetRole || undefined };
    } catch (err) {
      console.error("Error in canChangeRole:", err);
      return { allowed: false, reason: "error-checking-role-change" };
    }
  }

  /**
   * Get all permissions for a role
   * @param role - The role to get permissions for
   */
  static getPermissionsForRole(role: OrgRole): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if a role has a specific permission
   * @param role - The role to check
   * @param permission - The permission to check for
   */
  static roleHasPermission(role: OrgRole, permission: string): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Get the hierarchy level of a role (higher number = more permissions)
   * @param role - The role to get hierarchy level for
   */
  static getRoleHierarchy(role: OrgRole): number {
    const hierarchy: Record<OrgRole, number> = {
      owner: 100,
      admin: 90,
      finance: 70,
      marcom: 60,
    };
    return hierarchy[role] || 0;
  }

  /**
   * Check if one role is higher than another in hierarchy
   * @param role1 - First role
   * @param role2 - Second role
   */
  static isRoleHigher(role1: OrgRole, role2: OrgRole): boolean {
    return this.getRoleHierarchy(role1) > this.getRoleHierarchy(role2);
  }

  /**
   * Get user's complete role information
   * @param orgId - Organization ID
   * @param userId - User ID
   */
  static async getUserRoleInfo(orgId: string, userId: string) {
    try {
      const role = await getMemberRole(orgId, userId);
      if (!role) {
        return null;
      }

      return {
        role,
        permissions: this.getPermissionsForRole(role),
        hierarchy: this.getRoleHierarchy(role),
        isOwnerOrAdmin: role === "owner" || role === "admin"
      };
    } catch (err) {
      console.error("Error getting user role info:", err);
      return null;
    }
  }

  /**
   * Validate if a role transition is allowed based on business rules
   * @param fromRole - Current role
   * @param toRole - Target role
   * @param actorRole - Role of the person making the change
   */
  static validateRoleTransition(
    fromRole: OrgRole | null, 
    toRole: OrgRole, 
    actorRole: OrgRole
  ): { valid: boolean; reason?: string } {
    // New members can be assigned any role by owners/admins
    if (!fromRole) {
      if (actorRole === "owner" || actorRole === "admin") {
        // Admins cannot create owners
        if (actorRole === "admin" && toRole === "owner") {
          return { valid: false, reason: "admin-cannot-create-owner" };
        }
        return { valid: true };
      }
      return { valid: false, reason: "insufficient-permissions" };
    }

    // Only owners can modify owner roles
    if (fromRole === "owner" && actorRole !== "owner") {
      return { valid: false, reason: "only-owner-can-modify-owner" };
    }

    // Only owners can create new owners
    if (toRole === "owner" && actorRole !== "owner") {
      return { valid: false, reason: "only-owner-can-create-owner" };
    }

    return { valid: true };
  }
}

/**
 * Permission constants for common actions
 */
export const PERMISSIONS = {
  // User management
  MANAGE_USERS: "manage:users",
  VIEW_USERS: "view:users",
  INVITE_USERS: "manage:invites",
  
  // Role management
  MANAGE_ROLES: "manage:roles",
  VIEW_ROLES: "view:roles",
  
  // Financial
  MANAGE_BILLING: "manage:finance",
  VIEW_BILLING: "view:billing",
  MANAGE_BUDGET: "manage:budget",
  
  // Marketing
  MANAGE_CAMPAIGNS: "manage:campaigns",
  VIEW_ANALYTICS: "view:analytics",
  
  // General
  MANAGE_SETTINGS: "manage:settings",
  VIEW_SETTINGS: "view:settings"
} as const;

/**
 * Helper functions for common permission checks
 */
export const PermissionHelpers = {
  /**
   * Check if user can manage other users
   */
  async canManageUsers(orgId: string, userId: string): Promise<boolean> {
    return hasPermission(orgId, userId, PERMISSIONS.MANAGE_USERS);
  },

  /**
   * Check if user can manage billing
   */
  async canManageBilling(orgId: string, userId: string): Promise<boolean> {
    return hasPermission(orgId, userId, PERMISSIONS.MANAGE_BILLING);
  },

  /**
   * Check if user can manage campaigns
   */
  async canManageCampaigns(orgId: string, userId: string): Promise<boolean> {
    return hasPermission(orgId, userId, PERMISSIONS.MANAGE_CAMPAIGNS);
  },

  /**
   * Check if user can view analytics
   */
  async canViewAnalytics(orgId: string, userId: string): Promise<boolean> {
    return hasPermission(orgId, userId, PERMISSIONS.VIEW_ANALYTICS);
  }
};

