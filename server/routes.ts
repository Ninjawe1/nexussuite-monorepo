<<<<<<< HEAD
﻿import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./useStorage";
=======
import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { DatabaseStorage } from "./storage";
const storage = new DatabaseStorage();
>>>>>>> e6da67b (feat(repo): initial clean upload)
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

  // Auth: login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) { res.status(400).json({ message: "Email and password are required" }); return; }
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) { res.status(401).json({ message: "Invalid email or password" }); return; }
      }
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
<<<<<<< HEAD
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
=======
      if (!user) { res.status(404).json({ message: "User not found" }); return; }
      res.json(user);
      return;
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
        return res.status(413).json({
          message: "Image too large. Please upload an image under 1MB.",
          details: tooLarge,
        });
=======
        res.status(413).json({
          message: "Image too large. Please upload an image under 1MB.",
          details: tooLarge,
        });
        return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
=======
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    } catch (error) {
      console.error("Error updating profile:", error);
      // Surface known Firestore field size errors as 413 to the client
      const msg = String((error as any)?.details || (error as any)?.message || "Failed to update profile");
      if (msg.includes("longer than") && msg.includes("bytes")) {
<<<<<<< HEAD
        return res.status(413).json({ message: "Image too large. Please upload an image under 1MB.", details: msg });
      }
      res.status(500).json({ message: "Failed to update profile" });
=======
        res.status(413).json({ message: "Image too large. Please upload an image under 1MB.", details: msg });
        return;
      }
      res.status(500).json({ message: "Failed to update profile" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Wallets CRUD
  app.get("/api/wallets", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
<<<<<<< HEAD
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
      const wallets = await storage.getWalletsByTenant(tenantId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
=======
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
      const wallets = await storage.getWalletsByTenant(tenantId);
      res.json(wallets);
      return;
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/wallets", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
<<<<<<< HEAD
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
=======
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
      if (!payload.name) return res.status(400).json({ message: "Wallet name is required" });
=======
      if (!payload.name) { res.status(400).json({ message: "Wallet name is required" }); return; }
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
=======
      return;
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/wallets/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
<<<<<<< HEAD
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
=======
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
>>>>>>> e6da67b (feat(repo): initial clean upload)
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const id = String(req.params.id);
      const old = await storage.getWallet(id, tenantId);
<<<<<<< HEAD
      if (!old) return res.status(404).json({ message: "Wallet not found" });
=======
      if (!old) { res.status(404).json({ message: "Wallet not found" }); return; }
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).json({ message: "Failed to update wallet" });
=======
      return;
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).json({ message: "Failed to update wallet" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/wallets/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
<<<<<<< HEAD
      if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
=======
      if (!tenantId) { res.status(400).json({ message: "Missing tenant context" }); return; }
>>>>>>> e6da67b (feat(repo): initial clean upload)
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      const id = String(req.params.id);
      const old = await storage.getWallet(id, tenantId);
<<<<<<< HEAD
      if (!old) return res.status(404).json({ message: "Wallet not found" });
=======
      if (!old) { res.status(404).json({ message: "Wallet not found" }); return; }
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
=======
      return;
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Admin API endpoints (Super Admin only)
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!(user as any).isSuperAdmin) {
<<<<<<< HEAD
        return res.status(403).json({ message: "Super Admin access required" });
=======
        res.status(403).json({ message: "Super Admin access required" });
        return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
      }
      
      const rows = await storage.getAllUsers();
      res.json(rows);
<<<<<<< HEAD
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      return;
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/admin/clubs", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!(user as any).isSuperAdmin) {
<<<<<<< HEAD
        return res.status(403).json({ message: "Super Admin access required" });
=======
        res.status(403).json({ message: "Super Admin access required" });
        return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
      }
      
      const rows = await storage.getAllTenants();
      res.json(rows);
<<<<<<< HEAD
    } catch (error) {
      console.error("Error fetching all tenants:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      return;
    } catch (error) {
      console.error("Error fetching all tenants:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Social Media API endpoints
  app.get("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const accounts = await storage.getSocialAccountsByTenant(tenantId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const account = await storage.createSocialAccount({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created social account", "social_account", account.id, null, account, "create");
      res.json(account);
    } catch (error) {
      console.error("Error creating social account:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/social/analytics", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const metrics = await storage.getLatestMetricsByTenant(tenantId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching social analytics:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/social/sync/:accountId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const account = await storage.getSocialAccount(req.params.accountId, tenantId);
      if (!account) {
        return res.status(404).json({ message: "Social account not found" });
      }
      // Create a mock metric for sync (in real app, this would sync with actual platform)
      const metric = await storage.createSocialMetric({
        accountId: req.params.accountId,
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 1000),
        posts: Math.floor(Math.random() * 500),
        engagement: Math.floor(Math.random() * 100),
        reach: Math.floor(Math.random() * 50000),
        impressions: Math.floor(Math.random() * 100000),
<<<<<<< HEAD
        date: new Date().toISOString().split('T')[0]
      });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Synced social account", "social_account", req.params.accountId, null, metric, "create");
      res.json({ message: "Sync completed", metric });
    } catch (error) {
      console.error("Error syncing social account:", error);
      res.status(500).json({ message: "Internal server error" });
=======
        date: new Date().toISOString().slice(0, 10)
      });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Synced social account", "social_account", accountId, null, metric, "create");
      res.json({ message: "Sync completed", metric });
      return;
    } catch (error) {
      console.error("Error syncing social account:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Invite API endpoints
  app.get("/api/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invites = await storage.getInvitesByTenant(tenantId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invite = await storage.createInvite({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created invite", "invite", invite.id, null, invite, "create");
      res.json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/invites/:token", async (req, res) => {
    try {
<<<<<<< HEAD
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      res.json(invite);
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Tournament API endpoints
  app.get("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournaments = await storage.getTournamentsByTenant(tenantId);
      res.json(tournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tournament = await storage.createTournament({ ...req.body, tenantId });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created tournament", "tournament", tournament.id, null, tournament, "create");
      res.json(tournament);
    } catch (error) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Tournament Rounds API endpoints
  app.get("/api/tournaments/:id/rounds", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/tournaments/:tournamentId/rounds", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Round API endpoints
  app.get("/api/rounds/:id/matches", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const matches = await storage.getMatchesByRound(req.params.id);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching round matches:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
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
=======
      const oldRound = await storage.getRound(String(req.params.id), tournamentId as string);
      if (!oldRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      const id = String(req.params.id);
      const round = await storage.updateRound(id, tournamentId as string, req.body);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Updated tournament round", "tournament_round", round.id, oldRound, round);
      res.json(round);
      return;
    } catch (error) {
      console.error("Error updating round:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Contracts API endpoints
  app.get("/api/contracts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const items = await storage.getContractsByTenant(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/contracts", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const payload = { ...req.body, tenantId };
      const created = await storage.createContract(payload as any);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created contract", "contract", created.id, null, created, "create");
      res.json(created);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const item = await storage.getContract(req.params.id, tenantId);
      if (!item) return res.status(404).json({ message: "Contract not found" });
      res.json(item);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Internal server error" });
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Contract Files API endpoints
  app.get("/api/contracts/:id/files", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/contracts/:id/files", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
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
      console.error("Error creating contract file:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/contracts/:contractId/files/:fileId", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
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
=======
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const contractId = String(req.params.contractId);
      const fileId = String(req.params.fileId);
      const contract = await storage.getContract(contractId, tenantId);
      if (!contract) {
        res.status(404).json({ message: "Contract not found" });
        return;
      }
      const file = await storage.getContractFile(fileId, contractId);
      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }
      await storage.deleteContractFile(fileId, contractId);
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Deleted contract file", "contract_file", fileId, file, null, "delete");
      res.json({ message: "File deleted" });
      return;
    } catch (error) {
      console.error("Error deleting contract file:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Subscription API endpoints
  app.post("/api/subscriptions/create-checkout", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
=======
        res.status(401).json({ message: "Unauthorized" });
        return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
      }
      // Mock Stripe checkout session creation
      const checkoutSession = {
        id: `cs_${Date.now()}`,
        url: `https://checkout.stripe.com/pay/cs_${Date.now()}`,
        payment_status: "unpaid",
<<<<<<< HEAD
        customer_email: req.user.email,
        amount_total: req.body.amount || 2999, // Default $29.99
        currency: "usd"
      };
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created checkout session", "subscription", checkoutSession.id, null, checkoutSession, "create");
      res.json(checkoutSession);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Internal server error" });
=======
        customer_email: (req as any).user.email,
        amount_total: req.body.amount || 2999, // Default $29.99
        currency: "usd"
      };
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created checkout session", "subscription", checkoutSession.id, null, checkoutSession, "create");
      res.json(checkoutSession);
      return;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/subscriptions/create-portal", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
=======
        res.status(401).json({ message: "Unauthorized" });
        return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
      }
      // Mock Stripe customer portal session creation
      const portalSession = {
        id: `ps_${Date.now()}`,
        url: `https://billing.stripe.com/p/session/ps_${Date.now()}`,
<<<<<<< HEAD
        customer: req.user.id,
        return_url: req.body.return_url || `${req.protocol}://${req.get('host')}/dashboard`
      };
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created billing portal session", "subscription", portalSession.id, null, portalSession, "create");
      res.json(portalSession);
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Internal server error" });
=======
        customer: (req as any).user.id,
        return_url: req.body.return_url || `${req.protocol}://${req.get('host')}/dashboard`
      };
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Created billing portal session", "subscription", portalSession.id, null, portalSession, "create");
      res.json(portalSession);
      return;
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/subscriptions/sync-session", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
=======
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ message: "Session ID is required" });
        return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
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
=======
      await storage.updateTenantStripe(tenantId, { 
        subscriptionStatus: "active",
        stripeSubscriptionId: subscription.id,
        subscriptionPlan: "premium"
      });
      await createAuditLog(tenantId, (req as any).user.id, (req as any).user.name, "Synced subscription", "subscription", subscription.id, null, subscription);
      res.json(subscription);
      return;
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Team Management API endpoints
  app.get("/api/team/users", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
<<<<<<< HEAD
        return res.status(401).json({ message: "Unauthorized" });
      }
      const users = await storage.getUsersByTenant(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching team users:", error);
      res.status(500).json({ message: "Internal server error" });
=======
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const users = await storage.getUsersByTenant(tenantId);
      res.json(users);
      return;
    } catch (error) {
      console.error("Error fetching team users:", error);
      res.status(500).json({ message: "Internal server error" });
      return;
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/team/users/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
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
=======
      const id = String((req.params as any).id);
      const user = await storage.getUser(id);
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      const updatedUser = await storage.updateUser(id, req.body);
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Updated team member", "user", updatedUser.id, user, updatedUser);
      return res.json(updatedUser);
    } catch (error) {
      console.error("Error updating team user:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/team/users/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
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
=======
      const id = String((req.params as any).id);
      const user = await storage.getUser(id);
      if (!user || user.tenantId !== tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      const u = (req as any).user;
      if (user.id === u.id) {
        return res.status(400).json({ message: "Cannot remove yourself from the team" });
      }
      await storage.deleteUser(id);
      await createAuditLog(tenantId, u.id, u.name, "Removed team member", "user", id, user, null, "delete");
      return res.json({ message: "User removed from team" });
    } catch (error) {
      console.error("Error removing team user:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/team/invites", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const invites = await storage.getInvitesByTenant(tenantId);
<<<<<<< HEAD
      res.json(invites);
    } catch (error) {
      console.error("Error fetching team invites:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      return res.json(invites);
    } catch (error) {
      console.error("Error fetching team invites:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
        invitedBy: req.user.id,
        type: "team"
      });
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created team invite", "invite", invite.id, null, invite, "create");
      res.json(invite);
    } catch (error) {
      console.error("Error creating team invite:", error);
      res.status(500).json({ message: "Internal server error" });
=======
        invitedBy: (req as any).user.id,
        type: "team"
      });
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Created team invite", "invite", invite.id, null, invite, "create");
      return res.json(invite);
    } catch (error) {
      console.error("Error creating team invite:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/team/invites/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
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
=======
      const id = String((req.params as any).id);
      const invite = await storage.getInvite(id);
      if (!invite || invite.tenantId !== tenantId) {
        return res.status(404).json({ message: "Invite not found" });
      }
      await storage.deleteInvite(id, tenantId);
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Cancelled team invite", "invite", id, invite, null, "delete");
      return res.json({ message: "Invite cancelled" });
    } catch (error) {
      console.error("Error cancelling team invite:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
      res.json(rows);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      return res.json(rows);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/transactions", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
      const payload = { ...req.body, tenantId, createdBy: req.user.id };
      const created = await storage.createTransaction(payload as any);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created transaction", "transaction", created.id, null, created, "create");
      res.json(created);
=======
      const u = (req as any).user;
      const payload = { ...req.body, tenantId, createdBy: u.id };
      const created = await storage.createTransaction(payload as any);
      await createAuditLog(tenantId, u.id, u.name, "Created transaction", "transaction", created.id, null, created, "create");
      return res.json(created);
>>>>>>> e6da67b (feat(repo): initial clean upload)
    } catch (error) {
      console.error("Error creating transaction:", error);
      const errMsg = (error as any)?.message || String(error);
      const errStack = (error as any)?.stack || undefined;
<<<<<<< HEAD
      res.status(500).json({ message: "Internal server error", error: errMsg, stack: errStack });
=======
      return res.status(500).json({ message: "Internal server error", error: errMsg, stack: errStack });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/transactions/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
      const item = await storage.getTransaction(req.params.id, tenantId);
      if (!item) return res.status(404).json({ message: "Transaction not found" });
      res.json(item);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      const id = String((req.params as any).id);
      const item = await storage.getTransaction(id, tenantId);
      if (!item) return res.status(404).json({ message: "Transaction not found" });
      return res.json(item);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/transactions/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
      const old = await storage.getTransaction(req.params.id, tenantId);
      if (!old) return res.status(404).json({ message: "Transaction not found" });
      const updated = await storage.updateTransaction(req.params.id, tenantId, req.body);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Updated transaction", "transaction", updated.id, old, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      const id = String((req.params as any).id);
      const old = await storage.getTransaction(id, tenantId);
      if (!old) return res.status(404).json({ message: "Transaction not found" });
      const updated = await storage.updateTransaction(id, tenantId, req.body);
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Updated transaction", "transaction", updated.id, old, updated);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating transaction:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
      const old = await storage.getTransaction(req.params.id, tenantId);
      if (!old) return res.status(404).json({ message: "Transaction not found" });
      await storage.deleteTransaction(req.params.id, tenantId);
      await createAuditLog(tenantId, req.user.id, req.user.name, "Deleted transaction", "transaction", req.params.id, old, null, "delete");
      res.json({ message: "Transaction deleted" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      const id = String((req.params as any).id);
      const old = await storage.getTransaction(id, tenantId);
      if (!old) return res.status(404).json({ message: "Transaction not found" });
      await storage.deleteTransaction(id, tenantId);
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Deleted transaction", "transaction", id, old, null, "delete");
      return res.json({ message: "Transaction deleted" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching finance data:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching finance data:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
      await createAuditLog(tenantId, req.user.id, req.user.name, "Created transaction", "transaction", transaction.id, null, transaction, "create");
      res.json(transaction);
    } catch (error) {
      console.error("Error creating finance record:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Created transaction", "transaction", transaction.id, null, transaction, "create");
      return res.json(transaction);
    } catch (error) {
      console.error("Error creating finance record:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
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
<<<<<<< HEAD
      res.json(monthlyFinance);
    } catch (error) {
      console.error("Error fetching monthly finance data:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      return res.json(monthlyFinance);
    } catch (error) {
      console.error("Error fetching monthly finance data:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
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

<<<<<<< HEAD
      await createAuditLog(tenantId, req.user.id, req.user.name, "Exported finance data", "finance", "export", null, { startDate, endDate, format: 'csv' });
=======
      const u = (req as any).user;
      await createAuditLog(tenantId, u.id, u.name, "Exported finance data", "finance", "export", null, { startDate, endDate, format: 'csv' });
>>>>>>> e6da67b (feat(repo): initial clean upload)

      // Default to CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="finance-export.csv"');
<<<<<<< HEAD
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
=======
      return res.send(csv);
    } catch (error) {
      console.error("Error exporting finance data:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

>>>>>>> e6da67b (feat(repo): initial clean upload)

  // OAuth API endpoints
  app.get("/api/oauth/status", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
      const oauthStatus = await storage.getOAuthStatus(tenantId, req.user.id);
      res.json(oauthStatus);
    } catch (error) {
      console.error("Error fetching OAuth status:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      const oauthStatus = { connected: false, providers: [] } as any;
      return res.json(oauthStatus);
    } catch (error) {
      console.error("Error fetching OAuth status:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.post("/api/oauth/init/:platform", isAuthenticated, checkTenantSuspension, async (req, res) => {
    try {
      const tenantId = await getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
<<<<<<< HEAD
      const { platform } = req.params;
=======
      const platform = String((req.params as any).platform);
>>>>>>> e6da67b (feat(repo): initial clean upload)
      const supportedPlatforms = ['google', 'facebook', 'twitter', 'instagram', 'linkedin'];
      
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      // Mock OAuth initialization - in real implementation, this would redirect to OAuth provider
<<<<<<< HEAD
      const oauthUrl = `https://oauth.${platform}.com/authorize?client_id=mock_client_id&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/api/oauth/callback/${platform}`)}&scope=read_profile&state=${tenantId}_${req.user.id}`;
      
      await createAuditLog(tenantId, req.user.id, req.user.name, `Initiated OAuth for ${platform}`, "oauth", platform, null, { platform, url: oauthUrl });
      
      res.json({ 
=======
      const u = (req as any).user;
      const oauthUrl = `https://oauth.${platform}.com/authorize?client_id=mock_client_id&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/api/oauth/callback/${platform}`)}&scope=read_profile&state=${tenantId}_${u.id}`;
      
      await createAuditLog(tenantId, u.id, u.name, `Initiated OAuth for ${platform}`, "oauth", platform, null, { platform, url: oauthUrl });
      
      return res.json({ 
>>>>>>> e6da67b (feat(repo): initial clean upload)
        authUrl: oauthUrl,
        platform,
        status: "initialized"
      });
    } catch (error) {
      console.error("Error initializing OAuth:", error);
<<<<<<< HEAD
      res.status(500).json({ message: "Internal server error" });
=======
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.get("/api/oauth/callback/:platform", async (req, res) => {
    try {
      const { platform } = req.params;
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ message: "Missing authorization code or state" });
      }

<<<<<<< HEAD
      const [tenantId, userId] = (state as string).split('_');
=======
      const parts = String(state).split('_');
      const tenantId = parts[0] || "";
      const userId = parts[1] || "";
>>>>>>> e6da67b (feat(repo): initial clean upload)
      
      // Mock OAuth token exchange - in real implementation, this would exchange code for access token
      const mockToken = {
        access_token: `mock_access_token_${Date.now()}`,
        refresh_token: `mock_refresh_token_${Date.now()}`,
        expires_in: 3600,
        platform,
        user_id: userId,
        tenant_id: tenantId
      };

<<<<<<< HEAD
      await storage.saveOAuthToken(tenantId, userId, platform, mockToken);
      await createAuditLog(tenantId, userId, "System", `OAuth connected for ${platform}`, "oauth", platform, null, mockToken);

      // Redirect back to the application
      res.redirect(`${req.protocol}://${req.get('host')}/dashboard?oauth_success=${platform}`);
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      await createAuditLog(tenantId, userId, "System", `OAuth connected for ${platform}`, "oauth", platform, null, mockToken);

      // Redirect back to the application
      return res.redirect(`${req.protocol}://${req.get('host')}/dashboard?oauth_success=${platform}`);
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  // Additional Admin API endpoints
  app.get("/api/admin/export-database", requireSuperAdmin(), async (req, res) => {
    try {
<<<<<<< HEAD
      const exportData = await storage.exportDatabase();
      await createAuditLog("system", req.user.id, req.user.name, "Exported database", "admin", "database_export", null, { timestamp: new Date().toISOString() });
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="database-export.json"');
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting database:", error);
      res.status(500).json({ message: "Internal server error" });
=======
      const exportData = {
        tenants: await storage.getAllTenants(),
        users: await storage.getAllUsers(),
        staff: await storage.getAllStaff(),
        payroll: await storage.getAllPayroll(),
        matches: await storage.getAllMatches(),
        campaigns: await storage.getAllCampaigns(),
        contracts: await storage.getAllContracts(),
        auditLogs: await storage.getAllAuditLogs(10000),
        invites: await storage.getAllInvites(),
      } as any;
      const u = (req as any).user;
      await createAuditLog("system", u.id, u.name, "Exported database", "admin", "database_export", null, { timestamp: new Date().toISOString() });
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="database-export.json"');
      return res.json(exportData);
    } catch (error) {
      console.error("Error exporting database:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.patch("/api/admin/clubs/:id", requireSuperAdmin(), async (req, res) => {
    try {
<<<<<<< HEAD
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
=======
      const oldTenant = await storage.getTenant(String(req.params.id));
      if (!oldTenant) {
        return res.status(404).json({ message: "Club not found" });
      }
      const tenant = await storage.updateTenantAdmin(String(req.params.id), req.body);
      const u = (req as any).user;
      await createAuditLog("system", u.id, u.name, "Updated club", "tenant", tenant.id, oldTenant, tenant);
      return res.json(tenant);
    } catch (error) {
      console.error("Error updating club:", error);
      return res.status(500).json({ message: "Internal server error" });
>>>>>>> e6da67b (feat(repo): initial clean upload)
    }
  });

  app.delete("/api/admin/clubs/:id", requireSuperAdmin(), async (req, res) => {
    try {
<<<<<<< HEAD
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ message: "Club not found" });
      }
      await storage.deleteTenant(req.params.id);
      await createAuditLog("system", req.user.id, req.user.name, "Deleted club", "tenant", req.params.id, tenant, null, "delete");
=======
      const tenant = await storage.getTenant(String(req.params.id));
      if (!tenant) {
        res.status(404).json({ message: "Club not found" });
        return;
      }
      await storage.deleteTenant(String(req.params.id));
      const u = (req as any).user;
      await createAuditLog("system", u.id, u.name, "Deleted club", "tenant", String(req.params.id), tenant, null, "delete");
>>>>>>> e6da67b (feat(repo): initial clean upload)
      res.json({ message: "Club deleted" });
    } catch (error) {
      console.error("Error deleting club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/clubs/:id/suspend", requireSuperAdmin(), async (req, res) => {
    try {
<<<<<<< HEAD
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
=======
      const tenant = await storage.getTenant(String(req.params.id));
      if (!tenant) {
        res.status(404).json({ message: "Club not found" });
        return;
      }
      const u = (req as any).user;
      const updatedTenant = await storage.updateTenantAdmin(String(req.params.id), { 
        subscriptionStatus: "suspended",
        suspendedAt: new Date(),
        suspendedBy: u.id,
        suspensionReason: req.body.reason || "Administrative action"
      });
      await createAuditLog("system", u.id, u.name, "Suspended club", "tenant", String(req.params.id), tenant, updatedTenant);
>>>>>>> e6da67b (feat(repo): initial clean upload)
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error suspending club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/clubs/:id/reactivate", requireSuperAdmin(), async (req, res) => {
    try {
<<<<<<< HEAD
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
=======
      const tenant = await storage.getTenant(String(req.params.id));
      if (!tenant) {
        res.status(404).json({ message: "Club not found" });
        return;
      }
      const u = (req as any).user;
      const updatedTenant = await storage.updateTenantAdmin(String(req.params.id), { 
        subscriptionStatus: "active",
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null
      });
      await createAuditLog("system", u.id, u.name, "Reactivated club", "tenant", String(req.params.id), tenant, updatedTenant);
>>>>>>> e6da67b (feat(repo): initial clean upload)
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error reactivating club:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/users/:id", requireSuperAdmin(), async (req, res) => {
    try {
<<<<<<< HEAD
      const oldUser = await storage.getUser(req.params.id);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const user = await storage.updateUser(req.params.id, req.body);
      await createAuditLog("system", req.user.id, req.user.name, "Updated user", "user", user.id, oldUser, user);
=======
      const oldUser = await storage.getUser(String(req.params.id));
      if (!oldUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const user = await storage.updateUser(String(req.params.id), req.body);
      const u = (req as any).user;
      await createAuditLog("system", u.id, u.name, "Updated user", "user", user.id, oldUser, user);
>>>>>>> e6da67b (feat(repo): initial clean upload)
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Catch-all for unknown API routes to ensure JSON 404 instead of HTML index fallback
  app.use("/api", (req, res) => {
    res.status(404).json({ message: `Not Found: ${req.path}` });
  });

  const httpServer = createServer(app);
  return httpServer;
}
