import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./useStorage";

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

  const httpServer = createServer(app);
  return httpServer;
}