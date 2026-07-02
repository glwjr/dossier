import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, AuthError } from "@/lib/api";

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
});

afterEach(() => vi.unstubAllGlobals());

describe("api request", () => {
  it("sends the auth cookie via credentials:include and returns parsed JSON", async () => {
    mockFetch.mockResolvedValue(response({ id: 1 }));
    const data = await api.get<{ id: number }>("/me");

    expect(data).toEqual({ id: 1 });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/me");
    expect(opts.credentials).toBe("include");
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    // No Authorization header — the JWT is never in JS.
    expect((opts.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws AuthError on 401", async () => {
    mockFetch.mockResolvedValue(response(null, 401));
    await expect(api.get("/me")).rejects.toBeInstanceOf(AuthError);
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
