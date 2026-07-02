import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logout } from "@/lib/auth";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true } as Response);
  // jsdom doesn't implement navigation; make window.location.href assignable.
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("logout", () => {
  it("clears the server session cookie and redirects to the marketing site", async () => {
    await logout();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/auth/logout");
    expect(opts.method).toBe("POST");
    expect(opts.credentials).toBe("include");
    expect(window.location.href).toBe("https://dossiertool.com");
  });

  it("still redirects even if the logout request fails", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    await logout();
    expect(window.location.href).toBe("https://dossiertool.com");
  });
});
