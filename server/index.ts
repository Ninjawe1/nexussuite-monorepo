import "./env";
import * as path from "path";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import fs from "fs";
// Vite will be imported dynamically in development
import cookieParser from "cookie-parser";

// Env is already loaded above from the unified NexusSuite/.env

// Startup guard: warn if not running from project root
if (!fs.existsSync(path.resolve(process.cwd(), "NexusSuite"))) {
  console.warn("⚠️  Warning: You are running the server from the wrong directory. Run commands from the project root: D\\Nexus suite database\\NexusSuite Main\\");
}

// Import middleware
import {
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  AppError,
  ErrorCode,
  ErrorType,
  createErrorResponse
} from "./middleware/errorHandler";
import {
  rateLimit,
  requestId,
  requestLogger,
  timeout,
  securityHeaders,
  healthCheck
} from "./middleware/validation";

// Import routes
import apiRouter from "./routes/index";
// Vite will be created in development for frontend middleware serving
// We use dynamic import to avoid bundling vite in production

// Import services
import { getSupabase } from "./db/useSupabase";
import { getMem0 } from "./memory/mem0Client";

// __filename and __dirname are defined above for unified env loader

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Security middleware
app.use(helmet());
app.use(securityHeaders());
app.set("trust proxy", 1);
app.use(cookieParser());
app.set("etag", false);

// CORS configuration
const allowedOrigins = [
  String(process.env.VITE_APP_URL || "http://localhost:5173").replace(/\/$/, ""),
  "http://127.0.0.1:5173"
];
app.use(cors({
  origin: (origin, cb) => {
    const o = origin ? origin.replace(/\/$/, "") : undefined;
    const ok = !o || allowedOrigins.includes(o);
    cb(null, ok);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.options("/api/*", cors({
  origin: allowedOrigins[0],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// Body parsing middleware
// Avoid JSON parsing on the Polar webhook route to preserve raw body for signature verification
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/subscription/webhook")) return next();
  return (express.json({ limit: "10mb" }) as any)(req, res, () => {
    return (express.urlencoded({ extended: true, limit: "10mb" }) as any)(req, res, next);
  });
});

// Compression middleware
app.use(compression() as any);

// Request ID middleware
app.use(requestId);

// Logging middleware
app.use(requestLogger);

// Timeout middleware (30 seconds)
app.use(timeout(30000));

// Health check
app.use(healthCheck());
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "nexussuite-dev", timestamp: new Date().toISOString() });
});

// Rate limiting
const isDev = (process.env.NODE_ENV || "development") === "development";
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: (req) => req.ip || "unknown",
  label: "general",
  disableInDev: true,
});

const authRateLimit = rateLimit({
  windowMs: isDev ? 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 50 : 5,
  message: isDev ? "Dev mode: too many authentication attempts" : "Too many authentication attempts, please try again later.",
  keyGenerator: (req) => req.ip || "unknown",
  label: "auth",
  disableInDev: true,
});

const otpRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 OTP requests per windowMs
  message: "Too many OTP requests, please try again later.",
  keyGenerator: (req) => req.ip || "unknown"
});

// Apply rate limiting
app.use("/api/auth/*", authRateLimit);
app.use("/api/otp/*", otpRateLimit);
app.use("/api/*", generalRateLimit);

