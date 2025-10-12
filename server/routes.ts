import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
} from "@shared/schema";
import { randomBytes } from "crypto";
import Stripe from "stripe";
import bcrypt from "bcrypt";

// Initialize Stripe with testing keys (production keys can be added later)
const stripeKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error("Missing Stripe secret key (TESTING_STRIPE_SECRET_KEY or STRIPE_SECRET_KEY)");
}
const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-09-30.clover",
});

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

      // Regenerate session to prevent fixation attacks
      await new Promise((resolve, reject) => {
        (req as any).session.regenerate((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      // Set session data compatible with existing middleware (req.user.claims.sub)
      (req as any).session.passport = { 
        user: { 
          claims: { sub: user.id }
        }
      };
      
      await new Promise((resolve, reject) => {
        (req as any).session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

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

      // Regenerate session to prevent fixation attacks
      await new Promise((resolve, reject) => {
        (req as any).session.regenerate((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      // Set session data compatible with existing middleware
      (req as any).session.passport = { 
        user: { 
          claims: { sub: user.id }
        }
      };
      
      await new Promise((resolve, reject) => {
        (req as any).session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

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

  app.post("/api/staff", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.patch("/api/staff/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.delete("/api/staff/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.post("/api/payroll", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertPayrollSchema.parse({ ...req.body, tenantId });
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

  app.patch("/api/payroll/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldPayroll = await storage.getPayroll(req.params.id, tenantId);
      if (!oldPayroll) {
        return res.status(404).json({ message: "Payroll entry not found" });
      }
      
      const validatedData = insertPayrollSchema.partial().parse(req.body);
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

  app.delete("/api/payroll/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.post("/api/matches", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.patch("/api/matches/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.delete("/api/matches/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.post("/api/campaigns", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.patch("/api/campaigns/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.delete("/api/campaigns/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.post("/api/contracts", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.patch("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.delete("/api/contracts/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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
          users: await storage.getAllUsers(),
          staff: await storage.getAllStaff(),
          payroll: await storage.getAllPayroll(),
          matches: await storage.getAllMatches(),
          campaigns: await storage.getAllCampaigns(),
          contracts: await storage.getAllContracts(),
          auditLogs: await storage.getAllAuditLogs(10000),
          invites: await storage.getAllInvites(),
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

  app.post("/api/invites", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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

  app.get("/api/invites/verify/:token", async (req: any, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.status !== "pending") {
        return res.status(400).json({ message: "Invite already used or expired" });
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        await storage.updateInviteStatus(req.params.token, "expired");
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Error verifying invite:", error);
      res.status(500).json({ message: "Failed to verify invite" });
    }
  });

  app.post("/api/invites/accept/:token", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // SECURITY: Verify the logged-in user's email matches the invite
      if (invite.email.toLowerCase() !== userEmail?.toLowerCase()) {
        return res.status(403).json({ message: "This invite was sent to a different email address" });
      }
      
      if (invite.status !== "pending") {
        return res.status(400).json({ message: "Invite already used or expired" });
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        await storage.updateInviteStatus(req.params.token, "expired");
        return res.status(400).json({ message: "Invite has expired" });
      }
      
      // Add user to tenant and create staff entry
      await storage.updateUserAdmin(userId, { tenantId: invite.tenantId });
      await storage.createStaff({
        tenantId: invite.tenantId,
        name: req.body.name || userEmail,
        email: userEmail,
        role: invite.role,
        permissions: invite.permissions,
      });
      
      await storage.updateInviteStatus(req.params.token, "accepted");
      
      await createAuditLog(
        invite.tenantId,
        userId,
        userEmail || 'Unknown',
        `Accepted invite and joined club`,
        "invite",
        invite.id,
        undefined,
        undefined,
        "create"
      );
      
      res.json({ success: true, tenantId: invite.tenantId });
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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
  app.post("/api/social/accounts", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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
  app.patch("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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
  app.delete("/api/social/accounts/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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
  app.post("/api/social/sync/:accountId", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const account = await storage.getSocialAccount(req.params.accountId, tenantId);
      
      if (!account) {
        return res.status(404).json({ message: "Social account not found" });
      }
      
      // TODO: Implement actual API calls to social platforms
      // For now, create demo metrics
      const demoMetric = await storage.createSocialMetric({
        accountId: account.id,
        tenantId,
        platform: account.platform,
        followers: Math.floor(Math.random() * 50000) + 10000,
        following: Math.floor(Math.random() * 1000),
        posts: Math.floor(Math.random() * 500) + 50,
        reach: Math.floor(Math.random() * 100000) + 20000,
        impressions: Math.floor(Math.random() * 200000) + 50000,
        engagement: Math.floor(Math.random() * 5000) + 1000,
        engagementRate: (Math.random() * 5).toFixed(2),
        profileViews: Math.floor(Math.random() * 10000),
        websiteClicks: Math.floor(Math.random() * 2000),
        date: new Date(),
      });
      
      await storage.updateSocialAccount(account.id, tenantId, {
        lastSyncedAt: new Date(),
      });
      
      res.json({ success: true, metric: demoMetric });
    } catch (error) {
      console.error("Error syncing social account:", error);
      res.status(500).json({ message: "Failed to sync social account" });
    }
  });

  // ==================== Finance Routes ====================
  
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
  app.post("/api/finance", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const validatedData = insertTransactionSchema.parse({ 
        ...req.body, 
        tenantId,
        createdBy: userId 
      });
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
  app.patch("/api/finance/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const oldTransaction = await storage.getTransaction(req.params.id, tenantId);
      if (!oldTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const validatedData = insertTransactionSchema.partial().parse(req.body);
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
  app.delete("/api/finance/:id", isAuthenticated, checkTenantSuspension, async (req: any, res) => {
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
  
  // Webhook endpoint for Stripe events
  app.post("/api/webhooks/stripe", async (req, res) => {
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
