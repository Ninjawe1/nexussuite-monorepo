import { describe, it, expect, vi, beforeEach } from "vitest";
import { betterAuthService } from "@/services/betterAuthService";

describe("Auth integration flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("logs in and returns user+session", async () => {
    const mockFetch = vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: { id: "u1", email: "user@example.com" },
        session: { token: "t1", expiresAt: new Date(Date.now() + 3600_000).toISOString() },
      }),
    } as any);

    const res = await betterAuthService.login("user@example.com", "password123");
    expect(res.user.email).toBe("user@example.com");
    expect(res.session.token).toBe("t1");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("refreshes session and returns user", async () => {
    const mockFetch = vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: { id: "u1", email: "user@example.com" },
      }),
    } as any);

    const res = await betterAuthService.refreshSession();
    expect(res).toBeTruthy();
    expect(mockFetch).toHaveBeenCalled();
  });
});