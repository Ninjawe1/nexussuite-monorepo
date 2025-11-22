import { getSupabase } from "../useSupabase";

export async function upsertCredentialAccount(userId: string, email: string, passwordHash: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("accounts")
    .upsert({ user_id: userId, provider_id: "credential", account_id: email, password_hash: passwordHash })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCredentialAccountByEmail(email: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("accounts")
    .select("*")
    .eq("account_id", email)
    .eq("provider_id", "credential")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateCredentialPassword(email: string, passwordHash: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("accounts")
    .update({ password_hash: passwordHash })
    .eq("account_id", email)
    .eq("provider_id", "credential")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}