import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, daysUntil } from "@/lib/display";

describe("formatDate", () => {
  it("formats a YYYY-MM-DD string in US short form", () => {
    expect(formatDate("2025-12-01")).toBe("Dec 1, 2025");
  });

  it("returns empty string for falsy input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("does not shift the day across the local/UTC boundary", () => {
    // Parsed as a local date, so Jan 1 stays Jan 1 regardless of timezone.
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
});

describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T09:30:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns 0 for today", () => {
    expect(daysUntil("2026-01-10")).toBe(0);
  });

  it("returns a positive count for future dates", () => {
    expect(daysUntil("2026-01-17")).toBe(7);
  });

  it("returns a negative count for past dates", () => {
    expect(daysUntil("2026-01-05")).toBe(-5);
  });
});
