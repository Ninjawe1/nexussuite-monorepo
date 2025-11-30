import express, { type Request, type Response, type NextFunction, type Express } from "express";
import { createClient } from "@supabase/supabase-js";

let cachedHandler: any;
let routesReady = false;
let initError: any = null;
let initStarted = false;
let initStartedAt = 0;

let readyResolve: (() => void) | null = null;
let readyReject: ((err: any) => void) | null = null;
let readyPromise: Promise<void> = new Promise<void>((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});

function startRoutesImport(app: Express) {
  if (initStarted) return;
  initStarted = true;
  initStartedAt = Date.now();

  const timeoutMs = parseInt(process.env.ROUTES_IMPORT_TIMEOUT_MS || "8000", 10);
  console.log(`[api] Starting routes import (timeout ${timeoutMs}ms)...`);

  const routesImport = import("../dist/routes.js").catch(() => import("../server/routes"));
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Routes import timeout")), timeoutMs));
  Promise.race([routesImport, timeout])
    .then(async (mod: any) => {
      const { registerRoutes } = mod;
      await registerRoutes(app);
      routesReady = true;
      initError = null;
      if (readyResolve) readyResolve();
      console.log("[api] Routes registered successfully");
      try {
        const fb = await import("../dist/firebase.js").catch(() => import("../server/firebase"));
        const getDb = (fb as any).getFirestoreDb || fb?.default?.getFirestoreDb;
        if (typeof getDb === "function") {
          getDb();
          console.log("[api] Firebase Firestore warm-up triggered");
        }
      } catch (e) {
        console.warn("[api] Firebase warm-up failed:", e);
      }
    })
    .catch((err) => {
      initError = err;
      routesReady = false;
      if (readyReject) readyReject(err);
      console.error("[api] Routes import/register failed:", err);
    });
}

