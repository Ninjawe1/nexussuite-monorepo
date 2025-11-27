import type { Express } from "express";
import { setupAuth, isAuthenticated } from "./auth.js";
import crypto from "crypto";

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function makeExpiry(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function setSessionUser(req: any, user: any) {
  const sess = req.session || {};
  sess.passport = sess.passport || {};
  sess.passport.user = {
    claims: { sub: user.id, email: user.email, name: user.name || user.email },
    email: user.email,
    name: user.name || user.email
  };
  req.session = sess;
}

export async function registerRoutes(app: Express) {
  await setupAuth(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ message: "Missing email or password" });
      return;
    }
    // Mock user for now since we don't have the full DB logic here yet
    // In a real app, you'd verify password against DB
    const user = { id: email, email, name: email.split("@")[0], role: "member" };
    setSessionUser(req, user);
    const session = { token: makeToken(), expiresAt: makeExpiry() };
    res.json({ success: true, user, session });
  });

  app.post("/api/auth/register", (req, res) => {
    const { email, password, orgName } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ message: "Missing email or password" });
      return;
    }
    const user = { 
      id: email, 
      email, 
      name: email.split("@")[0], 
      organizationId: orgName || undefined, 
      role: "member" 
    };
    setSessionUser(req, user);
    const session = { token: makeToken(), expiresAt: makeExpiry() };
    res.json({ success: true, user, session });
  });

  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    const passportUser = (req as any).session?.passport?.user;
    const claims = passportUser?.claims || {};
    const user = { id: claims.sub, email: claims.email, name: claims.name };
    res.json(user);
  });

  app.post("/api/auth/logout", (req, res) => {
    (req as any).session = null;
    res.json({ success: true });
  });

  app.post("/api/auth/session/refresh", isAuthenticated, (req, res) => {
    const passportUser = (req as any).session?.passport?.user;
    const claims = passportUser?.claims || {};
    const user = { id: claims.sub, email: claims.email, name: claims.name };
    res.json({ user });
  });
}
