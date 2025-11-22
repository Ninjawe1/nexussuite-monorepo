import { getSupabase } from "../useSupabase";

export async function insertInvitation(payload: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("org_invitations").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPendingInvitationByToken(token: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("org_invitations").select("*").eq("token", token).eq("status", "pending").maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function pendingInvitationExists(orgId: string, email: string) {
  const s = getSupabase();
  if (!s) return false;
  const { count, error } = await s
    .from("org_invitations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("email", email)
    .eq("status", "pending");
  if (error) throw error;
  return (count || 0) > 0;
}

export async function updateInvitationStatus(id: string, status: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("org_invitations").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data;
}