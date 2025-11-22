import express, { type Request, Response, NextFunction } from "express";
import ViteExpress from "vite-express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { log } from "./vite";
// Bridge: mount unified auth + subscription routers from /server so client can call /api/betauth and /api/subscription
// These are mounted BEFORE registerRoutes to ensure they are matched before the '/api' catch-all in routes.ts
// and to share the same origin/port with the Vite dev server.
// Import routers with interop-safe handling between ESM and CJS
// In some environments, default imports from CJS-compiled modules resolve to a module object
// rather than the router function. Normalize to use .default when present.
// Use dynamic import to ensure proper ESM interop across subprojects (CJS/ESM mix)
const authRoutesImport = await import("../../server/auth/authRoutes");
const subscriptionRoutesImport = await import("../../server/subscription/routes");
// Import subscriptionService to provide a normalized plans endpoint during local dev/mock modes
const subscriptionServiceImport = await import("../../server/subscription/service");

const authRoutes = (authRoutesImport as any).default ?? (authRoutesImport as any);
const subscriptionRoutes = (subscriptionRoutesImport as any).default ?? (subscriptionRoutesImport as any);
const subscriptionService = (subscriptionServiceImport as any).subscriptionService ?? (subscriptionServiceImport as any).default ?? (subscriptionServiceImport as any);

const app = express();

// Increase body size limits to support base64 file uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));

// Install session/auth BEFORE mounting bridged routers so they can access req.session
await setupAuth(app);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register all routes
// Unified API mounts from the standalone server codebase
// Normalize router/module into an express-compatible middleware
const asMiddleware = (r: any) => {
  if (typeof r === "function") return r;
  if (r && typeof r.handle === "function") {
    // Express Router instances have a .handle method we can delegate to
    return (req: any, res: any, next: any) => r.handle(req, res, next);
  }
  console.error("[server] Invalid router export: expected function or Router with .handle", {
    type: typeof r,
    keys: r ? Object.keys(r) : [],
  });
  throw new TypeError("Router.use() requires a middleware function (function or Router) but got: " + typeof r);
};

const authMiddleware = asMiddleware(authRoutes);
const subscriptionMiddleware = asMiddleware(subscriptionRoutes);

app.use("/api/betauth", authMiddleware);

// Normalized plans endpoint to ensure UI-required keys exist even when Polar SDK returns mock data
// This handler is mounted BEFORE the bridged subscription router so it takes precedence.
app.get("/api/subscription/plans", async (req, res) => {
  try {
    const result = await subscriptionService.getAvailablePlans();
    const rawPlans = (result && Array.isArray(result.plans)) ? result.plans : [];
    const plans = rawPlans.map((p: any) => ({
      id: p.priceId || p.id || `${p.productId || "plan"}_${p.interval || "month"}`,
      name: p.productName || p.name || "Plan",
      amount: typeof p.amount === "number" ? p.amount : (typeof p.price === "number" ? p.price : 0),
      price: typeof p.amount === "number" ? p.amount : (typeof p.price === "number" ? p.price : 0),
      currency: p.currency || "USD",
      interval: p.interval === "year" ? "year" : "month",
      features: Array.isArray(p.features) ? p.features : [],
      description: p.description || "",
      limits: p.limits || {},
      metadata: p.metadata || { productId: p.productId, priceId: p.priceId },
    }));
    res.json({ success: true, plans });
  } catch (error: any) {
    console.error("Error normalizing subscription plans:", error);
    res.status(500).json({ success: false, error: "Failed to get subscription plans" });
  }
});

app.use("/api/subscription", subscriptionMiddleware);
app.use("/api/subscriptions", subscriptionMiddleware);

await registerRoutes(app);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

// 🧩 Merge Vite + Express on one port
const port = parseInt(process.env.PORT || "3000", 10);

ViteExpress.listen(app, port, () => {
  log(`🚀 Server and Vite running on http://localhost:${port}`);
});

