import { createAuthClient } from 'better-auth/react';
import { polarClient } from '@polar-sh/better-auth';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: '/api',
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
