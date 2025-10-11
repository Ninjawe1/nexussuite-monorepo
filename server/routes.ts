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
} from "@shared/schema";

// Helper to get tenant ID from authenticated user
async function getTenantId(req: any): Promise<string> {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  if (!user || !user.tenantId) {
    throw new Error("User tenant not found");
  }
  return user.tenantId;
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

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/tenant", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const tenant = await storage.getTenant(tenantId);
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/tenant", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/staff", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const staffList = await storage.getStaffByTenant(tenantId);
      res.json(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/staff", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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

  app.patch("/api/staff/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/staff/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/payroll", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const payrollList = await storage.getPayrollByTenant(tenantId);
      res.json(payrollList);
    } catch (error) {
      console.error("Error fetching payroll:", error);
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/payroll/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/payroll/:id", isAuthenticated, async (req: any, res) => {
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

  // Match routes
  app.get("/api/matches", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const matchList = await storage.getMatchesByTenant(tenantId);
      res.json(matchList);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/matches/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/matches/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const campaignList = await storage.getCampaignsByTenant(tenantId);
      res.json(campaignList);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/campaigns/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/campaigns/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = await getTenantId(req);
      const contractList = await storage.getContractsByTenant(tenantId);
      res.json(contractList);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post("/api/contracts", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/contracts/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/contracts/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
