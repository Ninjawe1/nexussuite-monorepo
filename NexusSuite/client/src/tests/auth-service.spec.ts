import { describe, it, expect, vi, beforeEach } from "vitest";
import { betterAuthService } from "@/services/betterAuthService";

describe("betterAuthService getCurrentUser/logout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("getCurrentUser returns null on 401", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as any);
    const u = await betterAuthService.getCurrentUser();
    expect(u).toBeNull();
  });

  it("logout does not throw on non-200", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Logout Failed" }),
    } as any);
    await expect(betterAuthService.logout()).resolves.toBeUndefined();
  });
});