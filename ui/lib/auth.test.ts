import { beforeEach, describe, expect, it } from "vitest";
import { getToken, setToken, clearToken } from "@/lib/auth";

describe("token storage", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "dossier_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("round-trips a token through localStorage and mirrors it to a cookie", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
    expect(document.cookie).toContain("dossier_token=abc.def.ghi");
  });

  it("clears both localStorage and the cookie", () => {
    setToken("abc.def.ghi");
    clearToken();
    expect(getToken()).toBeNull();
    expect(document.cookie).not.toContain("abc.def.ghi");
  });
});
