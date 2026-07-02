import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
  redirectToLogin: vi.fn(),
}));

import { api, AuthError } from "@/lib/api";
import { clearToken, getToken, redirectToLogin } from "@/lib/auth";

const mockFetch = vi.fn();

function response(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  vi.mocked(getToken).mockReturnValue("tok123");
});

afterEach(() => vi.unstubAllGlobals());

describe("api request", () => {
  it("redirects to login and throws when there is no token", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    await expect(api.get("/me")).rejects.toBeInstanceOf(AuthError);
    expect(redirectToLogin).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the bearer token and returns parsed JSON", async () => {
    mockFetch.mockResolvedValue(response({ id: 1 }));
    const data = await api.get<{ id: number }>("/me");

    expect(data).toEqual({ id: 1 });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/me");
    expect((opts.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok123"
    );
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });

  it("clears the token and throws AuthError on 401", async () => {
    mockFetch.mockResolvedValue(response(null, 401));
    await expect(api.get("/me")).rejects.toBeInstanceOf(AuthError);
    expect(clearToken).toHaveBeenCalledOnce();
  });

  it("returns undefined for a 204 with no body", async () => {
    mockFetch.mockResolvedValue({
      status: 204,
      ok: true,
      json: async () => {
        throw new Error("no body");
      },
    } as unknown as Response);
    await expect(api.delete("/programs/1")).resolves.toBeUndefined();
  });

  it("throws a generic error on other non-ok responses", async () => {
    mockFetch.mockResolvedValue(response({}, 500));
    await expect(api.get("/me")).rejects.toThrow("API error 500");
  });

  it("posts a JSON body with the POST method", async () => {
    mockFetch.mockResolvedValue(response({ ok: true }));
    await api.post("/programs", { school: "MIT" });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ school: "MIT" }));
  });
});
