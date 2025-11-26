import { getSupabase } from "./db/useSupabase";

type WithId<T> = T & { id: string };

function now() {
  return new Date();
}

function flattenRow<T>(row: any): WithId<T> | undefined {
  if (!row) return undefined as any;
  const base = (row.data && typeof row.data === "object") ? row.data : {};
  return { id: String(row.id), ...(base as any) } as WithId<T>;
}

async function getByIdGeneric<T>(table: string, id: string): Promise<WithId<T> | undefined> {
  const s = getSupabase();
  const { data, error } = await s!.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return flattenRow<T>(data);
}

async function listByTenantGeneric<T>(table: string, tenantId: string, orderField = "createdAt"): Promise<WithId<T>[]> {
  const s = getSupabase();
  const { data, error } = await s!.from(table).select("*").contains("data", { tenantId });
  if (error) throw error;
  const items = (data || []).map((r: any) => flattenRow<T>(r)!) as WithId<T>[];
  items.sort((a: any, b: any) => {
    const av = (a as any)[orderField];
    const bv = (b as any)[orderField];
    const at = av ? new Date(av).getTime() : 0;
    const bt = bv ? new Date(bv).getTime() : 0;
    return bt - at;
  });
  return items;
}

async function createDocGeneric<T>(table: string, data: any): Promise<WithId<T>> {
  const s = getSupabase();
  const id = data?.id || `${table}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const payload = {
    id,
    data: JSON.parse(JSON.stringify({ ...data, id }, (_k, v) => (v === undefined ? null : v))),
    created_at: (data?.createdAt instanceof Date ? data.createdAt.toISOString() : data?.createdAt) || now().toISOString(),
    updated_at: now().toISOString(),
  };
  const { data: inserted, error } = await s!.from(table).upsert(payload).select("*").maybeSingle();
  if (error) throw error;
  return flattenRow<T>(inserted)!;
}

async function updateDocGeneric<T>(table: string, id: string, patch: any): Promise<WithId<T>> {
  const s = getSupabase();
  const { data: existing, error: errSel } = await s!.from(table).select("*").eq("id", id).maybeSingle();
  if (errSel) throw errSel;
  const base = existing?.data || {};
  const merged = JSON.parse(JSON.stringify({ ...base, ...patch }, (_k, v) => (v === undefined ? null : v)));
  const { data: updated, error } = await s!.from(table).update({ data: merged, updated_at: now().toISOString() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return flattenRow<T>(updated)!;
}

export const storage = {
  async getUser(id: string) {
    const s = getSupabase();
    const { data, error } = await s!.from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    return { id: String(data.id), email: data.email, name: data.name, organizationId: data.organization_id, role: data.role } as any;
  },
  async getUserByEmail(email: string) {
    const s = getSupabase();
    const { data, error } = await s!.from("users").select("*").eq("email", email).maybeSingle();
    if (error) throw error;
    if (!data) return undefined as any;
    return { id: String(data.id), email: data.email, name: data.name, organizationId: data.organization_id, role: data.role } as any;
  },
  async createUser(user: any) {
    const s = getSupabase();
    const payload = {
      id: user.id || `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      email: user.email ?? null,
      name: user.name ?? null,
      organization_id: user.organizationId ?? null,
      role: user.role ?? null,
    };
    const { data, error } = await s!.from("users").upsert(payload).select("*").maybeSingle();
    if (error) throw error;
    return { id: String(data.id), email: data.email, name: data.name, organizationId: data.organization_id, role: data.role } as any;
  },
  async updateUser(id: string, patch: any) {
    const s = getSupabase();
    const update = {
      email: patch.email ?? undefined,
      name: patch.name ?? undefined,
      organization_id: patch.organizationId ?? undefined,
      role: patch.role ?? undefined,
    } as any;
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    const { data, error } = await s!.from("users").update(update).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return { id: String(data.id), email: data.email, name: data.name, organizationId: data.organization_id, role: data.role } as any;
  },

  async getTenant(id: string) { return getByIdGeneric<any>("tenants", id); },
  async createTenant(tenant: any) { return createDocGeneric<any>("tenants", tenant); },
  async updateTenantAdmin(id: string, patch: any) { return updateDocGeneric<any>("tenants", id, patch); },
  async deleteTenant(id: string) { const s = getSupabase(); await s!.from("tenants").delete().eq("id", id); },

  async getMatchesByTenant(tenantId: string) { return listByTenantGeneric<any>("matches", tenantId, "date"); },
  async createMatch(match: any) { return createDocGeneric<any>("matches", match); },

  async getCampaignsByTenant(tenantId: string) {
    try {
      return listByTenantGeneric<any>("campaigns", tenantId, "startDate");
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("schema cache") || msg.includes("Could not find the table") || msg.toLowerCase().includes("relation") || msg.toLowerCase().includes("table")) {
        return [] as any[];
      }
      return [] as any[];
    }
  },
  async createCampaign(campaign: any) { return createDocGeneric<any>("campaigns", campaign); },

  async createAuditLog(log: any) { return createDocGeneric<any>("audit_logs", log); },
  async getAuditLogsByTenant(tenantId: string, limit = 100) {
    const s = getSupabase();
    const { data, error } = await s!.from("audit_logs").select("*").contains("data", { tenantId }).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((r: any) => flattenRow<any>(r)!);
  },

  async getStaffByTenant(tenantId: string) { return listByTenantGeneric<any>("staff", tenantId); },
  async createStaff(staff: any) { return createDocGeneric<any>("staff", staff); },

  async getPayrollByTenant(tenantId: string) { return listByTenantGeneric<any>("payroll", tenantId, "date"); },
  async createPayroll(payroll: any) { return createDocGeneric<any>("payroll", payroll); },

  // Contracts
  async getContractsByTenant(tenantId: string) { return listByTenantGeneric<any>("contracts", tenantId, "createdAt"); },
  async getContract(id: string, tenantId: string) { const row = await getByIdGeneric<any>("contracts", id); return (row && row.tenantId === tenantId) ? row : undefined as any; },
  async createContract(contract: any) { return createDocGeneric<any>("contracts", contract); },
  async updateContract(id: string, patch: any) { return updateDocGeneric<any>("contracts", id, patch); },
  async deleteContract(id: string) { const s = getSupabase(); await s!.from("contracts").delete().eq("id", id); },

  // Rosters
  async getRostersByTenant(tenantId: string) { return listByTenantGeneric<any>("rosters", tenantId, "createdAt"); },
  async getRoster(id: string, tenantId: string) { const row = await getByIdGeneric<any>("rosters", id); return (row && row.tenantId === tenantId) ? row : undefined as any; },
  async createRoster(roster: any) { return createDocGeneric<any>("rosters", roster); },
  async updateRoster(id: string, patch: any) { return updateDocGeneric<any>("rosters", id, patch); },
  async deleteRoster(id: string) { const s = getSupabase(); await s!.from("rosters").delete().eq("id", id); },

  // Tournaments
  async getTournamentsByTenant(tenantId: string) { return listByTenantGeneric<any>("tournaments", tenantId, "createdAt"); },
  async getTournament(id: string, tenantId: string) { const row = await getByIdGeneric<any>("tournaments", id); return (row && row.tenantId === tenantId) ? row : undefined as any; },
  async createTournament(tournament: any) { return createDocGeneric<any>("tournaments", tournament); },
  async updateTournament(id: string, patch: any) { return updateDocGeneric<any>("tournaments", id, patch); },
  async deleteTournament(id: string) { const s = getSupabase(); await s!.from("tournaments").delete().eq("id", id); },

  async getRoundsByTournament(tournamentId: string) {
    const s = getSupabase();
    const { data, error } = await s!.from("rounds").select("*").contains("data", { tournamentId });
    if (error) throw error;
    return (data || []).map((r: any) => flattenRow<any>(r)!);
  },
  async getRound(id: string) { return getByIdGeneric<any>("rounds", id); },
  async createRound(round: any) { return createDocGeneric<any>("rounds", round); },
  async updateRound(id: string, patch: any) { return updateDocGeneric<any>("rounds", id, patch); },
  async deleteRound(id: string) { const s = getSupabase(); await s!.from("rounds").delete().eq("id", id); },
};

export type Storage = typeof storage;
