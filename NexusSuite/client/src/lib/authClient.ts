import { createAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth";
import { organizationClient } from "better-auth/client/plugins";

const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

export const authClient = createAuthClient({
  baseURL: `${apiBase}/api`,
  fetcher: async (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
    });
  },
  plugins: [polarClient(), organizationClient()],
});

// Side-effect checkout on import removed; trigger checkout from UI actions only