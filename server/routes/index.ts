import { Router } from "express";
import betaAuthRouter from "../auth/authRoutes";
import otpRoutes from "../otp/routes";
import orgRoutes from "../org/routes";
import subscriptionRoutes from "../subscription/routes";
import adminRoutes from "../admin/routes";
import tenantRoutes from "../tenant/routes";
import { organizationService } from "../org/service";
import { requireAuth } from "../auth/authRoutes";
import { storage } from "../useStorage";

const router = Router();

router.use("/auth", betaAuthRouter);
router.use("/otp", otpRoutes);
router.use("/organizations", orgRoutes);
router.use("/subscription", subscriptionRoutes);

// Alias: Support BetterAuth Polar client calling /api/checkout
router.all("/checkout", async (req: any, res: any) => {
  try {
    if (!process.env.POLAR_ACCESS_TOKEN) {
      return res.status(501).json({ success: false, error: "Billing disabled" });
    }
    const method = String(req.method || "GET").toUpperCase();
    if (method === "OPTIONS") return res.status(204).end();
    return res.redirect(307, "/api/subscription/checkout");
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});
router.use("/admin", adminRoutes);
router.use("/tenant", tenantRoutes);

async function resolveOrgId(req: any): Promise<string | null> {
  const direct = (req.body?.organizationId || req.query?.organizationId || req.user?.orgId || req.user?.organizationId) as string | undefined;
  if (direct) return String(direct);
  try {
    const existing = await organizationService.getUserOrganization(String(req.user?.id || ""));
    return existing?.organization?.id || null;
  } catch {
    return null;
  }
}

router.get("/staff", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getStaffByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch staff", message: String(error?.message || "Unknown error") });
  }
});

router.get("/payroll", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getPayrollByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch payroll", message: String(error?.message || "Unknown error") });
  }
});

router.get("/matches", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getMatchesByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch matches", message: String(error?.message || "Unknown error") });
  }
});

router.get("/campaigns", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getCampaignsByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch campaigns", message: String(error?.message || "Unknown error") });
  }
});

router.get("/audit-logs", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const limitRaw = req.query.limit as string | undefined;
    const limit = limitRaw ? parseInt(limitRaw, 10) : 100;
    const rows = await storage.getAuditLogsByTenant(orgId, Number.isFinite(limit) ? limit : 100);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch audit logs", message: String(error?.message || "Unknown error") });
  }
});

router.get("/contracts", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getContractsByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch contracts", message: String(error?.message || "Unknown error") });
  }
});

router.post("/contracts", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const { title } = req.body || {};
    if (!title) return res.status(400).json({ success: false, message: "title is required" });
    const payload = { ...req.body, tenantId: orgId, createdAt: new Date() };
    const created = await storage.createContract(payload);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "create_contract", resource: "contract", resourceId: created.id, changes: payload, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(created);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to create contract", message: String(error?.message || "Unknown error") });
  }
});

router.patch("/contracts/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getContract(id, orgId);
    if (!oldRow) return res.status(404).json({ success: false, message: "Contract not found" });
    const updated = await storage.updateContract(id, req.body || {});
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "update_contract", resource: "contract", resourceId: id, changes: { before: oldRow, after: updated }, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to update contract", message: String(error?.message || "Unknown error") });
  }
});

router.delete("/contracts/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getContract(id, orgId);
    if (!oldRow) return res.status(404).json({ success: false, message: "Contract not found" });
    await storage.deleteContract(id);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "delete_contract", resource: "contract", resourceId: id, changes: oldRow, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to delete contract", message: String(error?.message || "Unknown error") });
  }
});

router.get("/rosters", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getRostersByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch rosters", message: String(error?.message || "Unknown error") });
  }
});

router.post("/rosters", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const { game } = req.body || {};
    if (!game || typeof game !== "string") return res.status(400).json({ success: false, message: "game is required" });
    const payload = { ...req.body, tenantId: orgId, createdAt: new Date() };
    const created = await storage.createRoster(payload);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "create_roster", resource: "roster", resourceId: created.id, changes: payload, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(created);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to create roster", message: String(error?.message || "Unknown error") });
  }
});

