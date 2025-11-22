import { getSupabase } from "../useSupabase";

export async function getOrgById(id: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("organizations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function insertOrganization(payload: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("organizations").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrgBySlug(slug: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("organizations").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function countMembersByUser(userId: string) {
  const s = getSupabase();
  if (!s) return 0;
  const { count, error } = await s
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count || 0;
}

export async function getMemberByUserOrg(userId: string, orgId: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("org_members")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getFirstMemberByUser(userId: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("org_members")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function insertMember(payload: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("org_members").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMembersByOrg(orgId: string) {
  const s = getSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("org_members")
    .select("*, users:users(id,email,name)")
    .eq("organization_id", orgId);
  if (error) throw error;
  return data || [];
}