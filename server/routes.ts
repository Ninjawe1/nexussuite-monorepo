import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./useStorage";
import { setupAuth, isAuthenticated } from "./auth";
import { requirePermission, requireRoles } from "./rbac";
import {
  insertStaffSchema,
  insertPayrollSchema,
  insertMatchSchema,
  insertCampaignSchema,
  insertContractSchema,
  insertTenantSchema,
  insertInviteSchema,
  insertSocialAccountSchema,
  insertTransactionSchema,
  insertTournamentSchema,
  insertTournamentRoundSchema,
  insertRosterSchema,
  insertWalletSchema,
} from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { getOAuthConfig, isOAuthConfigured, OAUTH_PLATFORMS } from "./oauth-config";

// Disable Stripe completely
const stripeEnabled = false;
const stripe: any = null;

// Helper to get tenant ID from authenticated user
async function getTenantId(req: any): Promise<string> {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  if (!user || !user.tenantId) {
    throw new Error("User tenant not found");
  }
  return user.tenantId;
}

// Helper to check if user is super admin
async function isSuperAdmin(req: any): Promise<boolean> {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  return user?.isSuperAdmin || false;
}

// Middleware to require super admin
async function requireSuperAdmin(req: any, res: any, next: any) {
  try {
    const superAdmin = await isSuperAdmin(req);
    if (!superAdmin) {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization check failed" });
  }
}

// Middleware to check if tenant is suspended
async function checkTenantSuspension(req: any, res: any, next: any) {
  try {
    // Skip check for super admins
    const superAdmin = await isSuperAdmin(req);
    if (superAdmin) {
      return next();
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || !user.tenantId) {
      return next();
    }

    const tenant = await storage.getTenant(user.tenantId);
    
    if (tenant && tenant.subscriptionStatus === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended",
        reason: tenant.suspensionReason || "Please contact support for more information",
        suspendedAt: tenant.suspendedAt,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking tenant suspension:", error);
    next();
  }
}

// Helper to create audit log
async function createAuditLog(
  tenantId: string,
  userId: string,
  userName: string,
  action: string,
  entity: string,
  entityId?: string,
  oldValue?: any,
  newValue?: any,
  actionType: "create" | "update" | "delete" = "update"
) {
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
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Custom Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Regenerate session to prevent fixation attacks (safe fallback)
        await new Promise((resolve) => {
          const sess: any = (req as any).session;
          if (sess?.regenerate) {
            sess.regenerate((err: any) => {
              if (err) {
                console.warn("Session regenerate failed; continuing without regenerate:", err);
              }
              resolve(true);
            });
          } else {
            console.warn("Session regenerate unavailable; continuing without regenerate");
            resolve(true);
          }
        });

        // Set session data compatible with existing middleware
        const sess: any = (req as any).session;
        if (sess) {
          sess.passport = { 
            user: { 
              claims: { sub: user.id }
            }
          };
          await new Promise((resolve) => {
            if (sess.save) {
              sess.save((err: any) => {
                if (err) {
                  console.warn("Session save failed; login will not persist:", err);
                }
                resolve(true);
              });
            } else {
              console.warn("Session save unavailable; login will not persist");
              resolve(true);
            }
          });
        } else {
          console.warn("No session object found; login will not persist");
        }

      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          isTemporaryPassword: user.isTemporaryPassword,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, tenantName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let tenant;
      let user;

      try {
        // Create tenant for new user
        tenant = await storage.createTenant({
          name: tenantName || `${firstName || email}'s Club`,
          subscriptionPlan: "starter",
          subscriptionStatus: "trial",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        });

        // Create user
        user = await storage.createUser({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          tenantId: tenant.id,
          role: "owner",
          isTemporaryPassword: false,
          lastPasswordChange: new Date(),
        });
      } catch (error) {
        // Cleanup tenant if user creation failed
        if (tenant) {
          try {
            await storage.deleteTenant(tenant.id);
          } catch (cleanupError) {
            console.error("Failed to cleanup tenant after registration error:", cleanupError);
          }
        }
        throw error;
      }

      // Regenerate session to prevent fixation attacks (safe fallback)
      await new Promise((resolve) => {
        const sess: any = (req as any).session;
        if (sess?.regenerate) {
          sess.regenerate((err: any) => {
            if (err) {
              console.warn("Session regenerate failed after register; continuing:", err);
            }
            resolve(true);
          });
        } else {
          console.warn("Session regenerate unavailable after register; continuing");
          resolve(true);
        }
      });

      // Set session data compatible with existing middleware
      const sess: any = (req as any).session;
      if (sess) {
        sess.passport = { 
          user: { 
            claims: { sub: user.id }
          }
        };
        await new Promise((resolve) => {
          if (sess.save) {
            sess.save((err: any) => {
              if (err) {
                console.warn("Session save failed after register; login will not persist:", err);
              }
              resolve(true);
            });
          } else {
            console.warn("Session save unavailable after register; login will not persist");
            resolve(true);
          }
        });
      } else {
        console.warn("No session object found after register; login will not persist");
      }

      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          tenantId: user.tenantId,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/change-password", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      const user = await storage.getUser(userId);
      
      if (!user || !user.password) {
        return res.status(400).json({ message: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await storage.updateUser(userId, {
        password: hashedPassword,
        isTemporaryPassword: false,
        lastPasswordChange: new Date(),
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Tenant routes
  app.get("/api/tenant", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const tenant = await storage.getTenant(tenantId);
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/tenant", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertTenantSchema.partial().parse(req.body);
      const oldTenant = await storage.getTenant(tenantId);
      const updatedTenant = await storage.updateTenant(tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        "Updated club settings",
        "tenant",
        tenantId,
        oldTenant,
        updatedTenant,
        "update"
      );
      
      res.json(updatedTenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  // Roster routes
  app.get("/api/rosters", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const list = await storage.getRostersByTenant(tenantId);
      res.json(list);
    } catch (error) {
      console.error("Error fetching rosters:", error);
      res.status(500).json({ message: "Failed to fetch rosters" });
    }
  });

  app.post("/api/rosters", isAuthenticated, checkTenantSuspension, requirePermission("manage:staff"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const validated = insertRosterSchema.parse({ ...req.body, tenantId });
      const created = await storage.createRoster(validated);

      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Assigned roster for player ${validated.playerId} (${validated.game})`,
        "roster",
        created.id,
        undefined,
        created,
        "create"
      );
      res.json(created);
    } catch (error) {
      console.error("Error creating roster:", error);
      res.status(500).json({ message: "Failed to create roster" });
    }
  });

  app.patch("/api/rosters/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:staff"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const old = await storage.getRoster(req.params.id, tenantId);
      if (!old) {
        return res.status(404).json({ message: "Roster not found" });
      }

      const validated = insertRosterSchema.partial().parse(req.body);
      const updated = await storage.updateRoster(req.params.id, tenantId, validated);

      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated roster for player ${updated.playerId} (${updated.game})`,
        "roster",
        updated.id,
        old,
        updated,
        "update"
      );
      res.json(updated);
    } catch (error) {
      console.error("Error updating roster:", error);
      res.status(500).json({ message: "Failed to update roster" });
    }
  });

  app.delete("/api/rosters/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:staff"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const existing = await storage.getRoster(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Roster not found" });
      }

      await storage.deleteRoster(req.params.id, tenantId);

      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Removed roster for player ${existing.playerId} (${existing.game})`,
        "roster",
        req.params.id,
        existing,
        undefined,
        "delete"
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting roster:", error);
      res.status(500).json({ message: "Failed to delete roster" });
    }
  });

  // Staff routes
  app.get("/api/staff", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const staffList = await storage.getStaffByTenant(tenantId);
      res.json(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/staff", isAuthenticated, checkTenantSuspension, requirePermission("manage:staff"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check subscription plan limits
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const currentStaffCount = await storage.getStaffByTenant(tenantId);
      const staffCount = currentStaffCount.length;
      
      // Define plan limits
      const planLimits: Record<string, number> = {
        starter: 10,
        growth: 50,
        enterprise: Infinity, // Unlimited
      };
      
      const currentPlan = tenant.subscriptionPlan || 'starter';
      const limit = planLimits[currentPlan] || 10;
      
      if (staffCount >= limit) {
        return res.status(403).json({ 
          message: `Staff limit reached for ${currentPlan} plan. Upgrade to add more staff members.`,
          limit,
          current: staffCount
        });
      }
      
      const validatedData = insertStaffSchema.parse({ ...req.body, tenantId });
      const newStaff = await storage.createStaff(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Added staff member ${newStaff.name}`,
        "staff",
        newStaff.id,
        undefined,
        newStaff,
        "create"
      );
      
      res.json(newStaff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ message: "Failed to create staff" });
    }
  });

  app.patch("/api/staff/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:staff"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldStaff = await storage.getStaff(req.params.id, tenantId);
      if (!oldStaff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      const validatedData = insertStaffSchema.partial().parse(req.body);
      const updatedStaff = await storage.updateStaff(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated staff member ${updatedStaff.name}`,
        "staff",
        updatedStaff.id,
        oldStaff,
        updatedStaff,
        "update"
      );
      
      res.json(updatedStaff);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ message: "Failed to update staff" });
    }
  });

  app.delete("/api/staff/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:staff"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const staff = await storage.getStaff(req.params.id, tenantId);
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      await storage.deleteStaff(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Removed staff member ${staff?.name || 'Unknown'}`,
        "staff",
        req.params.id,
        staff,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ message: "Failed to delete staff" });
    }
  });

  // Payroll routes
  app.get("/api/payroll", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const payrollList = await storage.getPayrollByTenant(tenantId);
      res.json(payrollList);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll", isAuthenticated, checkTenantSuspension, requirePermission("manage:payroll"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertPayrollSchema.parse({ ...req.body, tenantId });

      if ((validatedData as any).walletId && String((validatedData as any).walletId).trim() !== "") {
        const wallet = await storage.getWallet((validatedData as any).walletId as string, tenantId);
        if (!wallet) {
          return res.status(400).json({ message: "Invalid wallet selected" });
        }
      }

      const newPayroll = await storage.createPayroll(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Added payroll entry for ${newPayroll.name}`,
        "payroll",
        newPayroll.id,
        undefined,
        newPayroll,
        "create"
      );
      
      res.json(newPayroll);
    } catch (error) {
      console.error("Error creating payroll:", error);
      res.status(500).json({ message: "Failed to create payroll" });
    }
  });

  app.patch("/api/payroll/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:payroll"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldPayroll = await storage.getPayroll(req.params.id, tenantId);
      if (!oldPayroll) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      const validatedData = insertPayrollSchema.partial().parse(req.body);

      if ((validatedData as any).walletId !== undefined && String((validatedData as any).walletId).trim() !== "") {
        const wallet = await storage.getWallet((validatedData as any).walletId as string, tenantId);
        if (!wallet) {
          return res.status(400).json({ message: "Invalid wallet selected" });
        }
      }

      const updatedPayroll = await storage.updatePayroll(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated payroll for ${updatedPayroll.name}`,
        "payroll",
        updatedPayroll.id,
        oldPayroll,
        updatedPayroll,
        "update"
      );
      
      res.json(updatedPayroll);
    } catch (error) {
      console.error("Error updating payroll:", error);
      res.status(500).json({ message: "Failed to update payroll" });
    }
  });

  app.delete("/api/payroll/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:payroll"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const payroll = await storage.getPayroll(req.params.id, tenantId);
      if (!payroll) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      await storage.deletePayroll(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted payroll for ${payroll.name}`,
        "payroll",
        req.params.id,
        payroll,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payroll:", error);
      res.status(500).json({ message: "Failed to delete payroll" });
    }
  });

  // ==================== Tournament Routes ====================
  
  // Get all tournaments for tenant
  app.get("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const tournamentList = await storage.getTournamentsByTenant(tenantId);
      res.json(tournamentList);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      res.status(500).json({ message: "Failed to fetch tournaments" });
    }
  });

  // Get single tournament
  app.get("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const tournament = await storage.getTournament(req.params.id, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error fetching tournament:", error);
      res.status(500).json({ message: "Failed to fetch tournament" });
    }
  });

  // Create tournament
  app.post("/api/tournaments", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertTournamentSchema.parse({ ...req.body, tenantId });
      const newTournament = await storage.createTournament(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Created tournament: ${newTournament.name}`,
        "tournament",
        newTournament.id,
        undefined,
        newTournament,
        "create"
      );
      
      res.json(newTournament);
    } catch (error) {
      console.error("Error creating tournament:", error);
      res.status(500).json({ message: "Failed to create tournament" });
    }
  });

  // Update tournament
  app.patch("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldTournament = await storage.getTournament(req.params.id, tenantId);
      if (!oldTournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      const validatedData = insertTournamentSchema.partial().parse(req.body);
      const updatedTournament = await storage.updateTournament(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated tournament: ${updatedTournament.name}`,
        "tournament",
        updatedTournament.id,
        oldTournament,
        updatedTournament,
        "update"
      );
      
      res.json(updatedTournament);
    } catch (error) {
      console.error("Error updating tournament:", error);
      res.status(500).json({ message: "Failed to update tournament" });
    }
  });

  // Delete tournament
  app.delete("/api/tournaments/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const tournament = await storage.getTournament(req.params.id, tenantId);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      
      await storage.deleteTournament(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted tournament: ${tournament.name}`,
        "tournament",
        req.params.id,
        tournament,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      res.status(500).json({ message: "Failed to delete tournament" });
    }
  });

  // ==================== Tournament Round Routes ====================
  
  // Get rounds for a tournament
  app.get("/api/tournaments/:tournamentId/rounds", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const rounds = await storage.getRoundsByTournament(req.params.tournamentId);
      res.json(rounds);
    } catch (error) {
      console.error("Error fetching rounds:", error);
      res.status(500).json({ message: "Failed to fetch rounds" });
    }
  });

  // Create round
  app.post("/api/tournaments/:tournamentId/rounds", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const tenantId = await getTenantId(req);
      
      const validatedData = insertTournamentRoundSchema.parse({ 
        ...req.body, 
        tournamentId: req.params.tournamentId 
      });
      const newRound = await storage.createRound(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Created tournament round: ${newRound.name}`,
        "tournament_round",
        newRound.id,
        undefined,
        newRound,
        "create"
      );
      
      res.json(newRound);
    } catch (error) {
      console.error("Error creating round:", error);
      res.status(500).json({ message: "Failed to create round" });
    }
  });

  // Update round
  app.patch("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const tenantId = await getTenantId(req);
      
      const { tournamentId } = req.body;
      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required" });
      }
      
      const oldRound = await storage.getRound(req.params.id, tournamentId);
      if (!oldRound) {
        return res.status(404).json({ message: "Round not found" });
      }
      
      const validatedData = insertTournamentRoundSchema.partial().parse(req.body);
      const updatedRound = await storage.updateRound(req.params.id, tournamentId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated tournament round: ${updatedRound.name}`,
        "tournament_round",
        updatedRound.id,
        oldRound,
        updatedRound,
        "update"
      );
      
      res.json(updatedRound);
    } catch (error) {
      console.error("Error updating round:", error);
      res.status(500).json({ message: "Failed to update round" });
    }
  });

  // Delete round
  app.delete("/api/rounds/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const tenantId = await getTenantId(req);
      
      const { tournamentId } = req.query;
      if (!tournamentId || typeof tournamentId !== 'string') {
        return res.status(400).json({ message: "Tournament ID is required" });
      }
      
      const round = await storage.getRound(req.params.id, tournamentId);
      if (!round) {
        return res.status(404).json({ message: "Round not found" });
      }
      
      await storage.deleteRound(req.params.id, tournamentId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted tournament round: ${round.name}`,
        "tournament_round",
        req.params.id,
        round,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting round:", error);
      res.status(500).json({ message: "Failed to delete round" });
    }
  });

  // ==================== Match Routes ====================
  
  // Match routes
  app.get("/api/matches", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const matchList = await storage.getMatchesByTenant(tenantId);
      res.json(matchList);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", isAuthenticated, checkTenantSuspension, requirePermission("manage:matches"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertMatchSchema.parse({ ...req.body, tenantId });
      const newMatch = await storage.createMatch(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Scheduled match ${newMatch.teamA} vs ${newMatch.teamB}`,
        "match",
        newMatch.id,
        undefined,
        newMatch,
        "create"
      );
      
      res.json(newMatch);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  app.patch("/api/matches/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:matches"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldMatch = await storage.getMatch(req.params.id, tenantId);
      if (!oldMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      const validatedData = insertMatchSchema.partial().parse(req.body);
      const updatedMatch = await storage.updateMatch(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated match ${updatedMatch.teamA} vs ${updatedMatch.teamB}`,
        "match",
        updatedMatch.id,
        oldMatch,
        updatedMatch,
        "update"
      );
      
      res.json(updatedMatch);
    } catch (error) {
      console.error("Error updating match:", error);
      res.status(500).json({ message: "Failed to update match" });
    }
  });

  app.delete("/api/matches/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:matches"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const match = await storage.getMatch(req.params.id, tenantId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      await storage.deleteMatch(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted match ${match?.teamA || 'Unknown'} vs ${match?.teamB || 'Unknown'}`,
        "match",
        req.params.id,
        match,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting match:", error);
      res.status(500).json({ message: "Failed to delete match" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const campaignList = await storage.getCampaignsByTenant(tenantId);
      res.json(campaignList);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, checkTenantSuspension, requirePermission("manage:campaigns"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertCampaignSchema.parse({ ...req.body, tenantId });
      const newCampaign = await storage.createCampaign(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Created campaign ${newCampaign.title}`,
        "campaign",
        newCampaign.id,
        undefined,
        newCampaign,
        "create"
      );
      
      res.json(newCampaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:campaigns"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldCampaign = await storage.getCampaign(req.params.id, tenantId);
      if (!oldCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      const updatedCampaign = await storage.updateCampaign(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated campaign ${updatedCampaign.title}`,
        "campaign",
        updatedCampaign.id,
        oldCampaign,
        updatedCampaign,
        "update"
      );
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:campaigns"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const campaign = await storage.getCampaign(req.params.id, tenantId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      await storage.deleteCampaign(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted campaign ${campaign?.title || 'Unknown'}`,
        "campaign",
        req.params.id,
        campaign,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Contract routes
  app.get("/api/contracts", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const contractList = await storage.getContractsByTenant(tenantId);
      res.json(contractList);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post("/api/contracts", isAuthenticated, checkTenantSuspension, requirePermission("manage:contracts"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertContractSchema.parse({ ...req.body, tenantId });
      const newContract = await storage.createContract(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Added contract ${newContract.fileName}`,
        "contract",
        newContract.id,
        undefined,
        newContract,
        "create"
      );
      
      res.json(newContract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:contracts"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldContract = await storage.getContract(req.params.id, tenantId);
      if (!oldContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      const validatedData = insertContractSchema.partial().parse(req.body);
      const updatedContract = await storage.updateContract(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated contract ${updatedContract.fileName}`,
        "contract",
        updatedContract.id,
        oldContract,
        updatedContract,
        "update"
      );
      
      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:contracts"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const contract = await storage.getContract(req.params.id, tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      await storage.deleteContract(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted contract ${contract?.fileName || 'Unknown'}`,
        "contract",
        req.params.id,
        contract,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Audit log routes
  app.get("/api/audit-logs", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const auditLogs = await storage.getAuditLogsByTenant(tenantId, limit);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Super Admin routes
  app.get("/api/admin/clubs", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const clubs = await storage.getAllTenants();
      res.json(clubs);
    } catch (error) {
      console.error("Error fetching clubs:", error);
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  app.post("/api/admin/clubs", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const newClub = await storage.createTenant(validatedData);
      res.json(newClub);
    } catch (error) {
      console.error("Error creating club:", error);
      res.status(500).json({ message: "Failed to create club" });
    }
  });

  app.patch("/api/admin/clubs/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const validatedData = insertTenantSchema.partial().parse(req.body);
      const updatedClub = await storage.updateTenantAdmin(req.params.id, validatedData);
      res.json(updatedClub);
    } catch (error) {
      console.error("Error updating club:", error);
      res.status(500).json({ message: "Failed to update club" });
    }
  });

  app.delete("/api/admin/clubs/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      await storage.deleteTenant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting club:", error);
      res.status(500).json({ message: "Failed to delete club" });
    }
  });

  app.post("/api/admin/clubs/:id/suspend", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { reason } = req.body;
      const tenantId = req.params.id;
      const userId = req.user.claims.sub;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const updatedTenant = await storage.updateTenantAdmin(tenantId, {
        subscriptionStatus: "suspended",
        suspendedAt: new Date(),
        suspensionReason: reason || "Suspended by administrator",
        suspendedBy: userId,
      });

      // Create audit log
      const user = await storage.getUser(userId);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Super Admin',
        `Suspended tenant: ${reason || 'No reason provided'}`,
        "tenant",
        tenantId,
        { subscriptionStatus: tenant.subscriptionStatus },
        { subscriptionStatus: "suspended", suspensionReason: reason },
        "update"
      );

      res.json(updatedTenant);
    } catch (error) {
      console.error("Error suspending tenant:", error);
      res.status(500).json({ message: "Failed to suspend tenant" });
    }
  });

  app.post("/api/admin/clubs/:id/reactivate", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const tenantId = req.params.id;
      const userId = req.user.claims.sub;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const updatedTenant = await storage.updateTenantAdmin(tenantId, {
        subscriptionStatus: "active",
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
      });

      // Create audit log
      const user = await storage.getUser(userId);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Super Admin',
        "Reactivated suspended tenant",
        "tenant",
        tenantId,
        { subscriptionStatus: tenant.subscriptionStatus },
        { subscriptionStatus: "active" },
        "update"
      );

      res.json(updatedTenant);
    } catch (error) {
      console.error("Error reactivating tenant:", error);
      res.status(500).json({ message: "Failed to reactivate tenant" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { isSuperAdmin, tenantId } = req.body;
      const updatedUser = await storage.updateUserAdmin(req.params.id, { isSuperAdmin, tenantId });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Database export route (Super Admin only)
  app.get("/api/admin/export-database", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      // Export all database tables
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        data: {
          tenants: await storage.getAllTenants(),
          users: await storage.getUsers(),
          staff: await storage.getStaff(),
          payroll: await storage.getPayroll(),
          matches: await storage.getMatches(),
          campaigns: await storage.getCampaigns(),
          contracts: await storage.getContracts(),
          auditLogs: await storage.getAuditLogs(10000),
          invites: await storage.getInvites(),
        }
      };

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="nexus-database-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting database:", error);
      res.status(500).json({ message: "Failed to export database" });
    }
  });

  // Invite routes
  app.get("/api/invites", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const invitesList = await storage.getInvitesByTenant(tenantId);
      res.json(invitesList);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.post("/api/invites", isAuthenticated, checkTenantSuspension, requirePermission("manage:invites"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
      
      const validatedData = insertInviteSchema.parse({
        ...req.body,
        tenantId,
        token,
        invitedBy: userId,
        inviterName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        expiresAt,
      });
      
      const newInvite = await storage.createInvite(validatedData);
      res.json(newInvite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });


  app.delete("/api/invites/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:invites"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Verify invite exists and belongs to tenant before deleting
      const invites = await storage.getInvitesByTenant(tenantId);
      const invite = invites.find(inv => inv.id === req.params.id);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      await storage.deleteInvite(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted invite for ${invite.email}`,
        "invite",
        req.params.id,
        invite,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  // ==================== Social Media Routes ====================
  
  // Get all connected social accounts
  app.get("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const accounts = await storage.getSocialAccountsByTenant(tenantId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  // Connect a new social account
  app.post("/api/social/accounts", isAuthenticated, checkTenantSuspension, requirePermission("manage:social"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertSocialAccountSchema.parse({
        ...req.body,
        tenantId,
      });
      
      const newAccount = await storage.createSocialAccount(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Connected ${req.body.platform} account: ${req.body.accountName}`,
        "socialAccount",
        newAccount.id,
        undefined,
        newAccount,
        "create"
      );
      
      res.json(newAccount);
    } catch (error) {
      console.error("Error creating social account:", error);
      res.status(500).json({ message: "Failed to connect social account" });
    }
  });

  // Update social account
  app.patch("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:social"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldAccount = await storage.getSocialAccount(req.params.id, tenantId);
      if (!oldAccount) {
        return res.status(404).json({ message: "Social account not found" });
      }
      
      const updatedAccount = await storage.updateSocialAccount(req.params.id, tenantId, req.body);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated ${updatedAccount.platform} account: ${updatedAccount.accountName}`,
        "socialAccount",
        req.params.id,
        oldAccount,
        updatedAccount,
        "update"
      );
      
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating social account:", error);
      res.status(500).json({ message: "Failed to update social account" });
    }
  });

  // Delete social account
  app.delete("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:social"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const account = await storage.getSocialAccount(req.params.id, tenantId);
      if (!account) {
        return res.status(404).json({ message: "Social account not found" });
      }
      
      await storage.deleteSocialAccount(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Disconnected ${account.platform} account: ${account.accountName}`,
        "socialAccount",
        req.params.id,
        account,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting social account:", error);
      res.status(500).json({ message: "Failed to disconnect social account" });
    }
  });

  // Get social media analytics summary
  app.get("/api/social/analytics", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const latestMetrics = await storage.getLatestMetricsByTenant(tenantId);
      
      // Aggregate metrics across all platforms
      const summary = {
        totalFollowers: latestMetrics.reduce((sum, m) => sum + (m.followers || 0), 0),
        totalReach: latestMetrics.reduce((sum, m) => sum + (m.reach || 0), 0),
        totalEngagement: latestMetrics.reduce((sum, m) => sum + Number(m.engagement || 0), 0),
        avgEngagementRate: latestMetrics.length > 0 
          ? latestMetrics.reduce((sum, m) => sum + Number(m.engagementRate || 0), 0) / latestMetrics.length 
          : 0,
        platforms: latestMetrics.map(m => ({
          platform: m.platform,
          accountId: m.accountId,
          followers: m.followers,
          reach: m.reach,
          engagement: m.engagement,
          engagementRate: m.engagementRate,
          posts: m.posts,
          impressions: m.impressions,
        })),
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching social analytics:", error);
      res.status(500).json({ message: "Failed to fetch social analytics" });
    }
  });

  // Manual sync endpoint - fetch latest data from social platforms
  app.post("/api/social/sync/:accountId", isAuthenticated, checkTenantSuspension, requirePermission("manage:social"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const account = await storage.getSocialAccount(req.params.accountId, tenantId);
      
      if (!account) {
        return res.status(404).json({ message: "Social account not found" });
      }
      
      if (!account.apiKey) {
        return res.status(400).json({ message: "Account not connected. Please connect via OAuth first." });
      }
      
      // Fetch real analytics from the platform
      const { fetchPlatformAnalytics } = await import("./analytics-fetcher");
      const platformMetrics = await fetchPlatformAnalytics(
        account.platform,
        account.apiKey,
        account.accountId || account.id
      );
      
      // Calculate engagement rate if we have the data
      let engagementRate = "0";
      if (platformMetrics.followers && platformMetrics.engagement) {
        engagementRate = ((platformMetrics.engagement / platformMetrics.followers) * 100).toFixed(2);
      }
      
      const newMetric = await storage.createSocialMetric({
        accountId: account.id,
        tenantId,
        platform: account.platform,
        followers: platformMetrics.followers || 0,
        following: platformMetrics.following || 0,
        posts: platformMetrics.posts || 0,
        reach: platformMetrics.reach || 0,
        impressions: platformMetrics.impressions || 0,
        engagement: platformMetrics.engagement || 0,
        engagementRate: platformMetrics.engagementRate || engagementRate,
        profileViews: platformMetrics.profileViews || 0,
        websiteClicks: platformMetrics.websiteClicks || 0,
        date: new Date(),
      });
      
      await storage.updateSocialAccount(account.id, tenantId, {
        lastSyncedAt: new Date(),
      });
      
      // Create audit log
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Synced analytics for ${account.platform} account`,
        "socialMetric",
        newMetric.id,
        undefined,
        newMetric,
        "create"
      );
      
      res.json({ success: true, metric: newMetric });
    } catch (error) {
      console.error("Error syncing social account:", error);
      res.status(500).json({ 
        message: "Failed to sync social account", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // ==================== OAuth Routes ====================
  
  // Check which OAuth platforms are configured
  app.get("/api/oauth/status", isAuthenticated, (req: any, res) => {
    const status: Record<string, { configured: boolean; name: string; note?: string }> = {};
    
    Object.keys(OAUTH_PLATFORMS).forEach((platform) => {
      const platformInfo = OAUTH_PLATFORMS[platform as keyof typeof OAUTH_PLATFORMS];
      status[platform] = {
        configured: isOAuthConfigured(platform),
        name: platformInfo.name,
        note: platformInfo.note,
      };
    });
    
    res.json(status);
  });

  // Initiate OAuth flow for a platform
  app.get("/api/oauth/init/:platform", isAuthenticated, async (req: any, res) => {
    try {
      const { platform } = req.params;
      const config = getOAuthConfig(platform);
      
      if (!config) {
        return res.status(400).json({ 
          message: `OAuth not configured for ${platform}. Please set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET environment variables.` 
        });
      }

      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      
      // Generate state token for CSRF protection
      const state = randomBytes(32).toString("hex");
      
      // Generate PKCE parameters (required for Twitter OAuth 2.0)
      const codeVerifier = randomBytes(32).toString("base64url");
      const codeChallenge = randomBytes(32)
        .toString("base64url")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      
      // Use crypto to generate proper code challenge for Twitter
      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
      const properCodeChallenge = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      
      // Store state and code verifier in session for verification on callback
      if (!req.session.oauthStates) {
        req.session.oauthStates = {};
      }
      req.session.oauthStates[state] = {
        platform,
        tenantId,
        userId,
        timestamp: Date.now(),
        codeVerifier, // Store for token exchange
      };
      
      // Build authorization URL with PKCE
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: config.scope.join(" "),
        state,
        code_challenge: properCodeChallenge,
        code_challenge_method: "s256",
      });
      
      const authUrl = `${config.authorizationUrl}?${params.toString()}`;
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      res.status(500).json({ message: "Failed to initiate OAuth flow" });
    }
  });

  // Handle OAuth callback from platform
  app.get("/api/oauth/callback/:platform", async (req: any, res) => {
    try {
      const { platform } = req.params;
      const { code, state, error: oauthError } = req.query;
      
      // Check for OAuth errors from the platform
      if (oauthError) {
        return res.redirect(`/marcom?oauth_error=${encodeURIComponent(oauthError as string)}`);
      }
      
      if (!code || !state) {
        return res.redirect("/marcom?oauth_error=missing_parameters");
      }
      
      // Verify state token
      const stateData = req.session?.oauthStates?.[state as string];
      if (!stateData || stateData.platform !== platform) {
        return res.redirect("/marcom?oauth_error=invalid_state");
      }
      
      // Check state is not expired (10 minutes)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        // Clean up expired state
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=state_expired");
      }
      
      const config = getOAuthConfig(platform);
      if (!config) {
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=platform_not_configured");
      }
      
      // Exchange code for access token (with PKCE code_verifier)
      let tokenResponse;
      try {
        const tokenParams: Record<string, string> = {
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: config.redirectUri,
        };
        
        // Add code_verifier for PKCE (Twitter requires this)
        if (stateData.codeVerifier) {
          tokenParams.code_verifier = stateData.codeVerifier;
        }
        
        tokenResponse = await fetch(config.tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
          },
          body: new URLSearchParams(tokenParams).toString(),
        });
      } catch (fetchError) {
        console.error("Token exchange network error:", fetchError);
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=network_error");
      }
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=token_exchange_failed");
      }
      
      let tokenData;
      try {
        tokenData = await tokenResponse.json();
      } catch (parseError) {
        console.error("Token response parse error:", parseError);
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=invalid_token_response");
      }
      
      const { access_token, refresh_token, expires_in } = tokenData;
      
      if (!access_token) {
        console.error("No access token in response:", tokenData);
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=no_access_token");
      }
      
      // Fetch account info from the platform to get account details
      let accountName = `${platform}_account`;
      let accountId = "";
      
      // Platform-specific API calls to get account info
      // (This would need to be implemented for each platform)
      // For now, we'll use placeholder values
      
      // Create or update social account
      const expiresAt = expires_in 
        ? new Date(Date.now() + expires_in * 1000)
        : undefined;
      
      try {
        const accountData = {
          tenantId: stateData.tenantId,
          platform,
          accountName,
          accountId: accountId || undefined,
          apiKey: access_token,
          refreshToken: refresh_token || undefined,
          expiresAt,
          isActive: true,
        };
        
        const newAccount = await storage.createSocialAccount(accountData);
        
        // Create audit log for connection
        const userId = stateData.userId;
        const user = await storage.getUser(userId);
        await createAuditLog(
          stateData.tenantId,
          userId,
          `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
          `Connected ${platform} account via OAuth`,
          "socialAccount",
          undefined,
          undefined,
          accountData,
          "create"
        );
        
        // Automatically fetch initial analytics after connection
        try {
          const { fetchPlatformAnalytics } = await import("./analytics-fetcher");
          const platformMetrics = await fetchPlatformAnalytics(
            platform,
            access_token,
            accountId || newAccount.id
          );
          
          let engagementRate = "0";
          if (platformMetrics.followers && platformMetrics.engagement) {
            engagementRate = ((platformMetrics.engagement / platformMetrics.followers) * 100).toFixed(2);
          }
          
          const initialMetric = await storage.createSocialMetric({
            accountId: newAccount.id,
            tenantId: stateData.tenantId,
            platform,
            followers: platformMetrics.followers || 0,
            following: platformMetrics.following || 0,
            posts: platformMetrics.posts || 0,
            reach: platformMetrics.reach || 0,
            impressions: platformMetrics.impressions || 0,
            engagement: platformMetrics.engagement || 0,
            engagementRate: platformMetrics.engagementRate || engagementRate,
            profileViews: platformMetrics.profileViews || 0,
            websiteClicks: platformMetrics.websiteClicks || 0,
            date: new Date(),
          });
          
          await storage.updateSocialAccount(newAccount.id, stateData.tenantId, {
            lastSyncedAt: new Date(),
          });
          
          // Create audit log for initial sync
          await createAuditLog(
            stateData.tenantId,
            userId,
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
            `Auto-synced initial analytics for ${platform} account`,
            "socialMetric",
            initialMetric.id,
            undefined,
            initialMetric,
            "create"
          );
        } catch (syncError) {
          console.error("Error fetching initial analytics:", syncError);
          // Don't fail the OAuth flow if analytics fetch fails
        }
        
        // Clear used state
        delete req.session.oauthStates[state as string];
        
        // Clean up other expired states
        const now = Date.now();
        if (req.session.oauthStates) {
          Object.keys(req.session.oauthStates).forEach((key) => {
            if (now - req.session.oauthStates[key].timestamp > 10 * 60 * 1000) {
              delete req.session.oauthStates[key];
            }
          });
        }
        
        // Redirect to marcom page with success message
        res.redirect("/marcom?oauth_success=true");
      } catch (storageError) {
        console.error("Error saving social account:", storageError);
        delete req.session.oauthStates[state as string];
        return res.redirect("/marcom?oauth_error=save_failed");
      }
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      // Clean up state if it exists
      if (req.query.state && req.session?.oauthStates?.[req.query.state as string]) {
        delete req.session.oauthStates[req.query.state as string];
      }
      res.redirect("/marcom?oauth_error=callback_failed");
    }
  });

  // ==================== Finance Routes ====================

  // ==================== Wallet Routes ====================
  app.get("/api/wallets", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const list = await storage.getWalletsByTenant(tenantId);
      res.json(list);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post("/api/wallets", isAuthenticated, checkTenantSuspension, requirePermission("manage:finance"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const validated = insertWalletSchema.parse({ ...req.body, tenantId });
      const created = await storage.createWallet(validated);

      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Created wallet ${created.name} (${created.type.toUpperCase()})`,
        "wallet",
        created.id,
        undefined,
        created,
        "create"
      );

      res.json(created);
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ message: "Failed to create wallet" });
    }
  });

  app.patch("/api/wallets/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:finance"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const existing = await storage.getWallet(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const validated = insertWalletSchema.partial().parse(req.body);
      const updated = await storage.updateWallet(req.params.id, tenantId, validated);

      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated wallet ${existing.name}`,
        "wallet",
        updated.id,
        existing,
        updated,
        "update"
      );

      res.json(updated);
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(500).json({ message: "Failed to update wallet" });
    }
  });

  app.delete("/api/wallets/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:finance"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const existing = await storage.getWallet(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      await storage.deleteWallet(req.params.id, tenantId);

      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted wallet ${existing.name}`,
        "wallet",
        req.params.id,
        existing,
        undefined,
        "delete"
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // Get all transactions for tenant
  app.get("/api/finance", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const transactionList = await storage.getTransactionsByTenant(tenantId);
      res.json(transactionList);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Create a new transaction
  app.post("/api/finance", isAuthenticated, checkTenantSuspension, requirePermission("manage:finance"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertTransactionSchema.parse({ 
        ...req.body, 
        tenantId,
        createdBy: userId 
      });

      // Validate walletId belongs to tenant (if provided)
      const walletId = (validatedData as any).walletId;
      if (walletId && String(walletId).trim() !== "") {
        const wallet = await storage.getWallet(walletId, tenantId);
        if (!wallet) {
          return res.status(400).json({ message: "Invalid wallet selected" });
        }
      }

      const newTransaction = await storage.createTransaction(validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Added ${newTransaction.type} transaction: ${newTransaction.description || newTransaction.category}`,
        "transaction",
        newTransaction.id,
        undefined,
        newTransaction,
        "create"
      );
      
      res.json(newTransaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Update a transaction
  app.patch("/api/finance/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:finance"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldTransaction = await storage.getTransaction(req.params.id, tenantId);
      if (!oldTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const validatedData = insertTransactionSchema.partial().parse(req.body);

      // If walletId is being set/changed, ensure it belongs to tenant
      if ((validatedData as any).walletId !== undefined && String((validatedData as any).walletId).trim() !== "") {
        const wallet = await storage.getWallet((validatedData as any).walletId as string, tenantId);
        if (!wallet) {
          return res.status(400).json({ message: "Invalid wallet selected" });
        }
      }

      const updatedTransaction = await storage.updateTransaction(req.params.id, tenantId, validatedData);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Updated ${updatedTransaction.type} transaction: ${updatedTransaction.description || updatedTransaction.category}`,
        "transaction",
        updatedTransaction.id,
        oldTransaction,
        updatedTransaction,
        "update"
      );
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  // Delete a transaction
  app.delete("/api/finance/:id", isAuthenticated, checkTenantSuspension, requirePermission("manage:finance"), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const transaction = await storage.getTransaction(req.params.id, tenantId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      await storage.deleteTransaction(req.params.id, tenantId);
      
      await createAuditLog(
        tenantId,
        userId,
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        `Deleted ${transaction.type} transaction: ${transaction.description || transaction.category}`,
        "transaction",
        req.params.id,
        transaction,
        undefined,
        "delete"
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Get monthly aggregated transaction data
  app.get("/api/finance/monthly", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const transactions = await storage.getTransactionsByTenant(tenantId);
      
      // Group transactions by month
      const monthlyData: Record<string, { income: number; expenses: number }> = {};
      
      transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expenses: 0 };
        }
        
        const amount = parseFloat(transaction.amount);
        if (transaction.type === 'income') {
          monthlyData[monthKey].income += amount;
        } else {
          monthlyData[monthKey].expenses += amount;
        }
      });
      
      // Convert to array and sort by date
      const result = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          income: data.income,
          expenses: data.expenses,
          profit: data.income - data.expenses
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ message: "Failed to fetch monthly data" });
    }
  });

  // Export transactions as CSV
  app.get("/api/finance/export", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const transactions = await storage.getTransactionsByTenant(tenantId);
      
      // Create CSV header
      const header = 'Date,Type,Category,Amount,Description,Payment Method,Reference\n';
      
      // Create CSV rows
      const rows = transactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(t => {
          const date = new Date(t.date).toISOString().split('T')[0];
          const description = (t.description || '').replace(/"/g, '""');
          const paymentMethod = t.paymentMethod || '';
          const reference = t.reference || '';
          
          return `${date},${t.type},${t.category},${t.amount},"${description}",${paymentMethod},${reference}`;
        })
        .join('\n');
      
      const csv = header + rows;
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  // ==================== Stripe Subscription Routes ====================
  
  // Create Stripe checkout session for subscription
  app.post("/api/subscriptions/create-checkout", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    if (!stripeEnabled || !stripe) {
      return res.status(503).json({ message: "Stripe is not configured in this environment" });
    }
    try {
      const tenantId = await getTenantId(req);
      const tenant = await storage.getTenant(tenantId);
      const { plan } = req.body; // starter, growth, enterprise
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }
      
      // Price mapping (in cents) - these should be configured in Stripe dashboard
      const prices: Record<string, number> = {
        starter: 2900,  // $29/month
        growth: 9900,   // $99/month
        enterprise: 29900, // $299/month
      };
      
      if (!prices[plan]) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }
      
      // Create or retrieve Stripe customer
      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email, // Use authenticated user's email
          name: tenant.name,
          metadata: {
            tenantId: tenant.id,
            tenantName: tenant.name,
            userId: user.id,
          },
        });
        customerId = customer.id;
        await storage.updateTenantStripe(tenantId, { stripeCustomerId: customerId });
      }
      
      // Build base URL with proper scheme
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? (process.env.REPLIT_DEV_DOMAIN.startsWith('http') 
            ? process.env.REPLIT_DEV_DOMAIN 
            : `https://${process.env.REPLIT_DEV_DOMAIN}`)
        : 'http://localhost:5000';
      
      // Create checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
                description: `Nexus Esports Suite - ${plan} subscription`,
              },
              unit_amount: prices[plan],
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/settings`,
        metadata: {
          tenantId: tenant.id,
          plan,
        },
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session", error: error.message });
    }
  });
  
  // Sync subscription from Stripe session (for environments where webhooks don't work)
  app.post("/api/subscriptions/sync-session", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    if (!stripeEnabled || !stripe) {
      return res.status(503).json({ message: "Stripe is not configured in this environment" });
    }
    try {
      const tenantId = await getTenantId(req);
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      // Retrieve session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      // SECURITY: Validate session belongs to this tenant via customer ID
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Verify customer ID matches
      if (session.customer !== tenant.stripeCustomerId) {
        return res.status(403).json({ message: "Session customer does not match tenant" });
      }
      
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }
      
      // Get subscription from session
      const subscriptionId = session.subscription as string;
      if (!subscriptionId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const plan = session.metadata?.plan || 'starter';
      
      // SECURITY: Verify the price matches the plan
      const prices: Record<string, number> = {
        starter: 2900,
        growth: 9900,
        enterprise: 29900,
      };
      
      const expectedPrice = prices[plan];
      const actualPrice = subscription.items.data[0]?.price.unit_amount || 0;
      
      if (actualPrice !== expectedPrice) {
        return res.status(400).json({ message: "Price mismatch - subscription verification failed" });
      }
      
      // Update tenant subscription
      await storage.updateTenant(tenantId, {
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscriptionId,
      });
      
      res.json({ success: true, plan });
    } catch (error: any) {
      console.error("Error syncing session:", error);
      res.status(500).json({ message: "Failed to sync session", error: error.message });
    }
  });
  
  // Create Stripe billing portal session
  app.post("/api/subscriptions/create-portal", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    if (!stripeEnabled || !stripe) {
      return res.status(503).json({ message: "Stripe is not configured in this environment" });
    }
    try {
      const tenantId = await getTenantId(req);
      const tenant = await storage.getTenant(tenantId);
      
      if (!tenant || !tenant.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      // Build base URL with proper scheme
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? (process.env.REPLIT_DEV_DOMAIN.startsWith('http') 
            ? process.env.REPLIT_DEV_DOMAIN 
            : `https://${process.env.REPLIT_DEV_DOMAIN}`)
        : 'http://localhost:5000';
      
      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${baseUrl}/settings`,
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Failed to create portal session", error: error.message });
    }
  });
  
  // ==================== Team Management Routes ====================
  
  // Get all users in the club (for club owners)
  app.get("/api/team/users", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const users = await storage.getUsersByTenant(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching team users:", error);
      res.status(500).json({ message: "Failed to fetch team users" });
    }
  });

  // Create a new user directly (for club owners)
  app.post("/api/team/users", isAuthenticated, checkTenantSuspension, requireRoles(["owner", "admin"]), async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const { email, firstName, lastName, role, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password || "Welcome123!", 10);
      
      // Create user
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        tenantId,
        role: role || "staff",
        isTemporaryPassword: !password, // If no password provided, mark as temporary
      });
      
      res.json(newUser);
    } catch (error) {
      console.error("Error creating team user:", error);
      res.status(500).json({ message: "Failed to create team user" });
    }
  });

  // Send an invite to join the club
  app.post("/api/team/invites", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { email, role, permissions } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Generate unique token
      const token = randomBytes(32).toString("hex");
      
      // Create invite (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const invite = await storage.createInvite({
        tenantId,
        email,
        role: role || "staff",
        permissions: permissions || [],
        token,
        invitedBy: userId,
        inviterName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || "Admin",
        status: "pending",
        expiresAt,
      });
      
      res.json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  // Get all pending invites for the club
  app.get("/api/team/invites", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const invites = await storage.getInvitesByTenant(tenantId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  // Delete an invite
  app.delete("/api/team/invites/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const { id } = req.params;
      
      // Verify invite belongs to this tenant
      const invite = await storage.getInvite(id);
      if (!invite || invite.tenantId !== tenantId) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      await storage.deleteInvite(id, tenantId);
      res.json({ message: "Invite deleted successfully" });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  // Get invite details by token (public - no auth required)
  app.get("/api/invites/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if expired
      if (new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      // Check if already accepted
      if (invite.status === "accepted") {
        return res.status(400).json({ message: "Invite has already been accepted" });
      }
      
      // Get tenant info
      const tenant = await storage.getTenant(invite.tenantId);
      
      res.json({
        ...invite,
        tenantName: tenant?.name,
      });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  // Accept invite and create account (public - no auth required)
  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const { firstName, lastName, password } = req.body;
      
      const invite = await storage.getInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if expired
      if (new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      // Check if already accepted
      if (invite.status === "accepted") {
        return res.status(400).json({ message: "Invite has already been accepted" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(invite.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const newUser = await storage.createUser({
        email: invite.email,
        firstName,
        lastName,
        password: hashedPassword,
        tenantId: invite.tenantId,
        role: invite.role,
        isTemporaryPassword: false,
      });
      
      // Mark invite as accepted
      await storage.updateInviteStatus(token, "accepted");
      
      res.json({ message: "Account created successfully", user: newUser });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // ==================== Admin User Management Routes ====================
  
  // Get all users across all clubs (Super Admin only)
  app.get("/api/admin/users", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Edit any user's credentials (Super Admin only)
  app.patch("/api/admin/users/:id", isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, password } = req.body;
      
      const updates: any = {};
      
      if (email) updates.email = email;
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      
      if (password) {
        updates.password = await bcrypt.hash(password, 10);
        updates.isTemporaryPassword = false;
        updates.lastPasswordChange = new Date();
      }
      
      const updatedUser = await storage.updateUser(id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Webhook endpoint for Stripe events
  app.post("/api/webhooks/stripe", async (req, res) => {
    if (!stripeEnabled || !stripe) {
      return res.status(503).json({ message: "Stripe is not configured in this environment" });
    }
    const sig = req.headers['stripe-signature'];
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
      
      // Handle subscription events
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const tenantId = session.metadata.tenantId;
          const plan = session.metadata.plan;
          
          if (tenantId && session.subscription) {
            await storage.updateTenantStripe(tenantId, {
              stripeSubscriptionId: session.subscription as string,
              subscriptionPlan: plan,
              subscriptionStatus: 'active',
            });
          }
          break;
        }
        
        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          const customer = await stripe.customers.retrieve(subscription.customer);
          const tenantId = (customer as any).metadata?.tenantId;
          
          if (tenantId) {
            await storage.updateTenantStripe(tenantId, {
              subscriptionStatus: subscription.status,
            });
          }
          break;
        }
        
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customer = await stripe.customers.retrieve(subscription.customer);
          const tenantId = (customer as any).metadata?.tenantId;
          
          if (tenantId) {
            await storage.updateTenantStripe(tenantId, {
              subscriptionStatus: 'canceled',
            });
          }
          break;
        }
      }
      
      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
