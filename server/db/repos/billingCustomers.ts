import { getSupabase } from "../useSupabase";

export async function getBillingCustomerByOrgId(orgId: string) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("billing_customers")
    .select("*")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function insertBillingCustomer(payload: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("billing_customers")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateBillingCustomer(id: string, patch: any) {
  const s = getSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("billing_customers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}