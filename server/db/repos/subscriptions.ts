import { getSupabase } from "../useSupabase";

export async function getSubscriptionByOrgId(orgId: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateSubscriptionRow(id: string, patch: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("subscriptions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}