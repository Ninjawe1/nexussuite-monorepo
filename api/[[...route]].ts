// Vercel serverless function wrapper for the existing Express app
import express, { type Request, type Response, type NextFunction } from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../server/routes";

let cachedHandler: any;

async function buildHandler() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register all API routes and middleware on the Express app
  await registerRoutes(app);

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