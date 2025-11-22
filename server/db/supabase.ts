import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL as string | undefined;
const key = (process.env.SUPABASE_SERVICE_KEY as string | undefined) || (process.env.SUPABASE_KEY as string | undefined);

export const supabase = (() => {
  if (!url || !key) return null as any;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
})();

export function isSupabaseEnabled(): boolean {
  return Boolean(url && key);
}