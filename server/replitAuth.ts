import type { Express } from "express";
import { getSession } from "./auth";

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}
export const isAuthenticated: any = async (req: any, res: any, next: any) => {
  const passportUser = (req as any).session?.passport?.user;
  const userId = passportUser?.claims?.sub;
  if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
  (req as any).user = {
    id: userId,
    name: passportUser?.claims?.name || passportUser?.name || "Unknown",
    claims: passportUser?.claims ?? { sub: userId },
  };
  next();
  return;
};
