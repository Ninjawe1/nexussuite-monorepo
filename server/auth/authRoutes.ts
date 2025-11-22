/**
 * Authentication routes
 * Express router mounting Better Auth handler and custom endpoints
 */

import { Router } from "express";
import { auth } from "./betterAuth";
import { User, getCurrentUser, loginUser, logoutUser, registerUser } from "./service";
import { organizationService } from "../org/service";
import { insertSession } from "../db/repos/sessions";

const router = Router();

// Always use Better Auth; no dev fallback user

/**
 * Middleware to extract session token from request
 * Accepts Authorization Bearer and multiple cookie names
 */
function extractToken(req: any): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    console.log("[auth] Authorization Bearer token detected");
    return token;
  }
  
  // Check cookies (support multiple common names)
  const cookieNames = ["authToken", "better_auth_session", "better-auth.session"];
  for (const name of cookieNames) {
    const token = req.cookies?.[name];
    if (token) {
      console.log(`[auth] Cookie token detected in ${name}`);
      return token;
    }
  }

  // Fallback: parse raw Cookie header manually if cookie-parser missed it
  const rawCookie: string | undefined = (req.headers as any)?.cookie;
  if (rawCookie) {
    try {
      for (const name of cookieNames) {
        const match = rawCookie.match(new RegExp(`${name}=([^;]+)`));
        if (match && match[1]) {
          console.log(`[auth] Raw Cookie header token detected in ${name}`);
          return match[1];
        }
      }
    } catch (e) {
      console.warn("[auth] Failed to parse raw Cookie header", e);
    }
  }

  console.log("[auth] No auth token found in headers or cookies");
  return null;
}

/**
 * Middleware to get current user from session
 */
