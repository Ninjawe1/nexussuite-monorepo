import { isSupabaseEnabled, supabase } from "./supabase";

export function getSupabase() {
  if (!isSupabaseEnabled()) return null;
  return supabase;
}