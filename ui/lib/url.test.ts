import { describe, expect, it } from "vitest";

import { safeExternalUrl } from "./url";

describe("safeExternalUrl", () => {
  it("allows http and https URLs", () => {
    expect(safeExternalUrl("http://mit.edu")).toBe("http://mit.edu");
    expect(safeExternalUrl("https://mit.edu/phd")).toBe("https://mit.edu/phd");
  });

  it("blocks javascript: URLs", () => {
    expect(safeExternalUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(safeExternalUrl("JavaScript:alert(1)")).toBeNull();
  });

  it("blocks data: and other schemes", () => {
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("returns null for empty, null, relative, or malformed input", () => {
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl("/relative/path")).toBeNull();
  });
});
