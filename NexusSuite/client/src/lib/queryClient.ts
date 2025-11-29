import { QueryClient, QueryFunction } from "@tanstack/react-query";


async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    // Try to parse JSON error response
    try {
      const errorData = JSON.parse(text);
      const error = new Error(errorData.message || text);
      // Attach full error data for access in error handlers
      (error as any).data = errorData;
      throw error;
    } catch {
      // Not JSON, throw as plain text
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

// Ensure we only attempt to parse JSON when the server actually returned JSON.
// This prevents "JSON.parse: unexpected character" errors when an HTML page
// (like the SPA index.html fallback) is returned with status 200.
function ensureJsonResponse(res: Response) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  // Many servers include charset in content-type, so we check inclusion.
  const isJson = contentType.includes("application/json");
  if (!isJson) {
    const status = res.status;
    const ctDisplay = contentType || "unknown";
    throw new Error(
      `Expected JSON but received ${ctDisplay} (status ${status}). This usually happens when an unknown /api route returns an HTML page.`,

    );
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_URL?.trim();

function resolveUrl(u: string): string {
  if (API_BASE) {
    try {
      return new URL(u, API_BASE).toString();
    } catch {
      return u;
    }
  }
  return u;
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string> },

): Promise<Response> {
  const res = await fetch(resolveUrl(url), {
    method,
    headers: {
      ...(options?.headers || {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    // Prevent cached responses for API calls; important for auth/session endpoints
    cache: "no-store",

  });

  await throwIfResNotOk(res);
  // Guard against HTML fallbacks that return 200 but aren't JSON
  ensureJsonResponse(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = resolveUrl(queryKey.join("/") as string);
    const res = await fetch(url, {
      credentials: "include",
      // Avoid 304 and ensure fresh data for user/session queries
      cache: "no-store",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {

      return null;
    }

    await throwIfResNotOk(res);
    ensureJsonResponse(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),

      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
