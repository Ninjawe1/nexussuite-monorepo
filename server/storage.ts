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
  rosters,
  type Roster,
  type InsertRoster,
  wallets,            // <-- add
  type Wallet,        // <-- add
  type InsertWallet,  // <-- add
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  createUser(userData: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser & { tenantId?: string }): Promise<User>;
<<<<<<< HEAD
=======
  deleteUser(id: string): Promise<void>;
>>>>>>> e6da67b (feat(repo): initial clean upload)

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

  // Roster operations
  getRostersByTenant(tenantId: string): Promise<Roster[]>;
  getRoster(id: string, tenantId: string): Promise<Roster | undefined>;
  createRoster(roster: InsertRoster): Promise<Roster>;
  updateRoster(id: string, tenantId: string, roster: Partial<InsertRoster>): Promise<Roster>;
  deleteRoster(id: string, tenantId: string): Promise<void>;

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

  // Contract file operations
  getContractFiles(contractId: string): Promise<any[]>;
  createContractFile(file: { contractId: string; fileName: string; fileUrl: string; [key: string]: any }): Promise<any>;
  getContractFile(fileId: string, contractId: string): Promise<any | undefined>;
  deleteContractFile(fileId: string, contractId: string): Promise<void>;

  // Audit log operations
  getAuditLogsByTenant(tenantId: string, limit?: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Super Admin operations
  getAllTenants(): Promise<Tenant[]>;
  updateTenantAdmin(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(id: string, user: Partial<UpsertUser>): Promise<User>;
  
  // Super Admin export operations
  getAllStaff(): Promise<Staff[]>;
  getAllPayroll(): Promise<Payroll[]>;
  getAllMatches(): Promise<Match[]>;
  getAllCampaigns(): Promise<Campaign[]>;
  getAllContracts(): Promise<Contract[]>;
  getAllAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAllInvites(): Promise<Invite[]>;
  
  // Stripe operations
  updateTenantStripe(id: string, stripeData: Partial<Pick<Tenant, 'stripeCustomerId' | 'stripeSubscriptionId' | 'subscriptionPlan' | 'subscriptionStatus'>>): Promise<Tenant>;

  // Invite operations
  getInvitesByTenant(tenantId: string): Promise<Invite[]>;
  getInvite(id: string): Promise<Invite | undefined>;
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

  // Wallet operations
  getWalletsByTenant(tenantId: string): Promise<Wallet[]>;
  getWallet(id: string, tenantId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: string, tenantId: string, wallet: Partial<InsertWallet>): Promise<Wallet>;
  deleteWallet(id: string, tenantId: string): Promise<void>;
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

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
<<<<<<< HEAD
=======
    if (!user) throw new Error("user_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
<<<<<<< HEAD
=======
    if (!user) throw new Error("user_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    return user;
  }

=======
    if (!user) throw new Error("user_upsert_failed");
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

>>>>>>> e6da67b (feat(repo): initial clean upload)
  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
<<<<<<< HEAD
=======
    if (!tenant) throw new Error("tenant_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return tenant;
  }

  async updateTenant(id: string, tenantData: Partial<InsertTenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
<<<<<<< HEAD
=======
    if (!tenant) throw new Error("tenant_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
=======
    if (!staffMember) throw new Error("staff_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
=======
    if (!staffMember) throw new Error("staff_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    const [payrollEntry] = await db.insert(payroll).values(payrollData).returning();
=======
    type PDbInsert = typeof payroll.$inferInsert;
    const normalized: PDbInsert = {
      ...payrollData,
      date:
        typeof payrollData.date === "string"
          ? new Date(payrollData.date)
          : payrollData.date,
    } as PDbInsert;
    const [payrollEntry] = await db.insert(payroll).values(normalized as any).returning();
    if (!payrollEntry) throw new Error("payroll_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return payrollEntry;
  }

  async updatePayroll(id: string, tenantId: string, payrollData: Partial<InsertPayroll>): Promise<Payroll> {
<<<<<<< HEAD
    const [payrollEntry] = await db
      .update(payroll)
      .set({ ...payrollData, updatedAt: new Date() })
      .where(and(eq(payroll.id, id), eq(payroll.tenantId, tenantId)))
      .returning();
=======
    type PDbInsert = typeof payroll.$inferInsert;
    const { date, ...rest } = payrollData as any;
    const normalized: Partial<PDbInsert> = { ...rest, updatedAt: new Date() } as any;
    if (date !== undefined) {
      (normalized as any).date = typeof date === "string" ? new Date(date) : (date as Date);
    } else {
      delete (normalized as any).date;
    }
    const [payrollEntry] = await db
      .update(payroll)
      .set(normalized as any)
      .where(and(eq(payroll.id, id), eq(payroll.tenantId, tenantId)))
      .returning();
    if (!payrollEntry) throw new Error("payroll_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return payrollEntry;
  }

  async deletePayroll(id: string, tenantId: string): Promise<void> {
    await db.delete(payroll).where(and(eq(payroll.id, id), eq(payroll.tenantId, tenantId)));
  }

  // Roster operations
  async getRostersByTenant(tenantId: string): Promise<Roster[]> {
    return db.select().from(rosters).where(eq(rosters.tenantId, tenantId)).orderBy(desc(rosters.createdAt));
  }

  async getRoster(id: string, tenantId: string): Promise<Roster | undefined> {
    const [row] = await db
      .select()
      .from(rosters)
      .where(and(eq(rosters.id, id), eq(rosters.tenantId, tenantId)));
    return row;
  }

  async createRoster(rosterData: InsertRoster): Promise<Roster> {
    const [row] = await db.insert(rosters).values(rosterData).returning();
<<<<<<< HEAD
=======
    if (!row) throw new Error("roster_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return row;
  }

  async updateRoster(id: string, tenantId: string, rosterData: Partial<InsertRoster>): Promise<Roster> {
    const [row] = await db
      .update(rosters)
      .set({ ...rosterData, updatedAt: new Date() })
      .where(and(eq(rosters.id, id), eq(rosters.tenantId, tenantId)))
      .returning();
<<<<<<< HEAD
=======
    if (!row) throw new Error("roster_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return row;
  }

  async deleteRoster(id: string, tenantId: string): Promise<void> {
    await db.delete(rosters).where(and(eq(rosters.id, id), eq(rosters.tenantId, tenantId)));
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
<<<<<<< HEAD
    const [tournament] = await db.insert(tournaments).values(tournamentData).returning();
=======
    type TDbInsert = typeof tournaments.$inferInsert;
    const normalized: TDbInsert = {
      ...tournamentData,
      startDate:
        typeof (tournamentData as any).startDate === "string"
          ? new Date((tournamentData as any).startDate)
          : (tournamentData as any).startDate,
      endDate:
        typeof (tournamentData as any).endDate === "string"
          ? new Date((tournamentData as any).endDate)
          : (tournamentData as any).endDate,
    } as TDbInsert;
    const [tournament] = await db.insert(tournaments).values(normalized as any).returning();
    if (!tournament) throw new Error("tournament_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return tournament;
  }

  async updateTournament(id: string, tenantId: string, tournamentData: Partial<InsertTournament>): Promise<Tournament> {
<<<<<<< HEAD
    const [tournament] = await db
      .update(tournaments)
      .set({ ...tournamentData, updatedAt: new Date() })
      .where(and(eq(tournaments.id, id), eq(tournaments.tenantId, tenantId)))
      .returning();
=======
    const { startDate, endDate, ...rest } = tournamentData as any;
    const normalized: any = { ...rest, updatedAt: new Date() };
    if (startDate !== undefined) {
      normalized.startDate = typeof startDate === "string" ? new Date(startDate) : (startDate as Date);
    } else {
      delete normalized.startDate;
    }
    if (endDate !== undefined) {
      normalized.endDate = typeof endDate === "string" ? new Date(endDate) : (endDate as Date);
    } else {
      delete normalized.endDate;
    }
    const [tournament] = await db
      .update(tournaments)
      .set(normalized as any)
      .where(and(eq(tournaments.id, id), eq(tournaments.tenantId, tenantId)))
      .returning();
    if (!tournament) throw new Error("tournament_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    const [round] = await db.insert(tournamentRounds).values(roundData).returning();
=======
    type RDbInsert = typeof tournamentRounds.$inferInsert;
    const normalized: RDbInsert = {
      ...roundData,
      startDate:
        typeof (roundData as any).startDate === "string"
          ? new Date((roundData as any).startDate)
          : (roundData as any).startDate,
    } as RDbInsert;
    const [round] = await db.insert(tournamentRounds).values(normalized as any).returning();
    if (!round) throw new Error("round_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return round;
  }

  async updateRound(id: string, tournamentId: string, roundData: Partial<InsertTournamentRound>): Promise<TournamentRound> {
<<<<<<< HEAD
    const [round] = await db
      .update(tournamentRounds)
      .set(roundData)
      .where(and(eq(tournamentRounds.id, id), eq(tournamentRounds.tournamentId, tournamentId)))
      .returning();
=======
    const { startDate, ...rest } = roundData as any;
    const updateData: any = { ...rest };
    if (startDate !== undefined) {
      updateData.startDate = typeof startDate === "string" ? new Date(startDate) : (startDate as Date);
    } else {
      delete updateData.startDate;
    }
    const [round] = await db
      .update(tournamentRounds)
      .set(updateData as any)
      .where(and(eq(tournamentRounds.id, id), eq(tournamentRounds.tournamentId, tournamentId)))
      .returning();
    if (!round) throw new Error("round_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    const [match] = await db.insert(matches).values(matchData).returning();
=======
    type MDbInsert = typeof matches.$inferInsert;
    const normalized: MDbInsert = {
      ...matchData,
      date: typeof matchData.date === "string" ? new Date(matchData.date) : matchData.date,
    } as MDbInsert;
    const [match] = await db.insert(matches).values(normalized as any).returning();
    if (!match) throw new Error("match_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return match;
  }

  async updateMatch(id: string, tenantId: string, matchData: Partial<InsertMatch>): Promise<Match> {
<<<<<<< HEAD
    const [match] = await db
      .update(matches)
      .set({ ...matchData, updatedAt: new Date() })
      .where(and(eq(matches.id, id), eq(matches.tenantId, tenantId)))
      .returning();
=======
    type MDbInsert = typeof matches.$inferInsert;
    const { date, ...rest } = matchData as any;
    const normalized: Partial<MDbInsert> = { ...rest, updatedAt: new Date() } as any;
    if (date !== undefined) {
      (normalized as any).date = typeof date === "string" ? new Date(date) : (date as Date);
    } else {
      delete (normalized as any).date;
    }
    const [match] = await db
      .update(matches)
      .set(normalized as any)
      .where(and(eq(matches.id, id), eq(matches.tenantId, tenantId)))
      .returning();
    if (!match) throw new Error("match_update_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    const [campaign] = await db.insert(campaigns).values({
      ...campaignData,
      platforms: campaignData.platforms as any,
    }).returning();
=======
    type CgDbInsert = typeof campaigns.$inferInsert;
    const normalized: CgDbInsert = {
      ...campaignData,
      startDate:
        typeof campaignData.startDate === "string"
          ? new Date(campaignData.startDate)
          : campaignData.startDate,
      endDate:
        typeof campaignData.endDate === "string"
          ? new Date(campaignData.endDate)
          : campaignData.endDate,
      platforms: campaignData.platforms as any,
    } as CgDbInsert;
    const [campaign] = await db.insert(campaigns).values(normalized as any).returning();
    if (!campaign) throw new Error("campaign_create_failed");
>>>>>>> e6da67b (feat(repo): initial clean upload)
    return campaign;
  }

  async updateCampaign(id: string, tenantId: string, campaignData: Partial<InsertCampaign>): Promise<Campaign> {
<<<<<<< HEAD
    const updateData: any = { ...campaignData, updatedAt: new Date() };
    if (campaignData.platforms) {
      updateData.platforms = campaignData.platforms as any;
    }
    const [campaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .returning();
=======
    const { startDate, endDate, platforms, ...rest } = campaignData as any;
    const updateData: any = { ...rest, updatedAt: new Date() };
    if (platforms !== undefined) updateData.platforms = platforms as any;
    if (startDate !== undefined)
      updateData.startDate = typeof startDate === "string" ? new Date(startDate) : (startDate as Date);
    if (endDate !== undefined)
      updateData.endDate = typeof endDate === "string" ? new Date(endDate) : (endDate as Date);
    const [campaign] = await db
      .update(campaigns)
      .set(updateData as any)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .returning();
    if (!campaign) throw new Error("campaign_update_failed");
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
    type CDbInsert = typeof contracts.$inferInsert;
    const normalized: CDbInsert = {
      ...contractData,
      expirationDate:
        typeof contractData.expirationDate === "string"
          ? new Date(contractData.expirationDate)
          : contractData.expirationDate,
    } as CDbInsert;
    const [contract] = await db.insert(contracts).values(normalized as any).returning();
    if (!contract) throw new Error("contract_create_failed");
    
    return contract;
  }

  async updateContract(id: string, tenantId: string, contractData: Partial<InsertContract>): Promise<Contract> {
    type CDbInsert = typeof contracts.$inferInsert;
    const { expirationDate, ...rest } = contractData as any;
    const normalized: Partial<CDbInsert> = { ...rest, updatedAt: new Date() } as any;
    if (expirationDate !== undefined) {
      (normalized as any).expirationDate =
        typeof expirationDate === "string"
          ? new Date(expirationDate)
          : (expirationDate as Date);
    } else {
      delete (normalized as any).expirationDate;
    }
    const [contract] = await db
      .update(contracts)
      .set(normalized as any)
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
      .returning();
    if (!contract) throw new Error("contract_update_failed");
    
    return contract;
  }

  async deleteContract(id: string, tenantId: string): Promise<void> {
    await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)));
  }

  // Contract file operations - placeholder implementations
  async getContractFiles(contractId: string): Promise<any[]> {
    // For now, return empty array - this would need proper file storage implementation
    return [];
  }

  async createContractFile(file: { contractId: string; fileName: string; fileUrl: string; [key: string]: any }): Promise<any> {
    // For now, return the file data with an ID - this would need proper file storage implementation
    return { id: `file_${Date.now()}`, ...file, createdAt: new Date(), updatedAt: new Date() };
  }

  async getContractFile(fileId: string, contractId: string): Promise<any | undefined> {
    // For now, return undefined - this would need proper file storage implementation
    return undefined;
  }

  async deleteContractFile(fileId: string, contractId: string): Promise<void> {
    // For now, do nothing - this would need proper file storage implementation
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
    if (!log) throw new Error("audit_log_create_failed");
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
    if (!tenant) throw new Error("tenant_update_failed");
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
    if (!user) throw new Error("user_update_failed");
    return user;
  }
  
  // Stripe operations
  async updateTenantStripe(id: string, stripeData: Partial<Pick<Tenant, 'stripeCustomerId' | 'stripeSubscriptionId' | 'subscriptionPlan' | 'subscriptionStatus'>>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...stripeData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    if (!tenant) throw new Error("tenant_stripe_update_failed");
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

  async getInvite(id: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.id, id));
    return invite;
  }

  async createInvite(inviteData: InsertInvite): Promise<Invite> {
    const [invite] = await db.insert(invites).values({
      ...inviteData,
      permissions: inviteData.permissions as any,
    }).returning();
    if (!invite) throw new Error("invite_create_failed");
    return invite;
  }

  async updateInviteStatus(token: string, status: "pending" | "accepted" | "expired"): Promise<Invite> {
    const [invite] = await db
      .update(invites)
      .set({ status })
      .where(eq(invites.token, token))
      .returning();
    if (!invite) throw new Error("invite_update_failed");
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
    if (!newAccount) throw new Error("social_account_create_failed");
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
    if (!updated) throw new Error("social_account_update_failed");
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
    type SmDbInsert = typeof socialMetrics.$inferInsert;
    const normalized: SmDbInsert = {
      ...metric,
      date: typeof metric.date === "string" ? new Date(metric.date) : metric.date,
    } as SmDbInsert;
    const [newMetric] = await db.insert(socialMetrics).values(normalized as any).returning();
    if (!newMetric) throw new Error("social_metric_create_failed");
    
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
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.date));
    return rows;
  }

  async getTransaction(id: string, tenantId: string): Promise<Transaction | undefined> {
    const [row] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)));
    return row;
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    type TxDbInsert = typeof transactions.$inferInsert;
    const normalized: TxDbInsert = {
      ...transactionData,
      date:
        typeof transactionData.date === "string"
          ? new Date(transactionData.date)
          : transactionData.date,
    } as TxDbInsert;
    const [row] = await db.insert(transactions).values(normalized as any).returning();
    if (!row) throw new Error("transaction_create_failed");
    return row;
  }

  async updateTransaction(id: string, tenantId: string, transactionData: Partial<InsertTransaction>): Promise<Transaction> {
    type TxDbInsert = typeof transactions.$inferInsert;
    const { date, ...rest } = transactionData as any;
    const normalized: Partial<TxDbInsert> = { ...rest, updatedAt: new Date() } as any;
    if (date !== undefined) {
      (normalized as any).date =
        typeof date === "string" ? new Date(date) : (date as Date);
    } else {
      delete (normalized as any).date;
    }
    const [row] = await db
      .update(transactions)
      .set(normalized as any)
    
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .returning();
    if (!row) throw new Error("transaction_update_failed");
    return row;
  }

  async deleteTransaction(id: string, tenantId: string): Promise<void> {
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)));
  }

  // Wallet operations (Postgres/Drizzle)
  async getWalletsByTenant(tenantId: string): Promise<Wallet[]> {
    const rows = await db.select().from(wallets).where(eq(wallets.tenantId, tenantId));
    return rows;
  }

  async getWallet(id: string, tenantId: string): Promise<Wallet | undefined> {
    const [row] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.tenantId, tenantId)));
    return row;
  }

  async createWallet(walletData: InsertWallet): Promise<Wallet> {
    const [row] = await db.insert(wallets).values(walletData).returning();
    if (!row) throw new Error("wallet_create_failed");
    return row;
  }

  async updateWallet(id: string, tenantId: string, walletData: Partial<InsertWallet>): Promise<Wallet> {
    const [row] = await db
      .update(wallets)
      .set({ ...walletData, updatedAt: new Date() })
      .where(and(eq(wallets.id, id), eq(wallets.tenantId, tenantId)))
      .returning();
    if (!row) throw new Error("wallet_update_failed");
    return row;
  }

  async deleteWallet(id: string, tenantId: string): Promise<void> {
    await db.delete(wallets).where(and(eq(wallets.id, id), eq(wallets.tenantId, tenantId)));
  }
}
