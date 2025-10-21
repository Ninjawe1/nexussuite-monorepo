// Vercel serverless function wrapper for the existing Express app (non-blocking init)
import express, { type Request, type Response, type NextFunction, type Express } from "express";
import serverless from "serverless-http";

let cachedHandler: any;
let routesReady = false;
let initError: any = null;
let initStarted = false;
let initStartedAt = 0;

function startRoutesImport(app: Express) {
  if (initStarted) return; // prevent duplicate imports on concurrent cold-start invocations
  initStarted = true;
  initStartedAt = Date.now();

  const timeoutMs = parseInt(process.env.ROUTES_IMPORT_TIMEOUT_MS || "8000", 10);
  console.log(`[api] Starting routes import (timeout ${timeoutMs}ms)...`);

  const routesImport = import("../server/routes");
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Routes import timeout")), timeoutMs));
  Promise.race([routesImport, timeout])
    .then(async (mod: any) => {
      const { registerRoutes } = mod;
      await registerRoutes(app);
      routesReady = true;
      initError = null;
      console.log("[api] Routes registered successfully");
    })
    .catch((err) => {
      // Keep the app running with guard endpoints; report error fast
      initError = err;
      routesReady = false;
      console.error("[api] Routes import/register failed:", err);
    });
}

async function buildHandler() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Early endpoints so we can confirm the function is alive even while routes import is pending
  app.get("/api/bootstrap", (_req, res) => {
    res.json({ ok: true, routesReady, initError: initError ? String(initError?.message || initError) : null, waitedMs: Date.now() - initStartedAt });
  });

  app.get("/api/health", (_req, res) => {
    if (routesReady) return res.json({ ok: true });
    if (initError) return res.status(500).json({ ok: false, message: String(initError?.message || initError) });
    res.status(503).json({ ok: false, message: "Server initializing" });
  });

  // Guard: while routes are not ready, respond quickly to any /api/* requests
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (routesReady) return next();
    if (initError) {
      return res.status(500).json({ message: String(initError?.message || initError) });
    }
    return res.status(503).json({ message: "Service initializing" });
  });

  // Begin routes import asynchronously (do NOT await)
  startRoutesImport(app);

  // Basic error handler (mirrors server/index.ts behavior without vite logging)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ message });
    try {
      console.error("API error:", err);
    } catch {}
  });

  return serverless(app);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await buildHandler();
  }
  return cachedHandler(req, res);
}