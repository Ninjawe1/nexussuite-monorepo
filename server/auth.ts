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

  return cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || randomBytes(32).toString("hex")],
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
  // Check if user ID exists in session
  const passportUser = (req as any).session?.passport?.user;
  const userId = passportUser?.claims?.sub;
  if (!userId) {
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
