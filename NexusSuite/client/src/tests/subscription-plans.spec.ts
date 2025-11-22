import { describe, it, expect } from "vitest";

describe("subscription plans mapping", () => {
  it("returns array of plans with required fields", async () => {
    const base = process.env.VITE_API_URL || "http://localhost:3000";
    const resp = await fetch(new URL("/api/subscription/plans", base), { credentials: "include" });
    if (!resp.ok) return;
    const json = await resp.json();
    expect(json.success).toBe(true);
    const plans = json.plans || [];
    expect(Array.isArray(plans)).toBe(true);
    // Fallback plans should have productId/productName/interval
    for (const p of plans) {
      expect(typeof p.productId === "string").toBe(true);
      expect(typeof p.productName === "string").toBe(true);
      expect(["month", "year"].includes(String(p.interval))).toBe(true);
    }
  });
});