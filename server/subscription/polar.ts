import { Polar } from "@polar-sh/sdk";

const serverEnv = String(process.env.POLAR_SERVER || "sandbox").toLowerCase();
const serverTarget = serverEnv === "production" ? "production" : "sandbox";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  server: serverTarget as any,
});