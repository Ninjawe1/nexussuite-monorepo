import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
// Use Better Auth router's auth middleware for protected endpoints
import { requireAuth as isAuthenticated } from "./auth/authRoutes";
import { storage } from "./useStorage";

// Basic middleware to block suspended tenants (kept minimal for restoration)
async function checkTenantSuspension(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) return next();
    const user = await storage.getUser(userId);
    if (!user || !user.tenantId) return next();
    const tenant = await storage.getTenant(user.tenantId);
    if (tenant && tenant.subscriptionStatus === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended",
        reason: (tenant as any).suspensionReason || "Please contact support for more information",
        suspendedAt: (tenant as any).suspendedAt || null,
      });
    }
    next();
  } catch (err) {
    console.error("Error checking tenant suspension:", err);
    next();
  }
}

async function createAuditLog(
  tenantId: string,
  userId: string,
  userName: string,
  action: string,
  entity: string,
  entityId: string,
  oldValue: any,
  newValue: any,
  actionType: "create" | "update" | "delete" = "update",
) {
  try {
    await storage.createAuditLog({
      tenantId,
      userId,
      userName,
      action,
      entity,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      actionType,
    });
  } catch (err) {
    console.warn("Failed to create audit log:", err);
  }
}

async function getTenantId(req: Request): Promise<string | undefined> {
  const userId = (req as any).user?.claims?.sub;
  if (!userId) return undefined;
  const user = await storage.getUser(userId);
  return user?.tenantId;
}

