import { betterAuth } from "better-auth";
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { createAdapterFactory } from "better-auth/adapters";
import { getSupabase } from "../db/useSupabase";
import { organizationService } from "../org/service";
import { insertBillingCustomer } from "../db/repos/billingCustomers";

const supabaseAdapter = createAdapterFactory({
  config: {
    adapterId: "supabase",
    adapterName: "Supabase Adapter",
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsNumericIds: false,
  },
  adapter: ({ getDefaultModelName }) => {
    const table = (model: string) => {
      const name = getDefaultModelName(model);
      const lower = String(name).toLowerCase();
      if (lower.includes("account")) return "accounts";
      if (lower.includes("session")) return "sessions";
      if (lower.includes("user")) return "users";
      if (lower.includes("verification")) return "verification_tokens";
      const t = name.endsWith("s") ? name : `${name}s`;
      return t;
    };
    const toDb = (model: string, data: any) => {
      const t = table(model);
      if (t === "accounts") {
        return {
          id: data?.id,
          user_id: data?.userId,
          provider_id: data?.providerId,
          account_id: data?.accountId ?? data?.email ?? data?.identifier,
          password_hash: data?.passwordHash ?? data?.password,
        };
      }
      if (t === "sessions") {
        return {
          token: data?.token || data?.id,
          user_id: data?.userId,
          expires_at: data?.expiresAt || null,
        };
      }
      if (t === "users") {
        return {
          id: data?.id,
          email: data?.email || null,
          name: data?.name || null,
        };
      }
      return data;
    };
    const fromDb = (model: string, row: any) => {
      const t = table(model);
      if (t === "accounts") {
        return {
          id: row?.id,
          userId: row?.user_id,
          providerId: row?.provider_id,
          accountId: row?.account_id,
          passwordHash: row?.password_hash,
          password: row?.password_hash,
        };
      }
      if (t === "sessions") {
        return {
          token: row?.token,
          userId: row?.user_id,
          expiresAt: row?.expires_at,
        };
      }
      if (t === "users") {
        return {
          id: row?.id,
          email: row?.email,
          name: row?.name,
        };
      }
      return row;
    };
    const mapField = (model: string, field: string) => {
      const t = table(model);
      const f = String(field);
      if (t === "accounts") {
        if (f === "providerId") return "provider_id";
        if (f === "accountId") return "account_id";
        if (f === "email") return "account_id";
        if (f === "identifier") return "account_id";
        if (f === "userId") return "user_id";
        if (f === "passwordHash") return "password_hash";
      }
      if (t === "sessions") {
        if (f === "userId") return "user_id";
        if (f === "expiresAt") return "expires_at";
        if (f === "token") return "token";
      }
      if (t === "users") {
        return f;
      }
      return f;
    };
    const findOne = async (model: string, where?: any[]) => {
      const s = getSupabase();
      if (!s) return null;
      let q = s.from(table(model)).select("*");
      if (where && where.length) {
        for (const c of where) q = q.eq(mapField(model, String(c.field)), c.value);
      }
      const { data } = await q.limit(1).maybeSingle();
      if (!data) return null;
      const mapped = fromDb(model, data);
      return { id: mapped?.id || mapped?.token || mapped?.email || mapped?.accountId, data: mapped };
    };
    return {
      create: async ({ model, data }: any) => {
        const s = getSupabase();
        if (!s) return data;
        const id = (data && (data.id || data.token)) || undefined;
        const payload = toDb(model, { ...data, ...(id ? { id } : {}) });
        const { data: row } = await s.from(table(model)).insert(payload).select("*").maybeSingle();
        return fromDb(model, row || payload);
      },
      update: async ({ model, where, data }: any) => {
        const s = getSupabase();
        if (!s) return null;
        const found = await findOne(model, where);
        if (!found) return null;
        const patch = toDb(model, { ...(found.data || {}), ...data });
        const { data: row } = await s.from(table(model)).update(patch).eq("id", found.id).select("*").maybeSingle();
        return fromDb(model, row || patch);
      },
      updateMany: async ({ model, where, data }: any) => {
        const s = getSupabase();
        if (!s) return 0;
        let q = s.from(table(model)).update(toDb(model, data));
        if (where && where.length) {
          for (const c of where) q = q.eq(mapField(model, String(c.field)), c.value);
        }
        const { count } = await q.select("id", { count: "exact", head: true });
        return count || 0;
      },
      delete: async ({ model, where }: any) => {
        const s = getSupabase();
        if (!s) return null;
        const found = await findOne(model, where);
        if (!found) return null;
        await s.from(table(model)).delete().eq("id", found.id);
        return fromDb(model, found.data);
      },
      deleteMany: async ({ model, where }: any) => {
        const s = getSupabase();
        if (!s) return 0;
        let q = s.from(table(model)).delete();
        if (where && where.length) {
          for (const c of where) q = q.eq(String(c.field), c.value);
        }
        const { count } = await q.select("id", { count: "exact", head: true });
        return count || 0;
      },
      findOne: async ({ model, where }: any) => {
        const found = await findOne(model, where);
        return found ? fromDb(model, found.data) : null;
      },
      findMany: async ({ model, where, limit, offset }: any) => {
        const s = getSupabase();
        if (!s) return [];
        let q = s.from(table(model)).select("*");
        if (where && where.length) {
          for (const c of where) q = q.eq(mapField(model, String(c.field)), c.value);
        }
        if (typeof offset === "number") q = q.range(offset, offset + (limit || 50) - 1);
        else if (typeof limit === "number") q = q.limit(limit);
        const { data } = await q;
        return (data || []).map((row: any) => fromDb(model, row));
      },
      count: async ({ model, where }: any) => {
        const s = getSupabase();
        if (!s) return 0;
        let q = s.from(table(model)).select("id", { count: "exact", head: true });
        if (where && where.length) {
          for (const c of where) q = q.eq(mapField(model, String(c.field)), c.value);
        }
        const { count } = await q;
        return count || 0;
      },
    };
  },
});

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: (process.env.POLAR_SERVER || "sandbox") as any,
});

export const auth = betterAuth({
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: supabaseAdapter,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    password: {
      hash: async (password: string) => {
        const bcrypt = (await import("bcryptjs")).default;
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ hash, password }: any) => {
        const bcrypt = (await import("bcryptjs")).default;
        return await bcrypt.compare(password, hash);
      },
    },
  },

  

  plugins: [],

  
  
});
