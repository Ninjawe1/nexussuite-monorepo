/**
 * Organization Types
 * Type definitions for organization and member management
 */

import { z } from "zod";

// Organization Roles (hierarchical)
export const ORG_ROLES = {
  OWNER: "owner",        // Full access, can delete org
  ADMIN: "admin",        // Full access except delete org
  MANAGER: "manager",    // Can manage members and content
  MEMBER: "member",      // Standard member access
  VIEWER: "viewer",      // Read-only access
  FINANCE: "finance",    // Billing-focused role
  MARCOM: "marcom",      // Marketing/communications role
} as const;

export type OrgRole = typeof ORG_ROLES[keyof typeof ORG_ROLES];

// Organization Status
export const ORG_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  TRIAL: "trial",
  CANCELLED: "cancelled",
} as const;

export type OrgStatus = typeof ORG_STATUS[keyof typeof ORG_STATUS];

// Invitation Status
export const INVITATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

export type InvitationStatus = typeof INVITATION_STATUS[keyof typeof INVITATION_STATUS];

// Organization Interface
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logo?: string;
  status: OrgStatus;
  subscriptionPlan: string;
  subscriptionStatus: string;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    defaultRole: OrgRole;
    customDomain?: string;
    branding?: {
      primaryColor?: string;
      logo?: string;
    };
  };
  usage: {
    members: number;
    storage: number;
    apiCalls: number;
    lastResetAt: Date;
  };
  billing: {
    customerId?: string;
    subscriptionId?: string;
    priceId?: string;
    lastPaymentAt?: Date;
    nextPaymentAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Member Interface
export interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  joinedAt: Date;
  invitedBy?: string;
  lastActiveAt?: Date;
  permissions: OrgPermission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Invitation Interface
export interface OrgInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  status: InvitationStatus;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  message?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Validation Schemas
export const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  slug: z.string().min(1, "Organization slug is required").max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
  description: z.string().max(500).optional(),
  website: z.string().url("Invalid website URL").optional(),
  logo: z.string().url("Invalid logo URL").optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  settings: z.object({
    allowMemberInvites: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    defaultRole: z.nativeEnum(ORG_ROLES).optional(),
    customDomain: z.string().optional(),
    branding: z.object({
      primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      logo: z.string().url().optional(),
    }).optional(),
  }).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.nativeEnum(ORG_ROLES),
  name: z.string().min(1).max(100).optional(),
  message: z.string().max(500).optional(),
  sendEmail: z.boolean().default(true),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ORG_ROLES),
});

// Response Types
export interface CreateOrgResponse {
  success: boolean;
  organization: Organization;
  member: OrgMember;
}

export interface InviteMemberResponse {
  success: boolean;
  invitation: OrgInvitation;
  message: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  organization: Organization;
  member: OrgMember;
  message: string;
}

// Permission Definitions
export const ORG_PERMISSIONS = {
  // Organization management
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_VIEW_SETTINGS: "org:view_settings",
  ORG_UPDATE_SETTINGS: "org:update_settings",
  
  // Member management
  MEMBER_INVITE: "member:invite",
  MEMBER_REMOVE: "member:remove",
  MEMBER_UPDATE_ROLE: "member:update_role",
  MEMBER_VIEW: "member:view",
  
  // Content management
  CONTENT_CREATE: "content:create",
  CONTENT_UPDATE: "content:update",
  CONTENT_DELETE: "content:delete",
  CONTENT_VIEW: "content:view",
  
  // Billing
  BILLING_VIEW: "billing:view",
  BILLING_UPDATE: "billing:update",
  BILLING_CANCEL: "billing:cancel",
  
  // Admin functions
  ADMIN_VIEW_ANALYTICS: "admin:view_analytics",
  ADMIN_MANAGE_ORGS: "admin:manage_orgs",
  ADMIN_MANAGE_USERS: "admin:manage_users",
} as const;

export type OrgPermission = typeof ORG_PERMISSIONS[keyof typeof ORG_PERMISSIONS];

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  [ORG_ROLES.OWNER]: [
    // All permissions
    ...Object.values(ORG_PERMISSIONS),
  ],
  [ORG_ROLES.ADMIN]: [
    ORG_PERMISSIONS.ORG_UPDATE,
    ORG_PERMISSIONS.ORG_VIEW_SETTINGS,
    ORG_PERMISSIONS.ORG_UPDATE_SETTINGS,
    ORG_PERMISSIONS.MEMBER_INVITE,
    ORG_PERMISSIONS.MEMBER_REMOVE,
    ORG_PERMISSIONS.MEMBER_UPDATE_ROLE,
    ORG_PERMISSIONS.MEMBER_VIEW,
    ORG_PERMISSIONS.CONTENT_CREATE,
    ORG_PERMISSIONS.CONTENT_UPDATE,
    ORG_PERMISSIONS.CONTENT_DELETE,
    ORG_PERMISSIONS.CONTENT_VIEW,
    ORG_PERMISSIONS.BILLING_VIEW,
    ORG_PERMISSIONS.BILLING_UPDATE,
    ORG_PERMISSIONS.ADMIN_VIEW_ANALYTICS,
  ],
  [ORG_ROLES.MANAGER]: [
    ORG_PERMISSIONS.ORG_VIEW_SETTINGS,
    ORG_PERMISSIONS.MEMBER_INVITE,
    ORG_PERMISSIONS.MEMBER_VIEW,
    ORG_PERMISSIONS.CONTENT_CREATE,
    ORG_PERMISSIONS.CONTENT_UPDATE,
    ORG_PERMISSIONS.CONTENT_DELETE,
    ORG_PERMISSIONS.CONTENT_VIEW,
  ],
  [ORG_ROLES.MEMBER]: [
    ORG_PERMISSIONS.ORG_VIEW_SETTINGS,
    ORG_PERMISSIONS.MEMBER_VIEW,
    ORG_PERMISSIONS.CONTENT_CREATE,
    ORG_PERMISSIONS.CONTENT_UPDATE,
    ORG_PERMISSIONS.CONTENT_VIEW,
  ],
  [ORG_ROLES.VIEWER]: [
    ORG_PERMISSIONS.ORG_VIEW_SETTINGS,
    ORG_PERMISSIONS.MEMBER_VIEW,
    ORG_PERMISSIONS.CONTENT_VIEW,
  ],
  [ORG_ROLES.FINANCE]: [
    ORG_PERMISSIONS.ORG_VIEW_SETTINGS,
    ORG_PERMISSIONS.MEMBER_VIEW,
    ORG_PERMISSIONS.BILLING_VIEW,
    ORG_PERMISSIONS.BILLING_UPDATE,
  ],
  [ORG_ROLES.MARCOM]: [
    ORG_PERMISSIONS.ORG_VIEW_SETTINGS,
    ORG_PERMISSIONS.MEMBER_VIEW,
    ORG_PERMISSIONS.CONTENT_CREATE,
    ORG_PERMISSIONS.CONTENT_UPDATE,
    ORG_PERMISSIONS.CONTENT_DELETE,
    ORG_PERMISSIONS.CONTENT_VIEW,
  ],
};