import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "NexusSuite/.env") });
import { getFirestore } from "../../auth/firebase";
import { supabase } from "../supabase";
import { createClient } from "@supabase/supabase-js";

type Doc = Record<string, any>;

const s = supabase ?? createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY), { auth: { persistSession: false } });

async function upsert(table: string, rows: any[]) {
  const chunks: any[][] = [];
  const size = 500;
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  for (const c of chunks) {
    const { error } = await s.from(table).upsert(c, { onConflict: table === "accounts" ? "account_id,provider_id" : undefined });
    if (error) throw error;
  }
}

function iso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v.toDate) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return null;
}

function pickTs(x: any, a: string, b: string): string | null {
  return iso(x[a]) ?? iso(x[b]) ?? null;
}

async function migrateGeneric(db: FirebaseFirestore.Firestore, collectionName: string, tableName: string) {
  const snap = await db.collection(collectionName).get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      data: x,
      created_at: pickTs(x, "createdAt", "created_at"),
      updated_at: pickTs(x, "updatedAt", "updated_at"),
    };
  });
  await upsert(tableName, rows);
  return rows.length;
}

async function migrateUsers(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("users").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      email: x.email ?? null,
      name: x.name ?? null,
      organization_id: x.organizationId ?? null,
      role: x.role ?? null,
    };
  });
  await upsert("users", rows);
  return rows.length;
}

async function migrateAccounts(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("accounts").get();
  const raw = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      user_id: x.userId,
      provider_id: x.providerId,
      account_id: x.accountId,
      password_hash: x.password ?? x.hashedPassword ?? null,
    };
  });
  const seen = new Set<string>();
  const rows = raw.filter((r) => {
    const k = `${r.account_id}|${r.provider_id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await upsert("accounts", rows);
  return rows.length;
}

async function migrateSessions(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("sessions").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      token: x.sessionToken || d.id,
      user_id: x.userId,
      expires_at: iso(x.expires) ?? null,
    };
  });
  await upsert("sessions", rows);
  return rows.length;
}

async function migrateOrganizations(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("organizations").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      name: x.name,
      slug: x.slug,
      owner_id: x.ownerId,
      metadata: x.metadata ?? {},
      created_at: iso(x.createdAt),
      updated_at: iso(x.updatedAt),
      member_count: x.memberCount ?? null,
      status: x.status ?? null,
      subscription_plan: x.subscriptionPlan ?? null,
      subscription_status: x.subscriptionStatus ?? null,
      max_members: x.maxMembers ?? null,
      settings: x.settings ?? {},
      usage: x.usage ?? {},
      billing: x.billing ?? {},
      description: x.description ?? null,
    };
  });
  await upsert("organizations", rows);
  return rows.length;
}

async function migrateOrgMembers(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("org_members").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      organization_id: x.organizationId,
      user_id: x.userId,
      role: x.role,
      permissions: x.permissions ?? [],
      is_active: x.isActive ?? true,
      joined_at: iso(x.joinedAt),
      invited_by: x.invitedBy ?? null,
      created_at: iso(x.createdAt),
      updated_at: iso(x.updatedAt),
    };
  });
  await upsert("org_members", rows);
  return rows.length;
}

async function migrateBillingCustomers(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("billing_customers").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      organization_id: x.organizationId,
      polar_customer_id: x.polarCustomerId,
      email: x.email ?? null,
      name: x.name ?? null,
      phone: x.phone ?? null,
      address: x.address ?? {},
      metadata: x.metadata ?? {},
      created_at: iso(x.createdAt),
      updated_at: iso(x.updatedAt),
    };
  });
  await upsert("billing_customers", rows);
  return rows.length;
}

async function migrateSubscriptions(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("subscriptions").get();
  const rows = snap.docs.map((d) => {
    const x = d.data() as Doc;
    return {
      id: d.id,
      organization_id: x.organizationId,
      user_id: x.userId ?? null,
      plan: x.plan ?? null,
      status: x.status ?? null,
      interval: x.billingInterval ?? null,
      current_period_start: iso(x.currentPeriodStart),
      current_period_end: iso(x.currentPeriodEnd),
      cancel_at_period_end: x.cancelAtPeriodEnd ?? null,
      canceled_at: iso(x.canceledAt),
      customer_id: x.customerId ?? null,
      subscription_id: x.subscriptionId ?? null,
      price_id: x.priceId ?? null,
      quantity: x.quantity ?? null,
      metadata: x.metadata ?? {},
      created_at: iso(x.createdAt),
      updated_at: iso(x.updatedAt),
    };
  });
  await upsert("subscriptions", rows);
  return rows.length;
}

async function main() {
  console.log(JSON.stringify({ env: { hasUrl: !!process.env.SUPABASE_URL, hasKey: !!(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY) } }));
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)) throw new Error("Supabase disabled");
  const db = getFirestore();
  const results: Record<string, number> = {};
  results.users = await migrateUsers(db);
  results.accounts = await migrateAccounts(db);
  results.sessions = await migrateSessions(db);
  results.organizations = await migrateOrganizations(db);
  results.org_members = await migrateOrgMembers(db);
  results.billing_customers = await migrateBillingCustomers(db);
  results.subscriptions = await migrateSubscriptions(db);
  results.audit_logs = await migrateGeneric(db, "auditLogs", "audit_logs");
  results.tenants = await migrateGeneric(db, "tenants", "tenants");
  results.org_tenant_map = await migrateGeneric(db, "orgTenantMap", "org_tenant_map");
  results.invitations = await migrateGeneric(db, "invites", "invitations");
  results.staff = await migrateGeneric(db, "staff", "staff");
  results.tournaments = await migrateGeneric(db, "tournaments", "tournaments");
  results.tournament_rounds = await migrateGeneric(db, "tournamentRounds", "tournament_rounds");
  results.transactions = await migrateGeneric(db, "transactions", "transactions");
  results.contracts = await migrateGeneric(db, "contracts", "contracts");
  results.wallets = await migrateGeneric(db, "wallets", "wallets");
  results.matches = await migrateGeneric(db, "matches", "matches");
  results.rosters = await migrateGeneric(db, "rosters", "rosters");
  results.files = await migrateGeneric(db, "files", "files");
  results.payroll = await migrateGeneric(db, "payroll", "payroll");
  console.log(JSON.stringify({ success: true, migrated: results }));
}

main().catch((e) => {
  console.error(JSON.stringify({ success: false, error: String(e?.message || e) }));
  process.exit(1);
});