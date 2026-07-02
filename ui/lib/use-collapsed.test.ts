import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCollapsedSections } from "@/lib/use-collapsed";

describe("useCollapsedSections", () => {
  beforeEach(() => localStorage.clear());

  it("toggles a section and persists to localStorage", () => {
    const { result } = renderHook(() => useCollapsedSections("k"));
    expect(result.current.collapsed.has("a")).toBe(false);

    act(() => result.current.toggle("a"));
    expect(result.current.collapsed.has("a")).toBe(true);
    expect(JSON.parse(localStorage.getItem("k")!)).toContain("a");

    act(() => result.current.toggle("a"));
    expect(result.current.collapsed.has("a")).toBe(false);
  });

  it("initializes from localStorage", () => {
    localStorage.setItem("k", JSON.stringify(["x", "y"]));
    const { result } = renderHook(() => useCollapsedSections("k"));
    expect(result.current.collapsed.has("x")).toBe(true);
    expect(result.current.collapsed.has("y")).toBe(true);
  });

  it("collapseAll then expandAll set and clear the whole set", () => {
    const { result } = renderHook(() => useCollapsedSections("k"));
    act(() => result.current.collapseAll(["a", "b", "c"]));
    expect(result.current.collapsed.size).toBe(3);

    act(() => result.current.expandAll());
    expect(result.current.collapsed.size).toBe(0);
  });
});
