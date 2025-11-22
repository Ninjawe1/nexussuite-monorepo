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
  // Session/auth is now initialized at server startup (server/index.ts)

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
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
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
      res.json({ user });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const sess: any = (req as any).session;
    if (sess?.destroy) {
      sess.destroy((err: any) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } else {
      (req as any).session = null;
      res.json({ message: "Logged out successfully" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Auth: forgot password - request reset link
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const email = (req.body || {}).email;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      // Do not reveal whether the email exists for security reasons
      if (user) {
        // In a real implementation, generate a token and send an email.
        // Create a lightweight audit log for observability.
        try {
          await createAuditLog(
            user.tenantId || "unknown",
            (user as any).id,
            `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
            "password_reset_requested",
            "user",
            (user as any).id,
            null,
            { requestedAt: new Date().toISOString(), email },
            "create",
          );
        } catch (err) {
          console.warn("Failed to log password reset request:", err);
        }
      }
      return res.json({ message: "Password reset link sent to your email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process reset request" });
    }
  });

  // Auth: change temporary password immediately after login
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const bcryptMod = await import("bcryptjs");
      const bcrypt = (bcryptMod as any).default || bcryptMod;
      const ok = await bcrypt.compare(currentPassword, (user as any).password);
      if (!ok) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateUser(userId, {
        password: hashed,
        isTemporaryPassword: false,
        lastPasswordChange: new Date(),
      } as any);

      // Audit log
      const tenantId = await getTenantId(req);
      await createAuditLog(
        tenantId || updated.tenantId || "unknown",
        userId,
        `${updated?.firstName || ""} ${updated?.lastName || ""}`.trim() || updated?.email || "Unknown",
        "change_password",
        "user",
        userId,
        { isTemporaryPassword: (user as any).isTemporaryPassword, lastPasswordChange: (user as any).lastPasswordChange },
        { isTemporaryPassword: (updated as any).isTemporaryPassword, lastPasswordChange: (updated as any).lastPasswordChange },
        "update",
      );

      return res.json({ message: "Password updated" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Profile endpoints used by the Profile page
  app.get("/api/profile", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
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
        return res.status(413).json({
          message: "Image too large. Please upload an image under 1MB.",
          details: tooLarge,
        });
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
    } catch (error) {
      console.error("Error updating profile:", error);
      // Surface known Firestore field size errors as 413 to the client
      const msg = String((error as any)?.details || (error as any)?.message || "Failed to update profile");
      if (msg.includes("longer than") && msg.includes("bytes")) {
        return res.status(413).json({ message: "Image too large. Please upload an image under 1MB.", details: msg });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Wallets CRUD
  app.get("/api/wallets", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const wallets = await storage.getWalletsByTenant(tenantId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post("/api/wallets", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
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
      if (!payload.name) return res.status(400).json({ message: "Wallet name is required" });
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
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  app.patch("/api/wallets/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const id = String(req.params.id);
      const old = await storage.getWallet(id, tenantId);
      if (!old) return res.status(404).json({ message: "Wallet not found" });
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
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).json({ message: "Failed to update wallet" });
    }
  });

  app.delete("/api/wallets/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const id = String(req.params.id);
      const old = await storage.getWallet(id, tenantId);
      if (!old) return res.status(404).json({ message: "Wallet not found" });
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
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // Admin API endpoints (Super Admin only)
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!(user as any).isSuperAdmin) {
        return res.status(403).json({ message: "Super Admin access required" });
      }
      
      const rows = await storage.getAllUsers();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/clubs", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!(user as any).isSuperAdmin) {
        return res.status(403).json({ message: "Super Admin access required" });
      }
      
      const rows = await storage.getAllTenants();
      res.json(rows);
    } catch (error) {
      console.error("Error fetching all tenants:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Social Media API endpoints
  app.get("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const accounts = await storage.getSocialAccountsByTenant(tenantId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const account = await storage.createSocialAccount({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created social account", "social_account", account.id, null, account, "create");
      res.json(account);
    } catch (error) {
      console.error("Error creating social account:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const oldAccount = await storage.getSocialAccount(req.params.id, tenantId);
      if (!oldAccount) {
        return res.status(404).json({ message: "Social account not found" });
      }
      const account = await storage.updateSocialAccount(req.params.id, tenantId, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated social account", "social_account", account.id, oldAccount, account);
      res.json(account);
    } catch (error) {
      console.error("Error updating social account:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const account = await storage.getSocialAccount(req.params.id, tenantId);
      if (!account) {
        return res.status(404).json({ message: "Social account not found" });
      }
      await storage.deleteSocialAccount(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted social account", "social_account", req.params.id, account, null, "delete");
      res.json({ message: "Social account deleted" });
    } catch (error) {
      console.error("Error deleting social account:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/social/analytics", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const metrics = await storage.getLatestMetricsByTenant(tenantId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching social analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/social/sync/:accountId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const account = await storage.getSocialAccount(req.params.accountId, tenantId);
      if (!account) {
        return res.status(404).json({ message: "Social account not found" });
      }
      // Create a mock metric for sync (in real app, this would sync with actual platform)
      const metric = await storage.createSocialMetric({
        accountId: req.params.accountId,
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 1000),
        posts: Math.floor(Math.random() * 500),
        engagement: Math.floor(Math.random() * 100),
        reach: Math.floor(Math.random() * 50000),
        impressions: Math.floor(Math.random() * 100000),
        date: new Date().toISOString().split('T')[0]
      });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Synced social account", "social_account", req.params.accountId, null, metric, "create");
      res.json({ message: "Sync completed", metric });
    } catch (error) {
      console.error("Error syncing social account:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Invite API endpoints
  app.get("/api/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invites = await storage.getInvitesByTenant(tenantId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invite = await storage.createInvite({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created invite", "invite", invite.id, null, invite, "create");
      res.json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      res.json(invite);
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      if (invite.status !== "pending") {
        return res.status(400).json({ message: "Invite is no longer valid" });
      }
      const updatedInvite = await storage.updateInviteStatus(req.params.token, "accepted");
      res.json({ message: "Invite accepted", invite: updatedInvite });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invite = await storage.getInvite(req.params.id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      await storage.deleteInvite(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted invite", "invite", req.params.id, invite, null, "delete");
      res.json({ message: "Invite deleted" });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tournament API endpoints
  app.get("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournaments = await storage.getTournamentsByTenant(tenantId);
      res.json(tournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournament = await storage.createTournament({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created tournament", "tournament", tournament.id, null, tournament, "create");
      res.json(tournament);
    } catch (error) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const oldTournament = await storage.getTournament(req.params.id, tenantId);
      if (!oldTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      const tournament = await storage.updateTournament(req.params.id, tenantId, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated tournament", "tournament", tournament.id, oldTournament, tournament);
      res.json(tournament);
    } catch (error) {
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournament = await storage.getTournament(req.params.id, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      await storage.deleteTournament(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted tournament", "tournament", req.params.id, tournament, null, "delete");
      res.json({ message: "Tournament deleted" });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tournament Rounds API endpoints
  app.get("/api/tournaments/:id/rounds", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournament = await storage.getTournament(req.params.id, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      const rounds = await storage.getRoundsByTournament(req.params.id);
      res.json(rounds);
    } catch (error) {
      console.error("Error fetching tournament rounds:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tournaments/:tournamentId/rounds", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournament = await storage.getTournament(req.params.tournamentId, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      const round = await storage.createRound({ ...req.body, tournamentId: req.params.tournamentId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created tournament round", "tournament_round", round.id, null, round, "create");
      res.json(round);
    } catch (error) {
      console.error("Error creating tournament round:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Round API endpoints
  app.get("/api/rounds/:id/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const matches = await storage.getMatchesByRound(req.params.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching round matches:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { tournamentId } = req.query;
      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required" });
      }
      const tournament = await storage.getTournament(tournamentId as string, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      const oldRound = await storage.getRound(req.params.id, tournamentId as string);
      if (!oldRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      const round = await storage.updateRound(req.params.id, tournamentId as string, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated tournament round", "tournament_round", round.id, oldRound, round);
      res.json(round);
    } catch (error) {
      console.error("Error updating round:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { tournamentId } = req.query;
      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required" });
      }
      const tournament = await storage.getTournament(tournamentId as string, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      const round = await storage.getRound(req.params.id, tournamentId as string);
      if (!round) {
        return res.status(404).json({ message: "Round not found" });
      }
      await storage.deleteRound(req.params.id, tournamentId as string);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted tournament round", "tournament_round", req.params.id, round, null, "delete");
      res.json({ message: "Round deleted" });
    } catch (error) {
      console.error("Error deleting round:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Contracts API endpoints
  app.get("/api/contracts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const items = await storage.getContractsByTenant(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/contracts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const payload = { ...req.body, tenantId };
      const created = await storage.createContract(payload as any);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created contract", "contract", created.id, null, created, "create");
      res.json(created);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const item = await storage.getContract(req.params.id, tenantId);
      if (!item) return res.status(404).json({ message: "Contract not found" });
      res.json(item);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const existing = await storage.getContract(req.params.id, tenantId);
      if (!existing) return res.status(404).json({ message: "Contract not found" });
      const updated = await storage.updateContract(req.params.id, tenantId, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated contract", "contract", updated.id, existing, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const existing = await storage.getContract(req.params.id, tenantId);
      if (!existing) return res.status(404).json({ message: "Contract not found" });
      await storage.deleteContract(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted contract", "contract", req.params.id, existing, null, "delete");
      res.json({ message: "Contract deleted" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Contract Files API endpoints
  app.get("/api/contracts/:id/files", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const contract = await storage.getContract(req.params.id, tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      const files = await storage.getContractFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error fetching contract files:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/contracts/:id/files", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const contract = await storage.getContract(req.params.id, tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      const file = await storage.createContractFile({ ...req.body, contractId: req.params.id });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Added contract file", "contract_file", file.id, null, file, "create");
      res.json(file);
    } catch (error) {
      console.error("Error creating contract file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/contracts/:contractId/files/:fileId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const contract = await storage.getContract(req.params.contractId, tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      const file = await storage.getContractFile(req.params.fileId, req.params.contractId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      await storage.deleteContractFile(req.params.fileId, req.params.contractId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted contract file", "contract_file", req.params.fileId, file, null, "delete");
      res.json({ message: "File deleted" });
    } catch (error) {
      console.error("Error deleting contract file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription API endpoints
  app.post("/api/subscriptions/create-checkout", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Mock Stripe checkout session creation
      const checkoutSession = {
        id: `cs_${Date.now()}`,
        url: `https://checkout.stripe.com/pay/cs_${Date.now()}`,
        payment_status: "unpaid",
        customer_email: req.user.email,
        amount_total: req.body.amount || 2999, // Default $29.99
        currency: "usd"
      };
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created checkout session", "subscription", checkoutSession.id, null, checkoutSession, "create");
      res.json(checkoutSession);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/subscriptions/create-portal", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Mock Stripe customer portal session creation
      const portalSession = {
        id: `ps_${Date.now()}`,
        url: `https://billing.stripe.com/p/session/ps_${Date.now()}`,
        customer: req.user.id,
        return_url: req.body.return_url || `${req.protocol}://${req.get('host')}/dashboard`
      };
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created billing portal session", "subscription", portalSession.id, null, portalSession, "create");
      res.json(portalSession);
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/subscriptions/sync-session", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      // Mock subscription sync - in real implementation, this would sync with Stripe
      const subscription = {
        id: `sub_${Date.now()}`,
        status: "active",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        plan: {
          id: "price_premium",
          nickname: "Premium Plan",
          amount: 2999,
          currency: "usd",
          interval: "month"
        }
      };
      await storage.updateTenant(tenantId, { 
        subscriptionStatus: "active",
        subscriptionId: subscription.id,
        planType: "premium"
      });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Synced subscription", "subscription", subscription.id, null, subscription);
      res.json(subscription);
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team Management API endpoints
  app.get("/api/team/users", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const users = await storage.getUsersByTenant(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching team users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/team/users/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      const updatedUser = await storage.updateUser(req.params.id, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated team member", "user", updatedUser.id, user, updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating team user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/team/users/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(req.params.id);
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.id === req.user.id) {
        return res.status(400).json({ message: "Cannot remove yourself from the team" });
      }
      await storage.deleteUser(req.params.id);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Removed team member", "user", req.params.id, user, null, "delete");
      res.json({ message: "User removed from team" });
    } catch (error) {
      console.error("Error removing team user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/team/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invites = await storage.getInvitesByTenant(tenantId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching team invites:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/team/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invite = await storage.createInvite({ 
        ...req.body, 
        tenantId,
        invitedBy: req.user.id,
        type: "team"
      });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created team invite", "invite", invite.id, null, invite, "create");
      res.json(invite);
    } catch (error) {
      console.error("Error creating team invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/team/invites/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invite = await storage.getInvite(req.params.id);
      if (!invite || invite.tenantId !== tenantId) {
        return res.status(404).json({ message: "Invite not found" });
      }
      await storage.deleteInvite(req.params.id);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Cancelled team invite", "invite", req.params.id, invite, null, "delete");
      res.json({ message: "Invite cancelled" });
    } catch (error) {
      console.error("Error cancelling team invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transactions API endpoints
  app.get("/api/transactions", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const rows = await storage.getTransactionsByTenant(tenantId);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/transactions", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const payload = { ...req.body, tenantId, createdBy: req.user.id };
      const created = await storage.createTransaction(payload as any);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created transaction", "transaction", created.id, null, created, "create");
      res.json(created);
    } catch (error) {
      console.error("Error creating transaction:", error);
      const errMsg = (error as any)?.message || String(error);
      const errStack = (error as any)?.stack || undefined;
      res.status(500).json({ message: "Internal server error", error: errMsg, stack: errStack });
    }
  });

  app.get("/api/transactions/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const item = await storage.getTransaction(req.params.id, tenantId);
      if (!item) return res.status(404).json({ message: "Transaction not found" });
      res.json(item);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/transactions/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const old = await storage.getTransaction(req.params.id, tenantId);
      if (!old) return res.status(404).json({ message: "Transaction not found" });
      const updated = await storage.updateTransaction(req.params.id, tenantId, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated transaction", "transaction", updated.id, old, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const old = await storage.getTransaction(req.params.id, tenantId);
      if (!old) return res.status(404).json({ message: "Transaction not found" });
      await storage.deleteTransaction(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted transaction", "transaction", req.params.id, old, null, "delete");
      res.json({ message: "Transaction deleted" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Finance API endpoints
  app.get("/api/finance", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Return transactions list for the tenant
      const transactions = await storage.getTransactionsByTenant(tenantId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching finance data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/finance", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Create a transaction record
      const transaction = await storage.createTransaction({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created transaction", "transaction", transaction.id, null, transaction, "create");
      res.json(transaction);
    } catch (error) {
      console.error("Error creating finance record:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/finance/monthly", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { year, month } = req.query as { year?: string; month?: string };
      const transactions = await storage.getTransactionsByTenant(tenantId);

      // Group transactions by YYYY-MM
      const groups: Record<string, { income: number; expenses: number }> = {};
      for (const tx of transactions) {
        const dateStr = (tx as any).date ?? (tx as any).createdAt;
        const d = dateStr ? new Date(dateStr) : new Date();
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, "0");
        const key = `${y}-${m}`;
        if (year && `${y}` !== year) continue;
        if (month && m !== month.padStart(2, "0")) continue;
        if (!groups[key]) groups[key] = { income: 0, expenses: 0 };
        const amt = Number((tx as any).amount ?? 0);
        if ((tx as any).type === "income") groups[key].income += amt;
        else groups[key].expenses += amt;
      }

      const monthlyFinance = Object.entries(groups)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([monthKey, vals]) => ({
          month: monthKey,
          income: vals.income,
          expenses: vals.expenses,
          profit: vals.income - vals.expenses,
        }));
      res.json(monthlyFinance);
    } catch (error) {
      console.error("Error fetching monthly finance data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/finance/export", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const transactions = await storage.getTransactionsByTenant(tenantId);

      // Filter by optional date range
      const filtered = transactions.filter(tx => {
        const dateStr = (tx as any).date ?? (tx as any).createdAt;
        const d = dateStr ? new Date(dateStr) : new Date();
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      });

      // Build CSV
      const header = [
        "id","tenantId","type","category","amount","description","date","paymentMethod","reference","walletId","createdAt","updatedAt"
      ];
      const rows = filtered.map(tx => {
        const t = tx as any;
        return [
          t.id,
          t.tenantId ?? "",
          t.type ?? "",
          t.category ?? "",
          t.amount ?? 0,
          (t.description ?? "").toString().replace(/\n/g, " ").replace(/"/g, "'"),
          t.date ?? "",
          t.paymentMethod ?? "",
          t.reference ?? "",
          t.walletId ?? "",
          t.createdAt ? new Date(t.createdAt).toISOString() : "",
          t.updatedAt ? new Date(t.updatedAt).toISOString() : "",
        ].map(v => typeof v === "string" ? `"${v}"` : v).join(",");
      });
      const csv = [header.join(","), ...rows].join("\n");

      await createAuditLog(tenantId, req.user.id, req.user.name, "Exported finance data", "finance", "export", null, { startDate, endDate, format: 'csv' });

      // Default to CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="finance-export.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting finance data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Basic list endpoints required by frontend pages
  app.get("/api/staff", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const staff = await storage.getStaffByTenant(tenantId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create staff member
  app.post("/api/staff", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const body = req.body || {};
      if (!body.name || !body.email || !body.role) {
        return res.status(400).json({ message: "name, email, and role are required" });
      }
      const created = await storage.createStaff({
        tenantId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        role: body.role,
        avatar: body.avatar,
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
        status: body.status || "active",
      } as any);

      await createAuditLog(tenantId, (req as any).user?.claims?.sub, (req as any).user?.name || "Unknown",
        `Created staff ${created.name}`,
        "staff", (created as any).id, null, created, "create");

      res.json(created);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update staff member
  app.patch("/api/staff/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = (req.params || {}).id;
      const existing = await storage.getStaff(id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Staff not found" });
      }
      const patch = req.body || {};
      const updated = await storage.updateStaff(id, tenantId, patch);

      await createAuditLog(tenantId, (req as any).user?.claims?.sub, (req as any).user?.name || "Unknown",
        `Updated staff ${updated.name}`,
        "staff", id, existing, updated, "update");

      res.json(updated);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete staff member
  app.delete("/api/staff/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = (req.params || {}).id;
      const existing = await storage.getStaff(id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Staff not found" });
      }
      await storage.deleteStaff(id, tenantId);

      await createAuditLog(tenantId, (req as any).user?.claims?.sub, (req as any).user?.name || "Unknown",
        `Deleted staff ${existing.name}`,
        "staff", id, existing, null, "delete");

      res.json({ message: "Staff deleted" });
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/payroll", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const payroll = await storage.getPayrollByTenant(tenantId);
      res.json(payroll);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const matches = await storage.getMatchesByTenant(tenantId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/campaigns", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const campaigns = await storage.getCampaignsByTenant(tenantId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Roster API endpoints
  app.get("/api/rosters", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const rosters = await storage.getRostersByTenant(tenantId);
      res.json(rosters);
    } catch (error) {
      console.error("Error fetching rosters:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/rosters", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Basic payload validation to prevent creating invalid roster records
      const { playerId, role, game } = req.body || {};
      if (typeof game !== "string" || !game.trim()) {
        return res.status(400).json({ message: "'game' is required to create a roster" });
      }
      if (!playerId) {
        return res.status(400).json({ message: "'playerId' is required to create a roster" });
      }
      const roster = await storage.createRoster({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created roster", "roster", roster.id, null, roster, "create");
      res.json(roster);
    } catch (error) {
      console.error("Error creating roster:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/rosters/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const roster = await storage.getRoster(req.params.id, tenantId);
      if (!roster) {
        return res.status(404).json({ message: "Roster not found" });
      }
      res.json(roster);
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/rosters/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const oldRoster = await storage.getRoster(req.params.id, tenantId);
      if (!oldRoster) {
        return res.status(404).json({ message: "Roster not found" });
      }
      const roster = await storage.updateRoster(req.params.id, tenantId, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated roster", "roster", roster.id, oldRoster, roster);
      res.json(roster);
    } catch (error) {
      console.error("Error updating roster:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/rosters/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const roster = await storage.getRoster(req.params.id, tenantId);
      if (!roster) {
        return res.status(404).json({ message: "Roster not found" });
      }
      await storage.deleteRoster(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted roster", "roster", req.params.id, roster, null, "delete");
      res.json({ message: "Roster deleted" });
    } catch (error) {
      console.error("Error deleting roster:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Roster Player endpoints
  app.get("/api/rosters/:id/players", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const baseRoster = await storage.getRoster(req.params.id, tenantId);
      if (!baseRoster) {
        return res.status(404).json({ message: "Roster not found" });
      }
      const allRosters = await storage.getRostersByTenant(tenantId);
      const players = allRosters.filter(r => (r as any).game === (baseRoster as any).game);
      const response = players.map(p => ({
        id: (p as any).id,
        playerId: (p as any).playerId,
        role: (p as any).role ?? "Player",
        joinedAt: (p as any).createdAt ?? new Date().toISOString(),
        isActive: true,
      }));
      res.json(response);
    } catch (error) {
      console.error("Error fetching roster players:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/rosters/:id/players", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const baseRoster = await storage.getRoster(req.params.id, tenantId);
      if (!baseRoster) {
        return res.status(404).json({ message: "Roster not found" });
      }
      // Validate that the base roster has a valid 'game' value before proceeding.
      const baseGameRaw = (baseRoster as any)?.game;
      const baseGame = typeof baseGameRaw === "string" ? baseGameRaw.trim() : "";
      if (!baseGame) {
        console.warn(`[rosters.assign] Roster ${req.params.id} is missing required 'game' field. Aborting assignment.`);
        return res.status(400).json({
          message: "Roster is missing required 'game'. Please set the roster's game before assigning players.",
        });
      }
      // Validate and sanitize request payload
      const payload = req.body ?? {};
      const incomingPlayers: any[] = Array.isArray(payload.players) ? payload.players : [];
      if (!incomingPlayers.length) {
        return res.status(400).json({ message: "players[] is required" });
      }

      const normalizedPlayers = incomingPlayers
        .map((p: any) => ({
          playerId: typeof p?.playerId === "string" ? p.playerId.trim() : "",
          role: typeof p?.role === "string" && p.role.trim() ? p.role.trim() : "Player",
        }))
        .filter(p => !!p.playerId);

      if (!normalizedPlayers.length) {
        return res.status(400).json({ message: "No valid players provided (missing playerId)." });
      }

      console.log(`[rosters.assign] rosterId=${(baseRoster as any).id} game=${baseGame} incoming=${incomingPlayers.length} normalized=${normalizedPlayers.length}`);

      const allRosters = await storage.getRostersByTenant(tenantId);
      const sameGame = allRosters.filter(r => (r as any).game === baseGame);

      let createdCount = 0;
      let updatedCount = 0;

      for (const assignment of normalizedPlayers) {
        const { playerId, role } = assignment;
        const existing = sameGame.find(r => (r as any).playerId === playerId);
        try {
          if (existing) {
            const oldValue = { role: (existing as any).role };
            const updated = await storage.updateRoster((existing as any).id, tenantId, { role });
            updatedCount += 1;
            await createAuditLog(tenantId, req.user.id, req.user.name, `Updated roster player ${playerId}`,
              "roster_player", (existing as any).id, oldValue, updated, "update");
          } else {
            const created = await storage.createRoster({
              tenantId,
              playerId,
              game: baseGame,
              role,
            } as any);
            createdCount += 1;
            await createAuditLog(tenantId, req.user.id, req.user.name, `Assigned roster player ${playerId}`,
              "roster_player", (created as any).id, null, created, "create");
          }
        } catch (opErr: any) {
          const msg = opErr?.message || String(opErr);
          // Log full diagnostic context to identify Firestore write errors (e.g., undefined values)
          try {
            const diag = {
              playerId,
              role,
              game: baseGame,
              tenantId,
              errMessage: msg,
              errCode: (opErr && (opErr.code || opErr.name)) || undefined,
              errStack: opErr?.stack,
            };
            console.error(`[rosters.assign] Failed write diagnostics`, diag);
          } catch (_) {
            // no-op if serialization fails
          }
          console.error(`[rosters.assign] Failed for playerId=${playerId} game=${baseGame}:`, msg);
          if (/not\s*null|constraint|validation/i.test(msg)) {
            return res.status(400).json({
              message: `Failed to assign player ${playerId}: ${msg}`,
            });
          }
          throw opErr;
        }
      }

      res.json({ message: "Players assigned", created: createdCount, updated: updatedCount });
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error(`Error assigning roster players for roster ${req.params.id}:`, msg);
      // Always return a clear 400 with the backend message so the client stops seeing opaque 500s while we finish hardening
      return res.status(400).json({ message: `Failed to assign players: ${msg}` });
    }
  });

  app.delete("/api/rosters/:id/players/:playerId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { id, playerId } = req.params;

      console.log(`Attempting to remove player ${playerId} from roster ${id}`);

      const baseRoster = await storage.getRoster(id, tenantId);
      if (!baseRoster) {
        console.log(`Roster ${id} not found for deletion`);
        return res.status(404).json({ message: "Roster not found" });
      }

      const allRosters = await storage.getRostersByTenant(tenantId);
      const sameGame = allRosters.filter(r => (r as any).game === (baseRoster as any).game);
      const existing = sameGame.find(r => (r as any).playerId === playerId);

      if (!existing) {
        console.log(`Player ${playerId} not found in roster ${id} for game ${(baseRoster as any).game}`);
        return res.status(404).json({ message: "Player not assigned to roster" });
      }

      await storage.deleteRoster((existing as any).id, tenantId);
      console.log(`Player ${playerId} removed from roster ${id}`);

      await createAuditLog(tenantId, req.user.id, req.user.name, `Removed roster player ${playerId}`,
        "roster_player", (existing as any).id, existing, null, "delete");

      res.json({ message: "Player removed" });
    } catch (error) {
      console.error("Error removing roster player:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // Basic list endpoints required by frontend pages
  app.get("/api/staff", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const staff = await storage.getStaffByTenant(tenantId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/payroll", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const payroll = await storage.getPayrollByTenant(tenantId);
      res.json(payroll);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const matches = await storage.getMatchesByTenant(tenantId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/campaigns", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const campaigns = await storage.getCampaignsByTenant(tenantId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/audit-logs", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const logs = await storage.getAuditLogsByTenant(tenantId, 200);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // OAuth API endpoints
  app.get("/api/oauth/status", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const oauthStatus = await storage.getOAuthStatus(tenantId, req.user.id);
      res.json(oauthStatus);
    } catch (error) {
      console.error("Error fetching OAuth status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/oauth/init/:platform", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { platform } = req.params;
      const supportedPlatforms = ['google', 'facebook', 'twitter', 'instagram', 'linkedin'];
      
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      // Mock OAuth initialization - in real implementation, this would redirect to OAuth provider
      const oauthUrl = `https://oauth.${platform}.com/authorize?client_id=mock_client_id&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/api/oauth/callback/${platform}`)}&scope=read_profile&state=${tenantId}_${req.user.id}`;
      
      await createAuditLog(tenantId, req.user.id, req.user.name, `Initiated OAuth for ${platform}`, "oauth", platform, null, { platform, url: oauthUrl });
      
      res.json({ 
        authUrl: oauthUrl,
        platform,
        status: "initialized"
      });
    } catch (error) {
      console.error("Error initializing OAuth:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/oauth/callback/:platform", async (req, res) => {
    try {
      const { platform } = req.params;
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ message: "Missing authorization code or state" });
      }

      const [tenantId, userId] = (state as string).split('_');
      
      // Mock OAuth token exchange - in real implementation, this would exchange code for access token
      const mockToken = {
        access_token: `mock_access_token_${Date.now()}`,
        refresh_token: `mock_refresh_token_${Date.now()}`,
        expires_in: 3600,
        platform,
        user_id: userId,
        tenant_id: tenantId
      };

      await storage.saveOAuthToken(tenantId, userId, platform, mockToken);
      await createAuditLog(tenantId, userId, "System", `OAuth connected for ${platform}`, "oauth", platform, null, mockToken);

      // Redirect back to the application
      res.redirect(`${req.protocol}://${req.get('host')}/dashboard?oauth_success=${platform}`);
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Additional Admin API endpoints
  app.get("/api/admin/export-database", requireSuperAdmin(), async (req, res) => {
    try {
      const exportData = await storage.exportDatabase();
      await createAuditLog("system", req.user.id, req.user.name, "Exported database", "admin", "database_export", null, { timestamp: new Date().toISOString() });
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="database-export.json"');
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting database:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/clubs/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const oldTenant = await storage.getTenant(req.params.id);
      if (!oldTenant) {
        return res.status(404).json({ message: "Club not found" });
      }
      const tenant = await storage.updateTenant(req.params.id, req.body);
      await createAuditLog("system", req.user.id, req.user.name, "Updated club", "tenant", tenant.id, oldTenant, tenant);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/clubs/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ message: "Club not found" });
      }
      await storage.deleteTenant(req.params.id);
      await createAuditLog("system", req.user.id, req.user.name, "Deleted club", "tenant", req.params.id, tenant, null, "delete");
      res.json({ message: "Club deleted" });
    } catch (error) {
      console.error("Error deleting club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/clubs/:id/suspend", requireSuperAdmin(), async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ message: "Club not found" });
      }
      const updatedTenant = await storage.updateTenant(req.params.id, { 
        status: "suspended",
        suspendedAt: new Date().toISOString(),
        suspendedBy: req.user.id,
        suspensionReason: req.body.reason || "Administrative action"
      });
      await createAuditLog("system", req.user.id, req.user.name, "Suspended club", "tenant", req.params.id, tenant, updatedTenant);
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error suspending club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/clubs/:id/reactivate", requireSuperAdmin(), async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ message: "Club not found" });
      }
      const updatedTenant = await storage.updateTenant(req.params.id, { 
        status: "active",
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: req.user.id
      });
      await createAuditLog("system", req.user.id, req.user.name, "Reactivated club", "tenant", req.params.id, tenant, updatedTenant);
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error reactivating club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/users/:id", requireSuperAdmin(), async (req, res) => {
    try {
      const oldUser = await storage.getUser(req.params.id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const user = await storage.updateUser(req.params.id, req.body);
      await createAuditLog("system", req.user.id, req.user.name, "Updated user", "user", user.id, oldUser, user);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organization (Tenant) API endpoints
  app.patch("/api/tenant", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const oldTenant = await storage.getTenant(tenantId);
      if (!oldTenant) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Whitelist updatable fields to avoid accidental overwrites
      const patch: any = {};
      const fields = ["name", "slug", "logoUrl", "description", "website", "metadata"];
      for (const key of fields) {
        if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
          (patch as any)[key] = (req.body as any)[key];
        }
      }

      const updated = await storage.updateTenant(tenantId, patch);
      await createAuditLog(
        tenantId,
        (req as any).user?.id,
        (req as any).user?.name,
        "Updated organization settings",
        "tenant",
        tenantId,
        oldTenant,
        updated,
        "update",
      );
      return res.json(updated);
    } catch (error) {
      console.error("Error updating tenant:", error);
      return res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.delete("/api/tenant", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Organization not found" });
      }

      await storage.deleteTenant(tenantId);
      await createAuditLog(
        tenantId,
        (req as any).user?.id,
        (req as any).user?.name,
        "Deleted organization",
        "tenant",
        tenantId,
        tenant,
        null,
        "delete",
      );
      return res.json({ message: "Organization deleted" });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Organization Members management endpoints
  // Note: These endpoints operate on the current tenant derived from auth context
  // and enforce owner/admin permissions. Only owners can assign the "owner" role.
  app.get("/api/tenant/members", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

      // Allow owners and admins to list members
      const { isOwnerOrAdmin, listOrgMembers } = await import("./orgRoles");
      const allowed = await isOwnerOrAdmin(tenantId, (req as any).user?.id);
      if (!allowed) return res.status(403).json({ message: "Forbidden" });

      const members = await listOrgMembers(tenantId);
      return res.json(members);
    } catch (error) {
      console.error("Error listing org members:", error);
      return res.status(500).json({ message: "Failed to list organization members" });
    }
  });

  app.post("/api/tenant/members", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

      const { email, role } = req.body || {};
      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }

      // Only owners and admins can invite; but only owners may assign the "owner" role
      const { getMemberRole, setMemberRoleWithMetadata } = await import("./orgRoles");
      const requesterRole = await getMemberRole(tenantId, (req as any).user?.id);
      if (!requesterRole || (requesterRole !== "owner" && requesterRole !== "admin")) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (String(role).toLowerCase() === "owner" && requesterRole !== "owner") {
        return res.status(403).json({ message: "Only owner can assign owner role" });
      }

      // Find existing user by email
      const user = await storage.getUserByEmail(String(email));
      if (!user) {
        // For now, we require the user account to exist; invite flow for non-users can be added later
        return res.status(404).json({ message: "User not found. Please ensure the user has an account before inviting." });
      }

      await setMemberRoleWithMetadata(tenantId, user.id, String(role).toLowerCase() as any, {
        email: user.email,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
      });

      await createAuditLog(
        tenantId,
        (req as any).user?.id,
        (req as any).user?.name,
        "Invited/added member",
        "tenantMember",
        user.id,
        null,
        { email: user.email, role },
        "create",
      );

      return res.json({ message: "Member invited", userId: user.id });
    } catch (error) {
      console.error("Error inviting org member:", error);
      return res.status(500).json({ message: "Failed to invite organization member" });
    }
  });

  app.patch("/api/tenant/members/:memberId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

      const memberId = req.params.memberId;
      const { role } = req.body || {};
      if (!role) return res.status(400).json({ message: "Role is required" });

      const { getMemberRole, setMemberRoleWithMetadata, listOrgMembers } = await import("./orgRoles");
      const requesterRole = await getMemberRole(tenantId, (req as any).user?.id);
      if (!requesterRole || (requesterRole !== "owner" && requesterRole !== "admin")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const requestedRole = String(role).toLowerCase();
      if (requestedRole === "owner" && requesterRole !== "owner") {
        return res.status(403).json({ message: "Only owner can assign owner role" });
      }

      // Enforce single owner rule
      if (requestedRole === "owner") {
        const members = await listOrgMembers(tenantId);
        const existingOwner = members.find((m) => String(m.role).toLowerCase() === "owner" && m.userId !== memberId);
        if (existingOwner) {
          return res.status(400).json({ message: "Only one owner allowed. Transfer ownership by demoting the existing owner first." });
        }
      }

      // Update role, preserving metadata
      await setMemberRoleWithMetadata(tenantId, memberId, requestedRole as any, {});

      await createAuditLog(
        tenantId,
        (req as any).user?.id,
        (req as any).user?.name,
        "Updated member role",
        "tenantMember",
        memberId,
        null,
        { role: requestedRole },
        "update",
      );

      return res.json({ message: "Member role updated", memberId, role: requestedRole });
    } catch (error) {
      console.error("Error updating member role:", error);
      return res.status(500).json({ message: "Failed to update member role" });
    }
  });

  app.delete("/api/tenant/members/:memberId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

      const memberId = req.params.memberId;
      const { getMemberRole, removeMemberFromOrg } = await import("./orgRoles");
      const requesterRole = await getMemberRole(tenantId, (req as any).user?.id);
      if (!requesterRole || (requesterRole !== "owner" && requesterRole !== "admin")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const targetRole = await getMemberRole(tenantId, memberId);
      if (targetRole === "owner") {
        return res.status(400).json({ message: "Cannot remove the owner" });
      }

      await removeMemberFromOrg(tenantId, memberId);

      await createAuditLog(
        tenantId,
        (req as any).user?.id,
        (req as any).user?.name,
        "Removed member",
        "tenantMember",
        memberId,
        { role: targetRole },
        null,
        "delete",
      );

      return res.json({ message: "Member removed", memberId });
    } catch (error) {
      console.error("Error removing org member:", error);
      return res.status(500).json({ message: "Failed to remove organization member" });
    }
  });

  // Catch-all for unknown API routes to ensure JSON 404 instead of HTML index fallback
  app.use("/api", (req, res) => {
    res.status(404).json({ message: `Not Found: ${req.path}` });
  });

  const httpServer = createServer(app);
  return httpServer;
}

