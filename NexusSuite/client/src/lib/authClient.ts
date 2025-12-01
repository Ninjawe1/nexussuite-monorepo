import { createAuthClient } from 'better-auth/react';
import { polarClient } from '@polar-sh/better-auth';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: "/api",
  fetcher: async (url: string, options: any = {}) => {
    const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    const access = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') ?? undefined : undefined;
    const headers = {
      ...(options.headers || {}),
      ...(access ? { Authorization: `Bearer ${access}`, apikey: anon } : (anon ? { Authorization: `Bearer ${anon}`, apikey: anon } : {})),
    };
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  },
  plugins: [polarClient(), organizationClient()],
});

// Side-effect checkout on import removed; trigger checkout from UI actions only