async function buildHandler() {
  const app = express();
  app.set("trust proxy", 1);
  app.use((req: any, res: any, next: any) => {
    const origin = process.env.ALLOWED_ORIGIN || process.env.VITE_APP_URL || "http://localhost:5173";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
    next();
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  function getUserFromCookie(req: any) {
    const raw = String(req.headers?.cookie || "");
    const m = raw.match(/sb-access-token=([^;]+)/);
    const jwt = m ? m[1] : null;
    if (!jwt) return null;
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      const sub = payload?.sub;
      const email = payload?.email || String(sub || "user");
      return { id: String(sub || email), email: String(email), name: String(email).split("@")[0] };
    } catch {
      return null;
    }
  }

  app.get("/api/bootstrap", (_req, res) => {
    res.json({ ok: true, routesReady, initError: initError ? String(initError?.message || initError) : null, waitedMs: Date.now() - initStartedAt });
  });

  app.get("/api/health", (_req, res) => {
    if (routesReady) return res.json({ ok: true });
    if (initError) return res.status(500).json({ ok: false, message: String(initError?.message || initError) });
    res.status(503).json({ ok: false, message: "Server initializing" });
  });

  app.get("/api/diagnostics", (req, res) => {
    (async () => {
      const origin = process.env.ALLOWED_ORIGIN || process.env.VITE_APP_URL || "http://localhost:5173";
      const haveUrl = Boolean(process.env.SUPABASE_URL);
      const haveAnon = Boolean(process.env.SUPABASE_ANON_KEY);
      const haveService = Boolean(process.env.SUPABASE_SERVICE_KEY);
      let canQuery = false;
      let rows = 0;
      try {
        const admin = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data } = await admin.from("wallets").select("id", { count: "exact", head: true });
        canQuery = true;
        rows = Number((data as any)?.length || 0);
      } catch {}
      const raw = String(req.headers?.cookie || "");
      const hasAccessCookie = /sb-access-token=/.test(raw);
      res.status(200).json({
        ok: true,
        env: { haveUrl, haveAnon, haveService, allowedOrigin: origin },
        cookies: { hasAccessCookie },
        supabase: { canQuery, sampleCount: rows },
        request: { host: req.headers.host, proto: String(req.headers["x-forwarded-proto"] || "http") }
      });
    })();
  });

  app.post("/api/auth/login", (req, res) => {
    (async () => {
      try {
        const body = typeof req.body === "object" && req.body ? req.body : {};
        const email = String(body.email || "");
        const password = String(body.password || "");
        if (!email || !password) { res.status(400).json({ success: false, message: "Missing email or password" }); return; }
        const url = String(process.env.SUPABASE_URL || "");
        const supabaseAuthKey = String(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || "");
        if (!url || !supabaseAuthKey) { res.status(500).json({ success: false, message: "Supabase env not configured" }); return; }
        const supabase = createClient(url, supabaseAuthKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data?.session || !data?.user) { res.status(401).json({ success: false, message: String(error?.message || "Invalid credentials") }); return; }
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token;
        const expMs = (data.session.expires_at ? Number(data.session.expires_at) * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000);
        const maxAge = Math.max(60, Math.floor((expMs - Date.now()) / 1000));
        const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https");
        const cookieBase = `Path=/; HttpOnly; SameSite=None; Max-Age=${maxAge}` + (isSecure ? "; Secure" : "");
        res.setHeader("Set-Cookie", [
          `sb-access-token=${accessToken}; ${cookieBase}`,
          `sb-refresh-token=${refreshToken}; ${cookieBase}`
        ]);
        res.status(200).json({ success: true, user: data.user, session: { token: accessToken, expiresAt: new Date(expMs).toISOString() } });
      } catch (e: any) {
        res.status(500).json({ success: false, message: String(e?.message || "Login failed") });
      }
    })();
  });

  app.all("/api/auth/login", (req, res, next) => {
    if (req.method === "POST") return next();
    res.status(405).json({ message: "Method Not Allowed" });
  });

  app.get("/api/auth/user", (req, res) => {
    (async () => {
      const raw = String(req.headers?.cookie || "");
      const am = raw.match(/sb-access-token=([^;]+)/);
      const access = am ? am[1] : null;
      if (!access) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      try {
        const url = `${String(process.env.SUPABASE_URL).replace(/\/$/, "")}/auth/v1/user`;
        const anon = String(process.env.SUPABASE_ANON_KEY || "");
        const headers: Record<string, string> = { Authorization: `Bearer ${access}` };
        if (anon) headers["apikey"] = anon;
        const r = await fetch(url, { headers });
        if (!r.ok) { res.status(r.status).json({ success: false, message: await r.text() }); return; }
        const u = await r.json();
        res.status(200).json({ success: true, user: { id: u.id, email: u.email, name: u.user_metadata?.name || u.email } });
      } catch (e: any) {
        res.status(500).json({ success: false, message: String(e?.message || "Failed to get user") });
      }
    })();
  });

  app.post("/api/auth/session/refresh", (req, res) => {
    (async () => {
      try {
        const raw = String(req.headers?.cookie || "");
        const m = raw.match(/sb-refresh-token=([^;]+)/);
        const refresh = m ? m[1] : null;
        if (!refresh) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
        const url = String(process.env.SUPABASE_URL || "");
        const anon = String(process.env.SUPABASE_ANON_KEY || "");
        if (!url || !anon) { res.status(500).json({ success: false, message: "Supabase env not configured" }); return; }
        const endpoint = `${url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`;
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anon, Authorization: `Bearer ${anon}` },
          body: JSON.stringify({ refresh_token: refresh })
        });
        if (!r.ok) { res.status(r.status).json({ success: false, message: await r.text() }); return; }
        const out: any = await r.json();
        const accessToken = out?.access_token;
        const newRefresh = out?.refresh_token || refresh;
        if (!accessToken) { res.status(500).json({ success: false, message: "Failed to refresh session" }); return; }
        const expMs = out?.expires_in ? Date.now() + Number(out.expires_in) * 1000 : Date.now() + 3600 * 1000;
        const maxAge = Math.max(60, Math.floor((expMs - Date.now()) / 1000));
        const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https");
        const cookieBase = `Path=/; HttpOnly; SameSite=None; Max-Age=${maxAge}` + (isSecure ? "; Secure" : "");
        res.setHeader("Set-Cookie", [
          `sb-access-token=${accessToken}; ${cookieBase}`,
          `sb-refresh-token=${newRefresh}; ${cookieBase}`
        ]);
        res.status(200).json({ success: true, session: { token: accessToken, expiresAt: new Date(expMs).toISOString() } });
      } catch (e: any) {
        res.status(500).json({ success: false, message: String(e?.message || "Refresh failed") });
      }
    })();
  });

  app.post("/api/auth/logout", (req, res) => {
    const expired = "Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=None";
    res.setHeader("Set-Cookie", [
      `sb-access-token=; ${expired}`,
      `sb-refresh-token=; ${expired}`
    ]);
    res.status(200).json({ success: true, message: "Logged out successfully" });
    return;
  });

  app.get("/api/wallets", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = u.id || u.email;
      const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
      try {
        // Preferred: normalized column tenant_id
        const { data, error } = await supabase.from("wallets").select("id, tenant_id, name, type, currency, balance, is_default, created_at, updated_at, data").eq("tenant_id", tenantKey).limit(50);
        if (error) throw error;
        let rows = Array.isArray(data) ? data : [];

        // Fallback: JSONB schema with `data` containing wallet fields (and possibly tenantId)
        if (rows.length === 0) {
          const { data: jsonRows, error: jsonErr } = await supabase
            .from("wallets")
            .select("id, data, created_at, updated_at")
            .filter("data->>tenantId", "eq", tenantKey)
            .limit(50);
          if (!jsonErr && Array.isArray(jsonRows)) {
            rows = jsonRows.map((r: any) => ({
              id: r.id,
              tenantId: r.data?.tenantId ?? tenantKey,
              name: r.data?.name ?? "Main",
              type: r.data?.type ?? "cash",
              currency: r.data?.currency ?? "usd",
              balance: r.data?.balance ?? "0",
              isDefault: r.data?.isDefault ?? true,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }));
          }
        } else {
          // Normalize column names for client
          rows = rows.map((r: any) => ({
            id: r.id,
            tenantId: r.tenant_id ?? tenantKey,
            name: r.name ?? r.data?.name ?? "Main",
            type: r.type ?? r.data?.type ?? "cash",
            currency: r.currency ?? r.data?.currency ?? "usd",
            balance: r.balance ?? r.data?.balance ?? "0",
            isDefault: r.is_default ?? r.data?.isDefault ?? true,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        }

        if (!rows || rows.length === 0) {
          res.status(200).json([
            { id: `wallet-${tenantKey}`, tenantId: tenantKey, name: "Main", type: "cash", currency: "usd", balance: "0", isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          ]);
          return;
        }
        res.status(200).json(rows);
      } catch (_e: any) {
        res.status(200).json([
          { id: `wallet-${tenantKey}`, tenantId: tenantKey, name: "Main", type: "cash", currency: "usd", balance: "0", isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ]);
      }
    })();
  });

  app.get("/api/payroll", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = u.id || u.email;
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("payroll").select("*").eq("tenant_id", tenantKey).order("date", { ascending: false }).limit(200);
        if (error) throw error;
        res.status(200).json(Array.isArray(data) ? data : []);
      } catch (e: any) {
        res.status(200).json([]);
      }
    })();
  });

  // Matches CRUD
  app.get("/api/matches", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = (req.query.organizationId as string) || u.id || u.email;
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("matches").select("*").eq("tenant_id", tenantKey).order("date", { ascending: false }).limit(200);
        if (error) throw error;
        res.status(200).json(Array.isArray(data) ? data : []);
      } catch (e: any) {
        res.status(200).json([]);
      }
    })();
  });

  app.post("/api/matches", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = u.id || u.email;
      const body = typeof req.body === "object" && req.body ? req.body : {};
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const payload = { ...body, tenant_id: tenantKey, updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
        const { data, error } = await supabase.from("matches").insert(payload).select("*").single();
        if (error) throw error;
        res.status(200).json(data);
      } catch (e: any) {
        res.status(400).json({ message: String(e?.message || "Failed to add match") });
      }
    })();
  });

  app.patch("/api/matches/:id", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = u.id || u.email;
      const id = String(req.params.id);
      const body = typeof req.body === "object" && req.body ? req.body : {};
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("matches").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenantKey).select("*").single();
        if (error) throw error;
        res.status(200).json(data);
      } catch (e: any) {
        res.status(400).json({ message: String(e?.message || "Failed to update match") });
      }
    })();
  });

  // Contracts CRUD
  app.get("/api/contracts", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = (req.query.organizationId as string) || u.id || u.email;
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("contracts").select("*").eq("tenant_id", tenantKey).order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        res.status(200).json(Array.isArray(data) ? data : []);
      } catch (e: any) {
        res.status(200).json([]);
      }
    })();
  });

  app.post("/api/contracts", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = u.id || u.email;
      const body = typeof req.body === "object" && req.body ? req.body : {};
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const payload = { ...body, tenant_id: tenantKey, updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
        const { data, error } = await supabase.from("contracts").insert(payload).select("*").single();
        if (error) throw error;
        res.status(200).json(data);
      } catch (e: any) {
        res.status(400).json({ message: String(e?.message || "Failed to add contract") });
      }
    })();
  });

  app.patch("/api/contracts/:id", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = u.id || u.email;
      const id = String(req.params.id);
      const body = typeof req.body === "object" && req.body ? req.body : {};
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("contracts").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenantKey).select("*").single();
        if (error) throw error;
        res.status(200).json(data);
      } catch (e: any) {
        res.status(400).json({ message: String(e?.message || "Failed to update contract") });
      }
    })();
  });

  // Team: users & invites
  app.get("/api/team/users", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = (req.query.organizationId as string) || u.id || u.email;
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("staff").select("*").eq("tenant_id", tenantKey).order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        res.status(200).json(Array.isArray(data) ? data : []);
      } catch (e: any) {
        res.status(200).json([]);
      }
    })();
  });

  app.get("/api/team/invites", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = (req.query.organizationId as string) || u.id || u.email;
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("invitations").select("*").eq("tenant_id", tenantKey).order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        res.status(200).json(Array.isArray(data) ? data : []);
      } catch (e: any) {
        res.status(200).json([]);
      }
    })();
  });

  // Tenant members add/update
  app.post("/api/tenant/members", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = (req.query.organizationId as string) || u.id || u.email;
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const email = String(body.email || "");
      const role = String(body.role || "member");
      const name = body.name ? String(body.name) : null;
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("org_members").insert({ tenant_id: tenantKey, email, role, name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("*").single();
        if (error) throw error;
        res.status(200).json(data);
      } catch (e: any) {
        res.status(400).json({ message: String(e?.message || "Failed to invite member") });
      }
    })();
  });

  app.patch("/api/tenant/members/:id", (req, res) => {
    (async () => {
      const u = getUserFromCookie(req);
      if (!u) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
      const tenantKey = (req.query.organizationId as string) || u.id || u.email;
      const id = String(req.params.id);
      const body = typeof req.body === "object" && req.body ? req.body : {};
      try {
        const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_SERVICE_KEY), { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await supabase.from("org_members").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenantKey).select("*").single();
        if (error) throw error;
        res.status(200).json(data);
      } catch (e: any) {
        res.status(400).json({ message: String(e?.message || "Failed to update member") });
      }
    })();
  });

  app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
    if (routesReady) return next();
    if (initError) {
      return res.status(500).json({ message: String(initError?.message || initError) });
    }
    const waitMs = parseInt(process.env.ROUTES_IMPORT_GUARD_WAIT_MS || "2500", 10);
    try {
      await Promise.race([
        readyPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("init-timeout")), waitMs))
      ]);
      if (routesReady) return next();
    } catch (_e) {}
    return res.status(503).json({ message: "Service initializing", waitedMs: waitMs });
  });

  startRoutesImport(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ message });
    try {
      console.error("API error:", err);
    } catch {}
  });

  return (req: any, res: any) => app(req, res);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await buildHandler();
  }
  return cachedHandler(req, res);
}
