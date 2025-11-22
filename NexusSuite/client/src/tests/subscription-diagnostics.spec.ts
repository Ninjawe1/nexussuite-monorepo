import { describe, it, expect } from "vitest";

describe("subscription diagnostics", () => {
  it("reports env and token presence", async () => {
    const base = process.env.VITE_API_URL || "http://localhost:3000";
    const resp = await fetch(new URL("/api/subscription/diagnostics", base), { credentials: "include" });
    expect(resp.ok).toBe(true);
    const json = await resp.json();
    expect(json.success).toBe(true);
    expect(typeof json.serverEnv === "string").toBe(true);
    expect(["sandbox", "production", "live"].includes(String(json.serverEnv))).toBe(true);
    expect(typeof json.tokenPresent === "boolean").toBe(true);
  });
});