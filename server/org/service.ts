import { countMembersByUser, getFirstMemberByUser, getOrgById, listMembersByOrg, insertOrganization, insertMember } from "../db/repos/organizations";
import { updateUserOrg, getUserById } from "../db/repos/users";
import { otpService } from "../otp/service";
import { OTP_TYPE } from "../otp/types";
import { getSupabase } from "../db/useSupabase";
import { z } from "zod";
import { createOrgSchema, updateOrgSchema, inviteMemberSchema, type Organization, type OrgMember, type OrgInvitation } from "./types";
import { ROLE_PERMISSIONS, ORG_PERMISSIONS, type OrgRole, type OrgPermission } from "./types";

export class OrganizationService {
  private sanitize(obj: any): any {
    if (obj === null) return null;
    if (obj === undefined) return undefined;
    if (Array.isArray(obj)) return obj.map((v) => this.sanitize(v)).filter((v) => v !== undefined);
    if (typeof obj === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        const sv = this.sanitize(v as any);
        if (sv !== undefined) out[k] = sv;
      }
      return out;
    }
    return obj;
  }
  /**
   * Check if the user already owns an organization
   * Ownership is determined by an org_members record with role === "owner"
   */
  async doesUserOwnOrganization(userId: string): Promise<boolean> {
    const count = await countMembersByUser(userId);
    return (count || 0) > 0;
  }

  /**
   * Ensure the user has an organization; if none exists, create a personal org (dev-friendly).
   * Returns the organization and owner membership.
   */
  async ensureOrganizationForUser(
    userId: string,
    context?: { email?: string; name?: string }
  ): Promise<{ organization: Organization; member: OrgMember }> {
    const existing = await this.getUserOrganization(userId);
    if (existing && existing.organization) {
      try {
        const org = existing.organization as any;
        const needsUpdate = !org?.name || String(org.name).trim().toLowerCase() === "your club";
        if (needsUpdate) {
        const rawBase = String(context?.name ?? context?.email ?? "user");
        const base = rawBase.split("@")[0] || rawBase;
          const derivedName = `${base}'s Club`;
          const derivedSlug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `club-${base}`;
          const s = getSupabase();
          await s!.from("organizations").update({ name: derivedName, slug: derivedSlug, updated_at: new Date().toISOString() }).eq("id", org.id);
          org.name = derivedName;
          org.slug = derivedSlug;
        }
      } catch {}
      return { organization: existing.organization, member: existing.member } as any;
    }
    const result = await this.createOrganizationFromPayment(userId, "free");
    return result;
  }
  /**
   * Create organization
   */
  async createOrganization(userId: string, data: z.infer<typeof createOrgSchema>) {
    const validatedData = createOrgSchema.parse(data);

    // Enforce: a user who already owns an org cannot create another
    const alreadyOwner = await this.doesUserOwnOrganization(userId);
    if (alreadyOwner) {
      throw new Error("You already own an organization and cannot create another.");
    }

    // Enforce: unique slug across organizations
    {
      const { getOrgBySlug } = require("../db/repos/organizations");
      const existing = await getOrgBySlug(validatedData.slug);
      if (existing) {
        throw new Error("Organization slug is already in use");
      }
    }
    
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const organization: Organization = {
      id: orgId,
      name: validatedData.name,
      slug: validatedData.slug,
      description: validatedData.description || "",
      ...(validatedData.logo ? { logo: validatedData.logo } : {}),
      ...(validatedData.website ? { website: validatedData.website } : {}),
      status: "active",
      subscriptionPlan: "free",
      subscriptionStatus: "active",
      ownerId: userId,
      memberCount: 1,
      maxMembers: 10, // Free plan limit
      settings: {
        allowMemberInvites: false,
        requireApproval: false,
        defaultRole: "member",
      },
      usage: {
        members: 1,
        storage: 0,
        apiCalls: 0,
        lastResetAt: now,
      },
      billing: {},
      createdAt: now,
      updatedAt: now,
    };
    
    // Create organization
    await insertOrganization({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        owner_id: organization.ownerId,
        metadata: (organization as any).metadata ?? {},
        created_at: organization.createdAt,
        updated_at: organization.updatedAt,
        member_count: organization.memberCount,
        status: (organization as any).status,
        subscription_plan: (organization as any).subscriptionPlan,
        subscription_status: (organization as any).subscriptionStatus,
        max_members: (organization as any).maxMembers,
        settings: (organization as any).settings ?? {},
        usage: (organization as any).usage ?? {},
        billing: (organization as any).billing ?? {},
        description: (organization as any).description ?? null,
      });
    
    // Create owner member record
    const ownerMember: OrgMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId: orgId,
      userId,
      role: "admin",
      permissions: ROLE_PERMISSIONS.admin,
      isActive: true,
      joinedAt: now,
      // lastActiveAt omitted when unknown
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    
    await insertMember({
        id: ownerMember.id,
        organization_id: ownerMember.organizationId,
        user_id: ownerMember.userId,
        role: ownerMember.role,
        permissions: ownerMember.permissions,
        is_active: ownerMember.isActive,
        joined_at: ownerMember.joinedAt,
        invited_by: ownerMember.invitedBy,
        created_at: ownerMember.createdAt,
        updated_at: ownerMember.updatedAt,
      });
    
    // Update user document with organization reference
    await updateUserOrg(userId, orgId, "admin");
    
    return {
      organization,
      member: ownerMember,
    };
  }

  /**
   * Create minimal organization after successful payment
   * The paying user becomes the owner. Plan limits are set by subscription plan.
   */
  async createOrganizationFromPayment(userId: string, plan: string) {
    // Enforce single organization ownership
    const alreadyOwner = await this.doesUserOwnOrganization(userId);
    if (alreadyOwner) {
      throw new Error("User already owns an organization");
    }

    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Derive a friendly organization name from user profile
    let derivedName = "Your Club";
    let derivedSlug = `club-${Math.random().toString(36).substr(2, 6)}`;
    try {
      const userRow = await getUserById(userId);
      const emailLocal = (userRow?.email || "user").split("@")[0];
      const base = (userRow?.name || emailLocal).toString();
      derivedName = `${base}'s Club`;
      derivedSlug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `club-${emailLocal}`;
    } catch {}

    const organization: Organization = {
      id: orgId,
      name: derivedName,
      slug: derivedSlug,
      description: "",
      // logo/website omitted by default
      status: "active",
      subscriptionPlan: plan as any,
      subscriptionStatus: "active",
      ownerId: userId,
      memberCount: 1,
      maxMembers: plan === "free" ? 10 : plan === "starter" ? 25 : plan === "professional" ? 100 : 1000000,
      settings: {
        allowMemberInvites: false,
        requireApproval: false,
        defaultRole: "member",
      },
      usage: {
        members: 1,
        storage: 0,
        apiCalls: 0,
        lastResetAt: now,
      },
      billing: {},
      createdAt: now,
      updatedAt: now,
    };

    await insertOrganization({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        owner_id: organization.ownerId,
        metadata: (organization as any).metadata ?? {},
        created_at: organization.createdAt,
        updated_at: organization.updatedAt,
        member_count: organization.memberCount,
        status: (organization as any).status,
        subscription_plan: (organization as any).subscriptionPlan,
        subscription_status: (organization as any).subscriptionStatus,
        max_members: (organization as any).maxMembers,
        settings: (organization as any).settings ?? {},
        usage: (organization as any).usage ?? {},
        billing: (organization as any).billing ?? {},
        description: (organization as any).description ?? null,
      });

    const ownerMember: OrgMember = {
      id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId: orgId,
      userId,
      role: "admin",
      permissions: ROLE_PERMISSIONS.admin,
      isActive: true,
      joinedAt: now,
      // lastActiveAt omitted when unknown
      invitedBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    await insertMember({
        id: ownerMember.id,
        organization_id: ownerMember.organizationId,
        user_id: ownerMember.userId,
        role: ownerMember.role,
        permissions: ownerMember.permissions,
        is_active: ownerMember.isActive,
        joined_at: ownerMember.joinedAt,
        invited_by: ownerMember.invitedBy,
        created_at: ownerMember.createdAt,
        updated_at: ownerMember.updatedAt,
      });

    await updateUserOrg(userId, orgId, "admin");

    return { organization, member: ownerMember };
  }
  
  /**
   * Get user's organization
   */
  async getUserOrganization(userId: string) {
    const m = await getFirstMemberByUser(userId);
    if (m) {
      const org = await getOrgById(String(m.organization_id));
      if (org) {
        return {
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            ownerId: org.owner_id,
            createdAt: new Date(org.created_at),
            updatedAt: new Date(org.updated_at),
            metadata: org.metadata || {},
          } as any,
          member: {
            id: m.id,
            organizationId: m.organization_id,
            userId: m.user_id,
            role: m.role,
            permissions: m.permissions || [],
            isActive: !!m.is_active,
            joinedAt: new Date(m.joined_at),
            invitedBy: m.invited_by,
            createdAt: new Date(m.created_at),
            updatedAt: new Date(m.updated_at),
          } as any,
        } as any;
      }
    }
    return null;
  }
  
  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string) {
    const org = await getOrgById(orgId);
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo || undefined,
      website: org.website || undefined,
      ownerId: org.owner_id,
      createdAt: new Date(org.created_at),
      updatedAt: new Date(org.updated_at),
      metadata: org.metadata || {},
    } as any;
  }
  
  /**
   * Update organization
   */
  async updateOrganization(orgId: string, userId: string, data: z.infer<typeof updateOrgSchema>) {
    const validatedData = updateOrgSchema.parse(data);
    
    // Check permissions
    const hasPermission = await this.checkPermission(userId, orgId, ORG_PERMISSIONS.ORG_UPDATE_SETTINGS as OrgPermission);
    if (!hasPermission) {
      throw new Error("Insufficient permissions to update organization");
    }
    
    const now = new Date();
    
    // Build update data
    const updateData: any = {
      ...validatedData,
      updatedAt: now,
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const s = getSupabase();
    const { error } = await s!.from("organizations").update({ ...updateData, updated_at: now }).eq("id", orgId);
    if (error) throw error;
    return this.getOrganization(orgId);
  }
  
  /**
   * Get organization members
   */
  async getOrganizationMembers(orgId: string, requestingUserId: string) {
    // Check permissions
    const hasPermission = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_VIEW as OrgPermission);
    if (!hasPermission) {
      throw new Error("Insufficient permissions to view organization members");
    }
    
    const rows = await listMembersByOrg(orgId);
    return rows.map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      userId: r.user_id,
      role: r.role,
      permissions: r.permissions || [],
      isActive: !!r.is_active,
      joinedAt: new Date(r.joined_at),
      invitedBy: r.invited_by,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      user: { id: r.users?.id, email: r.users?.email, name: r.users?.name, avatar: r.users?.avatar },
    }));
  }

  async getOrganizationInvites(orgId: string, requestingUserId: string) {
    const allowed = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_VIEW as OrgPermission);
    if (!allowed) {
      throw new Error("Insufficient permissions to view invitations");
    }
    const s = getSupabase();
    const { data, error } = await s.from("org_invitations").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      email: r.email,
      role: r.role,
      status: r.status,
      token: r.token,
      invitedBy: r.invited_by,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async updateMemberStatus(orgId: string, memberId: string, requestingUserId: string, isActive: boolean) {
    const allowed = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_REMOVE as OrgPermission);
    if (!allowed) {
      throw new Error("Insufficient permissions to update member status");
    }
    const s = getSupabase();
    const { data, error } = await s.from("org_members").update({ is_active: !!isActive, updated_at: new Date().toISOString() }).eq("id", memberId).eq("organization_id", orgId).select("*").maybeSingle();
    if (error) throw error;
    return data;
  }

  async completeInvitationForUser(userId: string, token: string) {
    const { getPendingInvitationByToken, updateInvitationStatus } = require('../db/repos/orgInvitations');
    const inv = await getPendingInvitationByToken(token);
    if (!inv) throw new Error("Invalid or expired invitation");
    const now = new Date();
    if (new Date(inv.expires_at) < now) {
      await updateInvitationStatus(inv.id, "expired");
      throw new Error("Invitation has expired");
    }
    const userRow = await require('../db/repos/users').getUserById(userId);
    const userEmail = String(userRow?.email || "");
    if (!userEmail || userEmail.toLowerCase() !== String(inv.email).toLowerCase()) {
      throw new Error("Authenticated email does not match invitation");
    }
    const existing = await require('../db/repos/organizations').getMemberByUserOrg(userId, inv.organization_id);
    if (existing) {
      await updateInvitationStatus(inv.id, "accepted");
      return { organizationId: inv.organization_id, alreadyMember: true };
    }
    const memberId = `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const createdIso = new Date().toISOString();
    await require('../db/repos/organizations').insertMember({
      id: memberId,
      organization_id: inv.organization_id,
      user_id: userId,
      role: inv.role,
      permissions: [],
      is_active: true,
      joined_at: createdIso,
      invited_by: inv.invited_by,
      created_at: createdIso,
      updated_at: createdIso,
    });
    await require('../db/repos/users').updateUserOrg(userId, inv.organization_id, inv.role);
    await updateInvitationStatus(inv.id, "accepted");
    return { organizationId: inv.organization_id, memberId };
  }

  async resendInvitation(orgId: string, invitationId: string, requestingUserId: string) {
    const allowed = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_INVITE as OrgPermission);
    if (!allowed) {
      throw new Error("Insufficient permissions to resend invitations");
    }
    const s = getSupabase();
    const { data: inv } = await s.from("org_invitations").select("*").eq("id", invitationId).eq("organization_id", orgId).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    if (String(inv.status).toLowerCase() !== "pending") throw new Error("Only pending invitations can be resent");
    const now = new Date().toISOString();
    await s.from("org_invitations").update({ updated_at: now }).eq("id", invitationId);
    const acceptUrl = `${String(process.env.VITE_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/invite/${encodeURIComponent(inv.token)}`;
    console.log(`[InviteEmail:Resend] To: ${inv.email} | Org: ${inv.organization_id} | Role: ${inv.role} | Link: ${acceptUrl}`);
    return { success: true } as any;
  }

  async cancelInvitation(orgId: string, invitationId: string, requestingUserId: string) {
    const allowed = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_INVITE as OrgPermission);
    if (!allowed) {
      throw new Error("Insufficient permissions to cancel invitations");
    }
    const s = getSupabase();
    const { data: inv } = await s.from("org_invitations").select("*").eq("id", invitationId).eq("organization_id", orgId).maybeSingle();
    if (!inv) throw new Error("Invitation not found");
    if (String(inv.status).toLowerCase() !== "pending") throw new Error("Only pending invitations can be cancelled");
    const now = new Date().toISOString();
    const { data } = await s.from("org_invitations").update({ status: "cancelled", updated_at: now }).eq("id", invitationId).select("*").maybeSingle();
    return data;
  }
  
  /**
   * Invite member to organization
   */
  async inviteMember(orgId: string, invitingUserId: string, data: z.infer<typeof inviteMemberSchema>) {
    const validatedData = inviteMemberSchema.parse(data);
    
    // Check permissions
    const hasPermission = await this.checkPermission(invitingUserId, orgId, ORG_PERMISSIONS.MEMBER_INVITE as OrgPermission);
    if (!hasPermission) {
      throw new Error("Insufficient permissions to invite members");
    }
    
    // Check if organization has reached member limit
    const org = await this.getOrganization(orgId);
    if (!org) {
      throw new Error("Organization not found");
    }
    
    if (org.memberCount >= org.maxMembers) {
      throw new Error("Organization has reached maximum member limit");
    }
    
    // Optionally check if a user with this email is already a member (requires user lookup).
    // Skipping direct member check by userId because we only have email in the invitation payload.
    
    const { pendingInvitationExists, insertInvitation } = require('../db/repos/orgInvitations');
    const exists = await pendingInvitationExists(orgId, validatedData.email);
    if (exists) throw new Error("Invitation has already been sent to this email");
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = this.generateInvitationToken();
    const payload: any = {
      id: invitationId,
      organization_id: orgId,
      email: validatedData.email,
      role: validatedData.role,
      invited_by: invitingUserId,
      status: "pending",
      token,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    // Do not include non-existent columns in Supabase schema
    await insertInvitation(payload);

    if (validatedData.sendEmail !== false) {
      try {
        const acceptUrl = `${String(process.env.VITE_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`;
        console.log(`[InviteEmail] To: ${validatedData.email} | Org: ${org.name} | Role: ${validatedData.role} | Name: ${validatedData.name || "(not provided)"} | Link: ${acceptUrl}`);
      } catch (e) {
        console.warn("Invite email send failed (placeholder)", (e as any)?.message || e);
      }
    }
    return {
      id: invitationId,
      organizationId: orgId,
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
      invitedBy: invitingUserId,
      status: "pending",
      token,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    } as any;
  }
  
  /**
   * Accept organization invitation
   */
  async acceptInvitation(userId: string, token: string, otpCode?: string) {
    // Find invitation by token (Supabase)
      const { getPendingInvitationByToken, updateInvitationStatus } = require('../db/repos/orgInvitations');
      const inv = await getPendingInvitationByToken(token);
      if (!inv) throw new Error("Invalid or expired invitation");
      const now = new Date();
      if (new Date(inv.expires_at) < now) {
        await updateInvitationStatus(inv.id, "expired");
        throw new Error("Invitation has expired");
      }
      const userRow = await getUserById(userId);
      const userEmail = String(userRow?.email || "");
      if (!userEmail || userEmail.toLowerCase() !== String(inv.email).toLowerCase()) {
        throw new Error("Authenticated email does not match invitation");
      }
          if (!otpCode) {
            const gen = await otpService.generateOtp({
              userId,
              type: OTP_TYPE.ORG_INVITATION as any,
              deliveryMethod: "email" as any,
              target: inv.email,
              metadata: { orgId: inv.organization_id, invitationId: inv.id, email: inv.email },
            } as any);
            return { otpSent: true, otpId: gen.otpId, expiresAt: gen.expiresAt } as any;
          }
      const verification = await otpService.verifyOtp({ userId, code: otpCode, type: OTP_TYPE.ORG_INVITATION as any } as any);
      if (!verification.success || !verification.verified) {
        throw new Error("Invalid OTP code");
      }
      const meta = verification.metadata || {};
      if (String(meta.orgId || "") !== String(inv.organization_id) || String(meta.invitationId || "") !== String(inv.id)) {
        throw new Error("OTP does not match organization/invitation");
      }
      const m = await require('../db/repos/organizations').getMemberByUserOrg(userId, inv.organization_id);
      if (m) {
        await updateInvitationStatus(inv.id, "accepted");
        throw new Error("User is already a member of this organization");
      }
      const ownerMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organization_id: inv.organization_id,
        user_id: userId,
        role: inv.role,
        permissions: (require('./types').ROLE_PERMISSIONS)[inv.role],
        is_active: true,
        joined_at: now.toISOString(),
        invited_by: inv.invited_by,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      await insertMember(ownerMember);
      await updateInvitationStatus(inv.id, "accepted");
      const s = getSupabase();
      const { count } = await s.from('org_members').select('id', { count: 'exact', head: true }).eq('organization_id', inv.organization_id);
      await s.from('organizations').update({ member_count: count || 0, updated_at: now.toISOString() }).eq('id', inv.organization_id);
      await updateUserOrg(userId, inv.organization_id, inv.role);
      return {
        id: ownerMember.id,
        organizationId: inv.organization_id,
        userId,
        role: inv.role,
        permissions: (require('./types').ROLE_PERMISSIONS)[inv.role],
        isActive: true,
        joinedAt: now,
        invitedBy: inv.invited_by,
        createdAt: now,
        updatedAt: now,
      } as any;
    
  }
  
  /**
   * Update member role
   */
  async updateMemberRole(orgId: string, memberId: string, requestingUserId: string, newRole: OrgRole) {
    // Check permissions
    const hasPermission = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_UPDATE_ROLE as OrgPermission);
    if (!hasPermission) {
      throw new Error("Insufficient permissions to manage members");
    }
    
    {
      const s = getSupabase();
      const { data: memberRow } = await s!.from('org_members').select('*').eq('id', memberId).maybeSingle();
      if (!memberRow) throw new Error('Member not found');
      if (memberRow.organization_id !== orgId) throw new Error('Member does not belong to this organization');
      const { data: reqRow } = await s!
        .from('org_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', requestingUserId)
        .maybeSingle();
      if (!reqRow) throw new Error('Requesting user is not a member of this organization');
      if (newRole === 'owner' && reqRow.role !== 'owner') throw new Error('Only organization owner can promote members to owner');
      if (memberRow.role === 'owner' && newRole !== 'owner' && memberRow.user_id === requestingUserId) throw new Error('Organization owner cannot demote themselves');
      const nowIso = new Date().toISOString();
      await s!
        .from('org_members')
        .update({ role: newRole, permissions: (require('./types').ROLE_PERMISSIONS)[newRole], updated_at: nowIso })
        .eq('id', memberId);
      await updateUserOrg(memberRow.user_id, orgId, newRole);
      return await this.getMember(memberId);
    }
  }
  
  /**
   * Remove member from organization
   */
  async removeMember(orgId: string, memberId: string, requestingUserId: string) {
    // Check permissions
    const hasPermission = await this.checkPermission(requestingUserId, orgId, ORG_PERMISSIONS.MEMBER_REMOVE as OrgPermission);
    if (!hasPermission) {
      throw new Error("Insufficient permissions to manage members");
    }
    
    {
      const s = getSupabase();
      const { data: memberRow } = await s!.from('org_members').select('*').eq('id', memberId).maybeSingle();
      if (!memberRow) throw new Error('Member not found');
      if (memberRow.organization_id !== orgId) throw new Error('Member does not belong to this organization');
      const { data: reqRow } = await s!
        .from('org_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', requestingUserId)
        .maybeSingle();
      if (!reqRow) throw new Error('Requesting user is not a member of this organization');
      if (memberRow.role === 'owner' && requestingUserId === memberRow.user_id) throw new Error('Organization owner cannot remove themselves');
      if (memberRow.role === 'owner' && reqRow.role !== 'owner') throw new Error('Only organization owner can remove other owners');
      await s!.from('org_members').delete().eq('id', memberId);
      const { count } = await s!.from('org_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId);
      await s!.from('organizations').update({ member_count: count || 0, updated_at: new Date().toISOString() }).eq('id', orgId);
      await updateUserOrg(memberRow.user_id, null, undefined);
    }
  }
  
  /**
   * Check if user has specific role in organization
   */
  async checkUserRole(userId: string, orgId: string, requiredRole: OrgRole): Promise<boolean> {
    const s = getSupabase();
    const { data } = await s!.from('org_members').select('role').eq('organization_id', orgId).eq('user_id', userId).maybeSingle();
    return !!data && String(data.role) === String(requiredRole);
  }
  
  /**
   * Get user permissions in organization
   */
  async getUserPermissions(userId: string, orgId: string): Promise<OrgPermission[]> {
    const s = getSupabase();
    const { data } = await s!.from('org_members').select('permissions').eq('organization_id', orgId).eq('user_id', userId).maybeSingle();
    return (data?.permissions as OrgPermission[]) || [];
  }
  
  /**
   * Check if user is member of organization
   */
  async isUserMember(userId: string, orgId: string): Promise<boolean> {
    const s = getSupabase();
    const { count } = await s!.from('org_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('user_id', userId);
    return (count || 0) > 0;
  }
  
  /**
   * Check if user has specific permission in organization
   */
  async checkPermission(userId: string, orgId: string, permission: OrgPermission): Promise<boolean> {
    const s = getSupabase();
    const { data } = await s!
      .from('org_members')
      .select('permissions')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      const org = await getOrgById(orgId);
      if (org && org.owner_id === userId) return true;
      return false;
    }
    const perms: OrgPermission[] = (data.permissions as any) || [];
    return perms.includes(permission);
  }
  
  /**
   * Get member by ID
   */
  private async getMember(memberId: string) {
    const s = getSupabase();
    const { data } = await s!.from('org_members').select('*, users:users(id,email,name)').eq('id', memberId).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      role: data.role,
      permissions: data.permissions || [],
      isActive: !!data.is_active,
      joinedAt: new Date(data.joined_at),
      invitedBy: data.invited_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      user: { id: data.users?.id, email: data.users?.email, name: data.users?.name, avatar: data.users?.avatar },
    } as any;
  }
  
  /**
   * Generate secure invitation token
   */
  private generateInvitationToken(): string {
    return Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  }
}

export const organizationService = new OrganizationService();