// API routes mounted via unified router
// Mounted before Vite middlewares to ensure /api is excluded from SPA fallback
let viteInstance: any;
// BetterAuth handler is NOT globally mounted to avoid intercepting our custom /api/auth routes
app.use("/api", apiRouter);
app.get("/api/auth/then", (req: any, res) => {
  const url = String(req.query?.currentURL || "").trim();
  if (url && /^https?:\/\//i.test(url)) return res.redirect(url);
  res.status(404).json({ success: false, error: "Resource not found" });
});
app.get("/then", (req: any, res) => {
  const url = String(req.query?.currentURL || "").trim();
  if (url && /^https?:\/\//i.test(url)) return res.redirect(url);
  res.status(404).json({ success: false, error: "Resource not found" });
});

// --- BetterAuth adapter for Express (mounted AFTER our custom /api routes)
// This forwards unmatched /api/auth/* requests to BetterAuth's internal router
// Removed then redirects and BetterAuth adapter

// Optional diagnostics route for dev
app.get("/api/diagnostics", async (_req, res) => {
  try {
    const s = getSupabase();
    let users = 0, accounts = 0, sessions = 0, organizations = 0, orgMembers = 0;
    if (s) {
      users = (await s.from("users").select("id", { count: "exact", head: true })).count || 0;
      accounts = (await s.from("accounts").select("id", { count: "exact", head: true })).count || 0;
      sessions = (await s.from("sessions").select("token", { count: "exact", head: true })).count || 0;
      organizations = (await s.from("organizations").select("id", { count: "exact", head: true })).count || 0;
      orgMembers = (await s.from("org_members").select("id", { count: "exact", head: true })).count || 0;
    }
    const mem0Enabled = Boolean(getMem0());
    res.json({
      env: process.env.NODE_ENV || "development",
      vite: process.env.NODE_ENV === "development" ? "active" : "inactive",
      polarConnected: Boolean(process.env.POLAR_ACCESS_TOKEN),
      authMode: process.env.NODE_ENV === "development" ? "mock" : "live",
      serverPort: PORT,
      mem0Enabled,
      allowedOrigins,
      hmr: { port: PORT },
      supabase: {
        users,
        accounts,
        sessions,
        organizations,
        orgMembers
      }
    });
  } catch (e) {
    res.status(500).json({ error: "diagnostics_failed" });
  }
});

// ---- Final Vite Middleware for SPA Frontend ----
function startServer() {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Unified server running at http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔐 Security: ${process.env.NODE_ENV === "production" ? "enabled" : "disabled"}`);
      console.log(`📧 Admin email: ${process.env.ADMIN_EMAIL || "not configured"}`);
      console.log(`💳 Polar integration: ${process.env.POLAR_ACCESS_TOKEN ? "enabled" : "disabled"}`);
      console.log(`Better Auth: ${process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL ? "active" : "inactive"}`);
    });
    server.on("error", (err: any) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Stop the other process or change PORT.`);
        process.exit(1);
      } else {
        console.error("Server listen error:", err);
      }
    });
  } catch (err: any) {
    if (err && err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Stop the other process or change PORT.`);
      process.exit(1);
    }
    throw err;
  }
}

(async () => {
  if (process.env.NODE_ENV === "development" && String(process.env.VITE_MIDDLEWARE).toLowerCase() === "true") {
    try {
      const clientRoot = path.resolve(process.cwd(), "NexusSuite/client");
      const viteMod = await import("vite");
      const createViteServer = (viteMod as any).createServer;
      viteInstance = await createViteServer({
        root: clientRoot,
        server: {
          middlewareMode: true
        },
        appType: "custom",
      });
      app.use(viteInstance.middlewares);
      app.use(express.static(clientRoot));
      app.get(["/", "/index.html"], async (req, res, next) => {
        if (req.originalUrl.startsWith("/api")) return next();
        try {
          const url = req.originalUrl;
          const indexHtmlPath = path.resolve(clientRoot, "index.html");
          let template = await fs.promises.readFile(indexHtmlPath, "utf-8");
          template = await viteInstance.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (err) {
          // @ts-ignore
          viteInstance.ssrFixStacktrace?.(err);
          next(err);
        }
      });
      app.get("*", async (req, res, next) => {
        if (req.originalUrl.startsWith("/api")) return next();
        try {
          const url = req.originalUrl;
          const indexHtmlPath = path.resolve(clientRoot, "index.html");
          let template = await fs.promises.readFile(indexHtmlPath, "utf-8");
          template = await viteInstance.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (err) {
          // @ts-ignore
          viteInstance.ssrFixStacktrace?.(err);
          next(err);
        }
      });
      console.log("🔧 Vite middleware attached (client root:", clientRoot, ")");
    } catch (err) {
      console.error("Vite middleware setup failed:", err);
      console.warn("Frontend will not be served by middleware. Ensure Vite config and .env are correct.");
    }
  }
  startServer();
})();

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start server
// server start moved to startServer()