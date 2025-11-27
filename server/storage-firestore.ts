import { getFirestore } from "./firebase";
import type {
  User, UpsertUser,
  Tenant, InsertTenant,
  Staff, InsertStaff,
  Payroll, InsertPayroll,
  Match, InsertMatch,
  Campaign, InsertCampaign,
  Contract, InsertContract,
  AuditLog, InsertAuditLog,
  Invite, InsertInvite,
  SocialAccount, InsertSocialAccount,
  SocialMetric, InsertSocialMetric,
  Transaction, InsertTransaction,
  Tournament, InsertTournament,
  TournamentRound, InsertTournamentRound,
  Roster, InsertRoster,
  Wallet, InsertWallet, // <-- already present per your view
} from "../shared/schema";
import type { IStorage } from "./storage";

type WithId<T> = T & { id: string };

function now() {
  return new Date();
}

function col(name: string) { return getFirestore().collection(name); }

// Define an optional UploadedFile type for Firestore file storage helpers
// This keeps file operations centralized if you later decide to move logic here
export type UploadedFile = {
  tenantId: string;
  fileName: string;
  base64: string;
  contentType?: string | null;
  createdAt?: any;
  updatedAt?: any;
};
async function getById<T>(collection: string, id: string): Promise<WithId<T> | undefined> {
  const snap = await col(collection).doc(id).get();
  if (!snap.exists) return undefined;
  const raw = snap.data() as any;
  const { id: _id, ...rest } = raw;
  return { id: snap.id, ...rest } as WithId<T>;
}

async function listAll<T>(collection: string): Promise<WithId<T>[]> {
  const snap = await col(collection).get();
  return snap.docs.map((d: any) => { const raw = d.data() as any; const { id: _id, ...rest } = raw; return { id: d.id, ...rest } as WithId<T>; });
}

async function listByTenant<T>(collection: string, tenantId: string, orderField = "createdAt"): Promise<WithId<T>[]> {
  try {
    const snap = await col(collection)
      .where("tenantId", "==", tenantId)
      .orderBy(orderField, "desc")
      .get();
    return snap.docs.map((d: any) => { const raw = d.data() as any; const { id: _id, ...rest } = raw; return { id: d.id, ...rest } as WithId<T>; });
  } catch (err: any) {
    if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
      const snap = await col(collection)
        .where("tenantId", "==", tenantId)
        .get();
      const items = snap.docs.map((d: any) => {
        const data = d.data() as any;
        const { id: _id, ...rest } = data;
        return { id: d.id, ...rest } as WithId<T>;
      });
      items.sort((a: any, b: any) => {
        const av = (a as any)[orderField];
        const bv = (b as any)[orderField];
        const at = av?.toMillis ? av.toMillis() : (av ? new Date(av).getTime() : 0);
        const bt = bv?.toMillis ? bv.toMillis() : (bv ? new Date(bv).getTime() : 0);
        return bt - at;
      });
      return items;
    }
    throw err;
  }
}

async function createDoc<T>(collection: string, data: any): Promise<WithId<T>> {
  const id = data.id || col(collection).doc().id;
  const payload = { ...data, id, createdAt: data.createdAt ?? now(), updatedAt: now() };
  await col(collection).doc(id).set(payload);
  return payload;
}

async function updateDoc<T>(collection: string, id: string, patch: any): Promise<WithId<T>> {
  const payload = { ...patch, updatedAt: now() };
  await col(collection).doc(id).set(payload, { merge: true });
  const snap = await col(collection).doc(id).get();
  const raw = snap.data() as any;
  const { id: _id, ...rest } = raw;
  return { id, ...rest } as WithId<T>;
}

async function deleteDoc(collection: string, id: string): Promise<void> {
  await col(collection).doc(id).delete();
}

class FirestoreStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    return await getById<User>("users", id);
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const snap = await col("users").where("email", "==", email).limit(1).get();
    const doc = snap.docs[0];
    return doc ? (() => { const raw = doc.data() as User; const { id: _id, ...rest } = raw; return { id: doc.id, ...rest }; })() : undefined;
  }
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await listByTenant<User>("users", tenantId);
  }
  async createUser(userData: UpsertUser): Promise<User> {
    return await createDoc<User>("users", userData);
  }
  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    return await updateDoc<User>("users", id, userData);
  }
  async upsertUser(user: UpsertUser & { tenantId?: string }): Promise<User> {
    const existing = await this.getUser(user.id!);
    if (existing) {
      return await updateDoc<User>("users", user.id!, user);
    }
    return await createDoc<User>("users", user);
  }
  async deleteUser(id: string): Promise<void> { await deleteDoc("users", id); }
  async updateUserAdmin(id: string, userData: Partial<UpsertUser>): Promise<User> {
    return await updateDoc<User>("users", id, userData);
  }
  async getAllUsers(): Promise<User[]> {
    return await listAll<User>("users");
  }

  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    return await getById<Tenant>("tenants", id);
  }
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    return await createDoc<Tenant>("tenants", tenant);
  }
  async updateTenant(id: string, patch: Partial<InsertTenant>): Promise<Tenant> { return await updateDoc<Tenant>("tenants", id, patch); }
  async updateTenantAdmin(id: string, patch: Partial<InsertTenant>): Promise<Tenant> { return await updateDoc<Tenant>("tenants", id, patch); }
  async updateTenantStripe(id: string, patch: Partial<Pick<Tenant, 'stripeCustomerId' | 'stripeSubscriptionId' | 'subscriptionPlan' | 'subscriptionStatus'>>): Promise<Tenant> {
    return await updateDoc<Tenant>("tenants", id, patch);
  }
  async deleteTenant(id: string): Promise<void> {
    await deleteDoc("tenants", id);
  }
  async getAllTenants(): Promise<Tenant[]> {
    return await listAll<Tenant>("tenants");
  }

  // Staff
  async getStaffByTenant(tenantId: string): Promise<Staff[]> {
    return await listByTenant<Staff>("staff", tenantId);
  }
  async getStaff(id: string, tenantId: string): Promise<Staff | undefined> {
    const s = await getById<Staff>("staff", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createStaff(data: InsertStaff): Promise<Staff> {
    return await createDoc<Staff>("staff", data);
  }
  async updateStaff(id: string, _tenantId: string, patch: Partial<InsertStaff>): Promise<Staff> { 
    return await updateDoc<Staff>("staff", id, patch);
  }
  async deleteStaff(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("staff", id);
  }
  async getAllStaff(): Promise<Staff[]> {
    return await listAll<Staff>("staff");
  }

  // Payroll
  async getPayrollByTenant(tenantId: string): Promise<Payroll[]> {
    return await listByTenant<Payroll>("payroll", tenantId);
  }
  async getPayroll(id: string, tenantId: string): Promise<Payroll | undefined> {
    const s = await getById<Payroll>("payroll", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createPayroll(data: InsertPayroll): Promise<Payroll> {
    return await createDoc<Payroll>("payroll", data);
  }
  async updatePayroll(id: string, _tenantId: string, patch: Partial<InsertPayroll>): Promise<Payroll> {
    return await updateDoc<Payroll>("payroll", id, patch);
  }
  async deletePayroll(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("payroll", id);
  }
  async getAllPayroll(): Promise<Payroll[]> {
    return await listAll<Payroll>("payroll");
  }

  // Rosters
  async getRostersByTenant(tenantId: string): Promise<Roster[]> {
    return await listByTenant<Roster>("rosters", tenantId);
  }
  async getRoster(id: string, tenantId: string): Promise<Roster | undefined> {
    const s = await getById<Roster>("rosters", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createRoster(data: InsertRoster): Promise<Roster> {
    return await createDoc<Roster>("rosters", data);
  }
  async updateRoster(id: string, _tenantId: string, patch: Partial<InsertRoster>): Promise<Roster> {
    return await updateDoc<Roster>("rosters", id, patch);
  }
  async deleteRoster(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("rosters", id);
  }

  // Tournaments
  async getTournamentsByTenant(tenantId: string): Promise<Tournament[]> {
    return await listByTenant<Tournament>("tournaments", tenantId);
  }
  async getTournament(id: string, tenantId: string): Promise<Tournament | undefined> {
    const s = await getById<Tournament>("tournaments", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createTournament(data: InsertTournament): Promise<Tournament> {
    return await createDoc<Tournament>("tournaments", data);
  }
  async updateTournament(id: string, _tenantId: string, patch: Partial<InsertTournament>): Promise<Tournament> {
    return await updateDoc<Tournament>("tournaments", id, patch);
  }
  async deleteTournament(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("tournaments", id);
  }

  // Rounds
  async getRoundsByTournament(tournamentId: string): Promise<TournamentRound[]> {
    const snap = await col("tournamentRounds").where("tournamentId", "==", tournamentId).orderBy("createdAt", "desc").get();
    return snap.docs.map((d: any) => { const data = d.data() as Omit<TournamentRound, "id">; return { id: d.id, ...data }; });
  }
  async getRound(id: string, tournamentId: string): Promise<TournamentRound | undefined> {
    const s = await getById<TournamentRound>("tournamentRounds", id);
    return s && (s as any).tournamentId === tournamentId ? s : undefined;
  }
  async createRound(data: InsertTournamentRound): Promise<TournamentRound> {
    return await createDoc<TournamentRound>("tournamentRounds", data);
  }
  async updateRound(id: string, _tournamentId: string, patch: Partial<TournamentRound>): Promise<TournamentRound> {
    return await updateDoc<TournamentRound>("tournamentRounds", id, patch);
  }
  async deleteRound(id: string, _tournamentId: string): Promise<void> {
    return await deleteDoc("tournamentRounds", id);
  }

  // Matches
  async getMatchesByTenant(tenantId: string): Promise<Match[]> {
    return await listByTenant<Match>("matches", tenantId);
  }
  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    try {
      const snap = await col("matches")
        .where("tournamentId", "==", tournamentId)
        .orderBy("matchNumber")
        .get();
      return snap.docs.map(d => {
        const raw = d.data() as any;
        const { id: _id, ...rest } = raw;
        return { id: d.id, ...rest } as Match;
      });
    } catch (err: any) {
      if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
        const snap = await col("matches").where("tournamentId", "==", tournamentId).get();
        const items = snap.docs.map(d => {
          const raw = d.data() as any;
          const { id: _id, ...rest } = raw;
          return { id: d.id, ...rest } as Match;
        });
        items.sort((a: any, b: any) => {
          const am = (a as any)?.matchNumber ?? 0;
          const bm = (b as any)?.matchNumber ?? 0;
          return am - bm;
        });
        return items;
      }
      throw err;
    }
  }
  async getMatchesByRound(roundId: string): Promise<Match[]> {
    try {
      const snap = await col("matches")
        .where("roundId", "==", roundId)
        .orderBy("matchNumber")
        .get();
      return snap.docs.map(d => {
        const raw = d.data() as any;
        const { id: _id, ...rest } = raw;
        return { id: d.id, ...rest } as Match;
      });
    } catch (err: any) {
      if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
        const snap = await col("matches").where("roundId", "==", roundId).get();
        const items = snap.docs.map(d => {
          const raw = d.data() as any;
          const { id: _id, ...rest } = raw;
          return { id: d.id, ...rest } as Match;
        });
        items.sort((a: any, b: any) => {
          const am = (a as any)?.matchNumber ?? 0;
          const bm = (b as any)?.matchNumber ?? 0;
          return am - bm;
        });
        return items;
      }
      throw err;
    }
  }
  async getMatch(id: string, tenantId: string): Promise<Match | undefined> {
    const s = await getById<Match>("matches", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createMatch(data: InsertMatch): Promise<Match> {
    return await createDoc<Match>("matches", data);
  }
  async updateMatch(id: string, _tenantId: string, patch: Partial<Match>): Promise<Match> {
    return await updateDoc<Match>("matches", id, patch);
  }
  async deleteMatch(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("matches", id);
  }
  async getAllMatches(): Promise<Match[]> {
    return await listAll<Match>("matches");
  }

  // Campaigns
  async getCampaignsByTenant(tenantId: string): Promise<Campaign[]> {
    return await listByTenant<Campaign>("campaigns", tenantId);
  }
  async getCampaign(id: string, tenantId: string): Promise<Campaign | undefined> {
    const s = await getById<Campaign>("campaigns", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    return await createDoc<Campaign>("campaigns", data);
  }
  async updateCampaign(id: string, _tenantId: string, patch: Partial<Campaign>): Promise<Campaign> {
    return await updateDoc<Campaign>("campaigns", id, patch);
  }
  async deleteCampaign(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("campaigns", id);
  }
  async getAllCampaigns(): Promise<Campaign[]> {
    return await listAll<Campaign>("campaigns");
  }

  // Contracts
  async getContractsByTenant(tenantId: string): Promise<Contract[]> {
    return await listByTenant<Contract>("contracts", tenantId);
  }
  async getContract(id: string, tenantId: string): Promise<Contract | undefined> {
    const s = await getById<Contract>("contracts", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createContract(data: InsertContract): Promise<Contract> {
    return await createDoc<Contract>("contracts", data);
  }
  async updateContract(id: string, _tenantId: string, patch: Partial<Contract>): Promise<Contract> {
    return await updateDoc<Contract>("contracts", id, patch);
  }
  async deleteContract(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("contracts", id);
  }
  async getAllContracts(): Promise<Contract[]> {
    return listAll<Contract>("contracts");
  }

  // Contract file operations
  async getContractFiles(contractId: string): Promise<any[]> {
    try {
      const snap = await col("contractFiles")
        .where("contractId", "==", contractId)
        .orderBy("createdAt", "desc")
        .get();
      return snap.docs.map(d => {
        const data = d.data() as any;
        const { id: _id, ...rest } = data;
        return { id: d.id, ...rest };
      });
    } catch (err: any) {
      if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
        const snap = await col("contractFiles")
          .where("contractId", "==", contractId)
          .get();
        const items = snap.docs.map(d => {
          const data = d.data() as any;
          const { id: _id, ...rest } = data;
          return { id: d.id, ...rest };
        });
        items.sort((a: any, b: any) => {
          const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return bt - at;
        });
        return items;
      }
      throw err;
    }
  }

  async createContractFile(file: { contractId: string; fileName: string; fileUrl: string; [key: string]: any }): Promise<any> {
    return createDoc<any>("contractFiles", file);
  }

  async getContractFile(fileId: string, contractId: string): Promise<any | undefined> {
    const file = await getById<any>("contractFiles", fileId);
    if (file && file.contractId === contractId) {
      return file;
    }
    return undefined;
  }

  async deleteContractFile(fileId: string, contractId: string): Promise<void> {
    // Verify the file belongs to the contract before deleting
    const file = await this.getContractFile(fileId, contractId);
    if (file) {
      await deleteDoc("contractFiles", fileId);
    }
  }

  // Audit Logs
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    return await createDoc<AuditLog>("auditLogs", data);
  }
  async getAuditLogsByTenant(tenantId: string, limit: number): Promise<AuditLog[]> {
    try {
      const snap = await col("auditLogs")
        .where("tenantId", "==", tenantId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      return snap.docs.map(d => { const data = d.data() as Omit<AuditLog, "id">; return { id: d.id, ...data }; });
    } catch (err: any) {
      if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
        const snap = await col("auditLogs")
          .where("tenantId", "==", tenantId)
          .get();
        const items = snap.docs.map(d => {
          const data = d.data() as Omit<AuditLog, "id">;
          return { id: d.id, ...data };
        });
        items.sort((a: any, b: any) => {
          const av = a?.createdAt;
          const bv = b?.createdAt;
          const at = av?.toMillis ? av.toMillis() : new Date(av).getTime();
          const bt = bv?.toMillis ? bv.toMillis() : new Date(bv).getTime();
          return bt - at;
        });
        return items.slice(0, limit);
      }
      throw err;
    }
  }
  async getAllAuditLogs(limit = 1000): Promise<AuditLog[]> {
    const snap = await col("auditLogs").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map(d => {
      const data = d.data() as Omit<AuditLog, "id">;
      return { id: d.id, ...data };
    });
  }

  // Invites
  async getInvitesByTenant(tenantId: string): Promise<Invite[]> {
    return await listByTenant<Invite>("invites", tenantId);
  }
  async getInvite(id: string): Promise<Invite | undefined> {
    return await getById<Invite>("invites", id);
  }
  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const snap = await col("invites").where("token", "==", token).limit(1).get();
    const doc = snap.docs[0];
    return doc ? (() => { const raw = doc.data() as Invite; const { id: _id, ...rest } = raw; return { id: doc.id, ...rest }; })() : undefined;
  }
  async createInvite(data: InsertInvite): Promise<Invite> {
    return await createDoc<Invite>("invites", data);
  }
  async deleteInvite(id: string, _tenantId: string): Promise<void> {
    await deleteDoc("invites", id);
  }
  async updateInviteStatus(token: string, status: "pending" | "accepted" | "expired"): Promise<Invite> {
    const snap = await col("invites").where("token", "==", token).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) throw new Error("Invite not found");
    await doc.ref.set({ status, updatedAt: now() }, { merge: true });
    const updated = await doc.ref.get();
    const raw = updated.data() as Invite;
    const { id: _id, ...rest } = raw || ({} as Invite);
    return { id: updated.id, ...rest, status } as Invite;
  }
  async getAllInvites(): Promise<Invite[]> {
    return await listAll<Invite>("invites");
  }

  // Social Accounts
  async getSocialAccountsByTenant(tenantId: string): Promise<SocialAccount[]> {
    return await listByTenant<SocialAccount>("socialAccounts", tenantId);
  }
  async getSocialAccount(id: string, tenantId: string): Promise<SocialAccount | undefined> {
    const s = await getById<SocialAccount>("socialAccounts", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  async createSocialAccount(data: InsertSocialAccount): Promise<SocialAccount> {
    return await createDoc<SocialAccount>("socialAccounts", data);
  }
  async updateSocialAccount(id: string, _tenantId: string, patch: Partial<SocialAccount>): Promise<SocialAccount> {
    return await updateDoc<SocialAccount>("socialAccounts", id, patch);
  }
  async deleteSocialAccount(id: string, _tenantId: string): Promise<void> {
    return await deleteDoc("socialAccounts", id);
  }

  // Social Metrics
  async getSocialMetricsByTenant(tenantId: string, limit: number = 100): Promise<SocialMetric[]> {
    try {
      const snap = await col("socialMetrics")
        .where("tenantId", "==", tenantId)
        .orderBy("date", "desc")
        .limit(limit)
        .get();
      return snap.docs.map(d => {
        const raw = d.data() as any;
        const { id: _id, ...rest } = raw;
        return { id: d.id, ...rest } as SocialMetric;
      });
    } catch (err: any) {
      if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
        const snap = await col("socialMetrics")
          .where("tenantId", "==", tenantId)
          .get();
        const items = snap.docs.map(d => {
          const raw = d.data() as any;
          const { id: _id, ...rest } = raw;
          return { id: d.id, ...rest } as SocialMetric;
        });
        items.sort((a: any, b: any) => {
          const av = (a as any)?.date;
          const bv = (b as any)?.date;
          const at = av?.toMillis ? av.toMillis() : (av ? new Date(av).getTime() : 0);
          const bt = bv?.toMillis ? bv.toMillis() : (bv ? new Date(bv).getTime() : 0);
          return bt - at;
        });
        return items.slice(0, limit);
      }
      throw err;
    }
  }

  async getSocialMetricsByAccount(accountId: string, limit: number = 30): Promise<SocialMetric[]> {
    try {
      const snap = await col("socialMetrics")
        .where("accountId", "==", accountId)
        .orderBy("date", "desc")
        .limit(limit)
        .get();
      return snap.docs.map(d => {
        const raw = d.data() as any;
        const { id: _id, ...rest } = raw;
        return { id: d.id, ...rest } as SocialMetric;
      });
    } catch (err: any) {
      if (err?.code === 9 || String(err?.message).includes("FAILED_PRECONDITION")) {
        const snap = await col("socialMetrics")
          .where("accountId", "==", accountId)
          .get();
        const items = snap.docs.map(d => {
          const raw = d.data() as any;
          const { id: _id, ...rest } = raw;
          return { id: d.id, ...rest } as SocialMetric;
        });
        items.sort((a: any, b: any) => {
          const av = (a as any)?.date;
          const bv = (b as any)?.date;
          const at = av?.toMillis ? av.toMillis() : (av ? new Date(av).getTime() : 0);
          const bt = bv?.toMillis ? bv.toMillis() : (bv ? new Date(bv).getTime() : 0);
          return bt - at;
        });
        return items.slice(0, limit);
      }
      throw err;
    }
  }
  async getLatestMetricsByTenant(tenantId: string): Promise<SocialMetric[]> {
    const accounts = await this.getSocialAccountsByTenant(tenantId);
    const latest: SocialMetric[] = [];
    for (const account of accounts) {
      const snap = await col("socialMetrics")
        .where("accountId", "==", account.id)
        .orderBy("date", "desc")
        .limit(1)
        .get();
      const doc = snap.docs[0];
      if (doc) {
        const data = doc.data() as Omit<SocialMetric, "id">;
        latest.push({ id: doc.id, ...data });
      }
    }
    return latest;
  }
  async createSocialMetric(data: InsertSocialMetric): Promise<SocialMetric> {
    return await createDoc<SocialMetric>("socialMetrics", data);
  }

  // Finance: Transactions
  async getTransactionsByTenant(tenantId: string): Promise<Transaction[]> {
    return await listByTenant<Transaction>("transactions", tenantId, "date");
  }
  async getTransaction(id: string, tenantId: string): Promise<Transaction | undefined> {
    const s = await getById<Transaction>("transactions", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }
  private async adjustWalletBalance(walletId: string, tenantId: string, delta: number): Promise<void> {
    const wallet = await this.getWallet(walletId, tenantId);
    if (!wallet) return;
    const current = parseFloat(String((wallet as any).balance ?? "0"));
    const next = current + delta;
    await updateDoc<Wallet>("wallets", walletId, { balance: next.toFixed(2) });
  }
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const tx = await createDoc<Transaction>("transactions", data);
    const walletId = (data as any).walletId;
    if (walletId && String(walletId).trim() !== "") {
      const delta =
        data.type === "income"
          ? parseFloat(String(data.amount))
          : -parseFloat(String(data.amount));
      await this.adjustWalletBalance(walletId, data.tenantId, delta);
    }
    return tx;
  }
  async updateTransaction(id: string, _tenantId: string, patch: Partial<Transaction>): Promise<Transaction> {
    const old = await this.getTransaction(id, _tenantId);
    const updated = await updateDoc<Transaction>("transactions", id, patch);

    if (old) {
      const oldWalletId =
        (old as any).walletId && String((old as any).walletId).trim() !== ""
          ? (old as any).walletId
          : undefined;
      const newWalletIdRaw =
        (patch as any).walletId !== undefined ? (patch as any).walletId : (old as any).walletId;
      const newWalletId =
        newWalletIdRaw && String(newWalletIdRaw).trim() !== "" ? newWalletIdRaw : undefined;

      const oldSigned = (old.type === "income" ? 1 : -1) * parseFloat(String(old.amount));
      const newType = (patch as any).type ?? old.type;
      const newAmount =
        (patch as any).amount !== undefined
          ? parseFloat(String((patch as any).amount))
          : parseFloat(String(old.amount));
      const newSigned = (newType === "income" ? 1 : -1) * newAmount;

      if (oldWalletId && newWalletId && oldWalletId === newWalletId) {
        const delta = newSigned - oldSigned;
        if (delta !== 0) await this.adjustWalletBalance(newWalletId, _tenantId, delta);
      } else {
        if (oldWalletId) await this.adjustWalletBalance(oldWalletId, _tenantId, -oldSigned);
        if (newWalletId) await this.adjustWalletBalance(newWalletId, _tenantId, newSigned);
      }
    }

    return updated;
  }
  async deleteTransaction(id: string, _tenantId: string): Promise<void> {
    const existing = await this.getTransaction(id, _tenantId);
    await deleteDoc("transactions", id);
    if (existing) {
      const walletId =
        (existing as any).walletId && String((existing as any).walletId).trim() !== ""
          ? (existing as any).walletId
          : undefined;
      if (walletId) {
        const oldSigned =
          (existing.type === "income" ? 1 : -1) * parseFloat(String(existing.amount));
        await this.adjustWalletBalance(walletId, _tenantId, -oldSigned);
      }
    }
  }

  // Wallets
  async getWalletsByTenant(tenantId: string): Promise<Wallet[]> {
    return await listByTenant<Wallet>("wallets", tenantId, "createdAt");
  }

  async getWallet(id: string, tenantId: string): Promise<Wallet | undefined> {
    const s = await getById<Wallet>("wallets", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }

  async createWallet(data: InsertWallet): Promise<Wallet> {
    const payload: InsertWallet = {
      ...data,
      balance: (data.balance ?? "0").toString(),
    };
    return await createDoc<Wallet>("wallets", payload);
  }

  async updateWallet(id: string, _tenantId: string, patch: Partial<InsertWallet>): Promise<Wallet> {
    const payload = {
      ...patch,
      balance: patch.balance !== undefined ? patch.balance.toString() : undefined,
    };
    return await updateDoc<Wallet>("wallets", id, payload);
  }

  async deleteWallet(id: string, _tenantId: string): Promise<void> {
    await deleteDoc("wallets", id);
  }

  // Files (optional helpers)
  async getFilesByTenant(tenantId: string): Promise<WithId<UploadedFile>[]> {
    return await listByTenant<UploadedFile>("files", tenantId, "createdAt");
  }

  async getFile(id: string, tenantId: string): Promise<WithId<UploadedFile> | undefined> {
    const s = await getById<UploadedFile>("files", id);
    return s && (s as any).tenantId === tenantId ? s : undefined;
  }

  async createFile(data: Omit<UploadedFile, "createdAt" | "updatedAt">): Promise<WithId<UploadedFile>> {
    const payload = {
      ...data,
      createdAt: now(),
      updatedAt: now(),
    } as UploadedFile;
    return await createDoc<UploadedFile>("files", payload);
  }

  async deleteFile(id: string, _tenantId: string): Promise<void> {
    await deleteDoc("files", id);
  }
}

export const storage = new FirestoreStorage();
