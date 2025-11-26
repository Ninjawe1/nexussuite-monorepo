import cookieSession from "cookie-session";
import type { Express } from "express";
import { randomBytes } from "crypto";

export function getSession(): any {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const useSecureCookies = process.env.SESSION_COOKIE_SECURE ? process.env.SESSION_COOKIE_SECURE === "true" : false;
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

export const isAuthenticated: any = async (req: any, res: any, next: any) => {
  const passportUser = (req as any).session?.passport?.user;
  const userId = passportUser?.claims?.sub;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  const userName = passportUser?.claims?.name || passportUser?.name || "Unknown";
  (req as any).user = { id: userId, name: userName, claims: passportUser?.claims ?? { sub: userId } };
  next();
  return;
};
