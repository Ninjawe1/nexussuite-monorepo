import { getSupabase } from "../useSupabase";

export async function insertSession(token: string, userId: string, expiresAt: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("sessions")
    .upsert({ token, user_id: userId, expires_at: expiresAt })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSession(token: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function deleteSession(token: string) {
  const s = getSupabase();
  if (!s) return null;
  const { error } = await s
    .from("sessions")
    .delete()
    .eq("token", token);
  if (error) throw error;
  return true;
}