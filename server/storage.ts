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
  socialAccounts,
  socialMetrics,
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
  type SocialAccount,
  type InsertSocialAccount,
  type SocialMetric,
  type InsertSocialMetric,
  transactions,
  type Transaction,
  type InsertTransaction,
  tournaments,
  type Tournament,
  type InsertTournament,
  tournamentRounds,
  type TournamentRound,
  type InsertTournamentRound,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User>;
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

  // Tournament operations
  getTournamentsByTenant(tenantId: string): Promise<Tournament[]>;
  getTournament(id: string, tenantId: string): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, tenantId: string, tournament: Partial<InsertTournament>): Promise<Tournament>;
  deleteTournament(id: string, tenantId: string): Promise<void>;

  // Tournament Round operations
  getRoundsByTournament(tournamentId: string): Promise<TournamentRound[]>;
  getRound(id: string, tournamentId: string): Promise<TournamentRound | undefined>;
  createRound(round: InsertTournamentRound): Promise<TournamentRound>;
  updateRound(id: string, tournamentId: string, round: Partial<InsertTournamentRound>): Promise<TournamentRound>;
  deleteRound(id: string, tournamentId: string): Promise<void>;

  // Match operations
  getMatchesByTenant(tenantId: string): Promise<Match[]>;
  getMatchesByTournament(tournamentId: string): Promise<Match[]>;
  getMatchesByRound(roundId: string): Promise<Match[]>;
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

  // Social Media operations
  getSocialAccountsByTenant(tenantId: string): Promise<SocialAccount[]>;
  getSocialAccount(id: string, tenantId: string): Promise<SocialAccount | undefined>;
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  updateSocialAccount(id: string, tenantId: string, account: Partial<InsertSocialAccount>): Promise<SocialAccount>;
  deleteSocialAccount(id: string, tenantId: string): Promise<void>;
  
  getSocialMetricsByTenant(tenantId: string, limit?: number): Promise<SocialMetric[]>;
  getSocialMetricsByAccount(accountId: string, limit?: number): Promise<SocialMetric[]>;
  createSocialMetric(metric: InsertSocialMetric): Promise<SocialMetric>;
  getLatestMetricsByTenant(tenantId: string): Promise<SocialMetric[]>;

  // Finance operations
  getTransactionsByTenant(tenantId: string): Promise<Transaction[]>;
  getTransaction(id: string, tenantId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, tenantId: string, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: string, tenantId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
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

  // Tournament operations
  async getTournamentsByTenant(tenantId: string): Promise<Tournament[]> {
    return db.select().from(tournaments).where(eq(tournaments.tenantId, tenantId)).orderBy(desc(tournaments.startDate));
  }

  async getTournament(id: string, tenantId: string): Promise<Tournament | undefined> {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.id, id), eq(tournaments.tenantId, tenantId)));
    return tournament;
  }

  async createTournament(tournamentData: InsertTournament): Promise<Tournament> {
    const [tournament] = await db.insert(tournaments).values(tournamentData).returning();
    return tournament;
  }

  async updateTournament(id: string, tenantId: string, tournamentData: Partial<InsertTournament>): Promise<Tournament> {
    const [tournament] = await db
      .update(tournaments)
      .set({ ...tournamentData, updatedAt: new Date() })
      .where(and(eq(tournaments.id, id), eq(tournaments.tenantId, tenantId)))
      .returning();
    return tournament;
  }

  async deleteTournament(id: string, tenantId: string): Promise<void> {
    // Delete associated rounds and matches first
    const rounds = await this.getRoundsByTournament(id);
    for (const round of rounds) {
      await this.deleteRound(round.id, id);
    }
    // Delete matches directly associated with tournament
    await db.delete(matches).where(eq(matches.tournamentId, id));
    // Delete tournament
    await db.delete(tournaments).where(and(eq(tournaments.id, id), eq(tournaments.tenantId, tenantId)));
  }

  // Tournament Round operations
  async getRoundsByTournament(tournamentId: string): Promise<TournamentRound[]> {
    return db.select().from(tournamentRounds).where(eq(tournamentRounds.tournamentId, tournamentId)).orderBy(tournamentRounds.roundNumber);
  }

  async getRound(id: string, tournamentId: string): Promise<TournamentRound | undefined> {
    const [round] = await db
      .select()
      .from(tournamentRounds)
      .where(and(eq(tournamentRounds.id, id), eq(tournamentRounds.tournamentId, tournamentId)));
    return round;
  }

  async createRound(roundData: InsertTournamentRound): Promise<TournamentRound> {
    const [round] = await db.insert(tournamentRounds).values(roundData).returning();
    return round;
  }

  async updateRound(id: string, tournamentId: string, roundData: Partial<InsertTournamentRound>): Promise<TournamentRound> {
    const [round] = await db
      .update(tournamentRounds)
      .set(roundData)
      .where(and(eq(tournamentRounds.id, id), eq(tournamentRounds.tournamentId, tournamentId)))
      .returning();
    return round;
  }

  async deleteRound(id: string, tournamentId: string): Promise<void> {
    // Delete associated matches first
    await db.delete(matches).where(eq(matches.roundId, id));
    // Delete round
    await db.delete(tournamentRounds).where(and(eq(tournamentRounds.id, id), eq(tournamentRounds.tournamentId, tournamentId)));
  }

  // Match operations
  async getMatchesByTenant(tenantId: string): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.tenantId, tenantId)).orderBy(desc(matches.date));
  }

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.tournamentId, tournamentId)).orderBy(matches.matchNumber);
  }

  async getMatchesByRound(roundId: string): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.roundId, roundId)).orderBy(matches.matchNumber);
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

  async getAllAuditLogs(limit: number = 10000): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
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

  async getAllInvites(): Promise<Invite[]> {
    return db.select().from(invites).orderBy(desc(invites.createdAt));
  }

  // Social Media operations
  async getSocialAccountsByTenant(tenantId: string): Promise<SocialAccount[]> {
    return db.select().from(socialAccounts)
      .where(eq(socialAccounts.tenantId, tenantId))
      .orderBy(desc(socialAccounts.createdAt));
  }

  async getSocialAccount(id: string, tenantId: string): Promise<SocialAccount | undefined> {
    const [account] = await db.select().from(socialAccounts)
      .where(and(eq(socialAccounts.id, id), eq(socialAccounts.tenantId, tenantId)));
    return account;
  }

  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> {
    const [newAccount] = await db.insert(socialAccounts).values(account).returning();
    return newAccount;
  }

  async updateSocialAccount(id: string, tenantId: string, account: Partial<InsertSocialAccount>): Promise<SocialAccount> {
    const existing = await this.getSocialAccount(id, tenantId);
    if (!existing) {
      throw new Error("Social account not found");
    }
    
    const [updated] = await db.update(socialAccounts)
      .set({ ...account, updatedAt: new Date() })
      .where(and(eq(socialAccounts.id, id), eq(socialAccounts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteSocialAccount(id: string, tenantId: string): Promise<void> {
    await db.delete(socialAccounts).where(and(eq(socialAccounts.id, id), eq(socialAccounts.tenantId, tenantId)));
  }

  async getSocialMetricsByTenant(tenantId: string, limit: number = 100): Promise<SocialMetric[]> {
    return db.select().from(socialMetrics)
      .where(eq(socialMetrics.tenantId, tenantId))
      .orderBy(desc(socialMetrics.date))
      .limit(limit);
  }

  async getSocialMetricsByAccount(accountId: string, limit: number = 30): Promise<SocialMetric[]> {
    return db.select().from(socialMetrics)
      .where(eq(socialMetrics.accountId, accountId))
      .orderBy(desc(socialMetrics.date))
      .limit(limit);
  }

  async createSocialMetric(metric: InsertSocialMetric): Promise<SocialMetric> {
    const [newMetric] = await db.insert(socialMetrics).values(metric).returning();
    return newMetric;
  }

  async getLatestMetricsByTenant(tenantId: string): Promise<SocialMetric[]> {
    // Get the latest metric for each social account
    const accounts = await this.getSocialAccountsByTenant(tenantId);
    const latestMetrics: SocialMetric[] = [];
    
    for (const account of accounts) {
      const [latestMetric] = await db.select().from(socialMetrics)
        .where(eq(socialMetrics.accountId, account.id))
        .orderBy(desc(socialMetrics.date))
        .limit(1);
      if (latestMetric) {
        latestMetrics.push(latestMetric);
      }
    }
    
    return latestMetrics;
  }

  // Super Admin export operations
  async getAllStaff(): Promise<Staff[]> {
    return db.select().from(staff).orderBy(desc(staff.createdAt));
  }

  async getAllPayroll(): Promise<Payroll[]> {
    return db.select().from(payroll).orderBy(desc(payroll.date));
  }

  async getAllMatches(): Promise<Match[]> {
    return db.select().from(matches).orderBy(desc(matches.date));
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getAllContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  // Finance operations
  async getTransactionsByTenant(tenantId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.date));
  }

  async getTransaction(id: string, tenantId: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)));
    return transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransaction(id: string, tenantId: string, transactionData: Partial<InsertTransaction>): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({ ...transactionData, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .returning();
    return transaction;
  }

  async deleteTransaction(id: string, tenantId: string): Promise<void> {
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)));
  }
}

export const storage = new DatabaseStorage();
