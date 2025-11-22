import { Router } from "express";
import { requireAuth } from "../auth/authRoutes";
import { organizationService } from "../org/service";

const router = Router();

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

router.patch("/", requireAuth as any, async (req: any, res: any) => {
  const orgId = await resolveOrgId(req);
  if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
  const updates = req.body || {};
  const updated = await organizationService.updateOrganization(orgId, String(req.user.id), updates);
  return res.json(updated);
});

router.delete("/", requireAuth as any, async (req: any, res: any) => {
  const orgId = await resolveOrgId(req);
  if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
  await organizationService.updateOrganization(orgId, String(req.user.id), { status: "archived" } as any);
  return res.json({ success: true });
});

router.get("/members", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await organizationService.getOrganizationMembers(orgId, String(req.user.id));
    return res.json(rows);
  } catch (error: any) {
    const msg = String(error?.message || "Unknown error");
    if (msg.includes("Insufficient permissions")) {
      return res.status(403).json({ success: false, error: "Access denied", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to get members", message: msg });
  }
});

router.get("/invites", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const rows = await organizationService.getOrganizationInvites(orgId, String(req.user.id));
    return res.json(rows);
  } catch (error: any) {
    const msg = String(error?.message || "Unknown error");
    if (msg.includes("Insufficient permissions")) {
      return res.status(403).json({ success: false, error: "Access denied", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to get invitations", message: msg });
  }
});

router.post("/invites/:id/resend", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const inviteId = String(req.params.id);
    const result = await organizationService.resendInvitation(orgId, inviteId, String(req.user.id));
    return res.json(result);
  } catch (error: any) {
    const msg = String(error?.message || "Unknown error");
    if (msg.includes("Insufficient permissions")) {
      return res.status(403).json({ success: false, error: "Access denied", message: msg });
    }
    if (msg.toLowerCase().includes("pending")) {
      return res.status(400).json({ success: false, error: "Invalid state", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to resend invitation", message: msg });
  }
});

router.patch("/invites/:id/cancel", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const inviteId = String(req.params.id);
    const row = await organizationService.cancelInvitation(orgId, inviteId, String(req.user.id));
    return res.json(row);
  } catch (error: any) {
    const msg = String(error?.message || "Unknown error");
    if (msg.includes("Insufficient permissions")) {
      return res.status(403).json({ success: false, error: "Access denied", message: msg });
    }
    if (msg.toLowerCase().includes("pending")) {
      return res.status(400).json({ success: false, error: "Invalid state", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to cancel invitation", message: msg });
  }
});
router.patch("/members/:id/status", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const memberId = String(req.params.id);
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean") return res.status(400).json({ success: false, message: "isActive must be boolean" });
    const row = await organizationService.updateMemberStatus(orgId, memberId, String(req.user.id), !!isActive);
    return res.json(row);
  } catch (error: any) {
    const msg = String(error?.message || "Unknown error");
    if (msg.includes("Insufficient permissions")) {
      return res.status(403).json({ success: false, error: "Access denied", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to update member status", message: msg });
  }
});
router.post("/members", requireAuth as any, async (req: any, res: any) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
    const { email, role, name, message, sendEmail } = req.body || {};
    if (!email || !role) return res.status(400).json({ success: false, message: "Email and role are required" });
    const inv = await organizationService.inviteMember(orgId, String(req.user.id), { email, role, name, message, sendEmail } as any);
    return res.json(inv);
  } catch (error: any) {
    const msg = String(error?.message || "Unknown error");
    if (msg.toLowerCase().includes("invalid email") || msg.toLowerCase().includes("role")) {
      return res.status(400).json({ success: false, error: "Invalid input", message: msg });
    }
    if (msg.includes("Insufficient permissions")) {
      return res.status(403).json({ success: false, error: "Access denied", message: msg });
    }
    if (msg.includes("already been sent")) {
      return res.status(409).json({ success: false, error: "Conflict", message: msg });
    }
    return res.status(500).json({ success: false, error: "Failed to invite member", message: msg });
  }
});

router.patch("/members/:id", requireAuth as any, async (req: any, res: any) => {
  const orgId = await resolveOrgId(req);
  if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
  const memberId = String(req.params.id);
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ success: false, message: "Role is required" });
  const row = await organizationService.updateMemberRole(orgId, memberId, String(req.user.id), role as any);
  return res.json(row);
});

router.delete("/members/:id", requireAuth as any, async (req: any, res: any) => {
  const orgId = await resolveOrgId(req);
  if (!orgId) return res.status(400).json({ success: false, message: "Organization not found for user" });
  const memberId = String(req.params.id);
  await organizationService.removeMember(orgId, memberId, String(req.user.id));
  return res.json({ success: true });
});

export default router;