async function getUserFromRequest(req: any): Promise<User | null> {
  const token = extractToken(req);
  if (!token) {
    console.warn("[auth] getUserFromRequest: missing token");
    return null;
  }
  try {
    const user = await getCurrentUser(token);
    if (!user) {
      console.warn("[auth] getUserFromRequest: token invalid or session not found");
    }
    return user;
  } catch (err) {
    console.error("[auth] getUserFromRequest error:", err);
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(req: any, res: any, next: any) {
  // If a previous middleware already populated req.user, honor it
  if (req.user && req.user.id) {
    return next();
  }

  // Bridge: support unified server session-based auth
  // The unified app sets req.session.passport.user.claims.sub
  // Populate req.user accordingly so subscription routes can share session context
  const sess = (req as any).session;
  const passportUser = sess?.passport?.user;
  const userId = passportUser?.claims?.sub;
  if (userId) {
    const userName = passportUser?.claims?.name || passportUser?.name || "Unknown";
    req.user = {
      id: userId,
      name: userName,
      claims: passportUser?.claims ?? { sub: userId },
    };
    return next();
  }

  // Better Auth session-based authentication
  const user = await getUserFromRequest(req);
  if (!user) {
    console.warn("[auth] requireAuth: unauthorized request", {
      hasAuthHeader: Boolean(req.headers.authorization),
      cookieKeys: Object.keys(req.cookies || {}),
    });
    return res.status(401).json({ 
      error: "Unauthorized", 
      message: "Authentication required" 
    });
  }
  
  req.user = user;
  next();
}

// Note: Mount Better Auth handler AFTER custom endpoints so it doesn't shadow them.
// Better Auth will still handle its internal routes under this base path.
// Placing this at the end ensures our bespoke endpoints (/register, /login, etc.) remain reachable.

// Registration is handled by Better Auth built-in routes; unified login/user only

/**
 * Custom login endpoint
 * POST /api/auth/login
 * Uses Better Auth by default; in development, backfills missing credential accounts
 */
router.post("/login", async (req, res) => {
  console.log("AuthLogin:entry", { path: req.path, ip: req.ip });
  try {
    const { email, password } = req.body;
    console.log("AuthLogin:validate", { hasEmail: Boolean(email) });

    if (!email || !password) {
      console.warn("AuthLogin:bad_request", { ip: req.ip });
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const result = await loginUser(email, password);
    if (!result?.success || !result.session?.token) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const { user, session } = result;
    const cookieBase = {
      httpOnly: true,
      secure: (process.env.NODE_ENV || "development") === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    } as const;
    res.cookie("better_auth_session", session.token, cookieBase);
    res.cookie("better-auth.session", session.token, cookieBase);
    res.cookie("authToken", session.token, cookieBase);
    console.log("[auth] Login: cookies set (authToken, better_auth_session)");

    return res.json({ success: true, user, session });
  } catch (error) {
    console.error("AuthLogin:error", error);
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }
});

/**
 * Registration endpoint
 * POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, orgName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    let result = await registerUser(email, password, undefined, orgName);
    if (!result?.success || !result.session?.token) {
      const login = await loginUser(email, password);
      if (login?.success && login?.session?.token) {
        result = login as any;
      } else {
        return res.status(400).json({ success: false, message: "Registration failed" });
      }
    }
    const { user, session } = result;
    const cookieBase = {
      httpOnly: true,
      secure: (process.env.NODE_ENV || "development") === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    } as const;
    res.cookie("better_auth_session", session.token, cookieBase);
    res.cookie("better-auth.session", session.token, cookieBase);
    res.cookie("authToken", session.token, cookieBase);
    return res.json({ success: true, user, session });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: msg });
  }
});

// Dev-only: seed a credential user
// Dev seed route removed for clean production-like auth

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      await logoutUser(token);
    }
    
    // Clear auth cookie
    res.clearCookie("authToken");
    res.clearCookie("better_auth_session");
    res.clearCookie("better-auth.session");
    
    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      error: "Logout Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/session/refresh", requireAuth, async (req: any, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await insertSession(token, String(req.user.id), expiresAt);
    const cookieBase = { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" } as const;
    res.cookie("better_auth_session", token, cookieBase);
    res.cookie("authToken", token, cookieBase);
    return res.json({ success: true, user: req.user, session: { token, expiresAt } });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed to refresh session" });
  }
});

/**
 * Get current user
 * GET /api/betauth/me
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    console.log("[auth] /me: authorized", { userId: (req as any).user?.id, email: (req as any).user?.email });
    return res.json({ success: true, user: (req as any).user });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      error: "Failed to get user",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Frontend compatibility: GET /api/auth/user
 * In development fallback mode (Better Auth disabled), return a mock user
 */
router.get("/user", requireAuth, async (req: any, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    const u = req.user || {};
    let orgPayload: any[] = [];
    let currentOrganizationId: string | null = null;

    try {
      const ensured = await organizationService.ensureOrganizationForUser(String(u.id || ""), { email: u.email, name: u.name });
      const org = ensured.organization;
      orgPayload = [{
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: org.updatedAt?.toISOString?.() || new Date().toISOString(),
        metadata: (org as any).metadata || {},
      }];
      currentOrganizationId = org.id;
    } catch {
      const defaultOrgId = String(u.orgId || u.id || "org");
      const defaultOrgName = String(u.name || (u.email ? String(u.email).split("@")[0] : "My Organization"));
      orgPayload = [{ id: defaultOrgId, name: defaultOrgName, slug: defaultOrgId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), metadata: {} }];
      currentOrganizationId = defaultOrgId;
    }

    return res.json({ success: true, user: u, organizations: orgPayload, currentOrganizationId, tenantId: currentOrganizationId, tenant: { name: orgPayload[0]?.name } });
  } catch (error) {
    console.error("/auth/user error:", error);
    const u = (req as any).user || {};
    const defaultOrgId = String(u.orgId || u.id || "org");
    const defaultOrgName = String(u.name || (u.email ? String(u.email).split("@")[0] : "My Organization"));
    const orgPayload = [{ id: defaultOrgId, name: defaultOrgName, slug: defaultOrgId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), metadata: {} }];
    const currentOrganizationId = defaultOrgId;
    return res.json({ success: true, user: u, organizations: orgPayload, currentOrganizationId, tenantId: currentOrganizationId, tenant: { name: orgPayload[0]?.name } });
  }
});

/**
 * Create organization (admin only)
 * POST /api/betauth/org
 */
// Organization endpoints are managed via Better Auth/feature routes; removed here for clarity

/**
 * Health check endpoint
 * GET /api/auth/health
 */
router.get("/health", (req, res) => {
  return res.json({ status: "ok", timestamp: new Date().toISOString(), service: "better-auth" });
});

/**
 * Mount Better Auth handler last so it doesn't shadow custom endpoints
 */
// Better Auth handler is mounted at app level in server/index.ts

export default router;
