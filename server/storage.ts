import {
  users,
  tenants,
  staff,
  payroll,
  matches,
  campaigns,
  contracts,
  auditLogs,
  invites,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type Staff,
  type InsertStaff,
  type Payroll,
  type InsertPayroll,
  type Match,
  type InsertMatch,
  type Campaign,
  type InsertCampaign,
  type Contract,
  type InsertContract,
  type AuditLog,
  type InsertAuditLog,
  type Invite,
  type InsertInvite,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser & { tenantId?: string }): Promise<User>;

  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;

  // Staff operations
  getStaffByTenant(tenantId: string): Promise<Staff[]>;
  getStaff(id: string, tenantId: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, tenantId: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string, tenantId: string): Promise<void>;

  // Payroll operations
  getPayrollByTenant(tenantId: string): Promise<Payroll[]>;
  getPayroll(id: string, tenantId: string): Promise<Payroll | undefined>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: string, tenantId: string, payroll: Partial<InsertPayroll>): Promise<Payroll>;
  deletePayroll(id: string, tenantId: string): Promise<void>;

  // Match operations
  getMatchesByTenant(tenantId: string): Promise<Match[]>;
  getMatch(id: string, tenantId: string): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, tenantId: string, match: Partial<InsertMatch>): Promise<Match>;
  deleteMatch(id: string, tenantId: string): Promise<void>;

  // Campaign operations
  getCampaignsByTenant(tenantId: string): Promise<Campaign[]>;
  getCampaign(id: string, tenantId: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, tenantId: string, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: string, tenantId: string): Promise<void>;

  // Contract operations
  getContractsByTenant(tenantId: string): Promise<Contract[]>;
  getContract(id: string, tenantId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, tenantId: string, contract: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: string, tenantId: string): Promise<void>;

  // Audit log operations
  getAuditLogsByTenant(tenantId: string, limit?: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Super Admin operations
  getAllTenants(): Promise<Tenant[]>;
  updateTenantAdmin(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, user: Partial<UpsertUser>): Promise<User>;
  
  // Stripe operations
  updateTenantStripe(id: string, stripeData: Partial<Pick<Tenant, 'stripeCustomerId' | 'stripeSubscriptionId' | 'subscriptionPlan' | 'subscriptionStatus'>>): Promise<Tenant>;

  // Invite operations
  getInvitesByTenant(tenantId: string): Promise<Invite[]>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  updateInviteStatus(token: string, status: "pending" | "accepted" | "expired"): Promise<Invite>;
  deleteInvite(id: string, tenantId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser & { tenantId?: string }): Promise<User> {
    // First try to get existing user
    const existingUser = await this.getUser(userData.id!);
    
    // If user doesn't exist, create tenant first
    if (!existingUser) {
      const tenantData: InsertTenant = {
        name: `${userData.firstName || userData.email?.split('@')[0] || 'Club'}'s Esports Club`,
        clubTag: userData.email?.substring(0, 3).toUpperCase() || 'NXS',
      };
      const tenant = await this.createTenant(tenantData);
      userData.tenantId = tenant.id;
    }

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
    return tenant;
  }

  async updateTenant(id: string, tenantData: Partial<InsertTenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  // Staff operations
  async getStaffByTenant(tenantId: string): Promise<Staff[]> {
    return db.select().from(staff).where(eq(staff.tenantId, tenantId));
  }

  async getStaff(id: string, tenantId: string): Promise<Staff | undefined> {
    const [staffMember] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)));
    return staffMember;
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [staffMember] = await db.insert(staff).values({
      ...staffData,
      permissions: staffData.permissions as any,
    }).returning();
    return staffMember;
  }

  async updateStaff(id: string, tenantId: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const updateData: any = { ...staffData, updatedAt: new Date() };
    if (staffData.permissions) {
      updateData.permissions = staffData.permissions as any;
    }
    const [staffMember] = await db
      .update(staff)
      .set(updateData)
      .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
      .returning();
    return staffMember;
  }

  async deleteStaff(id: string, tenantId: string): Promise<void> {
    await db.delete(staff).where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)));
  }

  // Payroll operations
  async getPayrollByTenant(tenantId: string): Promise<Payroll[]> {
    return db.select().from(payroll).where(eq(payroll.tenantId, tenantId)).orderBy(desc(payroll.date));
  }

  async getPayroll(id: string, tenantId: string): Promise<Payroll | undefined> {
    const [payrollEntry] = await db
      .select()
      .from(payroll)
      .where(and(eq(payroll.id, id), eq(payroll.tenantId, tenantId)));
    return payrollEntry;
  }

  async createPayroll(payrollData: InsertPayroll): Promise<Payroll> {
    const [payrollEntry] = await db.insert(payroll).values(payrollData).returning();
    return payrollEntry;
  }

  async updatePayroll(id: string, tenantId: string, payrollData: Partial<InsertPayroll>): Promise<Payroll> {
    const [payrollEntry] = await db
      .update(payroll)
      .set({ ...payrollData, updatedAt: new Date() })
      .where(and(eq(payroll.id, id), eq(payroll.tenantId, tenantId)))
      .returning();
    return payrollEntry;
  }

  async deletePayroll(id: string, tenantId: string): Promise<void> {
    await db.delete(payroll).where(and(eq(payroll.id, id), eq(payroll.tenantId, tenantId)));
  }

  // Match operations
  async getMatchesByTenant(tenantId: string): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.tenantId, tenantId)).orderBy(desc(matches.date));
  }

  async getMatch(id: string, tenantId: string): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(and(eq(matches.id, id), eq(matches.tenantId, tenantId)));
    return match;
  }

  async createMatch(matchData: InsertMatch): Promise<Match> {
    const [match] = await db.insert(matches).values(matchData).returning();
    return match;
  }

  async updateMatch(id: string, tenantId: string, matchData: Partial<InsertMatch>): Promise<Match> {
    const [match] = await db
      .update(matches)
      .set({ ...matchData, updatedAt: new Date() })
      .where(and(eq(matches.id, id), eq(matches.tenantId, tenantId)))
      .returning();
    return match;
  }

  async deleteMatch(id: string, tenantId: string): Promise<void> {
    await db.delete(matches).where(and(eq(matches.id, id), eq(matches.tenantId, tenantId)));
  }

  // Campaign operations
  async getCampaignsByTenant(tenantId: string): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId)).orderBy(desc(campaigns.startDate));
  }

  async getCampaign(id: string, tenantId: string): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)));
    return campaign;
  }

  async createCampaign(campaignData: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values({
      ...campaignData,
      platforms: campaignData.platforms as any,
    }).returning();
    return campaign;
  }

  async updateCampaign(id: string, tenantId: string, campaignData: Partial<InsertCampaign>): Promise<Campaign> {
    const updateData: any = { ...campaignData, updatedAt: new Date() };
    if (campaignData.platforms) {
      updateData.platforms = campaignData.platforms as any;
    }
    const [campaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: string, tenantId: string): Promise<void> {
    await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)));
  }

  // Contract operations
  async getContractsByTenant(tenantId: string): Promise<Contract[]> {
    return db.select().from(contracts).where(eq(contracts.tenantId, tenantId)).orderBy(desc(contracts.expirationDate));
  }

  async getContract(id: string, tenantId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)));
    return contract;
  }

  async createContract(contractData: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(contractData).returning();
    return contract;
  }

  async updateContract(id: string, tenantId: string, contractData: Partial<InsertContract>): Promise<Contract> {
    const [contract] = await db
      .update(contracts)
      .set({ ...contractData, updatedAt: new Date() })
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
      .returning();
    return contract;
  }

  async deleteContract(id: string, tenantId: string): Promise<void> {
    await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)));
  }

  // Audit log operations
  async getAuditLogsByTenant(tenantId: string, limit: number = 100): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  // Super Admin operations
  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async updateTenantAdmin(id: string, tenantData: Partial<InsertTenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async deleteTenant(id: string): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserAdmin(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Stripe operations
  async updateTenantStripe(id: string, stripeData: Partial<Pick<Tenant, 'stripeCustomerId' | 'stripeSubscriptionId' | 'subscriptionPlan' | 'subscriptionStatus'>>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...stripeData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  // Invite operations
  async getInvitesByTenant(tenantId: string): Promise<Invite[]> {
    return db.select().from(invites).where(eq(invites.tenantId, tenantId)).orderBy(desc(invites.createdAt));
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    return invite;
  }

  async createInvite(inviteData: InsertInvite): Promise<Invite> {
    const [invite] = await db.insert(invites).values({
      ...inviteData,
      permissions: inviteData.permissions as any,
    }).returning();
    return invite;
  }

  async updateInviteStatus(token: string, status: "pending" | "accepted" | "expired"): Promise<Invite> {
    const [invite] = await db
      .update(invites)
      .set({ status })
      .where(eq(invites.token, token))
      .returning();
    return invite;
  }

  async deleteInvite(id: string, tenantId: string): Promise<void> {
    await db.delete(invites).where(and(eq(invites.id, id), eq(invites.tenantId, tenantId)));
  }
}

export const storage = new DatabaseStorage();
