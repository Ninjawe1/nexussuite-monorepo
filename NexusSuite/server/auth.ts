import cookieSession from "cookie-session";
import type { Express, RequestHandler } from "express";
import { randomBytes } from "crypto";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // In local/prod test environments (http://localhost), secure cookies prevent the browser
  // from setting the session cookie, causing 401s on subsequent requests.
  // Make cookie security configurable via env, defaulting to false for local testing.
  const useSecureCookies = process.env.SESSION_COOKIE_SECURE
    ? process.env.SESSION_COOKIE_SECURE === "true"
    : false; // default to false to support local HTTP tests

  // Stabilize secret in development to avoid invalidating sessions on hot restarts
  const isDev = process.env.NODE_ENV === "development" || process.env.VITE_NODE_ENV === "development";
  const sessionSecret = process.env.SESSION_SECRET || (isDev ? "nexussuite-dev-session-secret" : randomBytes(32).toString("hex"));
  if (isDev && useSecureCookies) {
    console.warn("SESSION_COOKIE_SECURE=true in development may prevent cookies over http://localhost");
  }

  return cookieSession({
    name: "session",
    keys: [sessionSecret],
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: "lax",
    maxAge: sessionTtl,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const sess: any = (req as any).session;
  const passportUser = sess?.passport?.user;
  const userId = passportUser?.claims?.sub;
  if (!userId) {
    // Add detailed logging to diagnose why session-based auth failed
    try {
      const debug = {
        hasSession: !!sess,
        hasPassport: !!passportUser,
        hasClaims: !!passportUser?.claims,
        cookieSecure: process.env.SESSION_COOKIE_SECURE ?? "unset",
        nodeEnv: process.env.NODE_ENV ?? "unset",
        host: (req.headers as any)?.host,
      };
      console.warn("Auth 401: missing userId from session", debug);
    } catch (_) {
      // swallow
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Populate commonly used fields for downstream routes
  const userName =
    passportUser?.claims?.name ||
    passportUser?.name ||
    "Unknown";
  (req as any).user = {
    id: userId,
    name: userName,
    claims: passportUser?.claims ?? { sub: userId },
  };
  next();
};

