/// <reference path="../types/routes.d.ts" />
import express from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Import the compiled server routes from dist to ensure they are available in the serverless runtime
import { registerRoutes } from "../dist/routes.js";

// Create the Express app and mount JSON/urlencoded middleware
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes once and attach a global error handler (matches server/index.ts behavior)
const ready = (async () => {
  await registerRoutes(app);

  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    try {
      res.status(status).json({ message });
    } catch (_e) {
      res.status(500).json({ message: "Internal Server Error" });
    }
    // Re-throw if you want Vercel to also capture the error
    // console.error(err);
  });
})();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure routes and error handler are registered before handling the request
  await ready;

  // Hand off to the Express app
  return app(req as any, res as any);
}