// Vercel serverless function wrapper for the existing Express app
import express, { type Request, type Response, type NextFunction } from "express";
import serverless from "serverless-http";

let cachedHandler: any;

async function buildHandler() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Early bootstrap route so we can confirm the function starts even if route import fails
  app.get("/api/bootstrap", (_req, res) => {
    res.json({ ok: true, message: "Serverless function is alive" });
  });

  try {
    const timeoutMs = parseInt(process.env.ROUTES_IMPORT_TIMEOUT_MS || "8000", 10);
    console.log(`[api] Importing routes with timeout ${timeoutMs}ms...`);

    const routesImport = import("../server/routes");
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Routes import timeout")), timeoutMs));
    const mod: any = await Promise.race([routesImport, timeout]);

    const { registerRoutes } = mod;
    await registerRoutes(app);
    console.log("[api] Routes registered successfully");
  } catch (err: any) {
    console.error("API init error:", err);
    // Provide minimal fallback so health checks return useful info instead of a platform crash page
    app.get("/api/health", (_req, res) => {
      res.status(500).json({ ok: false, message: "Server initialization failed" });
    });
    app.all("/api/*", (_req, res) => {
      const message = (err && err.message) ? err.message : "Initialization error";
      res.status(500).json({ message });
    });
  }

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