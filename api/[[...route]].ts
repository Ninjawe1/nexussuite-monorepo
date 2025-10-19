// Vercel serverless function wrapper for the existing Express app
import express, { type Request, type Response, type NextFunction } from "express";
import serverless from "serverless-http";

let cachedHandler: any;

async function buildHandler() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  try {
    // Dynamically import routes to avoid crashing at module load time
    const { registerRoutes } = await import("../server/routes");
    await registerRoutes(app);
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