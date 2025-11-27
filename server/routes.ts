import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./useStorage";
import { requireSuperAdmin } from "./rbac";

// Basic middleware to block suspended tenants (kept minimal for restoration)
async function checkTenantSuspension(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) return next();
    const user = await storage.getUser(userId);
    if (!user || !user.tenantId) return next();
    const tenant = await storage.getTenant(user.tenantId);
    if (tenant && (tenant as any).subscriptionStatus === "suspended") {
      res.status(403).json({
        message: "Your account has been suspended",
        reason: (tenant as any).suspensionReason || "Please contact support for more information",
        suspendedAt: (tenant as any).suspendedAt || null,
      });
      return;
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
  return user?.tenantId ?? undefined;
}

export async function registerRoutes(app: Express) {
  // Initialize session/auth
  await setupAuth(app);

  // Health and simple debug
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/debug/envkeys", (_req, res) => {
    const keys = Object.keys(process.env || {}).sort();
    res.json({ count: keys.length, keys });
  });

  // Waitlist
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }
      const existing = await storage.getWaitlistEntryByEmail(email);
      if (existing) {
        res.status(400).json({ message: "Email already in waitlist" });
        return;
      }
      await storage.createWaitlistEntry({ email });
      res.json({ message: "Added to waitlist" });
      return;
    } catch (error) {
      console.error("Waitlist error:", error);
      res.status(500).json({ message: "Failed to add to waitlist" });
      return;
    }
  });

  // Auth: login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) { res.status(400).json({ message: "Email and password are required" }); return; }
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) { res.status(401).json({ message: "Invalid email or password" }); return; }
      
      const bcryptMod = await import("bcryptjs");
      const bcrypt = (bcryptMod as any).default || bcryptMod;
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) { res.status(401).json({ message: "Invalid email or password" }); return; }
      
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
      res.json({ user });
      return;
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
      return;
    }
  });

  // Auth: register (creates tenant + owner user)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, tenantName } = req.body || {};
      if (!email || !password) { res.status(400).json({ message: "Email and password are required" }); return; }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) { res.status(400).json({ message: "Email already exists" }); return; }
      
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
      res.json({ user });
      return;
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
      return;
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const sess: any = (req as any).session;
    if (sess?.destroy) {
      sess.destroy((err: any) => {
        if (err) { console.error("Logout error:", err); res.status(500).json({ message: "Logout failed" }); return; }
        res.json({ message: "Logged out successfully" });
        return;
      });
    } else {
      (req as any).session = null;
      res.json({ message: "Logged out successfully" });
      return;
    }
  });

  app.get("/api/auth/user", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
      return;
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
      return;
    }
  });

  app.post("/api/auth/session/refresh", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
      return;
    } catch (error) {
      console.error("Error refreshing session:", error);
      res.status(500).json({ message: "Failed to refresh session" });
      return;
    }
  });

  // Profile endpoints used by the Profile page
  app.get("/api/profile", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) { res.status(404).json({ message: "User not found" }); return; }
      res.json(user);
      return;
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
      return;
    }
  });

  app.post("/api/profile", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const oldUser = await storage.getUser(userId);
      const patch = req.body || {};

      // Validate avatar/banner payload sizes to avoid Firestore 1MB field limit
      const approxBytes = (b64: any) => {
        if (typeof b64 !== "string") return 0;
        const commaIdx = b64.indexOf(",");
        const raw = commaIdx >= 0 ? b64.slice(commaIdx + 1) : b64;
        // Base64 encodes 3 bytes into 4 chars
        return Math.floor((raw.length * 3) / 4);
      };
      const avatarBytes = approxBytes(patch.avatarBase64);
      const bannerBytes = approxBytes(patch.bannerBase64);
      const FIELD_LIMIT = 1048487; // Firestore per-field limit observed in logs
      if (avatarBytes > FIELD_LIMIT || bannerBytes > FIELD_LIMIT) {
        const tooLarge = [] as string[];
        if (avatarBytes > FIELD_LIMIT) tooLarge.push(`avatarBase64 ~${avatarBytes} bytes`);
        if (bannerBytes > FIELD_LIMIT) tooLarge.push(`bannerBase64 ~${bannerBytes} bytes`);
        res.status(413).json({
          message: "Image too large. Please upload an image under 1MB.",
          details: tooLarge,
        });
        return;
      }

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
      res.json(updated);
      return;
    } catch (error) {
      console.error("Error updating profile:", error);
      // Surface known Firestore field size errors as 413 to the client
      const msg = String((error as any)?.details || (error as any)?.message || "Failed to update profile");
      if (msg.includes("longer than") && msg.includes("bytes")) {
        res.status(413).json({ message: "Image too large. Please upload an image under 1MB.", details: msg });
        return;
      }
      res.status(500).json({ message: "Failed to update profile" });
      return;
    }
  });

  // Wallets CRUD
  app.get("/api/wallets", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
      const wallets = await storage.getWalletsByTenant(tenantId);
      res.json(wallets);
      return;
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
      return;
    }
  });

  app.post("/api/wallets", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const payload = {
        tenantId,
        name: req.body?.name,
        type: req.body?.type ?? "cash",
        currency: req.body?.currency ?? "usd",
        balance: req.body?.balance ?? "0",
        isDefault: !!req.body?.isDefault,
      };
      if (!payload.name) { res.status(400).json({ message: "Wallet name is required" }); return; }
      const created = await storage.createWallet(payload as any);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Created wallet '${payload.name}'`,
        "wallet",
        created.id,
        null,
        created,
        "create",
      );
      res.json(created);
      return;
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
      return;
    }
  });

  app.patch("/api/wallets/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const id = String(req.params.id);
      const old = await storage.getWallet(id, tenantId);
      if (!old) { res.status(404).json({ message: "Wallet not found" }); return; }
      const patch = {
        name: req.body?.name !== undefined ? req.body?.name : undefined,
        type: req.body?.type !== undefined ? req.body?.type : undefined,
        currency: req.body?.currency !== undefined ? req.body?.currency : undefined,
        balance: req.body?.balance !== undefined ? req.body?.balance : undefined,
        isDefault: req.body?.isDefault !== undefined ? !!req.body?.isDefault : undefined,
      } as any;
      const updated = await storage.updateWallet(id, tenantId, patch);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Updated wallet '${updated.name ?? old.name}'`,
        "wallet",
        id,
        old,
        updated,
        "update",
      );
      res.json(updated);
      return;
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).json({ message: "Failed to update wallet" });
      return;
    }
  });

  app.delete("/api/wallets/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const id = String(req.params.id);
      const old = await storage.getWallet(id, tenantId);
      if (!old) { res.status(404).json({ message: "Wallet not found" }); return; }
      await storage.deleteWallet(id, tenantId);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "Unknown",
        `Deleted wallet '${old.name}'`,
        "wallet",
        id,
        old,
        null,
        "delete",
      );
      res.json({ ok: true });
      return;
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
      return;
    }
  });

  // Admin API endpoints (Super Admin only)
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!(user as any).isSuperAdmin) {
        res.status(403).json({ message: "Super Admin access required" });
        return;
      }
      
      const rows = await storage.getAllUsers();
      res.json(rows);
      return;
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.get("/api/admin/clubs", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!(user as any).isSuperAdmin) {
        res.status(403).json({ message: "Super Admin access required" });
        return;
      }
      
      const rows = await storage.getAllTenants();
      res.json(rows);
      return;
    } catch (error) {
      console.error("Error fetching all tenants:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Social Media API endpoints
  app.get("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const accounts = await storage.getSocialAccountsByTenant(tenantId);
      res.json(accounts);
      return;
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const account = await storage.createSocialAccount({ ...req.body, tenantId });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created social account", "social_account", account.id, null, account, "create");
      res.json(account);
      return;
    } catch (error) {
      console.error("Error creating social account:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.patch("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const oldAccount = await storage.getSocialAccount(id, tenantId);
      if (!oldAccount) {
        res.status(404).json({ message: "Social account not found" });
        return;
      }
      const account = await storage.updateSocialAccount(id, tenantId, req.body);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Updated social account", "social_account", account.id, oldAccount, account);
      res.json(account);
      return;
    } catch (error) {
      console.error("Error updating social account:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.delete("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const account = await storage.getSocialAccount(id, tenantId);
      if (!account) {
        res.status(404).json({ message: "Social account not found" });
        return;
      }
      await storage.deleteSocialAccount(id, tenantId);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted social account", "social_account", id, account, null, "delete");
      res.json({ message: "Social account deleted" });
      return;
    } catch (error) {
      console.error("Error deleting social account:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.get("/api/social/analytics", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const metrics = await storage.getLatestMetricsByTenant(tenantId);
      res.json(metrics);
      return;
    } catch (error) {
      console.error("Error fetching social analytics:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/social/sync/:accountId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const accountId = String(req.params.accountId);
      const account = await storage.getSocialAccount(accountId, tenantId);
      if (!account) {
        res.status(404).json({ message: "Social account not found" });
        return;
      }
      // Create a mock metric for sync (in real app, this would sync with actual platform)
      const metric = await storage.createSocialMetric({
        tenantId,
        platform: (account as any).platform,
        accountId,
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 1000),
        posts: Math.floor(Math.random() * 500),
        engagement: Math.floor(Math.random() * 100),
        reach: Math.floor(Math.random() * 50000),
        impressions: Math.floor(Math.random() * 100000),
        date: new Date().toISOString().slice(0, 10)
      });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Synced social account", "social_account", accountId, null, metric, "create");
      res.json({ message: "Sync completed", metric });
      return;
    } catch (error) {
      console.error("Error syncing social account:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Invite API endpoints
  app.get("/api/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const invites = await storage.getInvitesByTenant(tenantId);
      res.json(invites);
      return;
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const invite = await storage.createInvite({ ...req.body, tenantId });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created invite", "invite", invite.id, null, invite, "create");
      res.json(invite);
      return;
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.get("/api/invites/:token", async (req, res) => {
    try {
      const token = String(req.params.token);
      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
      }
      res.json(invite);
      return;
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      const token = String(req.params.token);
      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
      }
      if (invite.status !== "pending") {
        res.status(400).json({ message: "Invite is no longer valid" });
        return;
      }
      const updatedInvite = await storage.updateInviteStatus(token, "accepted");
      res.json({ message: "Invite accepted", invite: updatedInvite });
      return;
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const invite = await storage.getInvite(id);
      if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
      }
      await storage.deleteInvite(id, tenantId);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted invite", "invite", id, invite, null, "delete");
      res.json({ message: "Invite deleted" });
      return;
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Tournament API endpoints
  app.get("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const tournaments = await storage.getTournamentsByTenant(tenantId);
      res.json(tournaments);
      return;
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const tournament = await storage.createTournament({ ...req.body, tenantId });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created tournament", "tournament", tournament.id, null, tournament, "create");
      res.json(tournament);
      return;
    } catch (error) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.patch("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const oldTournament = await storage.getTournament(id, tenantId);
      if (!oldTournament) {
        res.status(404).json({ message: "Tournament not found" });
        return;
      }
      const tournament = await storage.updateTournament(id, tenantId, req.body);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Updated tournament", "tournament", tournament.id, oldTournament, tournament);
      res.json(tournament);
      return;
    } catch (error) {
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.delete("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const tournament = await storage.getTournament(id, tenantId);
      if (!tournament) {
        res.status(404).json({ message: "Tournament not found" });
        return;
      }
      await storage.deleteTournament(id, tenantId);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted tournament", "tournament", id, tournament, null, "delete");
      res.json({ message: "Tournament deleted" });
      return;
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Tournament Rounds API endpoints
  app.get("/api/tournaments/:id/rounds", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const tournament = await storage.getTournament(id, tenantId);
      if (!tournament) {
        res.status(404).json({ message: "Tournament not found" });
        return;
      }
      const rounds = await storage.getRoundsByTournament(id);
      res.json(rounds);
      return;
    } catch (error) {
      console.error("Error fetching tournament rounds:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/tournaments/:tournamentId/rounds", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const tournamentId = String(req.params.tournamentId);
      const tournament = await storage.getTournament(tournamentId, tenantId);
      if (!tournament) {
        res.status(404).json({ message: "Tournament not found" });
        return;
      }
      const round = await storage.createRound({ ...req.body, tournamentId });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created tournament round", "tournament_round", round.id, null, round, "create");
      res.json(round);
      return;
    } catch (error) {
      console.error("Error creating tournament round:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Round API endpoints
  app.get("/api/rounds/:id/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const matches = await storage.getMatchesByRound(id);
      res.json(matches);
      return;
    } catch (error) {
      console.error("Error fetching round matches:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.patch("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { tournamentId } = req.query;
      if (!tournamentId) {
        res.status(400).json({ message: "Tournament ID is required" });
        return;
      }
      const tournament = await storage.getTournament(tournamentId as string, tenantId);
      if (!tournament) {
        res.status(404).json({ message: "Tournament not found" });
        return;
      }
      const id = String(req.params.id);
      const oldRound = await storage.getRound(id, tournamentId as string);
      if (!oldRound) {
        res.status(404).json({ message: "Round not found" });
        return;
      }
      const round = await storage.updateRound(id, tournamentId as string, req.body);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Updated tournament round", "tournament_round", round.id, oldRound, round);
      res.json(round);
      return;
    } catch (error) {
      console.error("Error updating round:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.delete("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { tournamentId } = req.query;
      if (!tournamentId) {
        res.status(400).json({ message: "Tournament ID is required" });
        return;
      }
      const tournament = await storage.getTournament(tournamentId as string, tenantId);
      if (!tournament) {
        res.status(404).json({ message: "Tournament not found" });
        return;
      }
      const id = String(req.params.id);
      const round = await storage.getRound(id, tournamentId as string);
      if (!round) {
        res.status(404).json({ message: "Round not found" });
        return;
      }
      await storage.deleteRound(id, tournamentId as string);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted tournament round", "tournament_round", id, round, null, "delete");
      res.json({ message: "Round deleted" });
      return;
    } catch (error) {
      console.error("Error deleting round:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Contracts API endpoints
  app.get("/api/contracts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const items = await storage.getContractsByTenant(tenantId);
      res.json(items);
      return;
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/contracts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const payload = { ...req.body, tenantId };
      const created = await storage.createContract(payload as any);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created contract", "contract", created.id, null, created, "create");
      res.json(created);
      return;
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const item = await storage.getContract(id, tenantId);
      if (!item) { res.status(404).json({ message: "Contract not found" }); return; }
      res.json(item);
      return;
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const existing = await storage.getContract(id, tenantId);
      if (!existing) { res.status(404).json({ message: "Contract not found" }); return; }
      const updated = await storage.updateContract(id, tenantId, req.body);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Updated contract", "contract", updated.id, existing, updated);
      res.json(updated);
      return;
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Audit Logs
  app.get("/api/audit-logs", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const logs = await storage.getAuditLogsByTenant(tenantId);
      res.json(logs);
      return;
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Analytics
  app.get("/api/analytics", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const roster = req.query.roster as string;
      
      const matches = await storage.getMatchesByTenant(tenantId);
      
      const totalMatches = matches.length;
      const wins = matches.filter((m: any) => m.result === 'win').length;
      const losses = matches.filter((m: any) => m.result === 'loss').length;
      const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      
      const analytics = {
        winRate,
        totalMatches,
        wins,
        losses,
        avgPlacement: 0,
        topPlayers: [],
      };
      
      res.json(analytics);
      return;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      const existing = await storage.getContract(id, tenantId);
      if (!existing) { res.status(404).json({ message: "Contract not found" }); return; }
      await storage.deleteContract(id, tenantId);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted contract", "contract", id, existing, null, "delete");
      res.json({ message: "Contract deleted" });
      return;
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  // Contract Files API endpoints
  app.get("/api/contracts/:id/files", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const contractId = String(req.params.id);
      const contract = await storage.getContract(contractId, tenantId);
      if (!contract) {
        res.status(404).json({ message: "Contract not found" });
        return;
      }
      const files = await storage.getContractFiles(contractId);
      res.json(files);
      return;
    } catch (error) {
      console.error("Error fetching contract files:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.post("/api/contracts/:id/files", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const contractId = String(req.params.id);
      const contract = await storage.getContract(contractId, tenantId);
      if (!contract) {
        res.status(404).json({ message: "Contract not found" });
        return;
      }
      const file = await storage.createContractFile({ ...req.body, contractId });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Added contract file", "contract_file", file.id, null, file, "create");
      res.json(file);
      return;
    } catch (error) {
      console.error("Error adding contract file:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  app.delete("/api/contract-files/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const id = String(req.params.id);
      // In a real app, verify the file belongs to a contract in the tenant
      await storage.deleteContractFile(id);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted contract file", "contract_file", id, null, null, "delete");
      res.json({ message: "File deleted" });
      return;
    } catch (error) {
      console.error("Error deleting contract file:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  });

  return app;
}