router.patch("/rosters/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getRoster(id, orgId);
    if (!oldRow) return res.status(404).json({ success: false, message: "Roster not found" });
    const updated = await storage.updateRoster(id, req.body || {});
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "update_roster", resource: "roster", resourceId: id, changes: { before: oldRow, after: updated }, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to update roster", message: String(error?.message || "Unknown error") });
  }
});

router.delete("/rosters/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getRoster(id, orgId);
    if (!oldRow) return res.status(404).json({ success: false, message: "Roster not found" });
    await storage.deleteRoster(id);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "delete_roster", resource: "roster", resourceId: id, changes: oldRow, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to delete roster", message: String(error?.message || "Unknown error") });
  }
});

router.get("/tournaments", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getTournamentsByTenant(orgId);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch tournaments", message: String(error?.message || "Unknown error") });
  }
});

router.post("/tournaments", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const payload = { ...req.body, tenantId: orgId, createdAt: new Date() };
    const created = await storage.createTournament(payload);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "create_tournament", resource: "tournament", resourceId: created.id, changes: payload, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(created);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to create tournament", message: String(error?.message || "Unknown error") });
  }
});

router.patch("/tournaments/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getTournament(id, orgId);
    if (!oldRow) return res.status(404).json({ success: false, message: "Tournament not found" });
    const updated = await storage.updateTournament(id, req.body || {});
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "update_tournament", resource: "tournament", resourceId: id, changes: { before: oldRow, after: updated }, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to update tournament", message: String(error?.message || "Unknown error") });
  }
});

router.delete("/tournaments/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getTournament(id, orgId);
    if (!oldRow) return res.status(404).json({ success: false, message: "Tournament not found" });
    await storage.deleteTournament(id);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "delete_tournament", resource: "tournament", resourceId: id, changes: oldRow, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to delete tournament", message: String(error?.message || "Unknown error") });
  }
});

router.get("/tournaments/:tournamentId/rounds", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await storage.getRoundsByTournament(String(req.params.tournamentId));
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch rounds", message: String(error?.message || "Unknown error") });
  }
});

router.post("/tournaments/:tournamentId/rounds", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const payload = { ...req.body, tournamentId: String(req.params.tournamentId), createdAt: new Date() };
    const created = await storage.createRound(payload);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "create_round", resource: "tournament_round", resourceId: created.id, changes: payload, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(created);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to create round", message: String(error?.message || "Unknown error") });
  }
});

router.patch("/rounds/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getRound(id);
    if (!oldRow) return res.status(404).json({ success: false, message: "Round not found" });
    const updated = await storage.updateRound(id, req.body || {});
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "update_round", resource: "tournament_round", resourceId: id, changes: { before: oldRow, after: updated }, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to update round", message: String(error?.message || "Unknown error") });
  }
});

router.delete("/rounds/:id", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const id = String(req.params.id);
    const oldRow = await storage.getRound(id);
    if (!oldRow) return res.status(404).json({ success: false, message: "Round not found" });
    await storage.deleteRound(id);
    try {
      await storage.createAuditLog({ tenantId: orgId, userId: String(req.user.id), action: "delete_round", resource: "tournament_round", resourceId: id, changes: oldRow, ipAddress: (req.ip || ""), userAgent: (req.get("User-Agent") || ""), createdAt: new Date() });
    } catch {}
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to delete round", message: String(error?.message || "Unknown error") });
  }
});

router.get("/analytics", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const staff = await storage.getStaffByTenant(orgId);
    const payroll = await storage.getPayrollByTenant(orgId);
    const matches = await storage.getMatchesByTenant(orgId);
    const campaigns = await storage.getCampaignsByTenant(orgId);
    const auditLogs = await storage.getAuditLogsByTenant(orgId, 20);
    return res.json({
      staffCount: staff.length,
      payrollCount: payroll.length,
      matchesCount: matches.length,
      campaignsCount: campaigns.length,
      recentAuditLogCount: auditLogs.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch analytics", message: String(error?.message || "Unknown error") });
  }
});

export default router;
