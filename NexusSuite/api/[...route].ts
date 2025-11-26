import express, { type Request, type Response, type NextFunction, type Express } from "express";

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
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  function getUserFromCookie(req: any) {
    const raw = String(req.headers?.cookie || "");
    const m = raw.match(/(?:better_auth_session|better-auth\.session|authToken)=([^;]+)/);
    const token = m ? m[1] : null;
    if (!token) return null;
    try {
      const tokenStr = Buffer.from(token, "base64").toString("utf8");
      const email = tokenStr.split(":")[0] || "user@example.com";
      return { id: email, email, name: String(email).split("@")[0] };
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

  app.post("/api/auth/login", (req, res) => {
    try {
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const email = String(body.email || "");
      const password = String(body.password || "");
      if (!email || !password) {
        res.status(400).json({ success: false, message: "Missing email or password" });
        return;
      }
      const user = { id: email, email, name: String(email).split("@")[0] };
      const token = Buffer.from(`${email}:${Date.now()}:${Math.random()}`).toString("base64");
      const maxAge = 7 * 24 * 60 * 60;
      const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https");
      const cookieBase = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (isSecure ? "; Secure" : "");
      res.setHeader("Set-Cookie", [
        `better_auth_session=${token}; ${cookieBase}`,
        `better-auth.session=${token}; ${cookieBase}`,
        `authToken=${token}; ${cookieBase}`
      ]);
      res.status(200).json({ success: true, user, session: { token, expiresAt: new Date(Date.now() + maxAge * 1000).toISOString() } });
      return;
    } catch (e) {
      res.status(500).json({ success: false, message: "Login failed" });
      return;
    }
  });

  app.get("/api/auth/user", (req, res) => {
    const raw = String(req.headers?.cookie || "");
    const m = raw.match(/(?:better_auth_session|better-auth\.session|authToken)=([^;]+)/);
    const token = m ? m[1] : null;
    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const tokenStr = Buffer.from(token, "base64").toString("utf8");
    const email = tokenStr.split(":")[0] || "user@example.com";
    const user = { id: email, email, name: String(email).split("@")[0] };
    res.status(200).json({ success: true, user });
    return;
  });

  app.post("/api/auth/session/refresh", (req, res) => {
    const raw = String(req.headers?.cookie || "");
    const m = raw.match(/(?:better_auth_session|better-auth\.session|authToken)=([^;]+)/);
    const token = m ? m[1] : null;
    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const tokenStr = Buffer.from(token, "base64").toString("utf8");
    const email = tokenStr.split(":")[0] || "user@example.com";
    const user = { id: email, email, name: String(email).split("@")[0] };
    const maxAge = 7 * 24 * 60 * 60;
    const isSecure = String(req.headers["x-forwarded-proto"] || "https").includes("https");
    const cookieBase = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (isSecure ? "; Secure" : "");
    res.setHeader("Set-Cookie", [
      `better_auth_session=${token}; ${cookieBase}`,
      `better-auth.session=${token}; ${cookieBase}`,
      `authToken=${token}; ${cookieBase}`
    ]);
    res.status(200).json({ success: true, user, session: { token, expiresAt: new Date(Date.now() + maxAge * 1000).toISOString() } });
    return;
  });

  app.post("/api/auth/logout", (req, res) => {
    const expired = "Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `better_auth_session=; ${expired}`,
      `better-auth.session=; ${expired}`,
      `authToken=; ${expired}`
    ]);
    res.status(200).json({ success: true, message: "Logged out successfully" });
    return;
  });

  app.get("/api/wallets", (req, res) => {
    const u = getUserFromCookie(req);
    if (!u) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const wallets = [
      {
        id: `wallet-${u.id}`,
        tenantId: u.id,
        name: "Main",
        type: "cash",
        currency: "usd",
        balance: "0",
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    res.status(200).json(wallets);
    return;
  });

  app.get("/api/payroll", (req, res) => {
    const u = getUserFromCookie(req);
    if (!u) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const rows: any[] = [];
    res.status(200).json(rows);
    return;
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
