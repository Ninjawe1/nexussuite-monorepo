import { getSupabase } from "../useSupabase";

export async function upsertUserBasic(user: { id: string; email?: string; name?: string }) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("users")
    .upsert({ id: user.id, email: user.email || null, name: user.name || null })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserById(id: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getUserByEmail(email: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateUserOrg(id: string, orgId: string | null, role?: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("users")
    .update({ organization_id: orgId, role: role || null })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}