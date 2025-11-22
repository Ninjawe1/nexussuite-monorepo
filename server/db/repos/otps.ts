import { getSupabase } from "../useSupabase";

export async function insertOtp(payload: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("otps").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestPendingOtpByUser(userId: string, type?: string) {
  const s = getSupabase();
  if (!s) return null;
  let q = s.from("otps").select("*").eq("user_id", userId).eq("status", "pending");
  if (type) q = q.eq("type", type);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateOtp(id: string, patch: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s.from("otps").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function invalidatePendingOtps(userId: string, type: string, excludeId?: string) {
  const s = getSupabase();
  if (!s) return 0;
  let q = s.from("otps").update({ status: "expired", updated_at: new Date().toISOString() }).eq("user_id", userId).eq("type", type).eq("status", "pending");
  if (excludeId) q = q.neq("id", excludeId);
  const { count, error } = await q.select("id", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

export async function countResendsLastHour(userId: string, deliveryMethod: string) {
  const s = getSupabase();
  if (!s) return 0;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await s
    .from("otps")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("delivery_method", deliveryMethod)
    .gt("created_at", oneHourAgo);
  if (error) throw error;
  return count || 0;
}