export async function registerRoutes(app: Express) {
  // Initialize Better Auth router for beta endpoints

  // Mount Better Auth example router (SQLite + JWT + OAuth) without conflicting with legacy /api/auth
  try {
    const betaAuthRouter = (await import("./auth/authRoutes")).default;
    app.use("/api/betauth", betaAuthRouter);
  } catch (err) {
    console.warn("Better Auth router not mounted:", err);
  }

  // Health and simple debug
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/debug/envkeys", (_req, res) => {
    const keys = Object.keys(process.env || {}).sort();
    res.json({ count: keys.length, keys });
  });

  // Auth: login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const bcryptMod = await import("bcryptjs");
      const bcrypt = (bcryptMod as any).default || bcryptMod;
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      // regenerate session if available
      await new Promise(resolve => {
        const sess: any = (req as any).session;
        if (sess?.regenerate) {
          sess.regenerate((_err: any) => resolve(true));
        } else {
          resolve(true);
        }
      });
      const sess: any = (req as any).session;
      if (sess) {
        sess.passport = { user: { claims: { sub: (user as any).id } } };
        await new Promise(resolve => {
          if (sess.save) {
            sess.save((_err: any) => resolve(true));
          } else {
            resolve(true);
          }
        });
      }
      return res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  // Auth: register (creates tenant + owner user)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, tenantName } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const bcryptMod = await import("bcryptjs");
      const bcrypt = (bcryptMod as any).default || bcryptMod;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tenant and user
      const tenant = await storage.createTenant({
        name: tenantName || `${firstName || email}'s Club`,
        subscriptionPlan: "starter",
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      } as any);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        tenantId: (tenant as any).id,
        role: "owner",
        isTemporaryPassword: false,
        lastPasswordChange: new Date(),
      } as any);

      await new Promise(resolve => {
        const sess: any = (req as any).session;
        if (sess?.regenerate) {
          sess.regenerate((_err: any) => resolve(true));
        } else {
          resolve(true);
        }
      });
      const sess: any = (req as any).session;
      if (sess) {
        sess.passport = { user: { claims: { sub: (user as any).id } } };
        await new Promise(resolve => {
          if (sess.save) {
            sess.save((_err: any) => resolve(true));
          } else {
            resolve(true);
          }
        });
      }
      return res.json({ user });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const sess: any = (req as any).session;
    if (sess?.destroy) {
      return sess.destroy((err: any) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        return res.json({ message: "Logged out successfully" });
      });
    } else {
      (req as any).session = null;
      return res.json({ message: "Logged out successfully" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      return res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile endpoints used by the Profile page
  app.get("/api/profile", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      // Return the full user object for now; UI can map/select fields
      return res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const oldUser = await storage.getUser(userId);
      const patch = req.body || {};
      const updated = await storage.updateUser(userId, { ...patch });
      const tenantId = await getTenantId(req);
      await createAuditLog(
        tenantId || "unknown",
        userId,
        `${oldUser?.firstName || ""} ${oldUser?.lastName || ""}`.trim() || oldUser?.email || "Unknown",
        "Updated profile",
        "user",
        userId,
        oldUser,
        updated,
        "update",
      );
      return res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // --- Dashboard/data endpoints ---
  // Matches
  app.get("/api/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const rows = await storage.getMatchesByTenant(tenantId);
      return res.json(rows);
    } catch (error) {
      console.error("Error fetching matches:", error);
      return res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const payload = {
        tenantId,
        opponent: req.body?.opponent,
        date: req.body?.date ? new Date(req.body.date) : new Date(),
        scoreA: req.body?.scoreA ?? null,
        scoreB: req.body?.scoreB ?? null,
        venue: req.body?.venue ?? null,
        status: req.body?.status ?? "upcoming",
        tournamentId: req.body?.tournamentId ?? null,
        roundId: req.body?.roundId ?? null,
        matchNumber: req.body?.matchNumber ?? 1,
      } as any;
      if (!payload.opponent) return res.status(400).json({ message: "Opponent is required" });
      const created = await storage.createMatch(payload);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Created match vs '${payload.opponent}'`,
        "match",
        created.id,
        null,
        created,
        "create",
      );
      return res.json(created);
    } catch (error) {
      console.error("Error creating match:", error);
      return res.status(500).json({ message: "Failed to create match" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const rows = await storage.getCampaignsByTenant(tenantId);
      return res.json(rows);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      return res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const payload = {
        tenantId,
        name: req.body?.name,
        description: req.body?.description ?? null,
        platforms: req.body?.platforms ?? [],
        startDate: req.body?.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: req.body?.endDate ? new Date(req.body.endDate) : null,
        budget: req.body?.budget ?? "0",
        reach: req.body?.reach ?? null,
        engagement: req.body?.engagement ?? null,
        status: req.body?.status ?? "active",
      } as any;
      if (!payload.name) return res.status(400).json({ message: "Campaign name is required" });
      const created = await storage.createCampaign(payload);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Created campaign '${payload.name}'`,
        "campaign",
        created.id,
        null,
        created,
        "create",
      );
      return res.json(created);
    } catch (error) {
      console.error("Error creating campaign:", error);
      return res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Audit Logs
  app.get("/api/audit-logs", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const rows = await storage.getAuditLogsByTenant(tenantId, Number.isFinite(limit) ? limit : 100);
      return res.json(rows);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Staff
  app.get("/api/staff", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const rows = await storage.getStaffByTenant(tenantId);
      return res.json(rows);
    } catch (error) {
      console.error("Error fetching staff:", error);
      return res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/staff", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const payload = {
        tenantId,
        name: req.body?.name,
        role: req.body?.role ?? "staff",
        email: req.body?.email ?? null,
        phone: req.body?.phone ?? null,
        status: req.body?.status ?? "active",
        salary: req.body?.salary ?? "0",
        joinedAt: req.body?.joinedAt ? new Date(req.body.joinedAt) : new Date(),
      } as any;
      if (!payload.name) return res.status(400).json({ message: "Staff name is required" });
      const created = await storage.createStaff(payload);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Added staff '${payload.name}'`,
        "staff",
        created.id,
        null,
        created,
        "create",
      );
      return res.json(created);
    } catch (error) {
      console.error("Error creating staff:", error);
      return res.status(500).json({ message: "Failed to create staff" });
    }
  });

  // Payroll
  app.get("/api/payroll", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const rows = await storage.getPayrollByTenant(tenantId);
      return res.json(rows);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      return res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const payload = {
        tenantId,
        staffId: req.body?.staffId ?? null,
        name: req.body?.name,
        role: req.body?.role ?? null,
        amount: req.body?.amount ?? "0",
        type: req.body?.type ?? "monthly",
        status: req.body?.status ?? "pending",
        date: req.body?.date ? new Date(req.body.date) : new Date(),
        walletId: req.body?.walletId ?? null,
      } as any;
      if (!payload.name) return res.status(400).json({ message: "Payroll name is required" });
      const created = await storage.createPayroll(payload);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Created payroll for '${payload.name}'`,
        "payroll",
        created.id,
        null,
        created,
        "create",
      );
      return res.json(created);
    } catch (error) {
      console.error("Error creating payroll:", error);
      return res.status(500).json({ message: "Failed to create payroll" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}