import { describe, it, expect, vi, beforeEach } from "vitest";
import { betterAuthService } from "@/services/betterAuthService";

describe("BetterAuthService error mapping", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps 401 login to 'Invalid email or password'", async () => {
    const mockFetch = vi.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Invalid email or password" }),
    } as any);

    await expect(betterAuthService.login("a@b.com", "x"))
      .rejects.toThrow("Invalid email or password");

    expect(mockFetch).toHaveBeenCalled();
  });

  it("maps 400 register with 'exists' to 'Email already exists'", async () => {
    const mockFetch = vi.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ success: false, message: "Email already exists" }),
    } as any);

    await expect(betterAuthService.register("a@b.com", "pass"))
      .rejects.toThrow("Email already exists");

    expect(mockFetch).toHaveBeenCalled();
  });
});